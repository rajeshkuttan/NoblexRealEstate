'use strict';

/**
 * OCR provider abstraction for scanned PDFs / image-like pages.
 * COPILOT_OCR_PROVIDER=none|stub|openai
 */
const { getCopilotConfig } = require('../config/copilotConfig');
const { logCopilot } = require('../observability/copilotLogger');

const MIN_TEXT_CHARS = parseInt(process.env.COPILOT_OCR_MIN_CHARS || '40', 10);

function needsOcr(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().length < MIN_TEXT_CHARS;
}

class NoneOcrProvider {
  async extractFromPdf() {
    return { text: '', usedOcr: false, provider: 'none' };
  }

  async healthCheck() {
    return { ok: true, provider: 'none', configured: false };
  }
}

/** Deterministic stub for tests / offline scanned-PDF path. */
class StubOcrProvider {
  async extractFromPdf({ filePath }) {
    return {
      text: `[OCR stub] Scanned content extracted from ${filePath || 'document'}`,
      usedOcr: true,
      provider: 'stub',
      pages: 1,
    };
  }

  async healthCheck() {
    return { ok: true, provider: 'stub', configured: true };
  }
}

/**
 * Optional OpenAI vision OCR: sends first page hint via Responses/Chat with image not available
 * without rasterizing PDF; for production, prefer a dedicated OCR service.
 * Here we mark OCR attempted and return empty if no rasterizer — callers keep pdf-parse text.
 */
class OpenAiVisionOcrProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async extractFromPdf() {
    // Without a PDF→image pipeline we cannot call vision reliably.
    // Log and return empty so extractors can surface OCR_REQUIRED status.
    logCopilot('info', 'ocr_openai_requires_rasterizer', {});
    return {
      text: '',
      usedOcr: false,
      provider: 'openai',
      note: 'Install rasterizer or use COPILOT_OCR_PROVIDER=stub for offline; production OCR hook ready.',
    };
  }

  async healthCheck() {
    return { ok: Boolean(this.apiKey), provider: 'openai', configured: Boolean(this.apiKey) };
  }
}

let singleton = null;

function getOcrProvider() {
  if (singleton) return singleton;
  const mode = String(process.env.COPILOT_OCR_PROVIDER || 'stub').toLowerCase();
  const cfg = getCopilotConfig();
  if (mode === 'openai') singleton = new OpenAiVisionOcrProvider(cfg.openaiApiKey);
  else if (mode === 'none') singleton = new NoneOcrProvider();
  else singleton = new StubOcrProvider();
  return singleton;
}

function resetOcrProviderForTests() {
  singleton = null;
}

module.exports = {
  needsOcr,
  getOcrProvider,
  resetOcrProviderForTests,
  MIN_TEXT_CHARS,
};
