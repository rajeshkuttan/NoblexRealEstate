const {
  assignUserToCompany,
  removeUserFromCompany,
  setUserDefaultCompany,
  assertCanDeactivateCompany,
  switchCompanyForUser,
  parseHeaderCompanyId,
} = require('../services/companyContextService');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

jest.mock('../models', () => {
  const mockCompanySetting = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  };
  const mockCompanyUser = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findOrCreate: jest.fn(),
    destroy: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const mockUser = { findByPk: jest.fn() };
  const mockAuditLog = { create: jest.fn() };

  return {
    CompanySetting: mockCompanySetting,
    CompanyUser: mockCompanyUser,
    User: mockUser,
    AuditLog: mockAuditLog,
    sequelize: {
      transaction: jest.fn((fn) => fn({})),
      query: jest.fn(),
      QueryTypes: { SELECT: 'SELECT' },
    },
  };
});

const { CompanySetting, CompanyUser, User, AuditLog, sequelize } = require('../models');

describe('Phase 1.5 company admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('parseHeaderCompanyId parses valid header', () => {
    expect(parseHeaderCompanyId('3')).toBe(3);
    expect(parseHeaderCompanyId('')).toBeNull();
  });

  test('assignUserToCompany rejects inactive company', async () => {
    CompanySetting.findByPk.mockResolvedValue({ id: 1, isActive: false });
    await expect(assignUserToCompany(1, 2, {})).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('assignUserToCompany reactivates existing membership', async () => {
    CompanySetting.findByPk.mockResolvedValue({ id: 1, isActive: true });
    User.findByPk.mockResolvedValue({ id: 2 });
    const membership = { update: jest.fn(), isActive: false, roleInCompany: null };
    CompanyUser.findOrCreate.mockResolvedValue([membership, false]);
    await assignUserToCompany(1, 2, { roleInCompany: 'Manager' });
    expect(membership.update).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true, roleInCompany: 'Manager' })
    );
  });

  test('setUserDefaultCompany rejects inactive membership', async () => {
    CompanyUser.findOne.mockResolvedValue({
      isActive: false,
      companySetting: { isActive: true },
    });
    await expect(setUserDefaultCompany(2, 1)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('removeUserFromCompany blocks last active membership', async () => {
    CompanyUser.count.mockResolvedValue(1);
    CompanyUser.findOne.mockResolvedValue({ companyId: 1, userId: 2, isActive: true });
    await expect(removeUserFromCompany(1, 2, {})).rejects.toMatchObject({ statusCode: 400 });
  });

  test('assertCanDeactivateCompany blocks last system company', async () => {
    CompanySetting.findByPk.mockResolvedValue({ id: 1, isActive: true });
    CompanySetting.count.mockResolvedValue(1);
    await expect(assertCanDeactivateCompany(1, {})).rejects.toMatchObject({ statusCode: 400 });
  });

  test('logCompanyEvent writes audit row', async () => {
    AuditLog.create.mockResolvedValue({});
    await logCompanyEvent({
      req: { user: { id: 1 }, ip: '127.0.0.1', headers: {}, method: 'POST', originalUrl: '/switch' },
      action: COMPANY_AUDIT_ACTIONS.COMPANY_SWITCHED,
      entityId: 2,
      metadata: { target_company_id: 2 },
    });
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'company_settings',
        entityId: 2,
        action: 'COMPANY_SWITCHED',
        userId: 1,
      })
    );
  });

  test('switchCompanyForUser requires membership', async () => {
    CompanyUser.findOne.mockResolvedValue(null);
    await expect(switchCompanyForUser(1, 99)).rejects.toMatchObject({ statusCode: 403 });
  });
});
