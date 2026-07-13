'use strict';

/**
 * RC1.2 native infrastructure validation (no Docker requirement).
 * Usage: node src/scripts/copilotRc12NativeInfraValidate.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { getCopilotConfig, isProviderConfigured } = require('../copilot/config/copilotConfig');
const { sequelize } = require('../config/database');
const {
  probeMysql,
  probeRedis,
  probeQdrant,
  probeFileStorage,
  probeCopilotWorker,
  buildLlmDependency,
} = require('../copilot/observability/dependencyHealth');

const ROOT = path.join(__dirname, '../../../Tasks/Release');
const OUT = path.join(ROOT, 'RC1.2_Native_Infrastructure_Report.md');

function sh(cmd) {
  try {
    return { ok: true, out: String(execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })).trim() };
  } catch (err) {
    return { ok: false, out: String(err.stdout || err.stderr || err.message || err).trim() };
  }
}

function row(name, result, severity) {
  const status = result.ok ? 'PASS' : severity === 'WARNING' ? 'WARNING' : 'FAIL';
  return { name, status, detail: result, severity: severity || (result.ok ? 'info' : 'critical') };
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
    };
    const name = `copilot-rc12-probe-${Date.now()}`;
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
    return { ok: true, jobId, enqueue: true, complete: true };
  } catch (err) {
    try {
      if (worker) await worker.close();
      if (events) await events.close();
      if (queue) await queue.close();
    } catch (_) {
      /* ignore */
    }
    return { ok: false, error: err.message };
  }
}

