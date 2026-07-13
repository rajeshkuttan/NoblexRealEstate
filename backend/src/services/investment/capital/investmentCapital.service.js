'use strict';

const {
  sequelize,
  InvestmentInvestor,
  InvestmentCommitment,
  InvestmentCapitalCall,
  InvestmentCapitalCallLine,
  InvestmentCapitalAccount,
  InvestmentOwnershipHistory,
  InvestmentDistributionRun,
  InvestmentDistributionRunLine,
  InvestmentPortfolio,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const {
  computeCapitalAccountClosing,
  reconcileCapitalAccounts,
  ownershipAsOf,
  dayBefore,
  runWaterfall,
  allocateCapitalCall,
  canTransitionDistribution,
  canTransitionCapitalCall,
  partnerStatement,
  round2,
} = require('./capitalEngine.service');
const { Op } = require('sequelize');

async function nextCode(Model, companyId, prefix, field) {
  const count = await Model.count({ where: { companyId } });
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
}

// ——— Investors ———
async function listInvestors(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.investorType) where.investorType = req.query.investorType;
  if (req.query.search) {
    where[Op.or] = [
      { investorCode: { [Op.like]: `%${req.query.search}%` } },
      { legalName: { [Op.like]: `%${req.query.search}%` } },
      { displayName: { [Op.like]: `%${req.query.search}%` } },
    ];
  }
  const { count, rows } = await InvestmentInvestor.findAndCountAll({
    where,
    order: [['legalName', 'ASC']],
    limit,
    offset,
  });
  return { investors: rows, pagination: paginationMeta(count, page, limit) };
}

async function getInvestor360(req, id) {
  const investor = await InvestmentInvestor.findOne({
    where: { id, ...companyWhere(req) },
    include: [
      { model: InvestmentCommitment, as: 'commitments', include: [{ model: InvestmentPortfolio, as: 'portfolio' }] },
      { model: InvestmentCapitalAccount, as: 'capitalAccounts' },
      { model: InvestmentOwnershipHistory, as: 'ownershipHistory' },
    ],
  });
  if (!investor) {
    const err = new Error('Investor not found');
    err.statusCode = 404;
    throw err;
  }
  const asOf = req.query.asOf || new Date().toISOString().slice(0, 10);
  const currentOwnership = ownershipAsOf(investor.ownershipHistory || [], asOf);
  return { investor, currentOwnership, asOf };
}

async function createInvestor(req, data) {
  if (!data.legalName) {
    const err = new Error('legalName is required');
    err.statusCode = 400;
    throw err;
  }
  return InvestmentInvestor.create(
    withCompanyId(req, {
      investorCode: data.investorCode || (await nextCode(InvestmentInvestor, req.companyId, 'INVSTR')),
      legalName: data.legalName,
      displayName: data.displayName || data.legalName,
      investorType: data.investorType || 'PARTNER',
      personOrEntity: data.personOrEntity || 'ENTITY',
      nationality: data.nationality || null,
      jurisdiction: data.jurisdiction || null,
      email: data.email || null,
      phone: data.phone || null,
      preferredCurrency: data.preferredCurrency || 'AED',
      bankAccountId: data.bankAccountId || null,
      taxIdentifier: data.taxIdentifier || null,
      kycStatus: data.kycStatus || 'PENDING',
      amlRiskRating: data.amlRiskRating || 'MEDIUM',
      uboStatus: data.uboStatus || null,
      sourceOfFundsStatus: data.sourceOfFundsStatus || null,
      relatedPartyFlag: !!data.relatedPartyFlag,
      onboardingStatus: data.onboardingStatus || 'DRAFT',
      reinvestmentPreference: data.reinvestmentPreference || null,
      distributionMethod: data.distributionMethod || 'BANK_TRANSFER',
      status: data.status || 'ACTIVE',
      remarks: data.remarks || null,
      isTestData: !!data.isTestData,
    })
  );
}

async function updateInvestor(req, id, data) {
  const investor = await InvestmentInvestor.findOne({ where: { id, ...companyWhere(req) } });
  if (!investor) {
    const err = new Error('Investor not found');
    err.statusCode = 404;
    throw err;
  }
  const fields = [
    'legalName', 'displayName', 'investorType', 'personOrEntity', 'nationality', 'jurisdiction',
    'email', 'phone', 'preferredCurrency', 'bankAccountId', 'taxIdentifier', 'kycStatus',
    'amlRiskRating', 'uboStatus', 'sourceOfFundsStatus', 'relatedPartyFlag', 'onboardingStatus',
    'reinvestmentPreference', 'distributionMethod', 'status', 'remarks',
  ];
  for (const f of fields) {
    if (data[f] !== undefined) investor[f] = data[f];
  }
  await investor.save();
  return getInvestor360(req, id);
}

