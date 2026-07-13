'use strict';

/**
 * Redact common sensitive patterns from tool/LLM-facing text and logs.
 * Order matters: identity formats before generic digit runs.
 */
const PATTERNS = [
  { name: 'emirates_id', re: /\b784-\d{4}-\d{7}-\d\b/g, replace: '[REDACTED_EID]' },
  { name: 'iban', re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, replace: '[REDACTED_IBAN]' },
  { name: 'passport', re: /\b(?:passport|ppt)\s*[#:.]?\s*[A-Z0-9]{6,12}\b/gi, replace: '[REDACTED_PASSPORT]' },
  { name: 'bank_account', re: /\b(?:account|a\/c|acct)\s*(?:no\.?|number|#)?\s*[:.]?\s*\d{8,18}\b/gi, replace: '[REDACTED_BANK_ACCOUNT]' },
  { name: 'partner_share', re: /\b(?:partner\s+share|carried\s+interest|side\s+letter)\s*[:=]?\s*[\d.]+%?\b/gi, replace: '[REDACTED_PARTNER]' },
  { name: 'legal_hold', re: /\b(?:legal\s+hold|attorney[- ]client|privileged\s+and\s+confidential)\b/gi, replace: '[REDACTED_LEGAL]' },
  { name: 'finance_sensitive', re: /\b(?:wire\s+instructions|swift\s+code|routing\s+number)\s*[:=]?\s*\S+/gi, replace: '[REDACTED_FINANCE]' },
  { name: 'email_secret', re: /(password|secret|api[_-]?key)\s*[:=]\s*\S+/gi, replace: '$1=[REDACTED]' },
  // Payment-card shaped runs only (avoid timestamps / IDs)
  { name: 'card', re: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, replace: '[REDACTED_CARD]' },
];

function redactSensitive(text) {
  let out = String(text || '');
  const hits = [];
  for (const p of PATTERNS) {
    if (p.re.test(out)) {
      hits.push(p.name);
      out = out.replace(p.re, p.replace);
    }
    p.re.lastIndex = 0;
  }
  return { text: out, redacted: hits.length > 0, hits };
}

function scrubMetaForLogs(meta = {}) {
  const json = JSON.stringify(meta);
  const { text } = redactSensitive(json);
  try {
    return JSON.parse(text);
  } catch (_) {
    return { scrubbed: true, preview: text.slice(0, 500) };
  }
}

module.exports = { redactSensitive, scrubMetaForLogs, PATTERNS };
