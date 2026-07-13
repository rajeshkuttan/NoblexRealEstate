const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const companyIdField = {
  type: DataTypes.INTEGER,
  allowNull: false,
  field: 'company_id',
};

const modelOpts = (tableName, extra = {}) => ({
  tableName,
  timestamps: true,
  underscored: true,
  ...extra,
});

const testDataField = {
  isTestData: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_test_data' },
};

const archiveFields = {
  isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_archived' },
};

const InvestmentCategory = sequelize.define(
  'InvestmentCategory',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    name: { type: DataTypes.STRING(200), allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false },
    assetClass: { type: DataTypes.STRING(100), allowNull: true, field: 'asset_class' },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    ...testDataField,
    ...archiveFields,
  },
  modelOpts('investment_categories', { paranoid: true, deletedAt: 'deleted_at' })
);

const InvestmentAsset = sequelize.define(
  'InvestmentAsset',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    categoryId: { type: DataTypes.INTEGER, allowNull: true, field: 'category_id' },
    investmentCode: { type: DataTypes.STRING(50), allowNull: false, field: 'investment_code' },
    investmentName: { type: DataTypes.STRING(255), allowNull: false, field: 'investment_name' },
    assetType: { type: DataTypes.STRING(100), allowNull: false, field: 'asset_type' },
    instrumentType: { type: DataTypes.STRING(100), allowNull: true, field: 'instrument_type' },
    marketName: { type: DataTypes.STRING(200), allowNull: true, field: 'market_name' },
    tickerSymbol: { type: DataTypes.STRING(50), allowNull: true, field: 'ticker_symbol' },
    isinCode: { type: DataTypes.STRING(50), allowNull: true, field: 'isin_code' },
    brokerName: { type: DataTypes.STRING(200), allowNull: true, field: 'broker_name' },
    custodianName: { type: DataTypes.STRING(200), allowNull: true, field: 'custodian_name' },
    currencyCode: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'currency_code' },
    accountingClassification: {
      type: DataTypes.ENUM('COST', 'AMORTISED_COST', 'FVTPL', 'FVOCI'),
      allowNull: false,
      defaultValue: 'COST',
      field: 'accounting_classification',
    },
    riskLevel: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      allowNull: false,
      defaultValue: 'MEDIUM',
      field: 'risk_level',
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'SOLD', 'MATURED', 'CLOSED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    acquisitionDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'acquisition_date' },
    maturityDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'maturity_date' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
    ...archiveFields,
  },
  modelOpts('investment_assets', { paranoid: true, deletedAt: 'deleted_at' })
);

const InvestmentHolding = sequelize.define(
  'InvestmentHolding',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    investmentAssetId: { type: DataTypes.INTEGER, allowNull: false, field: 'investment_asset_id' },
    quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
    averageCost: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0, field: 'average_cost' },
    totalCost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_cost' },
    currentPrice: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0, field: 'current_price' },
    currentMarketValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'current_market_value' },
    baseCurrencyValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'base_currency_value' },
    unrealizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'unrealized_gain_loss' },
    realizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'realized_gain_loss' },
    lastValuationDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'last_valuation_date' },
  },
  modelOpts('investment_holdings')
);

const InvestmentTransaction = sequelize.define(
  'InvestmentTransaction',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    investmentAssetId: { type: DataTypes.INTEGER, allowNull: false, field: 'investment_asset_id' },
    transactionNo: { type: DataTypes.STRING(50), allowNull: false, field: 'transaction_no' },
    transactionType: {
      type: DataTypes.ENUM(
        'BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'BONUS', 'SPLIT',
        'CHARGE', 'REVALUATION', 'FX_GAIN_LOSS', 'MATURITY', 'WRITE_OFF'
      ),
      allowNull: false,
      field: 'transaction_type',
    },
    transactionDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'transaction_date' },
    quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
    unitPrice: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0, field: 'unit_price' },
    grossAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'gross_amount' },
    chargesAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'charges_amount' },
    taxAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'tax_amount' },
    netAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'net_amount' },
    currencyCode: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'currency_code' },
    exchangeRate: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 1, field: 'exchange_rate' },
    baseAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'base_amount' },
    bankAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'bank_account_id' },
    journalVoucherId: { type: DataTypes.INTEGER, allowNull: true, field: 'journal_voucher_id' },
    postingStatus: {
      type: DataTypes.ENUM('DRAFT', 'APPROVED', 'POSTED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
      field: 'posting_status',
    },
    approvalStatus: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
      field: 'approval_status',
    },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    transactionOrigin: {
      type: DataTypes.ENUM('LEGACY', 'OMS', 'MIGRATION', 'API', 'IMPORT', 'CORPORATE_ACTION', 'SYSTEM'),
      allowNull: false,
      defaultValue: 'LEGACY',
      field: 'transaction_origin',
    },
    externalReference: { type: DataTypes.STRING(100), allowNull: true, field: 'external_reference' },
    brokerReference: { type: DataTypes.STRING(100), allowNull: true, field: 'broker_reference' },
    legacyEntryReason: { type: DataTypes.TEXT, allowNull: true, field: 'legacy_entry_reason' },
    ...testDataField,
  },
  modelOpts('investment_transactions')
);

const InvestmentPartnerAllocation = sequelize.define(
  'InvestmentPartnerAllocation',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    investmentAssetId: { type: DataTypes.INTEGER, allowNull: false, field: 'investment_asset_id' },
    investorType: {
      type: DataTypes.ENUM('OWNER', 'PARTNER', 'COMPANY'),
      allowNull: false,
      field: 'investor_type',
    },
    investorRefId: { type: DataTypes.INTEGER, allowNull: true, field: 'investor_ref_id' },
    investorName: { type: DataTypes.STRING(200), allowNull: false, field: 'investor_name' },
    contributionAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'contribution_amount' },
    ownershipPercentage: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0, field: 'ownership_percentage' },
    profitSharePercentage: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0, field: 'profit_share_percentage' },
    dividendSharePercentage: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0, field: 'dividend_share_percentage' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    ...testDataField,
  },
  modelOpts('investment_partner_allocations')
);

const InvestmentValuationHistory = sequelize.define(
  'InvestmentValuationHistory',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    investmentAssetId: { type: DataTypes.INTEGER, allowNull: false, field: 'investment_asset_id' },
    valuationNo: { type: DataTypes.STRING(50), allowNull: true, field: 'valuation_no' },
    valuationDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'valuation_date' },
    quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
    price: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
    marketValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'market_value' },
    exchangeRate: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 1, field: 'exchange_rate' },
    baseMarketValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'base_market_value' },
    unrealizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'unrealized_gain_loss' },
    valuationSource: {
      type: DataTypes.ENUM('MANUAL', 'IMPORT', 'API'),
      allowNull: false,
      defaultValue: 'MANUAL',
      field: 'valuation_source',
    },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvalStatus: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
      field: 'approval_status',
    },
    ...testDataField,
  },
  modelOpts('investment_valuation_history')
);

const InvestmentDocument = sequelize.define(
  'InvestmentDocument',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    investmentAssetId: { type: DataTypes.INTEGER, allowNull: false, field: 'investment_asset_id' },
    documentType: { type: DataTypes.STRING(100), allowNull: false, field: 'document_type' },
    fileName: { type: DataTypes.STRING(255), allowNull: false, field: 'file_name' },
    filePath: { type: DataTypes.STRING(500), allowNull: false, field: 'file_path' },
    uploadedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'uploaded_by' },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  modelOpts('investment_documents')
);

const InvestmentAccountConfiguration = sequelize.define(
  'InvestmentAccountConfiguration',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'company_id' },
    investmentAssetAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'investment_asset_account' },
    dividendIncomeAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'dividend_income_account' },
    interestIncomeAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'interest_income_account' },
    realizedGainAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'realized_gain_account' },
    realizedLossAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'realized_loss_account' },
    unrealizedGainAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'unrealized_gain_account' },
    unrealizedLossAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'unrealized_loss_account' },
    brokerageChargesAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'brokerage_charges_account' },
    bankChargesAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'bank_charges_account' },
    fxGainAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'fx_gain_account' },
    fxLossAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'fx_loss_account' },
    partnerPayableAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'partner_payable_account' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  modelOpts('investment_account_configurations')
);

const InvestmentDistribution = sequelize.define(
  'InvestmentDistribution',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    distributionNo: { type: DataTypes.STRING(50), allowNull: false, field: 'distribution_no' },
    distributionDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'distribution_date' },
    distributionType: {
      type: DataTypes.ENUM('DIVIDEND', 'INTEREST', 'SELL_PROFIT'),
      allowNull: false,
      field: 'distribution_type',
    },
    investmentAssetId: { type: DataTypes.INTEGER, allowNull: false, field: 'investment_asset_id' },
    sourceTransactionId: { type: DataTypes.INTEGER, allowNull: false, field: 'source_transaction_id' },
    totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
    bankAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'bank_account_id' },
    postingStatus: {
      type: DataTypes.ENUM('DRAFT', 'APPROVED', 'POSTED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
      field: 'posting_status',
    },
    approvalStatus: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
      field: 'approval_status',
    },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    journalVoucherId: { type: DataTypes.INTEGER, allowNull: true, field: 'journal_voucher_id' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_distributions')
);