// ——— Commitments ———
async function listCommitments(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.investorId) where.investorId = Number(req.query.investorId);
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.status) where.status = req.query.status;
  const { count, rows } = await InvestmentCommitment.findAndCountAll({
    where,
    include: [
      { model: InvestmentInvestor, as: 'investor', attributes: ['id', 'investorCode', 'legalName'] },
      { model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] },
    ],
    order: [['commitmentDate', 'DESC']],
    limit,
    offset,
  });
  return { commitments: rows, pagination: paginationMeta(count, page, limit) };
}

async function createCommitment(req, data) {
  if (!data.investorId || !data.portfolioId || !(Number(data.commitmentAmount) > 0)) {
    const err = new Error('investorId, portfolioId, and positive commitmentAmount required');
    err.statusCode = 400;
    throw err;
  }
  const amount = round2(Number(data.commitmentAmount));
  return InvestmentCommitment.create(
    withCompanyId(req, {
      investorId: data.investorId,
      portfolioId: data.portfolioId,
      commitmentNumber: data.commitmentNumber || (await nextCode(InvestmentCommitment, req.companyId, 'CMT')),
      commitmentAmount: amount,
      currencyCode: data.currencyCode || 'AED',
      commitmentDate: data.commitmentDate || new Date().toISOString().slice(0, 10),
      expiryDate: data.expiryDate || null,
      fundedAmount: 0,
      unfundedAmount: amount,
      status: data.status || 'ACTIVE',
      remarks: data.remarks || null,
      isTestData: !!data.isTestData,
    })
  );
}

// ——— Capital calls ———
async function listCapitalCalls(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.status) where.status = req.query.status;
  const { count, rows } = await InvestmentCapitalCall.findAndCountAll({
    where,
    include: [{ model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] }],
    order: [['callDate', 'DESC']],
    limit,
    offset,
  });
  return { capitalCalls: rows, pagination: paginationMeta(count, page, limit) };
}

async function getCapitalCall(req, id) {
  const call = await InvestmentCapitalCall.findOne({
    where: { id, ...companyWhere(req) },
    include: [
      { model: InvestmentPortfolio, as: 'portfolio' },
      {
        model: InvestmentCapitalCallLine,
        as: 'lines',
        include: [{ model: InvestmentInvestor, as: 'investor', attributes: ['id', 'investorCode', 'legalName'] }],
      },
    ],
  });
  if (!call) {
    const err = new Error('Capital call not found');
    err.statusCode = 404;
    throw err;
  }
  return call;
}

async function createCapitalCall(req, data) {
  if (!data.portfolioId || !(Number(data.totalAmount) > 0)) {
    const err = new Error('portfolioId and positive totalAmount required');
    err.statusCode = 400;
    throw err;
  }
  return sequelize.transaction(async (transaction) => {
    const call = await InvestmentCapitalCall.create(
      withCompanyId(req, {
        portfolioId: data.portfolioId,
        callNumber: data.callNumber || (await nextCode(InvestmentCapitalCall, req.companyId, 'CALL')),
        callDate: data.callDate || new Date().toISOString().slice(0, 10),
        dueDate: data.dueDate || null,
        totalAmount: round2(Number(data.totalAmount)),
        purpose: data.purpose || null,
        status: 'DRAFT',
        remarks: data.remarks || null,
        isTestData: !!data.isTestData,
      }),
      { transaction }
    );

    const commitments = await InvestmentCommitment.findAll({
      where: {
        portfolioId: data.portfolioId,
        status: 'ACTIVE',
        ...companyWhere(req),
        unfundedAmount: { [Op.gt]: 0 },
      },
      transaction,
    });
    const lines = allocateCapitalCall(call.totalAmount, commitments);
    for (const line of lines) {
      await InvestmentCapitalCallLine.create(
        withCompanyId(req, {
          capitalCallId: call.id,
          investorId: line.investorId,
          commitmentId: line.commitmentId,
          calledAmount: line.calledAmount,
          receivedAmount: 0,
          outstandingAmount: line.calledAmount,
          status: 'PENDING',
        }),
        { transaction }
      );
    }
    return getCapitalCall(req, call.id);
  });
}

