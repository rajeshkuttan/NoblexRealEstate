'use strict';

/**
 * Simple calculation helpers used by management briefs / eval.
 */
function occupancyRate(occupied, total) {
  const o = Number(occupied) || 0;
  const t = Number(total) || 0;
  if (t <= 0) return 0;
  return Number(((o / t) * 100).toFixed(1));
}

function sumAmounts(rows, key = 'amount') {
  return (rows || []).reduce((s, r) => s + (Number(r?.[key]) || 0), 0);
}

function agingBucket(daysPastDue) {
  const d = Number(daysPastDue) || 0;
  if (d <= 30) return '0-30';
  if (d <= 60) return '31-60';
  if (d <= 90) return '61-90';
  return '90+';
}

module.exports = { occupancyRate, sumAmounts, agingBucket };