const InvestmentDistributionLine = sequelize.define(
  'InvestmentDistributionLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    distributionId: { type: DataTypes.INTEGER, allowNull: false, field: 'distribution_id' },
    allocationId: { type: DataTypes.INTEGER, allowNull: true, field: 'allocation_id' },
    investorName: { type: DataTypes.STRING(200), allowNull: false, field: 'investor_name' },
    investorRefId: { type: DataTypes.INTEGER, allowNull: true, field: 'investor_ref_id' },
    sharePercentage: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0, field: 'share_percentage' },
    shareAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'share_amount' },
  },
  modelOpts('investment_distribution_lines')
);

const InvestmentValuationProviderConfig = sequelize.define(
  'InvestmentValuationProviderConfig',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    providerName: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'manual', field: 'provider_name' },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    apiKeyEnvVar: { type: DataTypes.STRING(100), allowNull: true, field: 'api_key_env_var' },
    supportedAssetClasses: { type: DataTypes.JSON, allowNull: true, field: 'supported_asset_classes' },
    refreshFrequencyMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1440, field: 'refresh_frequency_minutes' },
    lastRunAt: { type: DataTypes.DATE, allowNull: true, field: 'last_run_at' },
    lastStatus: { type: DataTypes.STRING(255), allowNull: true, field: 'last_status' },
  },
  modelOpts('investment_valuation_provider_configs')
);

const InvestmentBroker = sequelize.define(
  'InvestmentBroker',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    brokerCode: { type: DataTypes.STRING(50), allowNull: false, field: 'broker_code' },
    brokerName: { type: DataTypes.STRING(255), allowNull: false, field: 'broker_name' },
    contactEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'contact_email' },
    contactPhone: { type: DataTypes.STRING(50), allowNull: true, field: 'contact_phone' },
    countryCode: { type: DataTypes.STRING(10), allowNull: true, field: 'country_code' },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
    ...testDataField,
  },
  modelOpts('investment_brokers', { paranoid: true, deletedAt: 'deleted_at' })
);

const InvestmentCustodian = sequelize.define(
  'InvestmentCustodian',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    custodianCode: { type: DataTypes.STRING(50), allowNull: false, field: 'custodian_code' },
    custodianName: { type: DataTypes.STRING(255), allowNull: false, field: 'custodian_name' },
    contactEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'contact_email' },
    contactPhone: { type: DataTypes.STRING(50), allowNull: true, field: 'contact_phone' },
    countryCode: { type: DataTypes.STRING(10), allowNull: true, field: 'country_code' },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
    ...testDataField,
  },
  modelOpts('investment_custodians', { paranoid: true, deletedAt: 'deleted_at' })
);

const InvestmentPortfolio = sequelize.define(
  'InvestmentPortfolio',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioCode: { type: DataTypes.STRING(50), allowNull: false, field: 'portfolio_code' },
    portfolioName: { type: DataTypes.STRING(255), allowNull: false, field: 'portfolio_name' },
    reportingCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'reporting_currency' },
    baseCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'base_currency' },
    portfolioType: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'GENERAL', field: 'portfolio_type' },
    riskProfile: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      allowNull: false,
      defaultValue: 'MEDIUM',
      field: 'risk_profile',
    },
    inceptionDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'inception_date' },
    closeDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'close_date' },
    status: { type: DataTypes.ENUM('ACTIVE', 'CLOSED', 'DRAFT'), allowNull: false, defaultValue: 'ACTIVE' },
    managerUserId: { type: DataTypes.INTEGER, allowNull: true, field: 'manager_user_id' },
    custodianId: { type: DataTypes.INTEGER, allowNull: true, field: 'custodian_id' },
    defaultBrokerId: { type: DataTypes.INTEGER, allowNull: true, field: 'default_broker_id' },
    defaultBankAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'default_bank_account_id' },
    accountingMethod: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'COST', field: 'accounting_method' },
    costBasisMethod: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'AVERAGE', field: 'cost_basis_method' },
    description: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_portfolios', { paranoid: true, deletedAt: 'deleted_at' })
);

const InvestmentBook = sequelize.define(
  'InvestmentBook',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    bookCode: { type: DataTypes.STRING(50), allowNull: false, field: 'book_code' },
    bookName: { type: DataTypes.STRING(255), allowNull: false, field: 'book_name' },
    bookType: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'TRADING', field: 'book_type' },
    accountingBasis: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'COST', field: 'accounting_basis' },
    reportingCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'reporting_currency' },
    activeFrom: { type: DataTypes.DATEONLY, allowNull: true, field: 'active_from' },
    activeTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'active_to' },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
  },
  modelOpts('investment_books')
);

const InvestmentInstrument = sequelize.define(
  'InvestmentInstrument',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    instrumentCode: { type: DataTypes.STRING(50), allowNull: false, field: 'instrument_code' },
    instrumentName: { type: DataTypes.STRING(255), allowNull: false, field: 'instrument_name' },
    shortName: { type: DataTypes.STRING(100), allowNull: true, field: 'short_name' },
    assetClass: { type: DataTypes.STRING(100), allowNull: true, field: 'asset_class' },
    instrumentType: { type: DataTypes.STRING(100), allowNull: true, field: 'instrument_type' },
    isin: { type: DataTypes.STRING(50), allowNull: true },
    ticker: { type: DataTypes.STRING(50), allowNull: true },
    exchange: { type: DataTypes.STRING(100), allowNull: true },
    issuerName: { type: DataTypes.STRING(255), allowNull: true, field: 'issuer_name' },
    countryCode: { type: DataTypes.STRING(10), allowNull: true, field: 'country_code' },
    sectorCode: { type: DataTypes.STRING(50), allowNull: true, field: 'sector_code' },
    currencyCode: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'currency_code' },
    faceValue: { type: DataTypes.DECIMAL(18, 6), allowNull: true, field: 'face_value' },
    couponRate: { type: DataTypes.DECIMAL(12, 6), allowNull: true, field: 'coupon_rate' },
    maturityDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'maturity_date' },
    isRestricted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_restricted' },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MATURED', 'DELISTED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    legacyAssetId: { type: DataTypes.INTEGER, allowNull: true, field: 'legacy_asset_id' },
    ...testDataField,
  },
  modelOpts('investment_instruments', { paranoid: true, deletedAt: 'deleted_at' })
);

const InvestmentInstrumentAttribute = sequelize.define(
  'InvestmentInstrumentAttribute',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    instrumentId: { type: DataTypes.INTEGER, allowNull: false, field: 'instrument_id' },
    attrKey: { type: DataTypes.STRING(100), allowNull: false, field: 'attr_key' },
    attrValue: { type: DataTypes.TEXT, allowNull: true, field: 'attr_value' },
  },
  modelOpts('investment_instrument_attributes')
);

const InvestmentAccount = sequelize.define(
  'InvestmentAccount',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
    accountCode: { type: DataTypes.STRING(50), allowNull: false, field: 'account_code' },
    accountName: { type: DataTypes.STRING(255), allowNull: false, field: 'account_name' },
    accountType: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'BROKERAGE', field: 'account_type' },
    brokerId: { type: DataTypes.INTEGER, allowNull: true, field: 'broker_id' },
    custodianId: { type: DataTypes.INTEGER, allowNull: true, field: 'custodian_id' },
    bankAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'bank_account_id' },
    currencyCode: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'currency_code' },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
    ...testDataField,
  },
  modelOpts('investment_accounts', { paranoid: true, deletedAt: 'deleted_at' })
);

const InvestmentHoldingV2 = sequelize.define(
  'InvestmentHoldingV2',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    bookId: { type: DataTypes.INTEGER, allowNull: false, field: 'book_id' },
    instrumentId: { type: DataTypes.INTEGER, allowNull: false, field: 'instrument_id' },
    legacyAssetId: { type: DataTypes.INTEGER, allowNull: true, field: 'legacy_asset_id' },
    quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
    averageCost: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0, field: 'average_cost' },
    totalCost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_cost' },
    currentPrice: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0, field: 'current_price' },
    currentMarketValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'current_market_value' },
    baseCurrencyValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'base_currency_value' },
    unrealizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'unrealized_gain_loss' },
    realizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'realized_gain_loss' },
    lastValuationDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'last_valuation_date' },
  },
  modelOpts('investment_holdings_v2')
);

