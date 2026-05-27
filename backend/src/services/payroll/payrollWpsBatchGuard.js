class WpsBatchExportedError extends Error {
  constructor(message = 'WPS batch is exported and cannot be modified') {
    super(message);
    this.name = 'WpsBatchExportedError';
    this.statusCode = 400;
  }
}

function assertBatchNotExported(batch) {
  if (batch?.status === 'EXPORTED') {
    throw new WpsBatchExportedError();
  }
}

module.exports = { assertBatchNotExported, WpsBatchExportedError };
