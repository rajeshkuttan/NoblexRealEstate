'use strict';

const {
  sequelize,
  InvestmentReconciliationBatch,
  InvestmentReconciliationLine,
  InvestmentClosePeriod,
  InvestmentPortfolio,
  InvestmentTrade,
  InvestmentSettlement,
  InvestmentIncomeEvent,
  InvestmentValuationBatch,
  InvestmentHoldingV2,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const {
  runMatchingEngine,
  summarizeMatchLines,
  manualMatch,
  manyToOneMatch,
  oneToManyMatch,
  buildChecklist,
  checklistReady,
  canClosePeriod,
  isPeriodLocked,
  assertPeriodOpen,
  canTransitionReconBatch,
  canTransitionClose,
  round2,
} = require('./reconEngine.service');
const { Op } = require('sequelize');

async function nextBatchNumber(companyId) {
  const count = await InvestmentReconciliationBatch.count({ where: { companyId } });
  return `RECON-${String(count + 1).padStart(6, '0')}`;
}

async function listReconBatches(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.reconciliationType) where.reconciliationType = req.query.reconciliationType;
  if (req.query.status) where.status = req.query.status;
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  const { count, rows } = await InvestmentReconciliationBatch.findAndCountAll({
    where,
    include: [{ model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] }],
    order: [['statementDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
  return { batches: rows, pagination: paginationMeta(count, page, limit) };
}

async function getReconBatch(req, id) {
  const batch = await InvestmentReconciliationBatch.findOne({
    where: { id, ...companyWhere(req) },
    include: [
      { model: InvestmentPortfolio, as: 'portfolio' },
      { model: InvestmentReconciliationLine, as: 'lines' },
    ],
  });
  if (!batch) {
    const err = new Error('Reconciliation batch not found');
    err.statusCode = 404;
    throw err;
  }
  return batch;
}

async function createReconBatch(req, data) {
  if (!data.reconciliationType || !data.statementDate) {
    const err = new Error('reconciliationType and statementDate required');
    err.statusCode = 400;
    throw err;
  }
  return InvestmentReconciliationBatch.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId || null,
      batchNumber: data.batchNumber || (await nextBatchNumber(req.companyId)),
      reconciliationType: data.reconciliationType,
      sourceFileId: data.sourceFileId || null,
      statementDate: data.statementDate,
      status: 'DRAFT',
      amountTolerance: data.amountTolerance != null ? data.amountTolerance : 0.01,
      quantityTolerance: data.quantityTolerance != null ? data.quantityTolerance : 0.000001,
      dateToleranceDays: data.dateToleranceDays != null ? data.dateToleranceDays : 0,
      remarks: data.remarks || null,
      isTestData: !!data.isTestData,
    })
  );
}

/**
 * Import statement rows + optional internal rows, then optionally run match.
 */