async function issueCapitalCall(req, id) {
  const call = await InvestmentCapitalCall.findOne({ where: { id, ...companyWhere(req) } });
  if (!call) {
    const err = new Error('Capital call not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionCapitalCall(call.status, 'ISSUED')) {
    const err = new Error(`Cannot issue from ${call.status}`);
    err.statusCode = 400;
    throw err;
  }
  call.status = 'ISSUED';
  await call.save();
  return getCapitalCall(req, id);
}

async function receiveCapitalCallLine(req, lineId, data = {}) {
  return sequelize.transaction(async (transaction) => {
    const line = await InvestmentCapitalCallLine.findOne({
      where: { id: lineId, ...companyWhere(req) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!line) {
      const err = new Error('Capital call line not found');
      err.statusCode = 404;
      throw err;
    }
    const receive = round2(Number(data.amount != null ? data.amount : line.outstandingAmount));
    if (receive <= 0 || receive > Number(line.outstandingAmount) + 0.01) {
      const err = new Error('Invalid receive amount');
      err.statusCode = 400;
      throw err;
    }
    line.receivedAmount = round2(Number(line.receivedAmount) + receive);
    line.outstandingAmount = round2(Number(line.calledAmount) - Number(line.receivedAmount));
    line.status = line.outstandingAmount <= 0.01 ? 'RECEIVED' : 'PARTIAL';
    await line.save({ transaction });

    if (line.commitmentId) {
      const cmt = await InvestmentCommitment.findOne({
        where: { id: line.commitmentId, ...companyWhere(req) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (cmt) {
        cmt.fundedAmount = round2(Number(cmt.fundedAmount) + receive);
        cmt.unfundedAmount = round2(Number(cmt.commitmentAmount) - Number(cmt.fundedAmount));
        if (cmt.unfundedAmount <= 0.01) cmt.status = 'FULLY_FUNDED';
        await cmt.save({ transaction });
      }
    }

    // Update capital account contributions
    const period = data.period || new Date().toISOString().slice(0, 7);
    let acct = await InvestmentCapitalAccount.findOne({
      where: {
        investorId: line.investorId,
        portfolioId: (await InvestmentCapitalCall.findByPk(line.capitalCallId, { transaction })).portfolioId,
        period,
        ...companyWhere(req),
      },
      transaction,
    });
    const call = await InvestmentCapitalCall.findByPk(line.capitalCallId, { transaction });
    if (!acct) {
      acct = await InvestmentCapitalAccount.create(
        withCompanyId(req, {
          investorId: line.investorId,
          portfolioId: call.portfolioId,
          period,
          openingBalance: 0,
          contributions: receive,
          allocatedIncome: 0,
          allocatedGain: 0,
          allocatedLoss: 0,
          distributions: 0,
          returnOfCapital: 0,
          closingBalance: receive,
        }),
        { transaction }
      );
    } else {
      acct.contributions = round2(Number(acct.contributions) + receive);
      acct.closingBalance = computeCapitalAccountClosing(acct);
      await acct.save({ transaction });
    }

    const allLines = await InvestmentCapitalCallLine.findAll({
      where: { capitalCallId: line.capitalCallId, ...companyWhere(req) },
      transaction,
    });
    const allReceived = allLines.every((l) => l.status === 'RECEIVED');
    const anyReceived = allLines.some((l) => Number(l.receivedAmount) > 0);
    if (allReceived) call.status = 'FUNDED';
    else if (anyReceived && canTransitionCapitalCall(call.status, 'PARTIALLY_FUNDED')) {
      call.status = 'PARTIALLY_FUNDED';
    } else if (anyReceived && call.status === 'ISSUED') {
      call.status = 'PARTIALLY_FUNDED';
    }
    await call.save({ transaction });
    return getCapitalCall(req, line.capitalCallId);
  });
}

// ——— Ownership (effective-dated, never overwrite) ———
async function setOwnership(req, data) {
  if (!data.portfolioId || !data.investorId || data.ownershipPercentage == null || !data.effectiveFrom) {
    const err = new Error('portfolioId, investorId, ownershipPercentage, effectiveFrom required');
    err.statusCode = 400;
    throw err;
  }
  return sequelize.transaction(async (transaction) => {
    const prior = await InvestmentOwnershipHistory.findAll({
      where: {
        portfolioId: data.portfolioId,
        investorId: data.investorId,
        status: 'ACTIVE',
        ...companyWhere(req),
        ...(data.instrumentId ? { instrumentId: data.instrumentId } : { instrumentId: null }),
      },
      transaction,
    });
    for (const p of prior) {
      p.effectiveTo = dayBefore(data.effectiveFrom);
      p.status = 'SUPERSEDED';
      await p.save({ transaction });
    }
    const pct = Number(data.ownershipPercentage);
    return InvestmentOwnershipHistory.create(
      withCompanyId(req, {
        portfolioId: data.portfolioId,
        instrumentId: data.instrumentId || null,
        investorId: data.investorId,
        ownershipPercentage: pct,
        profitSharePercentage: data.profitSharePercentage != null ? data.profitSharePercentage : pct,
        lossSharePercentage: data.lossSharePercentage != null ? data.lossSharePercentage : pct,
        dividendSharePercentage: data.dividendSharePercentage != null ? data.dividendSharePercentage : pct,
        votingPercentage: data.votingPercentage != null ? data.votingPercentage : pct,
        beneficialPercentage: data.beneficialPercentage != null ? data.beneficialPercentage : pct,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: null,
        status: 'ACTIVE',
        approvedBy: req.user?.id || null,
        remarks: data.remarks || null,
        isTestData: !!data.isTestData,
      }),
      { transaction }
    );
  });
}

async function listOwnership(req) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.investorId) where.investorId = Number(req.query.investorId);
  if (req.query.status) where.status = req.query.status;
  const rows = await InvestmentOwnershipHistory.findAll({
    where,
    include: [{ model: InvestmentInvestor, as: 'investor', attributes: ['id', 'investorCode', 'legalName'] }],
    order: [['effectiveFrom', 'DESC'], ['id', 'DESC']],
  });
  const asOf = req.query.asOf;
  if (asOf) {
    return { ownership: ownershipAsOf(rows, asOf), asOf, history: rows };
  }
  return { ownership: rows };
}

// ——— Capital accounts ———
async function listCapitalAccounts(req) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.investorId) where.investorId = Number(req.query.investorId);
  if (req.query.period) where.period = req.query.period;
  const rows = await InvestmentCapitalAccount.findAll({
    where,
    include: [{ model: InvestmentInvestor, as: 'investor', attributes: ['id', 'investorCode', 'legalName'] }],
    order: [['period', 'DESC']],
  });
  return { capitalAccounts: rows, reconciliation: reconcileCapitalAccounts(rows) };
}

async function upsertCapitalAccount(req, data) {
  const period = data.period || new Date().toISOString().slice(0, 7);
  let acct = await InvestmentCapitalAccount.findOne({
    where: {
      investorId: data.investorId,
      portfolioId: data.portfolioId,
      period,
      ...companyWhere(req),
    },
  });
  const payload = {
    openingBalance: Number(data.openingBalance || 0),
    contributions: Number(data.contributions || 0),
    allocatedIncome: Number(data.allocatedIncome || 0),
    allocatedGain: Number(data.allocatedGain || 0),
    allocatedLoss: Number(data.allocatedLoss || 0),
    distributions: Number(data.distributions || 0),
    returnOfCapital: Number(data.returnOfCapital || 0),
  };
  payload.closingBalance = computeCapitalAccountClosing(payload);
  if (!acct) {
    acct = await InvestmentCapitalAccount.create(
      withCompanyId(req, {
        investorId: data.investorId,
        portfolioId: data.portfolioId,
        period,
        ...payload,
        isTestData: !!data.isTestData,
      })
    );
  } else {
    Object.assign(acct, payload);
    await acct.save();
  }
  return acct;
}

// ——— Distribution runs ———
async function listDistributionRuns(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.status) where.status = req.query.status;
  const { count, rows } = await InvestmentDistributionRun.findAndCountAll({
    where,
    include: [{ model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] }],
    order: [['id', 'DESC']],
    limit,
    offset,
  });
  return { distributionRuns: rows, pagination: paginationMeta(count, page, limit) };
}

