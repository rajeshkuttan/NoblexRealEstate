'use strict';

const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '../../routes/leaseRevenueRoutes.js');
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
  'terminate',
];

const EXPECTED_PATHS = [
  "router.get('/dashboard'",
  "router.get('/reports/:type'",
  "router.get('/settings'",
  "router.put('/settings'",
  "router.get('/posting-queue'",
  "router.post('/posting-batches'",
  "router.post('/posting-batches/:id/process'",
  "router.get('/'",
  "router.post('/'",
  "router.post('/generate-from-lease'",
  "router.post('/amendments/:id/approve'",
  "router.post('/amendments/:id/reject'",
  "router.post('/reconciliations/:id/resolve'",
  "router.get('/:id'",
  "router.put('/:id'",
  "router.delete('/:id'",
  "router.post('/:id/clone'",
  "router.post('/:id/generate-schedule'",
  "router.post('/:id/regenerate-schedule'",
  "router.post('/:id/submit'",
  "router.post('/:id/approve'",
  "router.post('/:id/reject'",
  "router.post('/:id/activate'",
  "router.post('/:id/terminate'",
  "router.post('/:id/cancel'",
  "router.post('/:id/post-lines'",
  "router.post('/:id/lines/:lineId/post'",
  "router.post('/:id/lines/:lineId/reverse'",
  "router.post('/:id/lines/:lineId/repost'",
  "router.post('/:id/amendments'",
  "router.post('/:id/reconcile'",
];

describe('leaseRevenueRoutes — permission codes', () => {
  test('uses module:lease_revenue permission prefix', () => {
    expect(routesSource).toContain('module:lease_revenue:${action}');
  });

  for (const action of PERMISSION_ACTIONS) {
    test(`registers P('${action}') permission action`, () => {
      expect(routesSource).toContain(`P('${action}')`);
    });
  }

  test('reject route uses approve permission', () => {
    expect(routesSource).toMatch(/reject.*P\('approve'\)/);
  });

  test('cancel route uses delete permission', () => {
    expect(routesSource).toMatch(/cancel.*P\('delete'\)/);
  });
});

describe('leaseRevenueRoutes — route paths', () => {
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

  test('mounts leaseRevenueController handlers', () => {
    expect(routesSource).toContain('leaseRevenueController');
  });
});