async function importReconRows(req, batchId, data = {}) {
  const batch = await InvestmentReconciliationBatch.findOne({
    where: { id: batchId, ...companyWhere(req) },
  });
  if (!batch) {
    const err = new Error('Reconciliation batch not found');
    err.statusCode = 404;
    throw err;
  }

  const sourceRows = data.sourceRows || data.rows || [];
  const internalRows = data.internalRows || [];

  // Persist as unmatched lines first (source side)
  await sequelize.transaction(async (transaction) => {
    await InvestmentReconciliationLine.destroy({
      where: { batchId, ...companyWhere(req) },
      transaction,
    });

    if (data.runMatch !== false && (sourceRows.length || internalRows.length)) {
      const result = runMatchingEngine(sourceRows, internalRows.length ? internalRows : sourceRows.map((s) => ({
        // if no internals provided, treat as unmatched sources only
        internalReference: null,
        expectedAmount: null,
        expectedQuantity: null,
      })), {
        amountTolerance: Number(batch.amountTolerance),
        quantityTolerance: Number(batch.quantityTolerance),
        dateToleranceDays: Number(batch.dateToleranceDays),
      });

      // If no real internals, force unmatched for sources
      const lines =
        internalRows.length > 0
          ? result.lines
          : sourceRows.map((s) => ({
              sourceReference: s.sourceReference || s.reference,
              internalReference: null,
              instrumentId: s.instrumentId || null,
              lineDate: s.lineDate || s.date || batch.statementDate,
              expectedAmount: null,
              actualAmount: s.actualAmount ?? s.amount ?? null,
              expectedQuantity: null,
              actualQuantity: s.actualQuantity ?? s.quantity ?? null,
              differenceAmount: round2(Number(s.actualAmount ?? s.amount ?? 0)),
              differenceQuantity: Number(s.actualQuantity ?? s.quantity ?? 0),
              matchStatus: 'UNMATCHED',
              matchMethod: null,
            }));

      for (const line of lines) {
        await InvestmentReconciliationLine.create(
          withCompanyId(req, {
            batchId,
            sourceReference: line.sourceReference || null,
            internalReference: line.internalReference || null,
            instrumentId: line.instrumentId || null,
            lineDate: line.lineDate || batch.statementDate,
            expectedAmount: line.expectedAmount,
            actualAmount: line.actualAmount,
            expectedQuantity: line.expectedQuantity,
            actualQuantity: line.actualQuantity,
            differenceAmount: line.differenceAmount || 0,
            differenceQuantity: line.differenceQuantity || 0,
            matchStatus: line.matchStatus || 'UNMATCHED',
            matchMethod: line.matchMethod || null,
            exceptionReason:
              line.matchStatus === 'EXCEPTION' || line.matchStatus === 'PARTIAL'
                ? (line.reasons || []).join(',')
                : null,
            resolutionStatus: 'OPEN',
          }),
          { transaction }
        );
      }

      const summary = summarizeMatchLines(lines);
      batch.totalRecords = summary.totalRecords;
      batch.matchedRecords = summary.matchedRecords;
      batch.exceptionRecords = summary.exceptionRecords;
      batch.unmatchedRecords = summary.unmatchedRecords;
      batch.status =
        summary.unmatchedRecords > 0 || summary.exceptionRecords > 0
          ? internalRows.length
            ? 'EXCEPTION'
            : 'IMPORTED'
          : 'MATCHED';
      if (internalRows.length && summary.matchedRecords === summary.totalRecords) batch.status = 'MATCHED';
      else if (internalRows.length) batch.status = summary.exceptionRecords || summary.unmatchedRecords ? 'EXCEPTION' : 'MATCHED';
      else batch.status = 'IMPORTED';
    } else {
      for (const s of sourceRows) {
        await InvestmentReconciliationLine.create(
          withCompanyId(req, {
            batchId,
            sourceReference: s.sourceReference || s.reference || null,
            internalReference: null,
            instrumentId: s.instrumentId || null,
            lineDate: s.lineDate || s.date || batch.statementDate,
            expectedAmount: null,
            actualAmount: s.actualAmount ?? s.amount ?? null,
            expectedQuantity: null,
            actualQuantity: s.actualQuantity ?? s.quantity ?? null,
            differenceAmount: 0,
            differenceQuantity: 0,
            matchStatus: 'UNMATCHED',
            resolutionStatus: 'OPEN',
          }),
          { transaction }
        );
      }
      batch.totalRecords = sourceRows.length;
      batch.matchedRecords = 0;
      batch.exceptionRecords = 0;
      batch.unmatchedRecords = sourceRows.length;
      batch.status = 'IMPORTED';
    }
    batch.sourceFileId = data.sourceFileId || batch.sourceFileId;
    await batch.save({ transaction });
  });

  return getReconBatch(req, batchId);
}

async function runMatch(req, batchId, data = {}) {
  const batch = await getReconBatch(req, batchId);
  const sourceRows = data.sourceRows || (batch.lines || [])
    .filter((l) => l.actualAmount != null || l.sourceReference)
    .map((l) => ({
      sourceReference: l.sourceReference,
      instrumentId: l.instrumentId,
      actualAmount: l.actualAmount,
      actualQuantity: l.actualQuantity,
      lineDate: l.lineDate,
    }));
  const internalRows = data.internalRows || [];
  if (!internalRows.length) {
    // Auto-build internals from system for type
    const built = await buildInternalRows(req, batch);
    internalRows.push(...built);
  }

  return importReconRows(req, batchId, {
    sourceRows: sourceRows.length ? sourceRows : data.sourceRows || [],
    internalRows,
    runMatch: true,
    sourceFileId: batch.sourceFileId,
  });
}

