'use strict';

/**
 * RC1.1 infrastructure validation (RC1.2-aligned: Docker is NOT required).
 * Usage: node src/scripts/copilotRc11InfraValidate.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { getCopilotConfig, isProviderConfigured } = require('../copilot/config/copilotConfig');
const { sequelize } = require('../config/database');

const ROOT = path.join(__dirname, '../../../Tasks/Release');
const OUT = path.join(ROOT, 'RC1.1_Infrastructure_Report.md');

function sh(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, out: String(out).trim() };
  } catch (err) {
    return { ok: false, out: String(err.stdout || err.stderr || err.message || err).trim() };
  }
}

async function redisVersionAndPing(url) {
  if (!url) return { ok: false, error: 'REDIS URL unset' };
  let client;
  try {
    const IORedis = require('ioredis');
    client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2500,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    client.on('error', () => {});
    await client.connect();
    const pong = await client.ping();
    const info = await client.info('server');
    await client.quit().catch(() => {});
    const m = info.match(/redis_version:([0-9.]+)/);
    const version = m ? m[1] : 'unknown';
    const major = parseInt(String(version).split('.')[0], 10) || 0;
    return { ok: pong === 'PONG' && major >= 5, pong, version, major };
  } catch (err) {
    try {
      if (client) client.disconnect();
    } catch (_) {
      /* ignore */
    }
    return { ok: false, error: err.message };
  }
}