const InvestmentPositionLot = sequelize.define(
  'InvestmentPositionLot',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    holdingV2Id: { type: DataTypes.INTEGER, allowNull: false, field: 'holding_v2_id' },
    lotRef: { type: DataTypes.STRING(50), allowNull: true, field: 'lot_ref' },
    openDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'open_date' },
    quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
    remainingQuantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, field: 'remaining_quantity' },
    unitCost: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0, field: 'unit_cost' },
    totalCost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_cost' },
    status: { type: DataTypes.ENUM('OPEN', 'CLOSED'), allowNull: false, defaultValue: 'OPEN' },
    lotOrigin: {
      type: DataTypes.ENUM('TRADE', 'MIGRATION_OPENING', 'CORPORATE_ACTION', 'ADJUSTMENT', 'IMPORT'),
      allowNull: false,
      defaultValue: 'TRADE',
      field: 'lot_origin',
    },
    legacyTransactionId: { type: DataTypes.INTEGER, allowNull: true, field: 'legacy_transaction_id' },
    migrationNotes: { type: DataTypes.TEXT, allowNull: true, field: 'migration_notes' },
  },
  modelOpts('investment_position_lots')
);

const InvestmentOrder = sequelize.define(
  'InvestmentOrder',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    instrumentId: { type: DataTypes.INTEGER, allowNull: false, field: 'instrument_id' },
    orderNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'order_number' },
    orderType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MARKET', field: 'order_type' },
    side: { type: DataTypes.ENUM('BUY', 'SELL'), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
    executedQuantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, field: 'executed_quantity' },
    limitPrice: { type: DataTypes.DECIMAL(15, 4), allowNull: true, field: 'limit_price' },
    stopPrice: { type: DataTypes.DECIMAL(15, 4), allowNull: true, field: 'stop_price' },
    currencyCode: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'currency_code' },
    orderDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'order_date' },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
    brokerId: { type: DataTypes.INTEGER, allowNull: true, field: 'broker_id' },
    accountId: { type: DataTypes.INTEGER, allowNull: true, field: 'account_id' },
    settlementInstructions: { type: DataTypes.TEXT, allowNull: true, field: 'settlement_instructions' },
    status: {
      type: DataTypes.ENUM(
        'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PLACED',
        'PARTIALLY_EXECUTED', 'EXECUTED', 'EXPIRED', 'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    submittedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'submitted_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_orders')
);

const InvestmentTrade = sequelize.define(
  'InvestmentTrade',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    orderId: { type: DataTypes.INTEGER, allowNull: true, field: 'order_id' },
    instrumentId: { type: DataTypes.INTEGER, allowNull: false, field: 'instrument_id' },
    holdingV2Id: { type: DataTypes.INTEGER, allowNull: true, field: 'holding_v2_id' },
    tradeNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'trade_number' },
    brokerReference: { type: DataTypes.STRING(100), allowNull: true, field: 'broker_reference' },
    side: { type: DataTypes.ENUM('BUY', 'SELL'), allowNull: false },
    tradeDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'trade_date' },
    settlementDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'settlement_date' },
    quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
    price: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
    grossAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'gross_amount' },
    accruedInterest: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'accrued_interest' },
    commission: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    fees: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    taxes: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    withholdingTax: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'withholding_tax' },
    exchangeRate: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 1, field: 'exchange_rate' },
    netSettlement: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'net_settlement' },
    realizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'realized_gain_loss' },
    costBasisMethod: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'AVERAGE', field: 'cost_basis_method' },
    brokerId: { type: DataTypes.INTEGER, allowNull: true, field: 'broker_id' },
    custodianId: { type: DataTypes.INTEGER, allowNull: true, field: 'custodian_id' },
    investmentAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'investment_account_id' },
    bankAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'bank_account_id' },
    accountingPolicy: {
      type: DataTypes.ENUM('TRADE_DATE', 'SETTLEMENT_DATE'),
      allowNull: false,
      defaultValue: 'TRADE_DATE',
      field: 'accounting_policy',
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'CONFIRMED', 'SETTLED', 'CANCELLED', 'FAILED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    legacyTransactionId: { type: DataTypes.INTEGER, allowNull: true, field: 'legacy_transaction_id' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_trades')
);

const InvestmentSettlement = sequelize.define(
  'InvestmentSettlement',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    tradeId: { type: DataTypes.INTEGER, allowNull: false, field: 'trade_id' },
    settlementNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'settlement_number' },
    expectedDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expected_date' },
    actualDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'actual_date' },
    settlementAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'settlement_amount' },
    settlementCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'settlement_currency' },
    bankAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'bank_account_id' },
    status: {
      type: DataTypes.ENUM('PENDING', 'PARTIALLY_SETTLED', 'SETTLED', 'FAILED', 'REVERSED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    failureReason: { type: DataTypes.TEXT, allowNull: true, field: 'failure_reason' },
    externalReference: { type: DataTypes.STRING(100), allowNull: true, field: 'external_reference' },
    reconciledAt: { type: DataTypes.DATE, allowNull: true, field: 'reconciled_at' },
    ...testDataField,
  },
  modelOpts('investment_settlements')
);

const InvestmentTradeLotAllocation = sequelize.define(
  'InvestmentTradeLotAllocation',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    tradeId: { type: DataTypes.INTEGER, allowNull: false, field: 'trade_id' },
    lotId: { type: DataTypes.INTEGER, allowNull: false, field: 'lot_id' },
    quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
    unitCost: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0, field: 'unit_cost' },
    realizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'realized_gain_loss' },
  },
  modelOpts('investment_trade_lot_allocations')
);

const InvestmentIncomeEvent = sequelize.define(
  'InvestmentIncomeEvent',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    instrumentId: { type: DataTypes.INTEGER, allowNull: false, field: 'instrument_id' },
    holdingV2Id: { type: DataTypes.INTEGER, allowNull: true, field: 'holding_v2_id' },
    eventNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'event_number' },
    incomeType: {
      type: DataTypes.ENUM(
        'DIVIDEND', 'INTEREST', 'COUPON', 'PROFIT_DISTRIBUTION', 'FUND_DISTRIBUTION',
        'RENTAL_DISTRIBUTION', 'CAPITAL_REPAYMENT', 'RETURN_OF_CAPITAL', 'REDEMPTION_INCOME', 'SPECIAL_DIVIDEND'
      ),
      allowNull: false,
      field: 'income_type',
    },
    declarationDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'declaration_date' },
    exDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'ex_date' },
    recordDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'record_date' },
    paymentDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'payment_date' },
    accrualStart: { type: DataTypes.DATEONLY, allowNull: true, field: 'accrual_start' },
    accrualEnd: { type: DataTypes.DATEONLY, allowNull: true, field: 'accrual_end' },
    quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
    rateOrPerUnit: { type: DataTypes.DECIMAL(18, 8), allowNull: true, field: 'rate_or_per_unit' },
    grossAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'gross_amount' },
    accruedAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'accrued_amount' },
    withholdingTax: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'withholding_tax' },
    netAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'net_amount' },
    currencyCode: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'currency_code' },
    exchangeRate: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 1, field: 'exchange_rate' },
    status: {
      type: DataTypes.ENUM(
        'EXPECTED', 'ACCRUED', 'RECEIVABLE', 'RECEIVED', 'RECONCILED', 'DISTRIBUTED', 'REINVESTED', 'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'EXPECTED',
    },
    source: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'MANUAL' },
    linkedTransactionId: { type: DataTypes.INTEGER, allowNull: true, field: 'linked_transaction_id' },
    corporateActionId: { type: DataTypes.INTEGER, allowNull: true, field: 'corporate_action_id' },
    bankAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'bank_account_id' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_income_events')
);

const InvestmentCorporateAction = sequelize.define(
  'InvestmentCorporateAction',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    instrumentId: { type: DataTypes.INTEGER, allowNull: false, field: 'instrument_id' },
    actionNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'action_number' },
    actionType: {
      type: DataTypes.ENUM(
        'CASH_DIVIDEND', 'STOCK_DIVIDEND', 'BONUS_ISSUE', 'STOCK_SPLIT', 'REVERSE_SPLIT',
        'RIGHTS_ISSUE', 'REDEMPTION', 'MERGER', 'SPIN_OFF', 'CONVERSION',
        'CAPITAL_REPAYMENT', 'TENDER_OFFER', 'MATURITY', 'CALL', 'PUT'
      ),
      allowNull: false,
      field: 'action_type',
    },
    announcementDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'announcement_date' },
    exDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'ex_date' },
    recordDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'record_date' },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_date' },
    electionDeadline: { type: DataTypes.DATEONLY, allowNull: true, field: 'election_deadline' },
    ratioNumerator: { type: DataTypes.DECIMAL(18, 8), allowNull: true, field: 'ratio_numerator' },
    ratioDenominator: { type: DataTypes.DECIMAL(18, 8), allowNull: true, field: 'ratio_denominator' },
    cashComponent: { type: DataTypes.DECIMAL(15, 4), allowNull: true, field: 'cash_component' },
    stockComponent: { type: DataTypes.DECIMAL(18, 6), allowNull: true, field: 'stock_component' },
    newInstrumentId: { type: DataTypes.INTEGER, allowNull: true, field: 'new_instrument_id' },
    status: {
      type: DataTypes.ENUM('ANNOUNCED', 'ENTITLED', 'ELECTED', 'APPLIED', 'SETTLED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ANNOUNCED',
    },
    sourceDocumentId: { type: DataTypes.INTEGER, allowNull: true, field: 'source_document_id' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_corporate_actions')
);

const InvestmentEntitlement = sequelize.define(
  'InvestmentEntitlement',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    corporateActionId: { type: DataTypes.INTEGER, allowNull: false, field: 'corporate_action_id' },
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    holdingV2Id: { type: DataTypes.INTEGER, allowNull: true, field: 'holding_v2_id' },
    holdingDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'holding_date' },
    eligibleQuantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, field: 'eligible_quantity' },
    entitlementQuantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, field: 'entitlement_quantity' },
    entitlementCash: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'entitlement_cash' },
    status: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'APPLIED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    ...testDataField,
  },
  modelOpts('investment_entitlements')
);

