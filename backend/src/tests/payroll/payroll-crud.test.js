const { makeCrudHandlers } = require('../../utils/payrollCrud');

describe('payrollCrud makeCrudHandlers', () => {
  const MockModel = {
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };

  test('list returns pagination shape', async () => {
    MockModel.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    const { list } = makeCrudHandlers(MockModel, { searchFields: ['name'] });
    const json = jest.fn();
    await list({ companyId: 1, query: {} }, { json }, jest.fn());
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [], pagination: expect.any(Object) })
    );
  });
});
