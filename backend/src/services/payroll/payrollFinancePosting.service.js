const { sequelize } = require('../../config/database');
const {
  AccountsTrans,
  PayrollRun,
  PayrollPeriod,
  PayrollRunEmployee,
  PayrollRunComponentLine,
  PayrollComponent,
  PayrollFinalSettlement,
  PayrollFinalSettlementLine,
  PayrollWpsBatch,
  PayrollAccountConfiguration,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');
const { createCompanyAccountingEntry, COMPANY_AUDIT_ACTIONS } = require('../companyAccountingEntry.service');
const { buildPostingContext, loadPostingSource } = require('../financePostingContext.service');
const periodValidation = require('../periodValidationService');
const { round2, getNextTransactionNo, assertBalanced, buildAtLine } = require('./payrollFinancePostingUtils');
const { appendLedgerLines } = require('./employeeLedger.service');

const CODE_ACCOUNT_MAP = {
  BASIC: 'basicSalaryExpenseAccount',
  HOUSING: 'housingExpenseAccount',
  TRANSPORT: 'transportExpenseAccount',
  FOOD: 'allowanceExpenseAccount',
  ALLOWANCE: 'allowanceExpenseAccount',
  OVERTIME: 'overtimeExpenseAccount',
  OT: 'overtimeExpenseAccount',
};

async function getActiveAccountConfig(companyId) {
  const config = await PayrollAccountConfiguration.findOne({
    where: { companyId, active: true },
  });
  if (!config) {
    const err = new Error('Payroll account configuration is required');
    err.statusCode = 400;
    throw err;
  }
  return config;
}

function resolveExpenseAccount(config, code) {
  const key = CODE_ACCOUNT_MAP[(code || '').toUpperCase()] || 'allowanceExpenseAccount';
  return config[key];
}

async function aggregateRunEarnings(companyId, runId) {
  const runEmployees = await PayrollRunEmployee.findAll({
    where: { companyId, payrollRunId: runId },
    include: [
      {
        model: PayrollRunComponentLine,
        as: 'lines',
        include: [{ model: PayrollComponent, as: 'component' }],
      },
    ],
  });

  const byCode = {};
  let totalDeductions = 0;
  let loanDeductions = 0;

  for (const re of runEmployees) {
    for (const line of re.lines || []) {
      const amt = Number(line.calculatedAmount || 0);
      if (amt <= 0) continue;
      const code = (line.component?.componentCode || 'OTHER').toUpperCase();
      if (line.componentType === 'DEDUCTION') {
        totalDeductions += amt;
        const method = (line.calculationMethod || '').toUpperCase();
        const compCode = (line.component?.componentCode || '').toUpperCase();
        if (method === 'LOAN_RECOVERY' || compCode === 'LOAN') {
          loanDeductions += amt;
        }
      } else if (line.componentType === 'EARNING') {
        byCode[code] = (byCode[code] || 0) + amt;
      }
    }
  }

  return { byCode, totalDeductions, loanDeductions };
}

async function postPayrollRun({ req, runId }) {
  const t = await sequelize.transaction();
  try {
    const run = await loadPostingSource(PayrollRun, runId, req, {
      transaction: t,
      include: [{ model: PayrollPeriod, as: 'payrollPeriod' }],
    });

    if (!['APPROVED', 'LOCKED'].includes(run.status)) {
      const err = new Error('Payroll run must be APPROVED or LOCKED to post');
      err.statusCode = 400;
      throw err;
    }
    if (run.financePostingStatus === 'POSTED') {
      const err = new Error('Payroll run already posted');
      err.statusCode = 400;
      throw err;
    }
    if (run.financePostingStatus === 'REVERSED') {
      const err = new Error('Payroll run was reversed; cannot repost without new run');
      err.statusCode = 400;
      throw err;
    }

    const config = await getActiveAccountConfig(req.companyId);
    const postingDate = run.payrollPeriod?.toDate || new Date().toISOString().slice(0, 10);
    await periodValidation.validatePostingDate(req, postingDate);

    buildPostingContext({ req, sourceType: 'PAYROLL_RUN', sourceId: run.id, sourceRecord: run });

    const { byCode, totalDeductions, loanDeductions } = await aggregateRunEarnings(req.companyId, run.id);
    const totalGross = Object.values(byCode).reduce((s, v) => s + v, 0);
    const netPayable = round2(Number(run.totalNet || totalGross - totalDeductions));

    let baseTransNo = await getNextTransactionNo(t);
    let nextNo = baseTransNo;
    const atLines = [];
    const jv = `PR-${run.id}`;

    for (const [code, amount] of Object.entries(byCode)) {
      const ledgerId = resolveExpenseAccount(config, code) || config.allowanceExpenseAccount;
      if (!ledgerId) continue;
      const amt = round2(amount);
      atLines.push(
        buildAtLine({
          transactionNo: nextNo++,
          transactionDate: postingDate,
          jvNumber: jv,
          ledgerId,
          debit: amt,
          credit: 0,
          narration: `Payroll run ${run.runNumber} ${code}`,
          payrollRunId: run.id,
        })
      );
    }

    if (netPayable > 0) {
      atLines.push(
        buildAtLine({
          transactionNo: nextNo++,
          transactionDate: postingDate,
          jvNumber: jv,
          ledgerId: config.payrollPayableAccount,
          debit: 0,
          credit: netPayable,
          narration: `Payroll payable run ${run.runNumber}`,
          payrollRunId: run.id,
        })
      );
    }

    const loanRecovery = round2(loanDeductions);
    const otherDeductions = round2(totalDeductions - loanDeductions);
    if (otherDeductions > 0 && config.payrollPayableAccount) {
      atLines.push(
        buildAtLine({
          transactionNo: nextNo++,
          transactionDate: postingDate,
          jvNumber: jv,
          ledgerId: config.payrollPayableAccount,
          debit: 0,
          credit: otherDeductions,
          narration: `Payroll deductions run ${run.runNumber}`,
          payrollRunId: run.id,
        })
      );
    }

    if (loanRecovery > 0 && config.loanRecoveryAccount) {
      atLines.push(
        buildAtLine({
          transactionNo: nextNo++,
          transactionDate: postingDate,
          jvNumber: jv,
          ledgerId: config.loanRecoveryAccount,
          debit: 0,
          credit: loanRecovery,
          narration: `Loan recovery run ${run.runNumber}`,
          payrollRunId: run.id,
        })
      );
    }

    assertBalanced(atLines);

    await createCompanyAccountingEntry({
      companyId: req.companyId,
      lines: atLines,
      transaction: t,
      req,
      sourceType: 'PAYROLL_RUN',
      sourceId: run.id,
      auditAction: COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_CREATED,
    });

    await run.update(
      {
        financePostingStatus: 'POSTED',
        financePostedAt: new Date(),
        financeTransactionNo: baseTransNo,
      },
      { transaction: t }
    );

    const runEmployees = await PayrollRunEmployee.findAll({
      where: { companyId: req.companyId, payrollRunId: run.id },
      transaction: t,
    });
    for (const re of runEmployees) {
      if (Number(re.netSalary) > 0) {
        await appendLedgerLines({
          companyId: req.companyId,
          employeeId: re.employeeId,
          sourceType: 'PAYROLL',
          sourceId: run.id,
          referenceNo: jv,
          transactionDate: postingDate,
          entries: [
            {
              credit: Number(re.netSalary),
              description: `Payroll run ${run.runNumber}`,
            },
          ],
        });
      }
    }

    await t.commit();
    return { run, transactionNo: baseTransNo, lineCount: atLines.length };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function reversePayrollRun({ req, runId }) {
  const t = await sequelize.transaction();
  try {
    const run = await loadPostingSource(PayrollRun, runId, req, {
      transaction: t,
      include: [{ model: PayrollPeriod, as: 'payrollPeriod' }],
    });

    if (run.financePostingStatus !== 'POSTED') {
      const err = new Error('Only POSTED payroll runs can be reversed');
      err.statusCode = 400;
      throw err;
    }

    const postingDate = run.payrollPeriod?.toDate || new Date().toISOString().slice(0, 10);
    await periodValidation.validatePostingDate(req, postingDate);

    const existing = await AccountsTrans.findAll({
      where: { payrollRunId: run.id, ...companyWhere(req) },
      transaction: t,
    });
    if (!existing.length) {
      const err = new Error('No accounting entries found for this payroll run');
      err.statusCode = 400;
      throw err;
    }

    let baseTransNo = await getNextTransactionNo(t);
    let nextNo = baseTransNo;
    const reversalLines = existing.map((row) => ({
      transactionNo: nextNo++,
      transactionDate: postingDate,
      jvNumber: `${row.jvNumber || 'PR'}-REV`,
      crDr: row.crDr === 'Dr' ? 'Cr' : 'Dr',
      particular: `Reversal: ${row.particular || ''}`,
      ledgerId: row.ledgerId,
      debitAmount: parseFloat(row.creditAmount) || 0,
      creditAmount: parseFloat(row.debitAmount) || 0,
      payrollRunId: run.id,
      narration: `Reverse payroll run ${run.id}`,
    }));

    await createCompanyAccountingEntry({
      companyId: req.companyId,
      lines: reversalLines,
      transaction: t,
      req,
      sourceType: 'PAYROLL_RUN',
      sourceId: run.id,
      auditAction: COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_REVERSED,
    });

    await run.update({ financePostingStatus: 'REVERSED' }, { transaction: t });
    await t.commit();
    return { run, transactionNo: baseTransNo };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function postSettlement({ req, settlementId }) {
  const t = await sequelize.transaction();
  try {
    const settlement = await loadPostingSource(PayrollFinalSettlement, settlementId, req, {
      transaction: t,
      include: [{ model: PayrollFinalSettlementLine, as: 'lines' }],
    });

    if (settlement.status !== 'LOCKED') {
      const err = new Error('Settlement must be LOCKED to post');
      err.statusCode = 400;
      throw err;
    }
    if (settlement.financePostingStatus === 'POSTED') {
      const err = new Error('Settlement already posted');
      err.statusCode = 400;
      throw err;
    }

    const config = await getActiveAccountConfig(req.companyId);
    const postingDate = settlement.settlementDate;
    await periodValidation.validatePostingDate(req, postingDate);

    buildPostingContext({ req, sourceType: 'PAYROLL_SETTLEMENT', sourceId: settlement.id, sourceRecord: settlement });

    const payableAccount = config.settlementPayableAccount || config.payrollPayableAccount;
    let baseTransNo = await getNextTransactionNo(t);
    let nextNo = baseTransNo;
    const atLines = [];
    const jv = `FS-${settlement.id}`;

    const expenseMap = {
      EOSB: config.eosExpenseAccount,
      LEAVE_ENCASHMENT: config.leaveEncashmentAccount,
      SALARY_PAYABLE: config.basicSalaryExpenseAccount,
      BONUS: config.allowanceExpenseAccount,
    };

    for (const line of settlement.lines || []) {
      const amt = round2(line.amount ?? 0);
      if (amt <= 0) continue;

      if (line.componentType === 'LOAN_RECOVERY' || line.componentType === 'NOTICE_RECOVERY' || line.componentType === 'ADJUSTMENT' || line.componentType === 'DEDUCTION') {
        const crAccount = line.componentType === 'LOAN_RECOVERY' ? config.loanRecoveryAccount : config.payrollPayableAccount;
        if (crAccount) {
          atLines.push(
            buildAtLine({
              transactionNo: nextNo++,
              transactionDate: postingDate,
              jvNumber: jv,
              ledgerId: crAccount,
              debit: 0,
              credit: amt,
              narration: line.componentName,
              payrollSettlementId: settlement.id,
            })
          );
        }
        continue;
      }

      const expenseLedger = expenseMap[line.componentType] || config.allowanceExpenseAccount;
      if (expenseLedger) {
        atLines.push(
          buildAtLine({
            transactionNo: nextNo++,
            transactionDate: postingDate,
            jvNumber: jv,
            ledgerId: expenseLedger,
            debit: amt,
            credit: 0,
            narration: line.componentName,
            payrollSettlementId: settlement.id,
          })
        );
      }
    }

    const net = round2(settlement.netSettlement);
    if (net > 0 && payableAccount) {
      atLines.push(
        buildAtLine({
          transactionNo: nextNo++,
          transactionDate: postingDate,
          jvNumber: jv,
          ledgerId: payableAccount,
          debit: 0,
          credit: net,
          narration: `Settlement payable ${settlement.settlementNumber}`,
          payrollSettlementId: settlement.id,
        })
      );
    }

    assertBalanced(atLines);

    await createCompanyAccountingEntry({
      companyId: req.companyId,
      lines: atLines,
      transaction: t,
      req,
      sourceType: 'PAYROLL_SETTLEMENT',
      sourceId: settlement.id,
      auditAction: COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_CREATED,
    });

    await settlement.update(
      {
        financePostingStatus: 'POSTED',
        financePostedAt: new Date(),
        financeTransactionNo: baseTransNo,
      },
      { transaction: t }
    );

    await appendLedgerLines({
      companyId: req.companyId,
      employeeId: settlement.employeeId,
      sourceType: 'SETTLEMENT',
      sourceId: settlement.id,
      referenceNo: jv,
      transactionDate: postingDate,
      entries: [{ credit: net, description: `Final settlement ${settlement.settlementNumber}` }],
    });

    await t.commit();
    return { settlement, transactionNo: baseTransNo };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function reverseSettlement({ req, settlementId }) {
  const t = await sequelize.transaction();
  try {
    const settlement = await loadPostingSource(PayrollFinalSettlement, settlementId, req, { transaction: t });

    if (settlement.financePostingStatus !== 'POSTED') {
      const err = new Error('Only POSTED settlements can be reversed');
      err.statusCode = 400;
      throw err;
    }

    await periodValidation.validatePostingDate(req, settlement.settlementDate);

    const existing = await AccountsTrans.findAll({
      where: { payrollSettlementId: settlement.id, ...companyWhere(req) },
      transaction: t,
    });

    let baseTransNo = await getNextTransactionNo(t);
    let nextNo = baseTransNo;
    const reversalLines = existing.map((row) => ({
      transactionNo: nextNo++,
      transactionDate: settlement.settlementDate,
      jvNumber: `${row.jvNumber || 'FS'}-REV`,
      crDr: row.crDr === 'Dr' ? 'Cr' : 'Dr',
      particular: `Reversal: ${row.particular || ''}`,
      ledgerId: row.ledgerId,
      debitAmount: parseFloat(row.creditAmount) || 0,
      creditAmount: parseFloat(row.debitAmount) || 0,
      payrollSettlementId: settlement.id,
      narration: `Reverse settlement ${settlement.id}`,
    }));

    await createCompanyAccountingEntry({
      companyId: req.companyId,
      lines: reversalLines,
      transaction: t,
      req,
      sourceType: 'PAYROLL_SETTLEMENT',
      sourceId: settlement.id,
      auditAction: COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_REVERSED,
    });

    await settlement.update({ financePostingStatus: 'REVERSED' }, { transaction: t });
    await t.commit();
    return { settlement, transactionNo: baseTransNo };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function postWpsClearing({ req, batchId }) {
  const t = await sequelize.transaction();
  try {
    const batch = await loadPostingSource(PayrollWpsBatch, batchId, req, { transaction: t });
    const config = await getActiveAccountConfig(req.companyId);

    if (!config.wpsClearingEnabled || !config.salaryClearingAccount) {
      const err = new Error('WPS clearing is not enabled or clearing account not configured');
      err.statusCode = 400;
      throw err;
    }
    if (batch.status !== 'EXPORTED') {
      const err = new Error('WPS batch must be EXPORTED');
      err.statusCode = 400;
      throw err;
    }
    if (batch.financeClearingStatus === 'POSTED') {
      const err = new Error('WPS clearing already posted');
      err.statusCode = 400;
      throw err;
    }

    const amount = round2(batch.totalAmount);
    const postingDate = batch.exportedAt ? batch.exportedAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    await periodValidation.validatePostingDate(req, postingDate);

    let baseTransNo = await getNextTransactionNo(t);
    const atLines = [
      buildAtLine({
        transactionNo: baseTransNo,
        transactionDate: postingDate,
        jvNumber: `WPS-${batch.id}`,
        ledgerId: config.payrollPayableAccount,
        debit: amount,
        credit: 0,
        narration: `WPS clearing batch ${batch.id}`,
        payrollWpsBatchId: batch.id,
      }),
      buildAtLine({
        transactionNo: baseTransNo + 1,
        transactionDate: postingDate,
        jvNumber: `WPS-${batch.id}`,
        ledgerId: config.salaryClearingAccount,
        debit: 0,
        credit: amount,
        narration: `WPS clearing batch ${batch.id}`,
        payrollWpsBatchId: batch.id,
      }),
    ];

    assertBalanced(atLines);

    await createCompanyAccountingEntry({
      companyId: req.companyId,
      lines: atLines,
      transaction: t,
      req,
      sourceType: 'PAYROLL_WPS_BATCH',
      sourceId: batch.id,
      auditAction: COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_CREATED,
    });

    await batch.update(
      { financeClearingStatus: 'POSTED', financeClearingTransactionNo: baseTransNo },
      { transaction: t }
    );

    await t.commit();
    return { batch, transactionNo: baseTransNo };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

module.exports = {
  postPayrollRun,
  reversePayrollRun,
  postSettlement,
  reverseSettlement,
  postWpsClearing,
  getActiveAccountConfig,
};