const InvestmentInvestor = sequelize.define(
  'InvestmentInvestor',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    investorCode: { type: DataTypes.STRING(50), allowNull: false, field: 'investor_code' },
    legalName: { type: DataTypes.STRING(255), allowNull: false, field: 'legal_name' },
    displayName: { type: DataTypes.STRING(255), allowNull: true, field: 'display_name' },
    investorType: {
      type: DataTypes.ENUM(
        'OWNER', 'PARTNER', 'COMPANY', 'FAMILY_OFFICE', 'TRUST',
        'NOMINEE', 'BENEFICIARY', 'EXTERNAL_INVESTOR'
      ),
      allowNull: false,
      defaultValue: 'PARTNER',
      field: 'investor_type',
    },
    personOrEntity: {
      type: DataTypes.ENUM('PERSON', 'ENTITY'),
      allowNull: false,
      defaultValue: 'ENTITY',
      field: 'person_or_entity',
    },
    nationality: { type: DataTypes.STRING(100), allowNull: true },
    jurisdiction: { type: DataTypes.STRING(100), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    preferredCurrency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'preferred_currency' },
    bankAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'bank_account_id' },
    taxIdentifier: { type: DataTypes.STRING(100), allowNull: true, field: 'tax_identifier' },
    kycStatus: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'PENDING', field: 'kyc_status' },
    amlRiskRating: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIUM', field: 'aml_risk_rating' },
    uboStatus: { type: DataTypes.STRING(50), allowNull: true, field: 'ubo_status' },
    sourceOfFundsStatus: { type: DataTypes.STRING(50), allowNull: true, field: 'source_of_funds_status' },
    kycExpiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'kyc_expiry_date' },
    kycReviewDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'kyc_review_date' },
    sanctionsResultRef: { type: DataTypes.STRING(100), allowNull: true, field: 'sanctions_result_ref' },
    complianceApprovalStatus: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'PENDING',
      field: 'compliance_approval_status',
    },
    relatedPartyFlag: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'related_party_flag' },
    onboardingStatus: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'DRAFT', field: 'onboarding_status' },
    reinvestmentPreference: { type: DataTypes.STRING(50), allowNull: true, field: 'reinvestment_preference' },
    distributionMethod: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'BANK_TRANSFER', field: 'distribution_method' },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'), allowNull: false, defaultValue: 'ACTIVE' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_investors', { paranoid: true, deletedAt: 'deleted_at' })
);

const InvestmentCommitment = sequelize.define(
  'InvestmentCommitment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    investorId: { type: DataTypes.INTEGER, allowNull: false, field: 'investor_id' },
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    commitmentNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'commitment_number' },
    commitmentAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'commitment_amount' },
    currencyCode: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'currency_code' },
    commitmentDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'commitment_date' },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
    fundedAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'funded_amount' },
    unfundedAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'unfunded_amount' },
    status: {
      type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'FULLY_FUNDED', 'EXPIRED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_commitments')
);

const InvestmentCapitalCall = sequelize.define(
  'InvestmentCapitalCall',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    callNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'call_number' },
    callDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'call_date' },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'due_date' },
    totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
    purpose: { type: DataTypes.STRING(255), allowNull: true },
    status: {
      type: DataTypes.ENUM('DRAFT', 'ISSUED', 'PARTIALLY_FUNDED', 'FUNDED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_capital_calls')
);

const InvestmentCapitalCallLine = sequelize.define(
  'InvestmentCapitalCallLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    capitalCallId: { type: DataTypes.INTEGER, allowNull: false, field: 'capital_call_id' },
    investorId: { type: DataTypes.INTEGER, allowNull: false, field: 'investor_id' },
    commitmentId: { type: DataTypes.INTEGER, allowNull: true, field: 'commitment_id' },
    calledAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'called_amount' },
    receivedAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'received_amount' },
    outstandingAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'outstanding_amount' },
    status: {
      type: DataTypes.ENUM('PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
  },
  modelOpts('investment_capital_call_lines')
);

const InvestmentCapitalAccount = sequelize.define(
  'InvestmentCapitalAccount',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    investorId: { type: DataTypes.INTEGER, allowNull: false, field: 'investor_id' },
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    period: { type: DataTypes.STRING(20), allowNull: false },
    openingBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'opening_balance' },
    contributions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    allocatedIncome: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'allocated_income' },
    allocatedGain: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'allocated_gain' },
    allocatedLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'allocated_loss' },
    distributions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    returnOfCapital: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'return_of_capital' },
    closingBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'closing_balance' },
    ...testDataField,
  },
  modelOpts('investment_capital_accounts')
);

const InvestmentOwnershipHistory = sequelize.define(
  'InvestmentOwnershipHistory',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    instrumentId: { type: DataTypes.INTEGER, allowNull: true, field: 'instrument_id' },
    investorId: { type: DataTypes.INTEGER, allowNull: false, field: 'investor_id' },
    ownershipPercentage: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 0, field: 'ownership_percentage' },
    profitSharePercentage: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 0, field: 'profit_share_percentage' },
    lossSharePercentage: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 0, field: 'loss_share_percentage' },
    dividendSharePercentage: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 0, field: 'dividend_share_percentage' },
    votingPercentage: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 0, field: 'voting_percentage' },
    beneficialPercentage: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 0, field: 'beneficial_percentage' },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'SUPERSEDED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_ownership_history')
);

const InvestmentDistributionRun = sequelize.define(
  'InvestmentDistributionRun',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    distributionNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'distribution_number' },
    periodStart: { type: DataTypes.DATEONLY, allowNull: true, field: 'period_start' },
    periodEnd: { type: DataTypes.DATEONLY, allowNull: true, field: 'period_end' },
    distributionType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'PRO_RATA', field: 'distribution_type' },
    grossDistributableAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'gross_distributable_amount' },
    expensesDeducted: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'expenses_deducted' },
    reserveRetained: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'reserve_retained' },
    preferredReturn: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'preferred_return' },
    carriedInterest: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'carried_interest' },
    withholdingTax: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'withholding_tax' },
    netDistributableAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'net_distributable_amount' },
    waterfallConfig: { type: DataTypes.TEXT, allowNull: true, field: 'waterfall_config' },
    status: {
      type: DataTypes.ENUM(
        'DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'PAYABLE_CREATED',
        'PAYMENT_AUTHORIZED', 'PAID', 'RECONCILED', 'STATEMENT_ISSUED', 'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    approvalStatus: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'PENDING', field: 'approval_status' },
    paymentStatus: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'UNPAID', field: 'payment_status' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_distribution_runs')
);

const InvestmentDistributionRunLine = sequelize.define(
  'InvestmentDistributionRunLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    distributionRunId: { type: DataTypes.INTEGER, allowNull: false, field: 'distribution_run_id' },
    investorId: { type: DataTypes.INTEGER, allowNull: false, field: 'investor_id' },
    ownershipPercentage: { type: DataTypes.DECIMAL(12, 6), allowNull: false, defaultValue: 0, field: 'ownership_percentage' },
    preferredAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'preferred_amount' },
    catchUpAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'catch_up_amount' },
    residualAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'residual_amount' },
    carriedInterestAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'carried_interest_amount' },
    withholdingTax: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'withholding_tax' },
    grossAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'gross_amount' },
    netAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'net_amount' },
    tierBreakdown: { type: DataTypes.TEXT, allowNull: true, field: 'tier_breakdown' },
  },
  modelOpts('investment_distribution_run_lines')
);

