const { Invoice, VendorInvoice } = require('../models');
const { Op } = require('sequelize');

async function computeQuarterVat(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59);

  const outputVat = await Invoice.sum('taxAmount', {
    where: {
      status: { [Op.in]: ['sent', 'paid', 'overdue'] },
      invoiceDate: { [Op.between]: [start, end] }
    }
  });

  const inputVat = await VendorInvoice.sum('taxAmount', {
    where: {
      invoiceDate: { [Op.between]: [start, end] }
    }
  });

  const outNum = parseFloat(outputVat || 0);
  const inNum = parseFloat(inputVat || 0);
  return { start, end, outNum, inNum };
}

/**
 * Quarterly VAT summary (posted revenue vs AP tax — extend with FinancialTransaction as needed).
 */
exports.getQuarterSummary = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year || new Date().getFullYear(), 10);
    const quarter = parseInt(req.query.quarter || Math.ceil((new Date().getMonth() + 1) / 3), 10);

    const { start, end, outNum, inNum } = await computeQuarterVat(year, quarter);

    res.json({
      success: true,
      data: {
        year,
        quarter,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        outputVat: outNum,
        inputVat: inNum,
        netVatPayable: Math.round((outNum - inNum) * 100) / 100,
        note:
          'Use POST /api/vat-returns/suggest-jv with GL ledger IDs to obtain balanced JV lines for Journal Voucher; record VAT payable settlement via Payment voucher.'
      }
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Balanced JV line suggestions for Journal Voucher create API (Dr/Cr totals match).
 * Third line posts the net to VAT payable / clearing ledger chosen by the user.
 */
exports.suggestJournalVoucher = async (req, res, next) => {
  try {
    const {
      year = new Date().getFullYear(),
      quarter = Math.ceil((new Date().getMonth() + 1) / 3),
      inputVatLedgerId,
      outputVatLedgerId,
      vatPayableLedgerId,
      reverse = false
    } = req.body;

    if (!inputVatLedgerId || !outputVatLedgerId || !vatPayableLedgerId) {
      return res.status(400).json({
        success: false,
        message:
          'Body requires inputVatLedgerId, outputVatLedgerId, and vatPayableLedgerId (chart_of_accounts ids)'
      });
    }

    const y = parseInt(year, 10);
    const q = parseInt(quarter, 10);
    const { start, end, outNum, inNum } = await computeQuarterVat(y, q);

    const details = [];

    if (inNum > 0.009) {
      details.push({
        type: 'Dr',
        ledgerId: parseInt(inputVatLedgerId, 10),
        debitAmount: Math.round(inNum * 100) / 100,
        creditAmount: 0,
        narration: `Input VAT Q${q} ${y}`
      });
    }
    if (outNum > 0.009) {
      details.push({
        type: 'Cr',
        ledgerId: parseInt(outputVatLedgerId, 10),
        debitAmount: 0,
        creditAmount: Math.round(outNum * 100) / 100,
        narration: `Output VAT Q${q} ${y}`
      });
    }

    const diff = Math.round((outNum - inNum) * 100) / 100;
    if (Math.abs(diff) > 0.009) {
      if (diff > 0) {
        details.push({
          type: 'Dr',
          ledgerId: parseInt(vatPayableLedgerId, 10),
          debitAmount: Math.round(diff * 100) / 100,
          creditAmount: 0,
          narration: `VAT net balance Q${q} ${y}`
        });
      } else {
        details.push({
          type: 'Cr',
          ledgerId: parseInt(vatPayableLedgerId, 10),
          debitAmount: 0,
          creditAmount: Math.round(Math.abs(diff) * 100) / 100,
          narration: `VAT net balance Q${q} ${y}`
        });
      }
    }

    let finalDetails = details;
    if (reverse && details.length > 0) {
      finalDetails = details.map((line) => ({
        ...line,
        type: line.type === 'Dr' ? 'Cr' : 'Dr',
        debitAmount: line.creditAmount || 0,
        creditAmount: line.debitAmount || 0,
        narration: `${line.narration || ''} (reverse)`
      }));
    }

    const totalDr = finalDetails.reduce((s, d) => s + parseFloat(d.debitAmount || 0), 0);
    const totalCr = finalDetails.reduce((s, d) => s + parseFloat(d.creditAmount || 0), 0);

    res.json({
      success: true,
      data: {
        year: y,
        quarter: q,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        outputVat: outNum,
        inputVat: inNum,
        netVatPayable: diff,
        narration: `VAT return ${y} Q${q}`,
        details: finalDetails,
        totals: {
          debit: Math.round(totalDr * 100) / 100,
          credit: Math.round(totalCr * 100) / 100
        }
      }
    });
  } catch (e) {
    next(e);
  }
};
