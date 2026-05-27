/** Demo tagging and fixed payroll period for Concord full-cycle seed. */
const DEMO_PREFIX = 'DEMO-CRE-';
const DEMO_BATCH_TAG = 'PAYROLL_FULL_CYCLE_DEMO_2026';
const COMPANY_NAME_MATCH = 'concord real estate';
const PERIOD_MONTH = 6;
const PERIOD_YEAR = 2026;
const PERIOD_FROM = '2026-06-01';
const PERIOD_TO = '2026-06-30';

/** Valid UAE IBAN for WPS (23 chars). */
const DEMO_IBAN_BASE = 'AE07033123456789012345';

function demoIban(suffix) {
  const s = String(suffix).padStart(1, '0').slice(-1);
  return `${DEMO_IBAN_BASE}${s}`;
}

module.exports = {
  DEMO_PREFIX,
  DEMO_BATCH_TAG,
  COMPANY_NAME_MATCH,
  PERIOD_MONTH,
  PERIOD_YEAR,
  PERIOD_FROM,
  PERIOD_TO,
  demoIban,
};