const InvestmentValuationBatch = sequelize.define(
  'InvestmentValuationBatch',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    valuationNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'valuation_number' },
    valuationDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'valuation_date' },
    valuationType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'MARK_TO_MARKET', field: 'valuation_type' },
    sourceType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'MANUAL', field: 'source_type' },
    status: {
      type: DataTypes.ENUM('DRAFT', 'IMPORTED', 'VALIDATED', 'EXCEPTION', 'APPROVED', 'POSTED', 'LOCKED', 'REVERSED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    totalCost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_cost' },
    totalMarketValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_market_value' },
    totalUnrealizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_unrealized_gain_loss' },
    exceptionCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'exception_count' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    postedAt: { type: DataTypes.DATE, allowNull: true, field: 'posted_at' },
    lockedAt: { type: DataTypes.DATE, allowNull: true, field: 'locked_at' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_valuation_batches')
);

const InvestmentValuationBatchLine = sequelize.define(
  'InvestmentValuationBatchLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    batchId: { type: DataTypes.INTEGER, allowNull: false, field: 'batch_id' },
    instrumentId: { type: DataTypes.INTEGER, allowNull: false, field: 'instrument_id' },
    holdingV2Id: { type: DataTypes.INTEGER, allowNull: true, field: 'holding_v2_id' },
    quantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
    cost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    price: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
    priorPrice: { type: DataTypes.DECIMAL(15, 4), allowNull: true, field: 'prior_price' },
    marketValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'market_value' },
    unrealizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'unrealized_gain_loss' },
    priceSource: { type: DataTypes.STRING(50), allowNull: true, field: 'price_source' },
    exceptionCode: { type: DataTypes.STRING(50), allowNull: true, field: 'exception_code' },
    exceptionMessage: { type: DataTypes.TEXT, allowNull: true, field: 'exception_message' },
    status: {
      type: DataTypes.ENUM('OK', 'WARNING', 'EXCEPTION', 'FIXED'),
      allowNull: false,
      defaultValue: 'OK',
    },
  },
  modelOpts('investment_valuation_batch_lines')
);

const InvestmentMarketPrice = sequelize.define(
  'InvestmentMarketPrice',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    instrumentId: { type: DataTypes.INTEGER, allowNull: false, field: 'instrument_id' },
    priceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'price_date' },
    priceType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'CLOSE', field: 'price_type' },
    bid: { type: DataTypes.DECIMAL(15, 4), allowNull: true },
    ask: { type: DataTypes.DECIMAL(15, 4), allowNull: true },
    close: { type: DataTypes.DECIMAL(15, 4), allowNull: true },
    mid: { type: DataTypes.DECIMAL(15, 4), allowNull: true },
    nav: { type: DataTypes.DECIMAL(15, 4), allowNull: true },
    source: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'MANUAL' },
    sourcePriority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100, field: 'source_priority' },
    currencyCode: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED', field: 'currency_code' },
    confidenceScore: { type: DataTypes.DECIMAL(8, 4), allowNull: true, field: 'confidence_score' },
    staleFlag: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'stale_flag' },
    ...testDataField,
  },
  modelOpts('investment_market_prices')
);

const InvestmentBenchmark = sequelize.define(
  'InvestmentBenchmark',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    code: { type: DataTypes.STRING(50), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    provider: { type: DataTypes.STRING(100), allowNull: true },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AED' },
    returnSeriesJson: { type: DataTypes.TEXT, allowNull: true, field: 'return_series_json' },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
    ...testDataField,
  },
  modelOpts('investment_benchmarks')
);

const InvestmentNavSnapshot = sequelize.define(
  'InvestmentNavSnapshot',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    investorId: { type: DataTypes.INTEGER, allowNull: true, field: 'investor_id' },
    navDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'nav_date' },
    marketValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'market_value' },
    cash: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    receivables: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    accruedIncome: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'accrued_income' },
    payables: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    fees: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    liabilities: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    nav: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    units: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
    navPerUnit: { type: DataTypes.DECIMAL(15, 6), allowNull: true, field: 'nav_per_unit' },
    valuationBatchId: { type: DataTypes.INTEGER, allowNull: true, field: 'valuation_batch_id' },
    status: { type: DataTypes.ENUM('DRAFT', 'FINAL', 'LOCKED'), allowNull: false, defaultValue: 'DRAFT' },
    ...testDataField,
  },
  modelOpts('investment_nav_snapshots')
);

const InvestmentPerformancePeriod = sequelize.define(
  'InvestmentPerformancePeriod',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: false, field: 'portfolio_id' },
    periodStart: { type: DataTypes.DATEONLY, allowNull: false, field: 'period_start' },
    periodEnd: { type: DataTypes.DATEONLY, allowNull: false, field: 'period_end' },
    openingValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'opening_value' },
    closingValue: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'closing_value' },
    externalFlows: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'external_flows' },
    income: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    realizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'realized_gain_loss' },
    unrealizedGainLoss: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'unrealized_gain_loss' },
    twr: { type: DataTypes.DECIMAL(18, 10), allowNull: true },
    mwr: { type: DataTypes.DECIMAL(18, 10), allowNull: true },
    irr: { type: DataTypes.DECIMAL(18, 10), allowNull: true },
    absoluteReturn: { type: DataTypes.DECIMAL(18, 10), allowNull: true, field: 'absolute_return' },
    annualizedReturn: { type: DataTypes.DECIMAL(18, 10), allowNull: true, field: 'annualized_return' },
    benchmarkReturn: { type: DataTypes.DECIMAL(18, 10), allowNull: true, field: 'benchmark_return' },
    excessReturn: { type: DataTypes.DECIMAL(18, 10), allowNull: true, field: 'excess_return' },
    volatility: { type: DataTypes.DECIMAL(18, 10), allowNull: true },
    maxDrawdown: { type: DataTypes.DECIMAL(18, 10), allowNull: true, field: 'max_drawdown' },
    sharpeRatio: { type: DataTypes.DECIMAL(18, 10), allowNull: true, field: 'sharpe_ratio' },
    ...testDataField,
  },
  modelOpts('investment_performance_periods')
);

const InvestmentReconciliationBatch = sequelize.define(
  'InvestmentReconciliationBatch',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
    batchNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'batch_number' },
    reconciliationType: {
      type: DataTypes.ENUM('BROKER', 'CUSTODIAN', 'BANK', 'INCOME', 'SUBLEDGER_GL', 'OWNERSHIP_CAPITAL', 'VALUATION'),
      allowNull: false,
      field: 'reconciliation_type',
    },
    sourceFileId: { type: DataTypes.STRING(100), allowNull: true, field: 'source_file_id' },
    statementDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'statement_date' },
    status: {
      type: DataTypes.ENUM('DRAFT', 'IMPORTED', 'MATCHING', 'MATCHED', 'EXCEPTION', 'APPROVED', 'CLOSED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    totalRecords: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_records' },
    matchedRecords: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'matched_records' },
    exceptionRecords: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'exception_records' },
    unmatchedRecords: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'unmatched_records' },
    amountTolerance: { type: DataTypes.DECIMAL(15, 4), allowNull: false, defaultValue: 0.01, field: 'amount_tolerance' },
    quantityTolerance: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0.000001, field: 'quantity_tolerance' },
    dateToleranceDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'date_tolerance_days' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_reconciliation_batches')
);

const InvestmentReconciliationLine = sequelize.define(
  'InvestmentReconciliationLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    batchId: { type: DataTypes.INTEGER, allowNull: false, field: 'batch_id' },
    sourceReference: { type: DataTypes.STRING(100), allowNull: true, field: 'source_reference' },
    internalReference: { type: DataTypes.STRING(100), allowNull: true, field: 'internal_reference' },
    instrumentId: { type: DataTypes.INTEGER, allowNull: true, field: 'instrument_id' },
    lineDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'line_date' },
    expectedAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'expected_amount' },
    actualAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'actual_amount' },
    expectedQuantity: { type: DataTypes.DECIMAL(18, 6), allowNull: true, field: 'expected_quantity' },
    actualQuantity: { type: DataTypes.DECIMAL(18, 6), allowNull: true, field: 'actual_quantity' },
    differenceAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'difference_amount' },
    differenceQuantity: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, field: 'difference_quantity' },
    matchStatus: {
      type: DataTypes.ENUM('MATCHED', 'PARTIAL', 'UNMATCHED', 'EXCEPTION', 'RESOLVED'),
      allowNull: false,
      defaultValue: 'UNMATCHED',
      field: 'match_status',
    },
    matchMethod: { type: DataTypes.STRING(50), allowNull: true, field: 'match_method' },
    exceptionReason: { type: DataTypes.TEXT, allowNull: true, field: 'exception_reason' },
    resolutionStatus: {
      type: DataTypes.ENUM('OPEN', 'APPROVED', 'WAIVED', 'CORRECTED', 'CLOSED'),
      allowNull: false,
      defaultValue: 'OPEN',
      field: 'resolution_status',
    },
    resolvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'resolved_by' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
    resolutionNotes: { type: DataTypes.TEXT, allowNull: true, field: 'resolution_notes' },
  },
  modelOpts('investment_reconciliation_lines')
);

const InvestmentClosePeriod = sequelize.define(
  'InvestmentClosePeriod',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
    period: { type: DataTypes.STRING(20), allowNull: false },
    status: {
      type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'READY', 'CLOSED', 'REOPENED'),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    checklistJson: { type: DataTypes.TEXT, allowNull: true, field: 'checklist_json' },
    closedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'closed_by' },
    closedAt: { type: DataTypes.DATE, allowNull: true, field: 'closed_at' },
    reopenedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'reopened_by' },
    reopenedAt: { type: DataTypes.DATE, allowNull: true, field: 'reopened_at' },
    reopenedReason: { type: DataTypes.TEXT, allowNull: true, field: 'reopened_reason' },
    ...testDataField,
  },
  modelOpts('investment_close_periods')
);

