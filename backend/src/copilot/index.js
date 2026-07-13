module.exports = {
  copilotRoutes: require('./routes/copilotRoutes'),
  isCopilotEnabled: require('./config/copilotConfig').isCopilotEnabled,
  shouldRunWorkers: require('./config/copilotConfig').shouldRunWorkers,
  startIndexerWorker: require('./ingestion/indexerWorker').startIndexerWorker,
  stopIndexerWorker: require('./ingestion/indexerWorker').stopIndexerWorker,
  startQueueWorker: require('./ingestion/ingestQueue').startQueueWorker,
  stopQueueWorker: require('./ingestion/ingestQueue').stopQueueWorker,
};