async function qdrantChecks(baseUrl, collection) {
  const url = String(baseUrl || '').replace(/\/$/, '');
  if (!url) return { ok: false, error: 'QDRANT URL unset' };
  const results = { ready: false, crud: false };
  try {
    const ready = await fetch(`${url}/readyz`);
    results.ready = ready.ok;
    const col = collection || 'copilot_rc11_probe';
    let exists = false;
    try {
      const g = await fetch(`${url}/collections/${col}`);
      exists = g.ok;
    } catch (_) {
      /* create */
    }
    if (!exists) {
      await fetch(`${url}/collections/${col}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vectors: { size: 8, distance: 'Cosine' } }),
      });
    }
    const pointId = 900001;
    const upsert = await fetch(`${url}/collections/${col}/points?wait=true`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{ id: pointId, vector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], payload: { probe: true } }],
      }),
    });
    const search = await fetch(`${url}/collections/${col}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
        limit: 1,
        with_payload: true,
      }),
    });
    const del = await fetch(`${url}/collections/${col}/points/delete?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: [pointId] }),
    });
    results.crud = upsert.ok && search.ok && del.ok;
    results.ok = results.ready && results.crud;
    results.collection = col;
    return results;
  } catch (err) {
    return { ok: false, error: err.message, ...results };
  }
}

async function bullmqRoundTrip(redisUrl) {
  if (!redisUrl) return { ok: false, error: 'redis unset' };
  let queue;
  let worker;
  let events;
  try {
    const { Queue, Worker, QueueEvents } = require('bullmq');
    const connection = {
      url: redisUrl,
      maxRetriesPerRequest: null,
      connectTimeout: 2500,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      lazyConnect: false,
    };
    const name = `copilot-rc11-probe-${Date.now()}`;
    queue = new Queue(name, { connection });
    worker = new Worker(
      name,
      async (job) => {
        if (job.name === 'probe') return { ok: true, id: job.id };
        throw new Error('unexpected');
      },
      { connection, concurrency: 1 }
    );
    worker.on('error', () => {});
    events = new QueueEvents(name, { connection });
    events.on('error', () => {});
    await Promise.race([
      events.waitUntilReady(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('BullMQ ready timeout')), 5000)),
    ]);
    const job = await queue.add('probe', { t: Date.now() }, { attempts: 1, removeOnComplete: true });
    await job.waitUntilFinished(events, 10000);
    const jobId = job.id;
    await worker.close();
    await events.close();
    await queue.obliterate({ force: true }).catch(() => {});
    await queue.close();
    return { ok: true, jobId };
  } catch (err) {
    try {
      if (worker) await worker.close();
      if (events) await events.close();
      if (queue) await queue.close();
    } catch (_) {
      /* ignore cleanup */
    }
    return { ok: false, error: err.message };
  }
}

async function main() {
  fs.mkdirSync(ROOT, { recursive: true });
  const cfg = getCopilotConfig();
  const report = {
    ts: new Date().toISOString(),
    releaseStage: cfg.releaseStage,
    retrievalMode: cfg.retrievalMode,
    redisUrl: cfg.redisUrl,
    qdrantUrl: cfg.qdrantUrl,
    note: 'Docker is optional (local-dev aid only). INFRA_PASS checks Redis/Qdrant/BullMQ/MySQL/LLM.',
  };

  // Informational only — never part of INFRA_PASS
  report.docker = sh('docker version --format "{{.Server.Version}}"');
  if (!report.docker.ok) report.docker = sh('docker version');
  report.compose = sh('docker compose version');
  report.dockerStatus = report.docker.ok ? 'PRESENT (optional)' : 'ABSENT (ok — not required)';

  try {
    await sequelize.authenticate();
    report.mysql = { ok: true };
  } catch (err) {
    report.mysql = { ok: false, error: err.message };
  }

  report.redis = await redisVersionAndPing(cfg.redisUrl);
  report.qdrant = await qdrantChecks(cfg.qdrantUrl, 'copilot_rc11_probe');
  report.bullmq = report.redis.ok
    ? await bullmqRoundTrip(cfg.redisUrl)
    : { ok: false, error: 'skipped — Redis unavailable', skipped: true };
  report.llm = { ok: isProviderConfigured() };

  report.volumeRestart = { attempted: false, ok: false, severity: 'WARNING' };
  if (report.docker.ok && report.compose.ok) {
    report.volumeRestart.attempted = true;
    const composeFile = path.join(__dirname, '../../../docker-compose.copilot.yml');
    const restart = sh(`docker compose -f "${composeFile}" restart`);
    report.volumeRestart.ok = restart.ok;
    report.volumeRestart.detail = restart.out;
  }

  const infraPass =
    report.mysql.ok &&
    report.redis.ok &&
    (report.redis.major || 0) >= 5 &&
    report.qdrant.ok &&
    report.bullmq.ok &&
    report.llm.ok;

  const md = `# RC1.1 Infrastructure Report

Generated: ${report.ts}

> **RC1.2 note:** Docker / Compose are **not** release criteria. Prefer native Redis/Qdrant (see RC1.2 reports). Compose remains optional for local development.

| Check | OK | Detail |
|-------|----|--------|
| Docker Engine (optional) | ${report.docker.ok ? 'YES' : 'N/A'} | ${report.dockerStatus} |
| Docker Compose (optional) | ${report.compose.ok ? 'YES' : 'N/A'} | informational only |
| MySQL | ${report.mysql.ok ? 'YES' : 'NO'} | ${report.mysql.error || 'ok'} |
| Redis PING + version ≥5 | ${report.redis.ok ? 'YES' : 'NO'} | ${JSON.stringify(report.redis)} |
| Redis URL (prefer 6380) | ${String(cfg.redisUrl).includes('6380') ? 'YES' : 'CHECK'} | ${cfg.redisUrl} |
| Qdrant ready + CRUD | ${report.qdrant.ok ? 'YES' : 'NO'} | ${JSON.stringify(report.qdrant)} |
| BullMQ enqueue/complete | ${report.bullmq.ok ? 'YES' : 'NO'} | ${JSON.stringify(report.bullmq)} |
| LLM configured | ${report.llm.ok ? 'YES' : 'NO'} | — |
| Compose volume restart | ${report.volumeRestart.ok ? 'YES' : 'WARNING/SKIP'} | optional |

**INFRA_PASS:** ${infraPass ? 'YES' : 'NO'}

Missing Docker does **not** fail INFRA_PASS. Prefer \`node src/scripts/copilotRc12NativeInfraValidate.js\` for production commissioning.

\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`
`;
  fs.writeFileSync(OUT, md);
  console.log(md);
  process.exit(infraPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