async function buildInternalRows(req, batch) {
  const type = String(batch.reconciliationType || '').toUpperCase();
  const date = batch.statementDate;
  const portfolioId = batch.portfolioId;

  if (type === 'VALUATION' && portfolioId) {
    const holdings = await InvestmentHoldingV2.findAll({
      where: { portfolioId, ...companyWhere(req) },
    });
    return holdings.map((h) => ({
      internalReference: `HLD-${h.id}`,
      instrumentId: h.instrumentId,
      expectedAmount: Number(h.currentMarketValue),
      expectedQuantity: Number(h.quantity),
      lineDate: date,
    }));
  }

  if (type === 'INCOME' && portfolioId) {
    const events = await InvestmentIncomeEvent.findAll({
      where: {
        portfolioId,
        ...companyWhere(req),
        paymentDate: { [Op.lte]: date },
        status: { [Op.in]: ['EXPECTED', 'ACCRUED', 'RECEIVABLE', 'RECEIVED'] },
      },
      limit: 200,
    });
    return events.map((e) => ({
      internalReference: e.eventNumber,
      instrumentId: e.instrumentId,
      expectedAmount: Number(e.netAmount),
      lineDate: e.paymentDate,
    }));
  }

  if ((type === 'BROKER' || type === 'CUSTODIAN') && portfolioId) {
    const trades = await InvestmentTrade.findAll({
      where: {
        portfolioId,
        ...companyWhere(req),
        tradeDate: { [Op.lte]: date },
        status: { [Op.in]: ['CONFIRMED', 'SETTLED'] },
      },
      limit: 200,
    });
    return trades.map((t) => ({
      internalReference: t.tradeNumber,
      instrumentId: t.instrumentId,
      expectedAmount: Number(t.netSettlement),
      expectedQuantity: Number(t.quantity),
      lineDate: t.tradeDate,
    }));
  }

  if (type === 'BANK') {
    const settlements = await InvestmentSettlement.findAll({
      where: {
        ...companyWhere(req),
        expectedDate: { [Op.lte]: date },
        status: { [Op.in]: ['PENDING', 'SETTLED'] },
      },
      limit: 200,
    });
    return settlements.map((s) => ({
      internalReference: s.settlementNumber,
      expectedAmount: Number(s.settlementAmount),
      lineDate: s.expectedDate,
    }));
  }

  return [];
}

async function resolveReconLine(req, lineId, data = {}) {
  const line = await InvestmentReconciliationLine.findOne({
    where: { id: lineId, ...companyWhere(req) },
  });
  if (!line) {
    const err = new Error('Reconciliation line not found');
    err.statusCode = 404;
    throw err;
  }
  line.matchStatus = 'RESOLVED';
  line.resolutionStatus = data.resolutionStatus || 'APPROVED';
  line.resolvedBy = req.user?.id || null;
  line.resolvedAt = new Date();
  line.resolutionNotes = data.notes || data.resolutionNotes || null;
  if (data.exceptionReason) line.exceptionReason = data.exceptionReason;
  await line.save();

  const lines = await InvestmentReconciliationLine.findAll({
    where: { batchId: line.batchId, ...companyWhere(req) },
  });
  const summary = summarizeMatchLines(lines);
  const batch = await InvestmentReconciliationBatch.findOne({
    where: { id: line.batchId, ...companyWhere(req) },
  });
  batch.matchedRecords = summary.matchedRecords + summary.resolvedRecords;
  batch.exceptionRecords = summary.exceptionRecords;
  batch.unmatchedRecords = summary.unmatchedRecords;
  if (summary.unmatchedRecords === 0 && summary.exceptionRecords === 0) {
    batch.status = 'MATCHED';
  }
  await batch.save();
  return getReconBatch(req, line.batchId);
}

async function approveReconBatch(req, id) {
  const batch = await InvestmentReconciliationBatch.findOne({ where: { id, ...companyWhere(req) } });
  if (!batch) {
    const err = new Error('Reconciliation batch not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionReconBatch(batch.status, 'APPROVED')) {
    const err = new Error(`Cannot approve from ${batch.status}`);
    err.statusCode = 400;
    throw err;
  }
  batch.status = 'APPROVED';
  await batch.save();
  return getReconBatch(req, id);
}

async function previewMatch(req, data = {}) {
  return runMatchingEngine(data.sourceRows || [], data.internalRows || [], {
    amountTolerance: data.amountTolerance,
    quantityTolerance: data.quantityTolerance,
    dateToleranceDays: data.dateToleranceDays,
  });
}

async function previewManyToOne(req, data = {}) {
  return manyToOneMatch(data.sources || [], data.internal || {}, data);
}

async function previewOneToMany(req, data = {}) {
  return oneToManyMatch(data.source || {}, data.internals || [], data);
}

async function previewManualMatch(req, data = {}) {
  return manualMatch(data.lineA || {}, data.lineB || {}, data);
}

// ——— Period close ———
function parseChecklist(row) {
  if (!row) return buildChecklist();
  try {
    return row.checklistJson ? JSON.parse(row.checklistJson) : buildChecklist();
  } catch {
    return buildChecklist();
  }
}

async function listClosePeriods(req) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.period) where.period = req.query.period;
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.status) where.status = req.query.status;
  const rows = await InvestmentClosePeriod.findAll({
    where,
    include: [{ model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] }],
    order: [['period', 'DESC']],
  });
  return {
    periods: rows.map((r) => ({
      ...r.toJSON(),
      checklist: parseChecklist(r),
      readiness: checklistReady(parseChecklist(r)),
    })),
  };
}