async function getDistributionRun(req, id) {
  const run = await InvestmentDistributionRun.findOne({
    where: { id, ...companyWhere(req) },
    include: [
      { model: InvestmentPortfolio, as: 'portfolio' },
      {
        model: InvestmentDistributionRunLine,
        as: 'lines',
        include: [{ model: InvestmentInvestor, as: 'investor', attributes: ['id', 'investorCode', 'legalName'] }],
      },
    ],
  });
  if (!run) {
    const err = new Error('Distribution run not found');
    err.statusCode = 404;
    throw err;
  }
  return run;
}

async function createDistributionRun(req, data) {
  if (!data.portfolioId) {
    const err = new Error('portfolioId required');
    err.statusCode = 400;
    throw err;
  }
  const gross = round2(Number(data.grossDistributableAmount || 0));
  const expenses = round2(Number(data.expensesDeducted || 0));
  const reserve = round2(Number(data.reserveRetained || 0));
  const net = round2(gross - expenses - reserve);
  return InvestmentDistributionRun.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId,
      distributionNumber: data.distributionNumber || (await nextCode(InvestmentDistributionRun, req.companyId, 'DRUN')),
      periodStart: data.periodStart || null,
      periodEnd: data.periodEnd || null,
      distributionType: data.distributionType || 'PRO_RATA',
      grossDistributableAmount: gross,
      expensesDeducted: expenses,
      reserveRetained: reserve,
      preferredReturn: 0,
      carriedInterest: 0,
      withholdingTax: 0,
      netDistributableAmount: net,
      waterfallConfig: data.waterfallConfig ? JSON.stringify(data.waterfallConfig) : null,
      status: 'DRAFT',
      remarks: data.remarks || null,
      isTestData: !!data.isTestData,
    })
  );
}

