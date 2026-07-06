'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../config.env') });

const { sequelize } = require('../../config/database');
const { runSeed } = require('../../scripts/seed-investment-posting-fixtures');
const { runValidation } = require('../../scripts/validate-investment-posting');

jest.setTimeout(180000);

describe('Investment posting integration (live DB)', () => {
  let canRun = false;

  beforeAll(async () => {
    try {
      await sequelize.authenticate();
      canRun = true;
    } catch (e) {
      console.warn('investment-posting-integration: skipped —', e.message);
    }
  });

  afterAll(async () => {
    try {
      await sequelize.close();
    } catch (_) {
      /* ignore */
    }
  });

  beforeEach(function () {
    if (!canRun) this.pending();
  });

  test('seed posting fixtures completes', async () => {
    const result = await runSeed();
    expect(result.postedCount).toBeGreaterThan(0);
  });

  test('validation passes for all posting scenarios', async () => {
    await sequelize.authenticate();
    const { overallPass, errors } = await runValidation();
    if (!overallPass) console.warn('Validation errors:', errors);
    expect(overallPass).toBe(true);
  });
});