async function qdrantCrudAndFilter(baseUrl, apiKey) {
  const url = String(baseUrl || '').replace(/\/$/, '');
  if (!url) return { ok: false, error: 'QDRANT URL unset' };
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['api-key'] = apiKey;
  const col = 'copilot_rc12_probe';
  try {
    const ready = await fetch(`${url}/readyz`, { headers });
    if (!ready.ok) return { ok: false, ready: false, error: `readyz ${ready.status}` };

    const list = await fetch(`${url}/collections`, { headers });
    let exists = false;
    try {
      const g = await fetch(`${url}/collections/${col}`, { headers });
      exists = g.ok;
    } catch (_) {
      /* create */
    }
    if (!exists) {
      await fetch(`${url}/collections/${col}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ vectors: { size: 8, distance: 'Cosine' } }),
      });
    }
    const pointId = 910001;
    const upsert = await fetch(`${url}/collections/${col}/points?wait=true`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        points: [
          {
            id: pointId,
            vector: [0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.71, 0.81],
            payload: { companyId: 42, probe: true },
          },
        ],
      }),
    });
    const search = await fetch(`${url}/collections/${col}/points/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vector: [0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.71, 0.81],
        limit: 5,
        with_payload: true,
        filter: { must: [{ key: 'companyId', match: { value: 42 } }] },
      }),
    });
    const searchBody = search.ok ? await search.json() : {};
    const filteredHit = Array.isArray(searchBody?.result)
      ? searchBody.result.some((r) => r.payload?.companyId === 42)
      : false;
    const wrong = await fetch(`${url}/collections/${col}/points/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vector: [0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.71, 0.81],
        limit: 5,
        with_payload: true,
        filter: { must: [{ key: 'companyId', match: { value: 99999 } }] },
      }),
    });
    const wrongBody = wrong.ok ? await wrong.json() : {};
    const isolated = !Array.isArray(wrongBody?.result) || wrongBody.result.length === 0;
    const del = await fetch(`${url}/collections/${col}/points/delete?wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ points: [pointId] }),
    });
    const ok = ready.ok && list.ok && upsert.ok && search.ok && del.ok && filteredHit && isolated;
    return {
      ok,
      ready: ready.ok,
      listCollections: list.ok,
      upsert: upsert.ok,
      filteredSearch: filteredHit,
      companyIsolation: isolated,
      delete: del.ok,
      collection: col,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function probePm2Worker() {
  const list = sh('pm2 jlist');
  if (!list.ok) {
    return {
      ok: false,
      severity: 'WARNING',
      error: 'pm2 not available or no process list',
      mode: 'unknown',
    };
  }
  try {
    const apps = JSON.parse(list.out);
    const w = apps.find((a) => a.name === 'realestate-copilot-worker');
    if (!w) {
      return {
        ok: false,
        severity: 'WARNING',
        error: 'realestate-copilot-worker not in PM2 list (in-process workers may still run)',
        mode: 'pm2-missing',
      };
    }
    const online = w.pm2_env?.status === 'online';
    return { ok: online, status: w.pm2_env?.status, mode: 'pm2', pid: w.pid };
  } catch (err) {
    return { ok: false, severity: 'WARNING', error: err.message };
  }
}

async function main() {
  fs.mkdirSync(ROOT, { recursive: true });
  const cfg = getCopilotConfig();
  const checks = [];

  const mysql = await probeMysql(sequelize);
  checks.push(row('MySQL connectivity', mysql));

  const redis = await probeRedis(cfg.redisUrl);
  checks.push(row('Redis connectivity + version ≥5', redis));

  const persistence = {
    ok: Boolean(redis.aofEnabled) || redis.ok === false,
    aofEnabled: redis.aofEnabled,
    note: redis.aofEnabled ? 'AOF enabled' : 'AOF not detected — WARNING',
  };
  if (redis.ok && !redis.aofEnabled) {
    checks.push(row('Redis persistence (AOF)', { ok: false, ...persistence }, 'WARNING'));
  } else if (redis.ok) {
    checks.push(row('Redis persistence (AOF)', { ok: true, ...persistence }));
  } else {
    checks.push(row('Redis persistence (AOF)', { ok: false, error: 'skipped — Redis down' }, 'WARNING'));
  }

  const bullmq = redis.ok
    ? await bullmqRoundTrip(cfg.redisUrl)
    : { ok: false, error: 'skipped — Redis unavailable' };
  checks.push(row('BullMQ enqueue/process/complete', bullmq));

  const qdrantReady = await probeQdrant(cfg.qdrantUrl, cfg.qdrantApiKey);
  checks.push(row('Qdrant HTTP health', qdrantReady));

  const qdrantCrud = qdrantReady.ok
    ? await qdrantCrudAndFilter(cfg.qdrantUrl, cfg.qdrantApiKey)
    : { ok: false, error: 'skipped — Qdrant unavailable' };
  checks.push(row('Qdrant collection CRUD + company filter', qdrantCrud));

  const embeddings = { ok: cfg.embeddingProvider !== 'none' && isProviderConfigured() };
  checks.push(row('Embedding provider configured', embeddings));

  const llm = buildLlmDependency({ state: 'closed' });
  checks.push(row('LLM provider configured', llm));

  const pm2 = probePm2Worker();
  const queueHealth = {
    ok: true,
    redis: redis.ok,
    workerRunning: false,
    provider: redis.ok ? 'bullmq' : 'inprocess-fallback',
  };
  const workerHealth = probeCopilotWorker(queueHealth);
  const workerCombined = {
    ok: pm2.ok || workerHealth.ok,
    pm2,
    processMode: workerHealth,
  };
  checks.push(
    row('Copilot worker (PM2 or in-process)', workerCombined, pm2.ok ? undefined : 'WARNING')
  );

  let backendHttp = { ok: false };
  try {
    const port = process.env.PORT || 5002;
    const res = await fetch(`http://127.0.0.1:${port}/api/health`).catch(() => null);
    backendHttp = {
      ok: Boolean(res && res.status < 500),
      status: res?.status || null,
      note: 'optional if API not running during validate',
    };
  } catch (err) {
    backendHttp = { ok: false, error: err.message };
  }
  checks.push(row('Backend HTTP health', backendHttp, 'WARNING'));

  const storage = probeFileStorage();
  checks.push(row('File storage writable', storage));

  const restartEvidence = {
    ok: false,
    note: 'Restart recovery not executed on this host (RC1.2 code/docs scope). Mark PASS after native service restart tests on Linux.',
  };
  checks.push(row('Service restart recovery evidence', restartEvidence, 'WARNING'));

  // Docker informational
  const docker = sh('docker version');
  checks.push(
    row('Docker (informational only)', { ok: true, present: docker.ok, detail: docker.out.slice(0, 120) }, 'WARNING')
  );

  const criticalFail = checks.some((c) => c.status === 'FAIL' && c.severity !== 'WARNING');
  // Force critical names
  const criticalNames = new Set([
    'MySQL connectivity',
    'Redis connectivity + version ≥5',
    'BullMQ enqueue/process/complete',
    'Qdrant HTTP health',
    'Qdrant collection CRUD + company filter',
    'LLM provider configured',
    'File storage writable',
  ]);
  const hasCriticalFail = checks.some(
    (c) => criticalNames.has(c.name) && c.status === 'FAIL'
  );
  const infraPass = !hasCriticalFail && !criticalFail;

  const md = `# RC1.2 Native Infrastructure Report

Generated: ${new Date().toISOString()}

Docker is **not** a production requirement. This report validates Redis, Qdrant, BullMQ, MySQL, LLM, worker, and storage.

| Check | Result | Severity |
|-------|--------|----------|
${checks.map((c) => `| ${c.name} | **${c.status}** | ${c.severity} |`).join('\n')}

**INFRA_PASS:** ${infraPass ? 'YES' : 'NO'}

\`\`\`json
${JSON.stringify({ redisUrl: cfg.redisUrl, qdrantUrl: cfg.qdrantUrl, checks }, null, 2)}
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
