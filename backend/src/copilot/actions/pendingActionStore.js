'use strict';

const crypto = require('crypto');
const { getCopilotConfig } = require('../config/copilotConfig');

/** In-memory pending confirmations (TTL). Redis can replace this later. */
const store = new Map();

function prune() {
  const now = Date.now();
  for (const [token, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(token);
  }
}

function createPendingAction(payload) {
  prune();
  const token = crypto.randomBytes(24).toString('hex');
  const ttl = getCopilotConfig().actionConfirmTtlMs;
  const entry = {
    ...payload,
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl,
  };
  store.set(token, entry);
  return entry;
}

function getPendingAction(token) {
  prune();
  const entry = store.get(token);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(token);
    return null;
  }
  return entry;
}

function consumePendingAction(token) {
  const entry = getPendingAction(token);
  if (!entry) return null;
  store.delete(token);
  return entry;
}

function clearAllForTests() {
  store.clear();
}

module.exports = {
  createPendingAction,
  getPendingAction,
  consumePendingAction,
  clearAllForTests,
};