const InvestmentMandate = sequelize.define(
  'InvestmentMandate',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
    mandateCode: { type: DataTypes.STRING(50), allowNull: false, field: 'mandate_code' },
    name: { type: DataTypes.STRING(255), allowNull: false },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
    allowedAssetClassesJson: { type: DataTypes.TEXT, allowNull: true, field: 'allowed_asset_classes_json' },
    prohibitedAssetClassesJson: { type: DataTypes.TEXT, allowNull: true, field: 'prohibited_asset_classes_json' },
    targetAllocationJson: { type: DataTypes.TEXT, allowNull: true, field: 'target_allocation_json' },
    concentrationLimitsJson: { type: DataTypes.TEXT, allowNull: true, field: 'concentration_limits_json' },
    liquidityLimitsJson: { type: DataTypes.TEXT, allowNull: true, field: 'liquidity_limits_json' },
    currencyLimitsJson: { type: DataTypes.TEXT, allowNull: true, field: 'currency_limits_json' },
    countryLimitsJson: { type: DataTypes.TEXT, allowNull: true, field: 'country_limits_json' },
    issuerLimitsJson: { type: DataTypes.TEXT, allowNull: true, field: 'issuer_limits_json' },
    status: {
      type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    ...testDataField,
  },
  modelOpts('investment_mandates')
);

const InvestmentRiskLimit = sequelize.define(
  'InvestmentRiskLimit',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
    limitCode: { type: DataTypes.STRING(50), allowNull: false, field: 'limit_code' },
    limitType: {
      type: DataTypes.ENUM(
        'CONCENTRATION', 'ISSUER', 'CURRENCY', 'COUNTRY', 'SECTOR',
        'LIQUIDITY', 'COUNTERPARTY', 'RELATED_PARTY', 'CASH', 'CUSTOM'
      ),
      allowNull: false,
      field: 'limit_type',
    },
    dimension: { type: DataTypes.STRING(100), allowNull: true },
    thresholdWarning: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, field: 'threshold_warning' },
    thresholdBreach: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, field: 'threshold_breach' },
    measurementBasis: {
      type: DataTypes.ENUM('PERCENT_NAV', 'ABSOLUTE', 'COUNT'),
      allowNull: false,
      defaultValue: 'PERCENT_NAV',
      field: 'measurement_basis',
    },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    ...testDataField,
  },
  modelOpts('investment_risk_limits')
);

const InvestmentRiskBreach = sequelize.define(
  'InvestmentRiskBreach',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
    limitId: { type: DataTypes.INTEGER, allowNull: true, field: 'limit_id' },
    mandateId: { type: DataTypes.INTEGER, allowNull: true, field: 'mandate_id' },
    breachNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'breach_number' },
    detectedAt: { type: DataTypes.DATE, allowNull: false, field: 'detected_at' },
    actualValue: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, field: 'actual_value' },
    limitValue: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: 0, field: 'limit_value' },
    severity: {
      type: DataTypes.ENUM('WARNING', 'BREACH', 'CRITICAL'),
      allowNull: false,
      defaultValue: 'BREACH',
    },
    status: {
      type: DataTypes.ENUM('OPEN', 'UNDER_REVIEW', 'EXCEPTION_APPROVED', 'REMEDIATED', 'CLOSED'),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    dimensionKey: { type: DataTypes.STRING(100), allowNull: true, field: 'dimension_key' },
    remediationPlan: { type: DataTypes.TEXT, allowNull: true, field: 'remediation_plan' },
    overrideReason: { type: DataTypes.TEXT, allowNull: true, field: 'override_reason' },
    approvedExceptionBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_exception_by' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
    ...testDataField,
  },
  modelOpts('investment_risk_breaches')
);

const InvestmentComplianceCheck = sequelize.define(
  'InvestmentComplianceCheck',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    investorId: { type: DataTypes.INTEGER, allowNull: true, field: 'investor_id' },
    instrumentId: { type: DataTypes.INTEGER, allowNull: true, field: 'instrument_id' },
    portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
    checkType: {
      type: DataTypes.ENUM(
        'KYC', 'AML', 'UBO', 'SOURCE_OF_FUNDS', 'SANCTIONS',
        'RESTRICTED_ASSET', 'RELATED_PARTY', 'DOCUMENT', 'PRE_TRADE'
      ),
      allowNull: false,
      field: 'check_type',
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PASS', 'FAIL', 'EXPIRED', 'WAIVED', 'UNDER_REVIEW'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    checkedAt: { type: DataTypes.DATE, allowNull: true, field: 'checked_at' },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
    resultJson: { type: DataTypes.TEXT, allowNull: true, field: 'result_json' },
    providerRef: { type: DataTypes.STRING(100), allowNull: true, field: 'provider_ref' },
    reviewedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'reviewed_by' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    ...testDataField,
  },
  modelOpts('investment_compliance_checks')
);

const InvestmentSavedReport = sequelize.define(
  'InvestmentSavedReport',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
    reportCode: { type: DataTypes.STRING(100), allowNull: false, field: 'report_code' },
    name: { type: DataTypes.STRING(255), allowNull: false },
    filtersJson: { type: DataTypes.TEXT, allowNull: true, field: 'filters_json' },
    format: {
      type: DataTypes.ENUM('JSON', 'PDF', 'EXCEL', 'CSV'),
      allowNull: false,
      defaultValue: 'JSON',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    ...testDataField,
  },
  modelOpts('investment_saved_reports')
);

const InvestmentReportPack = sequelize.define(
  'InvestmentReportPack',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
    packCode: { type: DataTypes.STRING(50), allowNull: false, field: 'pack_code' },
    name: { type: DataTypes.STRING(255), allowNull: false },
    reportCodesJson: { type: DataTypes.TEXT, allowNull: false, field: 'report_codes_json' },
    status: {
      type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'ARCHIVED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    ...testDataField,
  },
  modelOpts('investment_report_packs')
);

const InvestmentReportSchedule = sequelize.define(
  'InvestmentReportSchedule',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    packId: { type: DataTypes.INTEGER, allowNull: true, field: 'pack_id' },
    savedReportId: { type: DataTypes.INTEGER, allowNull: true, field: 'saved_report_id' },
    scheduleCode: { type: DataTypes.STRING(50), allowNull: false, field: 'schedule_code' },
    cadence: {
      type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'),
      allowNull: false,
      defaultValue: 'MONTHLY',
    },
    nextRunAt: { type: DataTypes.DATE, allowNull: true, field: 'next_run_at' },
    lastRunAt: { type: DataTypes.DATE, allowNull: true, field: 'last_run_at' },
    emailTo: { type: DataTypes.STRING(500), allowNull: true, field: 'email_to' },
    format: {
      type: DataTypes.ENUM('JSON', 'PDF', 'EXCEL', 'CSV'),
      allowNull: false,
      defaultValue: 'PDF',
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'PAUSED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    ...testDataField,
  },
  modelOpts('investment_report_schedules')
);

const InvestmentExportHistory = sequelize.define(
  'InvestmentExportHistory',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    reportCode: { type: DataTypes.STRING(100), allowNull: false, field: 'report_code' },
    packId: { type: DataTypes.INTEGER, allowNull: true, field: 'pack_id' },
    format: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'JSON' },
    rowCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'row_count' },
    status: {
      type: DataTypes.ENUM('SUCCESS', 'FAILED', 'PARTIAL'),
      allowNull: false,
      defaultValue: 'SUCCESS',
    },
    fileRef: { type: DataTypes.STRING(255), allowNull: true, field: 'file_ref' },
    filtersJson: { type: DataTypes.TEXT, allowNull: true, field: 'filters_json' },
    generatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'generated_by' },
    errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
    ...testDataField,
  },
  modelOpts('investment_export_history')
);

const InvestmentCopilotToolLog = sequelize.define(
  'InvestmentCopilotToolLog',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
    toolName: { type: DataTypes.STRING(100), allowNull: false, field: 'tool_name' },
    portfolioId: { type: DataTypes.INTEGER, allowNull: true, field: 'portfolio_id' },
    investorId: { type: DataTypes.INTEGER, allowNull: true, field: 'investor_id' },
    argsJson: { type: DataTypes.TEXT, allowNull: true, field: 'args_json' },
    resultSummary: { type: DataTypes.STRING(500), allowNull: true, field: 'result_summary' },
    status: {
      type: DataTypes.ENUM('OK', 'DENIED', 'ERROR'),
      allowNull: false,
      defaultValue: 'OK',
    },
  },
  modelOpts('investment_copilot_tool_logs')
);

