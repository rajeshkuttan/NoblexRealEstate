const {
  parseHeaderCompanyId,
  getUserCompanies,
  resolveActiveCompany,
} = require('../services/companyContextService');

jest.mock('../models', () => {
  const mockCompany = {
    id: 1,
    companyName: 'Default Company',
    isActive: true,
    currency: 'AED',
    timezone: 'Asia/Dubai',
  };

  return {
    CompanyUser: {
      findAll: jest.fn(),
      findOne: jest.fn(),
    },
    CompanySetting: {
      findByPk: jest.fn(),
      findOne: jest.fn(),
    },
    User: {},
    __mockCompany: mockCompany,
  };
});

const { CompanyUser, CompanySetting } = require('../models');

describe('company context service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('parseHeaderCompanyId parses valid header', () => {
    expect(parseHeaderCompanyId('42')).toBe(42);
    expect(parseHeaderCompanyId('')).toBeNull();
    expect(parseHeaderCompanyId('abc')).toBeNull();
  });

  test('resolveActiveCompany uses default when no header', async () => {
    CompanyUser.findAll.mockResolvedValue([
      {
        isDefault: true,
        roleInCompany: null,
        companySetting: { id: 1, companyName: 'A', isActive: true, currency: 'AED', timezone: 'Asia/Dubai' },
      },
    ]);
    CompanyUser.findOne.mockResolvedValue({
      companySetting: { id: 1, companyName: 'A', isActive: true },
    });

    const result = await resolveActiveCompany(10, null);
    expect(result.companyId).toBe(1);
  });

  test('resolveActiveCompany rejects unassigned company header', async () => {
    CompanyUser.findAll.mockResolvedValue([
      {
        isDefault: true,
        companySetting: { id: 1, companyName: 'A', isActive: true, currency: 'AED', timezone: 'Asia/Dubai' },
      },
    ]);

    await expect(resolveActiveCompany(10, 99)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('resolveActiveCompany requires selection when multiple and no default', async () => {
    CompanyUser.findAll.mockResolvedValue([
      { isDefault: false, companySetting: { id: 1, companyName: 'A', isActive: true, currency: 'AED', timezone: 'Asia/Dubai' } },
      { isDefault: false, companySetting: { id: 2, companyName: 'B', isActive: true, currency: 'AED', timezone: 'Asia/Dubai' } },
    ]);

    await expect(resolveActiveCompany(10, null)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Company selection required',
    });
  });

  test('getUserCompanies returns mapped list', async () => {
    CompanyUser.findAll.mockResolvedValue([
      {
        isDefault: true,
        roleInCompany: 'admin',
        companySetting: {
          id: 1,
          companyName: 'Test Co',
          companyNameArabic: null,
          logo: null,
          isActive: true,
          currency: 'AED',
          timezone: 'Asia/Dubai',
          vatNumber: null,
        },
      },
    ]);

    const list = await getUserCompanies(1);
    expect(list).toHaveLength(1);
    expect(list[0].company_name).toBe('Test Co');
    expect(list[0].is_default).toBe(true);
  });
});