async function getOrCreateClosePeriod(req, data = {}) {
  const period = data.period || new Date().toISOString().slice(0, 7);
  const portfolioId = data.portfolioId || null;
  let row = await InvestmentClosePeriod.findOne({
    where: {
      period,
      ...companyWhere(req),
      ...(portfolioId ? { portfolioId } : { portfolioId: null }),
    },
  });
  if (!row) {
    row = await InvestmentClosePeriod.create(
      withCompanyId(req, {
        portfolioId,
        period,
        status: 'OPEN',
        checklistJson: JSON.stringify(buildChecklist()),
        isTestData: !!data.isTestData,
      })
    );
  }
  const checklist = parseChecklist(row);
  return { period: row, checklist, readiness: checklistReady(checklist) };
}

async function updateCloseChecklist(req, id, data = {}) {
  const row = await InvestmentClosePeriod.findOne({ where: { id, ...companyWhere(req) } });
  if (!row) {
    const err = new Error('Close period not found');
    err.statusCode = 404;
    throw err;
  }
  assertPeriodOpen(row, 'update checklist');
  let checklist = parseChecklist(row);
  if (data.checklist) {
    checklist = data.checklist;
  } else if (data.key) {
    checklist = checklist.map((item) =>
      item.key === data.key
        ? { ...item, done: data.done !== false, completedAt: data.done === false ? null : new Date().toISOString() }
        : item
    );
  }
  row.checklistJson = JSON.stringify(checklist);
  const ready = checklistReady(checklist);
  if (ready.ready && row.status === 'OPEN') row.status = 'READY';
  else if (!ready.ready && ['READY'].includes(row.status)) row.status = 'IN_PROGRESS';
  else if (row.status === 'OPEN') row.status = 'IN_PROGRESS';
  await row.save();
  return { period: row, checklist, readiness: ready };
}

async function closePeriod(req, id) {
  const row = await InvestmentClosePeriod.findOne({ where: { id, ...companyWhere(req) } });
  if (!row) {
    const err = new Error('Close period not found');
    err.statusCode = 404;
    throw err;
  }
  const checklist = parseChecklist(row);
  if (!canClosePeriod(row.status, checklist)) {
    const err = new Error('Checklist incomplete; cannot close period');
    err.statusCode = 400;
    throw err;
  }
  if (!canTransitionClose(row.status, 'CLOSED')) {
    const err = new Error(`Cannot close from ${row.status}`);
    err.statusCode = 400;
    throw err;
  }
  // Mark period_lock item done
  const locked = checklist.map((i) =>
    i.key === 'period_lock' ? { ...i, done: true, completedAt: new Date().toISOString() } : i
  );
  row.checklistJson = JSON.stringify(locked);
  row.status = 'CLOSED';
  row.closedBy = req.user?.id || null;
  row.closedAt = new Date();
  await row.save();
  return { period: row, checklist: locked, readiness: checklistReady(locked) };
}

async function reopenPeriod(req, id, data = {}) {
  const row = await InvestmentClosePeriod.findOne({ where: { id, ...companyWhere(req) } });
  if (!row) {
    const err = new Error('Close period not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionClose(row.status, 'REOPENED')) {
    const err = new Error(`Cannot reopen from ${row.status}`);
    err.statusCode = 400;
    throw err;
  }
  if (!data.reason || !String(data.reason).trim()) {
    const err = new Error('Reopen requires a reason');
    err.statusCode = 400;
    throw err;
  }
  row.status = 'REOPENED';
  row.reopenedBy = req.user?.id || null;
  row.reopenedAt = new Date();
  row.reopenedReason = data.reason;
  // Unlock checklist lock item
  const checklist = parseChecklist(row).map((i) =>
    i.key === 'period_lock' ? { ...i, done: false, completedAt: null } : i
  );
  row.checklistJson = JSON.stringify(checklist);
  await row.save();
  return { period: row, checklist, readiness: checklistReady(checklist) };
}

async function checkPeriodLock(req, { period, portfolioId } = {}) {
  const p = period || new Date().toISOString().slice(0, 7);
  const where = { period: p, status: 'CLOSED', ...companyWhere(req) };
  if (portfolioId) {
    where[Op.or] = [{ portfolioId }, { portfolioId: null }];
  }
  const locked = await InvestmentClosePeriod.findOne({ where });
  if (locked) assertPeriodOpen(locked, 'post');
  return { locked: false, period: p };
}

module.exports = {
  listReconBatches,
  getReconBatch,
  createReconBatch,
  importReconRows,
  runMatch,
  resolveReconLine,
  approveReconBatch,
  previewMatch,
  previewManyToOne,
  previewOneToMany,
  previewManualMatch,
  listClosePeriods,
  getOrCreateClosePeriod,
  updateCloseChecklist,
  closePeriod,
  reopenPeriod,
  checkPeriodLock,
  buildInternalRows,
};