const InvestmentMigrationBatch = sequelize.define(
  'InvestmentMigrationBatch',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: true, field: 'company_id' },
    batchCode: { type: DataTypes.STRING(80), allowNull: false, field: 'batch_code' },
    status: {
      type: DataTypes.ENUM(
        'DRAFT', 'DRY_RUN', 'VALIDATED', 'RUNNING', 'PARTIAL', 'COMPLETED',
        'FAILED', 'RECONCILED', 'APPROVED', 'ROLLED_BACK'
      ),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    mode: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'FULL' },
    dryRun: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'dry_run' },
    startedAt: { type: DataTypes.DATE, allowNull: true, field: 'started_at' },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
    startedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'started_by' },
    summaryJson: { type: DataTypes.JSON, allowNull: true, field: 'summary_json' },
    errorSummary: { type: DataTypes.TEXT, allowNull: true, field: 'error_summary' },
  },
  modelOpts('investment_migration_batches')
);

const InvestmentMigrationItem = sequelize.define(
  'InvestmentMigrationItem',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    batchId: { type: DataTypes.INTEGER, allowNull: false, field: 'batch_id' },
    companyId: companyIdField,
    sourceType: { type: DataTypes.STRING(80), allowNull: false, field: 'source_type' },
    sourceId: { type: DataTypes.INTEGER, allowNull: true, field: 'source_id' },
    targetType: { type: DataTypes.STRING(80), allowNull: true, field: 'target_type' },
    targetId: { type: DataTypes.INTEGER, allowNull: true, field: 'target_id' },
    status: {
      type: DataTypes.ENUM('PENDING', 'SKIPPED', 'MIGRATED', 'WARNING', 'FAILED', 'ROLLED_BACK'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    warningCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'warning_count' },
    errorDetails: { type: DataTypes.TEXT, allowNull: true, field: 'error_details' },
    beforeSnapshot: { type: DataTypes.JSON, allowNull: true, field: 'before_snapshot' },
    afterSnapshot: { type: DataTypes.JSON, allowNull: true, field: 'after_snapshot' },
    migratedAt: { type: DataTypes.DATE, allowNull: true, field: 'migrated_at' },
  },
  modelOpts('investment_migration_items')
);

const InvestmentMigrationException = sequelize.define(
  'InvestmentMigrationException',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    batchId: { type: DataTypes.INTEGER, allowNull: false, field: 'batch_id' },
    companyId: companyIdField,
    itemId: { type: DataTypes.INTEGER, allowNull: true, field: 'item_id' },
    severity: {
      type: DataTypes.ENUM('CRITICAL', 'MAJOR', 'MINOR'),
      allowNull: false,
      defaultValue: 'MAJOR',
    },
    category: { type: DataTypes.STRING(80), allowNull: false },
    resultClass: {
      type: DataTypes.ENUM('MATCHED', 'MATCHED_WITHIN_TOLERANCE', 'WARNING', 'EXCEPTION', 'FAILED'),
      allowNull: false,
      defaultValue: 'EXCEPTION',
      field: 'result_class',
    },
    differenceCategory: {
      type: DataTypes.ENUM(
        'PRE_EXISTING_DIFFERENCE', 'MIGRATION_DIFFERENCE', 'TIMING_DIFFERENCE',
        'CONFIGURATION_DIFFERENCE', 'UNMAPPED_LEGACY_RECORD', 'MANUAL_REVIEW'
      ),
      allowNull: true,
      field: 'difference_category',
    },
    sourceType: { type: DataTypes.STRING(80), allowNull: true, field: 'source_type' },
    sourceId: { type: DataTypes.INTEGER, allowNull: true, field: 'source_id' },
    message: { type: DataTypes.TEXT, allowNull: false },
    detailJson: { type: DataTypes.JSON, allowNull: true, field: 'detail_json' },
    resolved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    resolutionNotes: { type: DataTypes.TEXT, allowNull: true, field: 'resolution_notes' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
    resolvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'resolved_by' },
  },
  modelOpts('investment_migration_exceptions')
);

const InvestmentOmsPilotUser = sequelize.define(
  'InvestmentOmsPilotUser',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    notes: { type: DataTypes.STRING(255), allowNull: true },
  },
  modelOpts('investment_oms_pilot_users')
);

