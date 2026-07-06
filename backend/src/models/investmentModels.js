const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const companyIdField = {
  type: DataTypes.INTEGER,
  allowNull: false,
  field: 'company_id',
};

const modelOpts = (tableName) => ({
  tableName,
  timestamps: true,
  underscored: true,
});

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
  },
  modelOpts('investment_categories')
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
  },
  modelOpts('investment_assets')
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

function wireInvestmentAssociations({ InvestmentCategory: Cat, InvestmentAsset: Asset, InvestmentHolding: Holding, InvestmentTransaction: Txn, InvestmentPartnerAllocation: Alloc, InvestmentValuationHistory: Val, InvestmentDocument: Doc, InvestmentDistribution: Dist, InvestmentDistributionLine: DistLine, BankAccount, JournalVoucher, User }) {
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
  wireInvestmentAssociations,
};
