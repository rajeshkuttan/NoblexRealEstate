/**
 * WPS SIF pipe-delimited TXT (HDR / EDR / TRL).
 * Agent-specific CB formats may vary; amounts use AED 2dp.
 */
function formatAmount(amount) {
  return Number(amount || 0).toFixed(2);
}

function padMonth(month, year) {
  const m = String(month).padStart(2, '0');
  return `${year}${m}`;
}

function generateSifContent({ batch, wpsConfig, companyName, lines }) {
  const exportable = (lines || []).filter((l) =>
    ['VALID', 'WARNING'].includes(l.validationStatus || l.validation_status)
  );
  const molId = wpsConfig?.molEstablishmentId || wpsConfig?.mol_establishment_id || '';
  const employerName = (companyName || 'EMPLOYER').slice(0, 100);
  const salaryMonth = padMonth(batch.salaryMonth, batch.salaryYear);
  const totalAmount = exportable.reduce((s, l) => s + Number(l.salaryAmount || 0), 0);
  const count = exportable.length;

  const rows = [];
  rows.push(
    ['HDR', 'SIF', molId, employerName, salaryMonth, String(count), formatAmount(totalAmount)].join('|')
  );

  for (const line of exportable) {
    rows.push(
      [
        'EDR',
        line.molPersonalId || line.mol_personal_id || '',
        line.employeeName || line.employee_name || '',
        line.bankName || line.bank_name || '',
        line.iban || '',
        formatAmount(line.salaryAmount),
        line.salaryType || line.salary_type || wpsConfig?.defaultSalaryType || 'BASIC',
      ].join('|')
    );
  }

  rows.push(['TRL', String(count), formatAmount(totalAmount)].join('|'));
  return rows.join('\n');
}

function buildFileName(batch) {
  const m = String(batch.salaryMonth).padStart(2, '0');
  return `WPS_SIF_${batch.salaryYear}${m}_B${batch.id}.txt`;
}

module.exports = { generateSifContent, buildFileName, formatAmount };