async function calculateDistributionRun(req, id, data = {}) {
  return sequelize.transaction(async (transaction) => {
    const run = await InvestmentDistributionRun.findOne({
      where: { id, ...companyWhere(req) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!run) {
      const err = new Error('Distribution run not found');
      err.statusCode = 404;
      throw err;
    }
    if (!canTransitionDistribution(run.status, 'CALCULATED') && run.status !== 'CALCULATED') {
      const err = new Error(`Cannot calculate from ${run.status}`);
      err.statusCode = 400;
      throw err;
    }

    const asOf = data.asOf || run.periodEnd || new Date().toISOString().slice(0, 10);
    const history = await InvestmentOwnershipHistory.findAll({
      where: { portfolioId: run.portfolioId, ...companyWhere(req) },
      transaction,
    });
    const owners = ownershipAsOf(history, asOf).map((h) => ({
      investorId: h.investorId,
      ownershipPercentage: Number(h.ownershipPercentage),
    }));
    if (!owners.length) {
      const err = new Error('No active ownership for portfolio as of ' + asOf);
      err.statusCode = 400;
      throw err;
    }

    let config = {};
    try {
      config = run.waterfallConfig ? JSON.parse(run.waterfallConfig) : {};
    } catch {
      config = {};
    }
    Object.assign(config, data.waterfallConfig || {});

    const result = runWaterfall({
      mode: run.distributionType || config.mode || 'PRO_RATA',
      distributable: Number(run.netDistributableAmount),
      lps: owners.filter((o) => !config.gpInvestorId || Number(o.investorId) !== Number(config.gpInvestorId)),
      preferredPool: data.preferredPool != null ? data.preferredPool : config.preferredPool,
      preferredRate: config.preferredRate || 0,
      carryPercent: config.carryPercent != null ? config.carryPercent : 20,
      gpInvestorId: config.gpInvestorId || null,
      withholdingRate: config.withholdingRate || 0,
    });

    // If GP not in owners but needed, still ok — waterfall adds GP row
    await InvestmentDistributionRunLine.destroy({
      where: { distributionRunId: run.id, ...companyWhere(req) },
      transaction,
    });

    for (const line of result.lines) {
      await InvestmentDistributionRunLine.create(
        withCompanyId(req, {
          distributionRunId: run.id,
          investorId: line.investorId,
          ownershipPercentage: line.ownershipPercentage || 0,
          preferredAmount: line.preferredAmount || 0,
          catchUpAmount: line.catchUpAmount || 0,
          residualAmount: line.residualAmount || 0,
          carriedInterestAmount: line.carriedInterestAmount || 0,
          withholdingTax: line.withholdingTax || 0,
          grossAmount: line.grossAmount || 0,
          netAmount: line.netAmount || 0,
          tierBreakdown: JSON.stringify(line.tierBreakdown || []),
        }),
        { transaction }
      );
    }

    run.preferredReturn = result.summary.preferredPaid || 0;
    run.carriedInterest = result.summary.carryPaid || 0;
    run.withholdingTax = result.summary.totalWht || 0;
    run.status = 'CALCULATED';
    await run.save({ transaction });
    return getDistributionRun(req, id);
  });
}

async function transitionDistributionRun(req, id, toStatus) {
  const run = await InvestmentDistributionRun.findOne({ where: { id, ...companyWhere(req) } });
  if (!run) {
    const err = new Error('Distribution run not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionDistribution(run.status, toStatus)) {
    const err = new Error(`Cannot transition from ${run.status} to ${toStatus}`);
    err.statusCode = 400;
    throw err;
  }
  run.status = toStatus;
  if (toStatus === 'APPROVED') run.approvalStatus = 'APPROVED';
  if (toStatus === 'PAID') run.paymentStatus = 'PAID';
  if (toStatus === 'PAID' || toStatus === 'RECONCILED') {
    // Post distributions to capital accounts
    const lines = await InvestmentDistributionRunLine.findAll({
      where: { distributionRunId: run.id, ...companyWhere(req) },
    });
    const period = (run.periodEnd || new Date().toISOString().slice(0, 10)).slice(0, 7);
    for (const line of lines) {
      let acct = await InvestmentCapitalAccount.findOne({
        where: {
          investorId: line.investorId,
          portfolioId: run.portfolioId,
          period,
          ...companyWhere(req),
        },
      });
      if (!acct) {
        acct = await InvestmentCapitalAccount.create(
          withCompanyId(req, {
            investorId: line.investorId,
            portfolioId: run.portfolioId,
            period,
            openingBalance: 0,
            contributions: 0,
            allocatedIncome: 0,
            allocatedGain: 0,
            allocatedLoss: 0,
            distributions: Number(line.netAmount),
            returnOfCapital: 0,
            closingBalance: round2(-Number(line.netAmount)),
          })
        );
      } else {
        acct.distributions = round2(Number(acct.distributions) + Number(line.netAmount));
        acct.closingBalance = computeCapitalAccountClosing(acct);
        await acct.save();
      }
    }
  }
  await run.save();
  return getDistributionRun(req, id);
}

async function getPartnerStatement(req, investorId, query = {}) {
  const investor = await InvestmentInvestor.findOne({ where: { id: investorId, ...companyWhere(req) } });
  if (!investor) {
    const err = new Error('Investor not found');
    err.statusCode = 404;
    throw err;
  }
  const period = query.period || new Date().toISOString().slice(0, 7);
  const portfolioId = query.portfolioId ? Number(query.portfolioId) : null;
  const acctWhere = { investorId, period, ...companyWhere(req) };
  if (portfolioId) acctWhere.portfolioId = portfolioId;
  const capitalAccount = await InvestmentCapitalAccount.findOne({ where: acctWhere });
  const ownWhere = { investorId, ...companyWhere(req), status: 'ACTIVE' };
  if (portfolioId) ownWhere.portfolioId = portfolioId;
  const ownership = await InvestmentOwnershipHistory.findOne({
    where: ownWhere,
    order: [['effectiveFrom', 'DESC']],
  });
  const lineWhere = { investorId, ...companyWhere(req) };
  const distributions = await InvestmentDistributionRunLine.findAll({
    where: lineWhere,
    include: [{ model: InvestmentDistributionRun, as: 'distributionRun' }],
    limit: 50,
    order: [['id', 'DESC']],
  });
  return partnerStatement({
    investor,
    capitalAccount,
    ownership,
    distributions,
  });
}

module.exports = {
  listInvestors,
  getInvestor360,
  createInvestor,
  updateInvestor,
  listCommitments,
  createCommitment,
  listCapitalCalls,
  getCapitalCall,
  createCapitalCall,
  issueCapitalCall,
  receiveCapitalCallLine,
  setOwnership,
  listOwnership,
  listCapitalAccounts,
  upsertCapitalAccount,
  listDistributionRuns,
  getDistributionRun,
  createDistributionRun,
  calculateDistributionRun,
  transitionDistributionRun,
  getPartnerStatement,
};
