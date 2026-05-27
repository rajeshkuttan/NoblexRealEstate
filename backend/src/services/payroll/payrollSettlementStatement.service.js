const {
  PayrollFinalSettlement,
  PayrollFinalSettlementLine,
  PayrollExport,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');
const { renderAndSavePdf } = require('./payrollDocumentRender.service');

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function buildSettlementSnapshot(settlement, lines) {
  const calc = settlement.calculationSnapshot || {};
  return {
    settlementId: settlement.id,
    settlementNumber: settlement.settlementNumber,
    settlementDate: settlement.settlementDate,
    employeeId: settlement.employeeId,
    frozenSnapshot: calc,
    lines: (lines || []).map((l) => ({
      componentType: l.componentType,
      componentName: l.componentName,
      amount: round2(l.amount),
    })),
    totalEarnings: round2(settlement.totalEarnings),
    totalDeductions: round2(settlement.totalDeductions),
    netSettlement: round2(settlement.netSettlement),
  };
}

async function generateSettlementStatement({ req, settlementId }) {
  const settlement = await PayrollFinalSettlement.findOne({
    where: { id: settlementId, ...companyWhere(req) },
    include: [{ model: PayrollFinalSettlementLine, as: 'lines' }],
  });
  if (!settlement) {
    const err = new Error('Settlement not found');
    err.statusCode = 404;
    throw err;
  }
  if (settlement.status !== 'LOCKED') {
    const err = new Error('Settlement must be LOCKED');
    err.statusCode = 400;
    throw err;
  }

  const snapshot = buildSettlementSnapshot(settlement, settlement.lines);
  const fileName = `FS-${settlement.id}-${Date.now()}.pdf`;
  const lineRows = snapshot.lines.map((l) => [l.componentName, l.componentType, String(l.amount)]);

  const { relativePath: filePath } = await renderAndSavePdf({
    companyId: req.companyId,
    documentType: 'FINAL_SETTLEMENT',
    fileName,
    title: `Final Settlement ${settlement.settlementNumber}`,
    sections: {
      blocks: [
        {
          heading: 'Settlement summary',
          lines: [
            `Settlement #: ${settlement.settlementNumber}`,
            `Date: ${settlement.settlementDate}`,
            `Employee ID: ${settlement.employeeId}`,
          ],
        },
        {
          heading: 'Components',
          table: {
            headers: ['Name', 'Type', 'Amount'],
            rows: lineRows,
          },
        },
      ],
      summary: [
        `Total earnings: ${snapshot.totalEarnings}`,
        `Total deductions: ${snapshot.totalDeductions}`,
        `Net settlement: ${snapshot.netSettlement}`,
      ],
    },
  });

  const exp = await PayrollExport.create({
    companyId: req.companyId,
    exportType: 'SETTLEMENT_STATEMENT',
    format: 'pdf',
    filePath,
    parameters: { settlement_id: settlement.id, snapshot },
    generatedBy: req.user?.id,
    generatedAt: new Date(),
  });

  return { export: exp, snapshot };
}

module.exports = { buildSettlementSnapshot, generateSettlementStatement };
