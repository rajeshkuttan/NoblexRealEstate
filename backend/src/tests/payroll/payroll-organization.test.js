const org = require('../../controllers/payrollOrganizationController');

describe('Payroll organization controller', () => {
  test('listEntities returns registry keys', () => {
    const json = jest.fn();
    org.listEntities({}, { json });
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining(['departments', 'designations']),
      })
    );
  });

  test('unknown entity throws via list', async () => {
    const next = jest.fn();
    await org.list({ params: { entity: 'unknown' } }, {}, next);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});
