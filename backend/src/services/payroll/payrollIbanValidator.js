/** UAE IBAN: AE + 21 digits (23 chars total). */
const UAE_IBAN_REGEX = /^AE\d{21}$/i;

function normalizeIban(iban) {
  return String(iban || '')
    .replace(/\s/g, '')
    .toUpperCase();
}

function validateUaeIban(iban) {
  const normalized = normalizeIban(iban);
  if (!normalized) {
    return { valid: false, normalized: '', message: 'IBAN is required' };
  }
  if (!UAE_IBAN_REGEX.test(normalized)) {
    return { valid: false, normalized, message: 'Invalid UAE IBAN format (AE + 21 digits)' };
  }
  return { valid: true, normalized, message: null };
}

module.exports = { validateUaeIban, normalizeIban, UAE_IBAN_REGEX };
