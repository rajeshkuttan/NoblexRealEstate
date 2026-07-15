'use strict';

/**
 * Optional BullMQ queue with in-process fallback.
 * When Redis is unavailable, jobs run via the existing indexer tick.
 */
const { getCopilotConfig } = require('../config/copilotConfig');
const { logCopilot } = require('../observability/copilotLogger');

let queue = null;
let worker = null;
let redisOk = null;

async function probeRedis() {
  const url = process.env.COPILOT_REDIS_URL || process.env.REDIS_URL || '';
  if (!url) {
    redisOk = false;
    return false;
  }
  let client;
  try {
    const IORedis = require('ioredis');
    client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
      // Fail once — do not retry forever and spam the process with ECONNREFUSED.
      retryStrategy: () => null,
    });
    client.on('error', () => {});
    await client.connect();
    await client.ping();
    redisOk = true;
    return true;
  } catch (err) {
    logCopilot('info', 'redis_unavailable_fallback_inprocess', { error: err.message });
    redisOk = false;
    return false;
  } finally {
    if (client) {
      try {
        await client.quit();
      } catch (_) {
        try {
          client.disconnect();
        } catch (__) {
          /* ignore */
        }
      }
    }
  }
}

async function enqueueDocumentIndex(documentId) {
  const cfg = getCopilotConfig();
  if (!cfg.useBullmq) {
    const { tick } = require('./indexerWorker');
    void tick();
    return { mode: 'inprocess', queued: false };
  }

  const ok = redisOk == null ? await probeRedis() : redisOk;
  if (!ok) {
    const { tick } = require('./indexerWorker');
    void tick();
    return { mode: 'inprocess-fallback', queued: false };
  }

  try {
    const { Queue } = require('bullmq');
    const connection = { url: process.env.COPILOT_REDIS_URL || process.env.REDIS_URL };
    if (!queue) queue = new Queue('copilot-ingest', { connection });
    await queue.add('index-document', { documentId }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    return { mode: 'bullmq', queued: true };
  } catch (err) {
    logCopilot('error', 'bullmq_enqueue_failed', { error: err.message });
    const { tick } = require('./indexerWorker');
    void tick();
    return { mode: 'inprocess-fallback', queued: false, error: err.message };
  }
}

async function startQueueWorker() {
  const cfg = getCopilotConfig();
  if (!cfg.useBullmq) return { started: false, reason: 'disabled' };
  const ok = await probeRedis();
  if (!ok) return { started: false, reason: 'redis_unavailable' };

  try {
    const { Worker } = require('bullmq');
    const connection = { url: process.env.COPILOT_REDIS_URL || process.env.REDIS_URL };
    worker = new Worker(
      'copilot-ingest',
      async (job) => {
        const { claimNextDocument, processDocument } = require('./indexerWorker');
        if (job.data?.documentId) {
          const { CopilotDocument } = require('../../models');
          const doc = await CopilotDocument.findByPk(job.data.documentId);
          if (doc && doc.ingestionStatus === 'pending') await processDocument(doc);
          return;
        }
        const doc = await claimNextDocument();
        if (doc) await processDocument(doc);
      },
      { connection, concurrency: 1 }
    );
    worker.on('failed', (job, err) => {
      logCopilot('error', 'bullmq_job_failed', { jobId: job?.id, error: err.message });
    });
    logCopilot('info', 'bullmq_worker_started', {});
    return { started: true };
  } catch (err) {
    logCopilot('error', 'bullmq_worker_start_failed', { error: err.message });
    return { started: false, reason: err.message };
  }
}

async function stopQueueWorker() {
  if (worker) {
    try {
      await worker.close();
    } catch (_) {
      /* ignore */
    }
    worker = null;
  }
  if (queue) {
    try {
      await queue.close();
    } catch (_) {
      /* ignore */
    }
    queue = null;
  }
}

async function healthCheck() {
  const cfg = getCopilotConfig();
  if (!cfg.useBullmq) {
    return { ok: true, provider: 'inprocess', bullmq: false, redis: false, queue: 'copilot-ingest' };
  }
  const ok = redisOk == null ? await probeRedis() : redisOk;
  return {
    ok: true,
    provider: ok ? 'bullmq' : 'inprocess-fallback',
    bullmq: cfg.useBullmq,
    redis: ok,
    queue: 'copilot-ingest',
    workerRunning: Boolean(worker),
  };
}

function getQueueHealthSync() {
  return {
    bullmqEnabled: Boolean(getCopilotConfig().useBullmq),
    redisOk,
    workerRunning: Boolean(worker),
  };
}

module.exports = {
  enqueueDocumentIndex,
  startQueueWorker,
  stopQueueWorker,
  healthCheck,
  getQueueHealthSync,
  probeRedis,
};
