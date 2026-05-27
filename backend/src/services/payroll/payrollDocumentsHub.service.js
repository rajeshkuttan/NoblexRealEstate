const { Op } = require('sequelize');
const { PayrollPayslip, PayrollExport, PayrollFinalSettlement } = require('../../models');

async function getDashboard(companyId) {
  const generatedPayslips = await PayrollPayslip.count({
    where: { companyId, status: { [Op.in]: ['GENERATED', 'PUBLISHED'] } },
  });
  const pendingPublication = await PayrollPayslip.count({
    where: { companyId, status: 'GENERATED' },
  });
  const settlementDocs = await PayrollExport.count({
    where: { companyId, exportType: 'SETTLEMENT_STATEMENT' },
  });
  const certificates = await PayrollExport.count({
    where: { companyId, exportType: { [Op.like]: 'CERT_%' } },
  });
  const exportsGenerated = await PayrollExport.count({ where: { companyId } });
  const lockedSettlements = await PayrollFinalSettlement.count({
    where: { companyId, status: 'LOCKED' },
  });

  return {
    generated_payslips: generatedPayslips,
    pending_publication: pendingPublication,
    settlement_documents: settlementDocs,
    salary_certificates: certificates,
    exports_generated: exportsGenerated,
    locked_settlements: lockedSettlements,
  };
}

async function payrollHistory(companyId, employeeId) {
  const payslips = await PayrollPayslip.findAll({
    where: { companyId, ...(employeeId ? { employeeId } : {}) },
    order: [['id', 'DESC']],
    limit: 50,
  });
  return payslips.map((p) => ({
    payslip_number: p.payslipNumber,
    period_id: p.payrollPeriodId,
    net: Number(p.netSalary),
    status: p.status,
    generated_at: p.generatedAt,
  }));
}

async function payrollTrend(companyId) {
  const rows = await PayrollPayslip.findAll({
    where: { companyId, status: { [Op.in]: ['GENERATED', 'PUBLISHED'] } },
    attributes: ['payrollPeriodId', 'netSalary', 'grossSalary'],
    limit: 500,
  });
  const byPeriod = {};
  for (const r of rows) {
    const key = r.payrollPeriodId || 'unknown';
    if (!byPeriod[key]) byPeriod[key] = { gross: 0, net: 0, count: 0 };
    byPeriod[key].gross += Number(r.grossSalary);
    byPeriod[key].net += Number(r.netSalary);
    byPeriod[key].count += 1;
  }
  return Object.entries(byPeriod).map(([periodId, v]) => ({ period_id: periodId, ...v }));
}

async function payrollCostSummary(companyId) {
  const rows = await PayrollPayslip.findAll({
    where: { companyId, status: { [Op.in]: ['GENERATED', 'PUBLISHED'] } },
    attributes: ['grossSalary', 'deductions', 'netSalary'],
  });
  return {
    total_gross: rows.reduce((s, r) => s + Number(r.grossSalary), 0),
    total_deductions: rows.reduce((s, r) => s + Number(r.deductions), 0),
    total_net: rows.reduce((s, r) => s + Number(r.netSalary), 0),
    payslip_count: rows.length,
  };
}

module.exports = {
  getDashboard,
  payrollHistory,
  payrollTrend,
  payrollCostSummary,
};
