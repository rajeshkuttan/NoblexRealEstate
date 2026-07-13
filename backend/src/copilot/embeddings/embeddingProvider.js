'use strict';

/**
 * Embedding provider abstraction.
 * Modes: none (default), stub (deterministic for tests), openai.
 */
const { getCopilotConfig } = require('../config/copilotConfig');
const { logCopilot } = require('../observability/copilotLogger');

class EmbeddingProvider {
  async embedTexts() {
    throw new Error('embedTexts not implemented');
  }

  async healthCheck() {
    return { ok: true, provider: this.constructor.name };
  }
}

class NoneEmbeddingProvider extends EmbeddingProvider {
  async embedTexts() {
    return [];
  }

  async healthCheck() {
    return { ok: true, provider: 'none', configured: false };
  }
}

/** Deterministic pseudo-embeddings for offline tests (not semantic). */
class StubEmbeddingProvider extends EmbeddingProvider {
  constructor(dims = 8) {
    super();
    this.dims = dims;
  }

  async embedTexts(texts = []) {
    return texts.map((t) => {
      const vec = new Array(this.dims).fill(0);
      const s = String(t || '');
      for (let i = 0; i < s.length; i += 1) {
        vec[i % this.dims] += (s.charCodeAt(i) % 31) / 31;
      }
      const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
      return vec.map((v) => Number((v / norm).toFixed(6)));
    });
  }

  async healthCheck() {
    return { ok: true, provider: 'stub', dims: this.dims, configured: true };
  }
}

class OpenAiEmbeddingProvider extends EmbeddingProvider {
  constructor({ apiKey, model, dims }) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.dims = dims;
  }

  async embedTexts(texts = []) {
    if (!texts.length) return [];
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts.map((t) => String(t || '').slice(0, 8000)),
        dimensions: this.dims > 0 ? this.dims : undefined,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      logCopilot('error', 'openai_embed_failed', { status: res.status, errText: errText.slice(0, 300) });
      throw Object.assign(new Error('Embedding provider failed'), { code: 'EMBED_FAILED' });
    }
    const data = await res.json();
    const byIndex = new Map((data.data || []).map((d) => [d.index, d.embedding]));
    return texts.map((_, i) => byIndex.get(i) || []);
  }

  async healthCheck() {
    return {
      ok: Boolean(this.apiKey),
      provider: 'openai',
      model: this.model,
      dims: this.dims,
      configured: Boolean(this.apiKey),
    };
  }
}

let singleton = null;

function getEmbeddingProvider() {
  if (singleton) return singleton;
  const cfg = getCopilotConfig();
  const mode = cfg.embeddingProvider;
  if (mode === 'stub') {
    singleton = new StubEmbeddingProvider(cfg.embeddingDims || 8);
  } else if (mode === 'openai' && cfg.openaiApiKey) {
    singleton = new OpenAiEmbeddingProvider({
      apiKey: cfg.openaiApiKey,
      model: cfg.embeddingModel,
      dims: cfg.embeddingDims,
    });
  } else {
    singleton = new NoneEmbeddingProvider();
  }
  return singleton;
}

function resetEmbeddingProviderForTests() {
  singleton = null;
}

module.exports = {
  EmbeddingProvider,
  NoneEmbeddingProvider,
  StubEmbeddingProvider,
  OpenAiEmbeddingProvider,
  getEmbeddingProvider,
  resetEmbeddingProviderForTests,
};
