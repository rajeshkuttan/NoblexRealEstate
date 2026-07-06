'use strict';

const companyFk = {
  type: require('sequelize').INTEGER,
  allowNull: false,
  references: { model: 'company_settings', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
};

const timestamps = {
  created_at: { type: require('sequelize').DATE, allowNull: false, defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP') },
  updated_at: {
    type: require('sequelize').DATE,
    allowNull: false,
    defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
  },
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ts = timestamps;
    const cfk = companyFk;

    await queryInterface.createTable('investment_categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      name: { type: Sequelize.STRING(200), allowNull: false },
      code: { type: Sequelize.STRING(50), allowNull: false },
      asset_class: { type: Sequelize.STRING(100), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });
    await queryInterface.addIndex('investment_categories', ['company_id', 'code'], {
      unique: true,
      name: 'idx_inv_cat_company_code',
    });

    await queryInterface.createTable('investment_assets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'investment_categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      investment_code: { type: Sequelize.STRING(50), allowNull: false },
      investment_name: { type: Sequelize.STRING(255), allowNull: false },
      asset_type: { type: Sequelize.STRING(100), allowNull: false },
      instrument_type: { type: Sequelize.STRING(100), allowNull: true },
      market_name: { type: Sequelize.STRING(200), allowNull: true },
      ticker_symbol: { type: Sequelize.STRING(50), allowNull: true },
      isin_code: { type: Sequelize.STRING(50), allowNull: true },
      broker_name: { type: Sequelize.STRING(200), allowNull: true },
      custodian_name: { type: Sequelize.STRING(200), allowNull: true },
      currency_code: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'AED' },
      accounting_classification: {
        type: Sequelize.ENUM('COST', 'AMORTISED_COST', 'FVTPL', 'FVOCI'),
        allowNull: false,
        defaultValue: 'COST',
      },
      risk_level: {
        type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH'),
        allowNull: false,
        defaultValue: 'MEDIUM',
      },
      status: {
        type: Sequelize.ENUM('DRAFT', 'ACTIVE', 'SOLD', 'MATURED', 'CLOSED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      acquisition_date: { type: Sequelize.DATEONLY, allowNull: true },
      maturity_date: { type: Sequelize.DATEONLY, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('investment_assets', ['company_id', 'investment_code'], {
      unique: true,
      name: 'idx_inv_asset_company_code',
    });
    await queryInterface.addIndex('investment_assets', ['company_id', 'status'], {
      name: 'idx_inv_asset_company_status',
    });

    await queryInterface.createTable('investment_holdings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      investment_asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'investment_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      average_cost: { type: Sequelize.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      total_cost: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      current_price: { type: Sequelize.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      current_market_value: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      base_currency_value: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      unrealized_gain_loss: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      realized_gain_loss: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      last_valuation_date: { type: Sequelize.DATEONLY, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('investment_holdings', ['company_id', 'investment_asset_id'], {
      unique: true,
      name: 'idx_inv_holding_company_asset',
    });

    await queryInterface.createTable('investment_transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      investment_asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'investment_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      transaction_no: { type: Sequelize.STRING(50), allowNull: false },
      transaction_type: {
        type: Sequelize.ENUM(
          'BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'BONUS', 'SPLIT',
          'CHARGE', 'REVALUATION', 'FX_GAIN_LOSS', 'MATURITY', 'WRITE_OFF'
        ),
        allowNull: false,
      },
      transaction_date: { type: Sequelize.DATEONLY, allowNull: false },
      quantity: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      unit_price: { type: Sequelize.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      gross_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      charges_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      tax_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      net_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      currency_code: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'AED' },
      exchange_rate: { type: Sequelize.DECIMAL(12, 6), allowNull: false, defaultValue: 1 },
      base_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      bank_account_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'bank_accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      journal_voucher_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'journal_vouchers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      posting_status: {
        type: Sequelize.ENUM('DRAFT', 'APPROVED', 'POSTED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      approval_status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('investment_transactions', ['company_id', 'transaction_no'], {
      unique: true,
      name: 'idx_inv_txn_company_no',
    });
    await queryInterface.addIndex('investment_transactions', ['company_id', 'investment_asset_id'], {
      name: 'idx_inv_txn_company_asset',
    });

    await queryInterface.createTable('investment_partner_allocations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      investment_asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'investment_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      investor_type: {
        type: Sequelize.ENUM('OWNER', 'PARTNER', 'COMPANY'),
        allowNull: false,
      },
      investor_ref_id: { type: Sequelize.INTEGER, allowNull: true },
      investor_name: { type: Sequelize.STRING(200), allowNull: false },
      contribution_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      ownership_percentage: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
      profit_share_percentage: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
      dividend_share_percentage: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });
    await queryInterface.addIndex('investment_partner_allocations', ['company_id', 'investment_asset_id'], {
      name: 'idx_inv_alloc_company_asset',
    });

    await queryInterface.createTable('investment_valuation_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      investment_asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'investment_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      valuation_no: { type: Sequelize.STRING(50), allowNull: true },
      valuation_date: { type: Sequelize.DATEONLY, allowNull: false },
      quantity: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      price: { type: Sequelize.DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      market_value: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      exchange_rate: { type: Sequelize.DECIMAL(12, 6), allowNull: false, defaultValue: 1 },
      base_market_value: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      unrealized_gain_loss: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      valuation_source: {
        type: Sequelize.ENUM('MANUAL', 'IMPORT', 'API'),
        allowNull: false,
        defaultValue: 'MANUAL',
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approval_status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      ...ts,
    });
    await queryInterface.addIndex('investment_valuation_history', ['company_id', 'investment_asset_id'], {
      name: 'idx_inv_val_company_asset',
    });

    await queryInterface.createTable('investment_documents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      investment_asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'investment_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      document_type: { type: Sequelize.STRING(100), allowNull: false },
      file_name: { type: Sequelize.STRING(255), allowNull: false },
      file_path: { type: Sequelize.STRING(500), allowNull: false },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      ...ts,
    });

    await queryInterface.createTable('investment_account_configurations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { ...cfk, unique: true },
      investment_asset_account: { type: Sequelize.INTEGER, allowNull: true },
      dividend_income_account: { type: Sequelize.INTEGER, allowNull: true },
      interest_income_account: { type: Sequelize.INTEGER, allowNull: true },
      realized_gain_account: { type: Sequelize.INTEGER, allowNull: true },
      realized_loss_account: { type: Sequelize.INTEGER, allowNull: true },
      unrealized_gain_account: { type: Sequelize.INTEGER, allowNull: true },
      unrealized_loss_account: { type: Sequelize.INTEGER, allowNull: true },
      brokerage_charges_account: { type: Sequelize.INTEGER, allowNull: true },
      bank_charges_account: { type: Sequelize.INTEGER, allowNull: true },
      fx_gain_account: { type: Sequelize.INTEGER, allowNull: true },
      fx_loss_account: { type: Sequelize.INTEGER, allowNull: true },
      partner_payable_account: { type: Sequelize.INTEGER, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investment_account_configurations');
    await queryInterface.dropTable('investment_documents');
    await queryInterface.dropTable('investment_valuation_history');
    await queryInterface.dropTable('investment_partner_allocations');
    await queryInterface.dropTable('investment_transactions');
    await queryInterface.dropTable('investment_holdings');
    await queryInterface.dropTable('investment_assets');
    await queryInterface.dropTable('investment_categories');
  },
};
