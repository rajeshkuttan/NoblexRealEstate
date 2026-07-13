'use strict';

/**
 * Lightweight circuit breaker for LLM provider calls.
 */
class CircuitBreaker {
  constructor({ failureThreshold = 5, cooldownMs = 30000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.failures = 0;
    this.openUntil = 0;
  }

  canRequest() {
    if (Date.now() < this.openUntil) return false;
    return true;
  }

  recordSuccess() {
    this.failures = 0;
    this.openUntil = 0;
  }

  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.openUntil = Date.now() + this.cooldownMs;
      this.failures = 0;
    }
  }

  status() {
    const open = Date.now() < this.openUntil;
    return {
      state: open ? 'open' : 'closed',
      openUntil: open ? this.openUntil : null,
      failures: this.failures,
    };
  }
}

const llmBreaker = new CircuitBreaker({
  failureThreshold: parseInt(process.env.COPILOT_LLM_FAILURE_THRESHOLD || '5', 10),
  cooldownMs: parseInt(process.env.COPILOT_LLM_COOLDOWN_MS || '30000', 10),
});

module.exports = { CircuitBreaker, llmBreaker };
