class SettlementLockedError extends Error {
  constructor(message = 'Final settlement is locked and cannot be modified') {
    super(message);
    this.name = 'SettlementLockedError';
    this.statusCode = 400;
  }
}

function assertSettlementMutable(settlement) {
  if (settlement?.status === 'LOCKED') {
    throw new SettlementLockedError();
  }
}

module.exports = { assertSettlementMutable, SettlementLockedError };
