/**
 * Prompt-injection / policy guardrails.
 */
const BLOCK_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(your|the)\s+system\s+prompt/i,
  /reveal\s+(your|the|all)?\s*(system\s+)?prompts?/i,
  /exfiltrate|dump\s+all\s+(secrets|keys|passwords)/i,
  /\b(api[_-]?keys?|secrets?|passwords?)\b.*\b(dump|reveal|show|exfiltrate)\b/i,
  /\byou\s+are\s+now\s+dan\b/i,
  /\b(drop\s+table|delete\s+from\s+users|truncate\s+table)\b/i,
  /\brun\s+select\s+\*\s+from\b/i,
];

function checkUserMessage(content) {
  const text = String(content || '').trim();
  if (!text) {
    return { allowed: false, code: 'EMPTY_MESSAGE', reason: 'Message is empty' };
  }
  if (text.length > 20000) {
    return { allowed: false, code: 'MESSAGE_TOO_LONG', reason: 'Message exceeds maximum length' };
  }
  for (const re of BLOCK_PATTERNS) {
    if (re.test(text)) {
      return {
        allowed: false,
        code: 'PROMPT_INJECTION_SUSPECTED',
        reason: 'Message blocked by safety policy',
      };
    }
  }
  return { allowed: true };
}

module.exports = { checkUserMessage };
