'use strict';

/**
 * Rough USD cost estimates for common chat models (input/output per 1M tokens).
 * Override via COPILOT_COST_INPUT_PER_1M / COPILOT_COST_OUTPUT_PER_1M.
 */
const DEFAULT_RATES = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  default: { input: 0.15, output: 0.6 },
};

function getRates(modelName) {
  const inputEnv = parseFloat(process.env.COPILOT_COST_INPUT_PER_1M || '');
  const outputEnv = parseFloat(process.env.COPILOT_COST_OUTPUT_PER_1M || '');
  if (Number.isFinite(inputEnv) && Number.isFinite(outputEnv)) {
    return { input: inputEnv, output: outputEnv };
  }
  const key = String(modelName || '')
    .toLowerCase()
    .replace(/^.*\//, '');
  if (key.includes('gpt-4o-mini')) return DEFAULT_RATES['gpt-4o-mini'];
  if (key.includes('gpt-4o')) return DEFAULT_RATES['gpt-4o'];
  return DEFAULT_RATES.default;
}

function estimateCostUsd({ promptTokens = 0, completionTokens = 0, modelName } = {}) {
  const rates = getRates(modelName);
  const prompt = Number(promptTokens) || 0;
  const completion = Number(completionTokens) || 0;
  const usd = (prompt * rates.input + completion * rates.output) / 1_000_000;
  return Number(usd.toFixed(6));
}

module.exports = { estimateCostUsd, getRates };
