const { scrubMetaForLogs } = require('../guardrails/redaction');

function logCopilot(level, message, meta = {}) {
  const safeMeta = scrubMetaForLogs(meta);
  const line = {
    ts: new Date().toISOString(),
    level,
    scope: 'copilot',
    message,
    ...safeMeta,
  };
  if (level === 'error') {
    console.error(JSON.stringify(line));
  } else {
    console.log(JSON.stringify(line));
  }
}

module.exports = { logCopilot };
