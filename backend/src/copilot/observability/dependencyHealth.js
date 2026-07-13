'use strict';

/**
 * Shared Copilot dependency probes for health endpoint + RC1.2 validate.
 */
const fs = require('fs');
const path = require('path');
const { getCopilotConfig, isProviderConfigured, shouldRunWorkers } = require('../config/copilotConfig');

function nowIso() {
  return new Date().toISOString();
}

async function withLatency(fn) {
  const t0 = Date.now();
  try {
    const result = await fn();
    return { ...result, latencyMs: Date.now() - t0, lastCheckedAt: nowIso() };
  } catch (err) {
    return {
      ok: false,
      status: 'fail',
      error: err.message,
      latencyMs: Date.now() - t0,
      lastCheckedAt: nowIso(),
    };
  }
}

async function probeMysql(sequelize) {
  return withLatency(async () => {
    await sequelize.authenticate();
    return { ok: true, status: 'ok', required: true };
  });
}

async function probeRedis(redisUrl) {
  const url = redisUrl || getCopilotConfig().redisUrl;
  if (!url) {
    return {
      ok: false,
      status: 'fail',
      error: 'REDIS URL unset',
      required: getCopilotConfig().useBullmq,
      lastCheckedAt: nowIso(),
      latencyMs: 0,
    };
  }
  return withLatency(async () => {
    const IORedis = require('ioredis');
    const client = new IORedis(url, {
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
    const persist = await client.info('persistence');
    await client.quit().catch(() => {});
    const m = info.match(/redis_version:([0-9.]+)/);
    const version = m ? m[1] : 'unknown';
    const major = parseInt(String(version).split('.')[0], 10) || 0;
    const aof = /aof_enabled:1/.test(persist) || /aof_enabled:yes/i.test(persist);
    return {
      ok: pong === 'PONG' && major >= 5,
      status: pong === 'PONG' && major >= 5 ? 'ok' : 'fail',
      version,
      major,
      pong,
      aofEnabled: aof,
      required: getCopilotConfig().useBullmq,
      error: major < 5 ? `Redis ${version} < 5` : undefined,
    };
  });
}

async function probeQdrant(baseUrl, apiKey) {
  const cfg = getCopilotConfig();
  const url = String(baseUrl || cfg.qdrantUrl || '').replace(/\/$/, '');
  const required = ['hybrid', 'qdrant'].includes(cfg.retrievalMode);
  if (!url) {
    return {
      ok: !required,
      status: required ? 'fail' : 'skipped',
      error: 'QDRANT URL unset',
      required,
      lastCheckedAt: nowIso(),
      latencyMs: 0,
    };
  }
  return withLatency(async () => {
    const headers = {};
    const key = apiKey || cfg.qdrantApiKey;
    if (key) headers['api-key'] = key;
    const ready = await fetch(`${url}/readyz`, { headers });
    return {
      ok: ready.ok,
      status: ready.ok ? 'ok' : 'fail',
      httpStatus: ready.status,
      required,
      collection: cfg.qdrantCollection,
      error: ready.ok ? undefined : `readyz ${ready.status}`,
    };
  });
}

function probeFileStorage() {
  const cfg = getCopilotConfig();
  const root =
    cfg.uploadDir ||
    path.join(__dirname, '../../../uploads/copilot');
  const t0 = Date.now();
  try {
    fs.mkdirSync(root, { recursive: true });
    const probe = path.join(root, `.rc12-write-probe-${process.pid}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return {
      ok: true,
      status: 'ok',
      path: root,
      required: true,
      latencyMs: Date.now() - t0,
      lastCheckedAt: nowIso(),
    };
  } catch (err) {
    return {
      ok: false,
      status: 'fail',
      path: root,
      error: err.message,
      required: true,
      latencyMs: Date.now() - t0,
      lastCheckedAt: nowIso(),
    };
  }
}

function probeCopilotWorker(queueHealth) {
  const runWorkers = shouldRunWorkers();
  const mode = runWorkers ? 'inprocess' : 'pm2-expected';
  const workerRunning = Boolean(queueHealth?.workerRunning);
  // Dedicated PM2 worker: API has RUN_WORKERS=false; worker process sets true.
  // Health from API: ok if Redis/BullMQ path healthy OR in-process workers running.
  const ok = runWorkers
    ? true
    : Boolean(queueHealth?.redis || queueHealth?.ok);
  return {
    ok,
    status: ok ? 'ok' : 'degraded',
    mode,
    runWorkersInThisProcess: runWorkers,
    bullmqWorkerRunning: workerRunning,
    required: true,
    lastCheckedAt: nowIso(),
    latencyMs: 0,
    note: runWorkers
      ? 'Indexer/queue workers run in this process'
      : 'API expects realestate-copilot-worker under PM2',
  };
}

function buildLlmDependency(breaker) {
  const cfg = getCopilotConfig();
  const ok = isProviderConfigured();
  return {
    ok,
    status: ok ? 'ok' : 'fail',
    provider: cfg.defaultProvider,
    circuit: breaker,
    required: true,
    lastCheckedAt: nowIso(),
    latencyMs: 0,
    error: ok ? undefined : 'LLM provider not configured',
  };
}

module.exports = {
  probeMysql,
  probeRedis,
  probeQdrant,
  probeFileStorage,
  probeCopilotWorker,
  buildLlmDependency,
  withLatency,
  nowIso,
};
