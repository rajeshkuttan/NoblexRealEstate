'use strict';

/**
 * RC1 infrastructure health probe.
 * Usage: node src/scripts/copilotRc1Health.js [--recovery]
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize } = require('../config/database');
const { getCopilotConfig, isProviderConfigured } = require('../copilot/config/copilotConfig');
const { getVectorStore, resetVectorStoreForTests } = require('../copilot/retrieval');
const { getEmbeddingProvider, resetEmbeddingProviderForTests } = require('../copilot/embeddings/embeddingProvider');
const { healthCheck: queueHealthCheck } = require('../copilot/ingestion/ingestQueue');
const { getOcrProvider } = require('../copilot/ingestion/ocrProvider');
const { llmBreaker } = require('../copilot/providers/circuitBreaker');

const ROOT = path.join(__dirname, '../../../Tasks/Release');
const OUT = path.join(ROOT, 'RC1_Infrastructure_Health.md');

async function probeRedis(url) {
  if (!url) return { ok: false, error: 'COPILOT_REDIS_URL unset' };
  try {
    const IORedis = require('ioredis');
    const client = new IORedis(url, { maxRetriesPerRequest: 1, connectTimeout: 2500, lazyConnect: true });
    await client.connect();
    const pong = await client.ping();
    await client.quit();
    return { ok: pong === 'PONG', pong };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function probeQdrant(url) {
  if (!url) return { ok: false, error: 'COPILOT_QDRANT_URL unset' };
  try {
    const res = await fetch(`${String(url).replace(/\/$/, '')}/readyz`);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    try {
      const res = await fetch(`${String(url).replace(/\/$/, '')}/`);
      return { ok: res.ok, status: res.status, via: 'root' };
    } catch (err2) {
      return { ok: false, error: err2.message };
    }
  }
}

async function probeErpHttp() {
  const port = process.env.PORT || 5002;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`).catch(() =>
      fetch(`http://127.0.0.1:${port}/api`)
    );
    return { ok: Boolean(res && res.status < 500), status: res?.status || null };
  } catch (err) {
    return { ok: false, error: err.message, note: 'Backend may be down; MySQL probe still runs' };
  }
}

async function run({ recovery = false } = {}) {
  const cfg = getCopilotConfig();
  resetVectorStoreForTests();
  resetEmbeddingProviderForTests();

  const results = {
    ts: new Date().toISOString(),
    releaseStage: cfg.releaseStage,
    retrievalMode: cfg.retrievalMode,
    useBullmq: cfg.useBullmq,
  };

  try {
    await sequelize.authenticate();
    results.mysql = { ok: true };
  } catch (err) {
    results.mysql = { ok: false, error: err.message };
  }

  results.redis = await probeRedis(cfg.redisUrl);
  results.qdrant = await probeQdrant(cfg.qdrantUrl);
  results.queue = await queueHealthCheck();
  results.embeddings = await getEmbeddingProvider().healthCheck();
  results.ocr = await getOcrProvider().healthCheck();
  results.llm = { ok: isProviderConfigured(), circuit: llmBreaker.status(), provider: cfg.defaultProvider };
  results.vectorStore = await getVectorStore().healthCheck();
  results.erpHttp = await probeErpHttp();

  if (recovery) {
    results.recovery = {
      note: 'Run with Redis/Qdrant stopped then restarted to validate fallback; this flag records intent.',
      expected: 'ERP HTTP remains usable; Copilot queue falls back to in-process when Redis down; hybrid degrades to MySQL when Qdrant down.',
    };
  }

  const critical = [results.mysql, results.llm];
  const criticalOk = critical.every((x) => x.ok);
  const needsVectorInfra = cfg.retrievalMode === 'hybrid' || cfg.retrievalMode === 'qdrant';
  const needsRedis = Boolean(cfg.useBullmq);
  const infraOk =
    (!needsRedis || results.redis.ok) && (!needsVectorInfra || results.qdrant.ok);
  const overallOk = criticalOk && infraOk;

  fs.mkdirSync(ROOT, { recursive: true });
  const md = `# RC1 Infrastructure Health

Generated: ${results.ts}

| Check | OK | Detail |
|-------|----|--------|
| Release stage | ${cfg.releaseStage} | — |
| MySQL | ${results.mysql.ok ? 'YES' : 'NO'} | ${results.mysql.error || 'authenticated'} |
| Redis | ${results.redis.ok ? 'YES' : 'NO'} | ${JSON.stringify(results.redis)} |
| Qdrant | ${results.qdrant.ok ? 'YES' : 'NO'} | ${JSON.stringify(results.qdrant)} |
| Queue | ${results.queue.ok ? 'YES' : 'NO'} | ${JSON.stringify(results.queue)} |
| Vector store | ${results.vectorStore.ok ? 'YES' : 'NO'} | ${JSON.stringify(results.vectorStore)} |
| Embeddings | ${results.embeddings.ok ? 'YES' : 'NO'} | ${JSON.stringify(results.embeddings)} |
| OCR | ${results.ocr.ok ? 'YES' : 'NO'} | ${JSON.stringify(results.ocr)} |
| LLM | ${results.llm.ok ? 'YES' : 'NO'} | ${JSON.stringify(results.llm)} |
| ERP HTTP | ${results.erpHttp.ok ? 'YES' : 'NO'} | ${JSON.stringify(results.erpHttp)} |

**Overall:** ${overallOk ? 'PASS' : 'FAIL'} (critical MySQL+LLM required; Redis/Qdrant required for hybrid/BullMQ RC1)

\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`
`;
  fs.writeFileSync(OUT, md);
  console.log(md);
  console.log(`Wrote ${OUT}`);
  process.exit(overallOk && criticalOk && infraOk ? 0 : 1);
}

run({ recovery: process.argv.includes('--recovery') }).catch((err) => {
  console.error(err);
  process.exit(1);
});
