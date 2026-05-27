const fs = require('fs');
const path = require('path');

const routes = fs.readFileSync(
  path.join(__dirname, '../../../routes/payroll/index.js'),
  'utf8'
);

describe('P6 route wiring', () => {
  test('post run route', () => expect(routes).toMatch(/\/post\/run\/:id/));
  test('reverse run route', () => expect(routes).toMatch(/\/post\/run\/:id\/reverse/));
  test('post settlement route', () => expect(routes).toMatch(/\/post\/settlement\/:id/));
  test('wps clear route', () => expect(routes).toMatch(/\/post\/wps\/:id\/clear/));
  test('account config routes', () => expect(routes).toMatch(/\/account-config/));
  test('finance dashboard', () => expect(routes).toMatch(/\/finance\/dashboard/));
  test('finance.view permission on dashboard', () => expect(routes).toMatch(/payroll\.finance\.view/));
  test('finance.manage on post run', () => expect(routes).toMatch(/payroll\.finance\.manage/));
  test('finance.approve on reverse', () => expect(routes).toMatch(/payroll\.finance\.approve/));
});
