'use strict';

/**
 * Dedicated Copilot ingestion worker (PM2: realestate-copilot-worker).
 * Runs MySQL poller + optional BullMQ worker; no HTTP server.
 */
require('../config/config');
const { testConnection, syncDatabase } = require('../config/database');
const { startIndexerWorker, stopIndexerWorker } = require('./ingestion/indexerWorker');
const { startQueueWorker, stopQueueWorker } = require('./ingestion/ingestQueue');
const { isCopilotEnabled } = require('./config/copilotConfig');
const { logCopilot } = require('./observability/copilotLogger');

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Copilot worker shutting down (${signal})...`);
  stopIndexerWorker();
  await stopQueueWorker();
  try {
    const { sequelize } = require('../config/database');
    await sequelize.close();
  } catch (_) {
    /* ignore */
  }
  process.exit(0);
}

async function main() {
  if (!isCopilotEnabled()) {
    console.log('COPILOT_ENABLED=false — worker idle exit');
    process.exit(0);
  }
  await testConnection();
  await syncDatabase();
  startIndexerWorker();
  const q = await startQueueWorker();
  logCopilot('info', 'copilot_worker_process_started', {
    bullmq: q?.started || false,
    reason: q?.reason || null,
    pid: process.pid,
  });
  console.log('✅ Copilot worker online (indexer + queue)');
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection in copilot worker:', err);
  process.exit(1);
});

main().catch((err) => {
  console.error('❌ Copilot worker failed to start:', err);
  process.exit(1);
});
