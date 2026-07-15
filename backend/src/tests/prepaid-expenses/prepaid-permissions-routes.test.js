'use strict';

const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '../../routes/prepaidExpenseRoutes.js');
const routesSource = fs.readFileSync(routesPath, 'utf8');

const PERMISSION_ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'settings',
  'post',
  'approve',
  'submit',
  'generate_schedule',
  'reverse',
  'amend',
  'reconcile',
];

const EXPECTED_PATHS = [
  "router.get('/dashboard'",
  "router.get('/reports/:type'",
  "router.get('/categories'",
  "router.post('/categories'",
  "router.get('/settings'",
  "router.get('/posting-queue'",
  "router.post('/posting-batches'",
  "router.post('/:id/submit'",
  "router.post('/:id/approve'",
  "router.post('/:id/post-lines'",
  "router.post('/:id/amendments'",
  "router.post('/:id/reconcile'",
  "router.post('/amendments/:id/approve'",
  "router.post('/reconciliations/:id/resolve'",
];

describe('prepaidExpenseRoutes — permission codes', () => {
  test('uses module:prepaid_expenses permission prefix', () => {
    expect(routesSource).toContain('module:prepaid_expenses:${action}');
  });

  for (const action of PERMISSION_ACTIONS) {
    test(`registers P('${action}') permission action`, () => {
      expect(routesSource).toContain(`P('${action}')`);
    });
  }
});

describe('prepaidExpenseRoutes — route paths', () => {
  for (const route of EXPECTED_PATHS) {
    test(`registers ${route}`, () => {
      expect(routesSource).toContain(route);
    });
  }

  test('applies authenticateToken middleware', () => {
    expect(routesSource).toContain('authenticateToken');
  });

  test('applies resolveCompanyContext middleware', () => {
    expect(routesSource).toContain('resolveCompanyContext');
  });

  test('exports router module', () => {
    expect(routesSource).toContain('module.exports = router');
  });
});