function wireInvestmentAssociations({ InvestmentCategory: Cat, InvestmentAsset: Asset, InvestmentHolding: Holding, InvestmentTransaction: Txn, InvestmentPartnerAllocation: Alloc, InvestmentValuationHistory: Val, InvestmentDocument: Doc, InvestmentDistribution: Dist, InvestmentDistributionLine: DistLine, InvestmentPortfolio: Portfolio, InvestmentBook: Book, InvestmentInstrument: Instrument, InvestmentInstrumentAttribute: InstrAttr, InvestmentBroker: Broker, InvestmentCustodian: Custodian, InvestmentAccount: InvAccount, InvestmentHoldingV2: HoldingV2, InvestmentPositionLot: Lot, InvestmentOrder: Order, InvestmentTrade: Trade, InvestmentSettlement: Settlement, InvestmentTradeLotAllocation: TradeLot, InvestmentIncomeEvent: Income, InvestmentCorporateAction: CorpAction, InvestmentEntitlement: Entitlement, InvestmentInvestor: Investor, InvestmentCommitment: Commitment, InvestmentCapitalCall: CapCall, InvestmentCapitalCallLine: CapCallLine, InvestmentCapitalAccount: CapAcct, InvestmentOwnershipHistory: OwnHist, InvestmentDistributionRun: DistRun, InvestmentDistributionRunLine: DistRunLine, InvestmentValuationBatch: ValBatch, InvestmentValuationBatchLine: ValBatchLine, InvestmentMarketPrice: MktPrice, InvestmentBenchmark: Benchmark, InvestmentNavSnapshot: NavSnap, InvestmentPerformancePeriod: PerfPeriod, InvestmentReconciliationBatch: ReconBatch, InvestmentReconciliationLine: ReconLine, InvestmentClosePeriod: ClosePeriod, InvestmentMandate: Mandate, InvestmentRiskLimit: RiskLimit, InvestmentRiskBreach: RiskBreach, InvestmentComplianceCheck: CompCheck, InvestmentSavedReport: SavedReport, InvestmentReportPack: ReportPack, InvestmentReportSchedule: ReportSchedule, InvestmentExportHistory: ExportHistory, InvestmentCopilotToolLog: CopilotLog, InvestmentMigrationBatch: MigBatch, InvestmentMigrationItem: MigItem, InvestmentMigrationException: MigExc, InvestmentOmsPilotUser: OmsPilot, BankAccount, JournalVoucher, User }) {
  Cat.hasMany(Asset, { foreignKey: 'categoryId', as: 'assets' });
  Asset.belongsTo(Cat, { foreignKey: 'categoryId', as: 'category' });

  Asset.hasOne(Holding, { foreignKey: 'investmentAssetId', as: 'holding' });
  Holding.belongsTo(Asset, { foreignKey: 'investmentAssetId', as: 'asset' });

  Asset.hasMany(Txn, { foreignKey: 'investmentAssetId', as: 'transactions' });
  Txn.belongsTo(Asset, { foreignKey: 'investmentAssetId', as: 'asset' });
  Txn.belongsTo(BankAccount, { foreignKey: 'bankAccountId', as: 'bankAccount' });
  Txn.belongsTo(JournalVoucher, { foreignKey: 'journalVoucherId', as: 'journalVoucher' });

  Asset.hasMany(Alloc, { foreignKey: 'investmentAssetId', as: 'allocations' });
  Alloc.belongsTo(Asset, { foreignKey: 'investmentAssetId', as: 'asset' });

  Asset.hasMany(Val, { foreignKey: 'investmentAssetId', as: 'valuations' });
  Val.belongsTo(Asset, { foreignKey: 'investmentAssetId', as: 'asset' });
  Val.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

  Asset.hasMany(Doc, { foreignKey: 'investmentAssetId', as: 'documents' });
  Doc.belongsTo(Asset, { foreignKey: 'investmentAssetId', as: 'asset' });
  Doc.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

  Asset.hasMany(Dist, { foreignKey: 'investmentAssetId', as: 'distributions' });
  Dist.belongsTo(Asset, { foreignKey: 'investmentAssetId', as: 'asset' });
  Dist.belongsTo(Txn, { foreignKey: 'sourceTransactionId', as: 'sourceTransaction' });
  Dist.belongsTo(BankAccount, { foreignKey: 'bankAccountId', as: 'bankAccount' });
  Dist.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
  Dist.belongsTo(JournalVoucher, { foreignKey: 'journalVoucherId', as: 'journalVoucher' });
  Dist.hasMany(DistLine, { foreignKey: 'distributionId', as: 'lines' });
  DistLine.belongsTo(Dist, { foreignKey: 'distributionId', as: 'distribution' });
  DistLine.belongsTo(Alloc, { foreignKey: 'allocationId', as: 'allocation' });

  if (Portfolio) {
    Portfolio.hasMany(Book, { foreignKey: 'portfolioId', as: 'books' });
    Book.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    Portfolio.belongsTo(Broker, { foreignKey: 'defaultBrokerId', as: 'defaultBroker' });
    Portfolio.belongsTo(Custodian, { foreignKey: 'custodianId', as: 'custodian' });
    Portfolio.hasMany(HoldingV2, { foreignKey: 'portfolioId', as: 'holdingsV2' });
    HoldingV2.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    HoldingV2.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
    HoldingV2.belongsTo(Instrument, { foreignKey: 'instrumentId', as: 'instrument' });
    HoldingV2.belongsTo(Asset, { foreignKey: 'legacyAssetId', as: 'legacyAsset' });
    Instrument.hasMany(InstrAttr, { foreignKey: 'instrumentId', as: 'attributes' });
    InstrAttr.belongsTo(Instrument, { foreignKey: 'instrumentId', as: 'instrument' });
    Instrument.belongsTo(Asset, { foreignKey: 'legacyAssetId', as: 'legacyAsset' });
    HoldingV2.hasMany(Lot, { foreignKey: 'holdingV2Id', as: 'lots' });
    Lot.belongsTo(HoldingV2, { foreignKey: 'holdingV2Id', as: 'holding' });
    InvAccount.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    InvAccount.belongsTo(Broker, { foreignKey: 'brokerId', as: 'broker' });
    InvAccount.belongsTo(Custodian, { foreignKey: 'custodianId', as: 'custodian' });
  }

  if (Order && Trade && Settlement) {
    Order.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    Order.belongsTo(Instrument, { foreignKey: 'instrumentId', as: 'instrument' });
    Order.belongsTo(Broker, { foreignKey: 'brokerId', as: 'broker' });
    Order.hasMany(Trade, { foreignKey: 'orderId', as: 'trades' });
    Trade.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
    Trade.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    Trade.belongsTo(Instrument, { foreignKey: 'instrumentId', as: 'instrument' });
    Trade.belongsTo(HoldingV2, { foreignKey: 'holdingV2Id', as: 'holdingV2' });
    Trade.belongsTo(Broker, { foreignKey: 'brokerId', as: 'broker' });
    Trade.hasMany(Settlement, { foreignKey: 'tradeId', as: 'settlements' });
    Settlement.belongsTo(Trade, { foreignKey: 'tradeId', as: 'trade' });
    Trade.hasMany(TradeLot, { foreignKey: 'tradeId', as: 'lotAllocations' });
    TradeLot.belongsTo(Trade, { foreignKey: 'tradeId', as: 'trade' });
    TradeLot.belongsTo(Lot, { foreignKey: 'lotId', as: 'lot' });
  }

  if (Income && CorpAction && Entitlement) {
    Income.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    Income.belongsTo(Instrument, { foreignKey: 'instrumentId', as: 'instrument' });
    Income.belongsTo(HoldingV2, { foreignKey: 'holdingV2Id', as: 'holdingV2' });
    CorpAction.belongsTo(Instrument, { foreignKey: 'instrumentId', as: 'instrument' });
    CorpAction.hasMany(Entitlement, { foreignKey: 'corporateActionId', as: 'entitlements' });
    Entitlement.belongsTo(CorpAction, { foreignKey: 'corporateActionId', as: 'corporateAction' });
    Entitlement.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    Entitlement.belongsTo(HoldingV2, { foreignKey: 'holdingV2Id', as: 'holdingV2' });
    Instrument.hasMany(CorpAction, { foreignKey: 'instrumentId', as: 'corporateActions' });
    Instrument.hasMany(Income, { foreignKey: 'instrumentId', as: 'incomeEvents' });
  }

  if (Investor) {
    Investor.hasMany(Commitment, { foreignKey: 'investorId', as: 'commitments' });
    Commitment.belongsTo(Investor, { foreignKey: 'investorId', as: 'investor' });
    Commitment.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    CapCall.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    CapCall.hasMany(CapCallLine, { foreignKey: 'capitalCallId', as: 'lines' });
    CapCallLine.belongsTo(CapCall, { foreignKey: 'capitalCallId', as: 'capitalCall' });
    CapCallLine.belongsTo(Investor, { foreignKey: 'investorId', as: 'investor' });
    CapCallLine.belongsTo(Commitment, { foreignKey: 'commitmentId', as: 'commitment' });
    CapAcct.belongsTo(Investor, { foreignKey: 'investorId', as: 'investor' });
    CapAcct.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    Investor.hasMany(CapAcct, { foreignKey: 'investorId', as: 'capitalAccounts' });
    OwnHist.belongsTo(Investor, { foreignKey: 'investorId', as: 'investor' });
    OwnHist.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    Investor.hasMany(OwnHist, { foreignKey: 'investorId', as: 'ownershipHistory' });
    DistRun.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    DistRun.hasMany(DistRunLine, { foreignKey: 'distributionRunId', as: 'lines' });
    DistRunLine.belongsTo(DistRun, { foreignKey: 'distributionRunId', as: 'distributionRun' });
    DistRunLine.belongsTo(Investor, { foreignKey: 'investorId', as: 'investor' });
  }

  if (ValBatch) {
    ValBatch.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    ValBatch.hasMany(ValBatchLine, { foreignKey: 'batchId', as: 'lines' });
    ValBatchLine.belongsTo(ValBatch, { foreignKey: 'batchId', as: 'batch' });
    ValBatchLine.belongsTo(Instrument, { foreignKey: 'instrumentId', as: 'instrument' });
    MktPrice.belongsTo(Instrument, { foreignKey: 'instrumentId', as: 'instrument' });
    NavSnap.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    PerfPeriod.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
  }

  if (ReconBatch) {
    ReconBatch.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    ReconBatch.hasMany(ReconLine, { foreignKey: 'batchId', as: 'lines' });
    ReconLine.belongsTo(ReconBatch, { foreignKey: 'batchId', as: 'batch' });
    ClosePeriod.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
  }

  if (Mandate) {
    Mandate.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    RiskLimit.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    RiskBreach.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    RiskBreach.belongsTo(RiskLimit, { foreignKey: 'limitId', as: 'limit' });
    RiskBreach.belongsTo(Mandate, { foreignKey: 'mandateId', as: 'mandate' });
    CompCheck.belongsTo(Investor, { foreignKey: 'investorId', as: 'investor' });
    CompCheck.belongsTo(Instrument, { foreignKey: 'instrumentId', as: 'instrument' });
    CompCheck.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
  }

  if (SavedReport) {
    SavedReport.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    ReportPack.belongsTo(Portfolio, { foreignKey: 'portfolioId', as: 'portfolio' });
    ReportSchedule.belongsTo(ReportPack, { foreignKey: 'packId', as: 'pack' });
    ReportSchedule.belongsTo(SavedReport, { foreignKey: 'savedReportId', as: 'savedReport' });
    ExportHistory.belongsTo(ReportPack, { foreignKey: 'packId', as: 'pack' });
  }

  if (MigBatch) {
    MigBatch.hasMany(MigItem, { foreignKey: 'batchId', as: 'items' });
    MigBatch.hasMany(MigExc, { foreignKey: 'batchId', as: 'exceptions' });
    MigItem.belongsTo(MigBatch, { foreignKey: 'batchId', as: 'batch' });
    MigExc.belongsTo(MigBatch, { foreignKey: 'batchId', as: 'batch' });
    MigExc.belongsTo(MigItem, { foreignKey: 'itemId', as: 'item' });
  }
}

module.exports = {
  InvestmentCategory,
  InvestmentAsset,
  InvestmentHolding,
  InvestmentTransaction,
  InvestmentPartnerAllocation,
  InvestmentValuationHistory,
  InvestmentDocument,
  InvestmentAccountConfiguration,
  InvestmentDistribution,
  InvestmentDistributionLine,
  InvestmentValuationProviderConfig,
  InvestmentBroker,
  InvestmentCustodian,
  InvestmentPortfolio,
  InvestmentBook,
  InvestmentInstrument,
  InvestmentInstrumentAttribute,
  InvestmentAccount,
  InvestmentHoldingV2,
  InvestmentPositionLot,
  InvestmentOrder,
  InvestmentTrade,
  InvestmentSettlement,
  InvestmentTradeLotAllocation,
  InvestmentIncomeEvent,
  InvestmentCorporateAction,
  InvestmentEntitlement,
  InvestmentInvestor,
  InvestmentCommitment,
  InvestmentCapitalCall,
  InvestmentCapitalCallLine,
  InvestmentCapitalAccount,
  InvestmentOwnershipHistory,
  InvestmentDistributionRun,
  InvestmentDistributionRunLine,
  InvestmentValuationBatch,
  InvestmentValuationBatchLine,
  InvestmentMarketPrice,
  InvestmentBenchmark,
  InvestmentNavSnapshot,
  InvestmentPerformancePeriod,
  InvestmentReconciliationBatch,
  InvestmentReconciliationLine,
  InvestmentClosePeriod,
  InvestmentMandate,
  InvestmentRiskLimit,
  InvestmentRiskBreach,
  InvestmentComplianceCheck,
  InvestmentSavedReport,
  InvestmentReportPack,
  InvestmentReportSchedule,
  InvestmentExportHistory,
  InvestmentCopilotToolLog,
  InvestmentMigrationBatch,
  InvestmentMigrationItem,
  InvestmentMigrationException,
  InvestmentOmsPilotUser,
  wireInvestmentAssociations,
};
