'use strict';

/**
 * Seed sample investment module data for the first active company.
 * Run: node src/scripts/seedInvestmentData.js
 */
const { sequelize } = require('../config/database');
const {
  CompanySetting,
  ChartOfAccount,
  BankAccount,
  User,
  InvestmentCategory,
  InvestmentAsset,
  InvestmentHolding,
  InvestmentPartnerAllocation,
  InvestmentTransaction,
  InvestmentValuationHistory,
  InvestmentAccountConfiguration,
} = require('../models');
const { seedMissingNumberSeries } = require('../services/companyNumberSeriesSeed.service');

async function findOrCreateCoa(companyId, { accountCode, accountName, accountType }) {
  const [acct] = await ChartOfAccount.findOrCreate({
    where: { companyId, accountCode },
    defaults: {
      companyId,
      accountCode,
      accountName,
      accountType,
      level: 1,
      isActive: true,
      isReconcilable: accountType === 'asset' && accountCode.includes('1120'),
    },
  });
  return acct;
}

async function seedInvestmentCoaAndBank(companyId) {
  const coaDefs = [
    { accountCode: 'INV-1120', accountName: 'Investment Operating Bank', accountType: 'asset' },
    { accountCode: 'INV-1210', accountName: 'Investments at FVTPL', accountType: 'asset' },
    { accountCode: 'INV-4110', accountName: 'Dividend Income', accountType: 'revenue' },
    { accountCode: 'INV-4120', accountName: 'Interest Income', accountType: 'revenue' },
    { accountCode: 'INV-4210', accountName: 'Realized Gain on Investments', accountType: 'revenue' },
    { accountCode: 'INV-5210', accountName: 'Realized Loss on Investments', accountType: 'expense' },
    { accountCode: 'INV-4220', accountName: 'Unrealized Gain on Investments', accountType: 'revenue' },
    { accountCode: 'INV-5220', accountName: 'Unrealized Loss on Investments', accountType: 'expense' },
    { accountCode: 'INV-5310', accountName: 'Brokerage Charges', accountType: 'expense' },
    { accountCode: 'INV-5320', accountName: 'Bank Charges', accountType: 'expense' },
    { accountCode: 'INV-4230', accountName: 'FX Gain on Investments', accountType: 'revenue' },
    { accountCode: 'INV-5230', accountName: 'FX Loss on Investments', accountType: 'expense' },
    { accountCode: 'INV-2110', accountName: 'Partner Investment Payable', accountType: 'liability' },
  ];

  const coa = {};
  for (const def of coaDefs) {
    coa[def.accountCode] = await findOrCreateCoa(companyId, def);
  }

  const user = await User.findOne({ order: [['id', 'ASC']] });
  const createdBy = user?.id || 1;

  const [bank] = await BankAccount.findOrCreate({
    where: { companyId, accountNumber: 'INV-OP-001' },
    defaults: {
      companyId,
      bankName: 'Investment Bank',
      accountName: 'Investment Operating Account',
      accountNumber: 'INV-OP-001',
      currency: 'AED',
      currentBalance: 100000,
      chartAccountId: coa['INV-1120'].id,
      status: 'active',
      createdBy,
    },
  });
  if (!bank.chartAccountId) {
    await bank.update({ chartAccountId: coa['INV-1120'].id });
  }

  const [config] = await InvestmentAccountConfiguration.findOrCreate({
    where: { companyId },
    defaults: { companyId, active: true },
  });

  await config.update({
    active: true,
    investmentAssetAccount: coa['INV-1210'].id,
    dividendIncomeAccount: coa['INV-4110'].id,
    interestIncomeAccount: coa['INV-4120'].id,
    realizedGainAccount: coa['INV-4210'].id,
    realizedLossAccount: coa['INV-5210'].id,
    unrealizedGainAccount: coa['INV-4220'].id,
    unrealizedLossAccount: coa['INV-5220'].id,
    brokerageChargesAccount: coa['INV-5310'].id,
    bankChargesAccount: coa['INV-5320'].id,
    fxGainAccount: coa['INV-4230'].id,
    fxLossAccount: coa['INV-5230'].id,
    partnerPayableAccount: coa['INV-2110'].id,
  });

  return { bank, config };
}

async function seedAssetBundle(companyId, bank, { assetDef, holdingDef, allocations = [], transactions = [], valuations = [] }) {
  const [asset] = await InvestmentAsset.findOrCreate({
    where: { companyId, investmentCode: assetDef.investmentCode },
    defaults: { companyId, ...assetDef },
  });

  await InvestmentHolding.findOrCreate({
    where: { companyId, investmentAssetId: asset.id },
    defaults: { companyId, investmentAssetId: asset.id, ...holdingDef },
  });
  const holding = await InvestmentHolding.findOne({ where: { companyId, investmentAssetId: asset.id } });
  if (holding) await holding.update(holdingDef);

  for (const alloc of allocations) {
    await InvestmentPartnerAllocation.findOrCreate({
      where: { companyId, investmentAssetId: asset.id, investorName: alloc.investorName },
      defaults: { companyId, investmentAssetId: asset.id, isActive: true, ...alloc },
    });
  }

  for (const txn of transactions) {
    const [row] = await InvestmentTransaction.findOrCreate({
      where: { companyId, transactionNo: txn.transactionNo },
      defaults: {
        companyId,
        investmentAssetId: asset.id,
        bankAccountId: bank.id,
        currencyCode: assetDef.currencyCode || 'AED',
        exchangeRate: txn.exchangeRate ?? 1,
        ...txn,
      },
    });
    await row.update({
      investmentAssetId: asset.id,
      bankAccountId: txn.bankAccountId === null ? null : (txn.bankAccountId ?? bank.id),
      approvalStatus: txn.approvalStatus || 'APPROVED',
      postingStatus: txn.postingStatus || 'APPROVED',
    });
  }

  for (const val of valuations) {
    await InvestmentValuationHistory.findOrCreate({
      where: { companyId, investmentAssetId: asset.id, valuationDate: val.valuationDate },
      defaults: {
        companyId,
        investmentAssetId: asset.id,
        valuationSource: 'MANUAL',
        exchangeRate: val.exchangeRate ?? 1,
        ...val,
      },
    });
  }

  return asset;
}

async function seedExtendedPortfolio(companyId, bank, categories) {
  const catEquity = categories.EQ;
  const catFixed = categories.FI;
  const catCommodities = categories.COM;
  const catRealEstate = categories.REF;
  const catFund = categories.MF;

  const bundles = [
    {
      assetDef: {
        categoryId: catCommodities.id,
        investmentCode: 'INV-SEED-003',
        investmentName: 'Emirates Gold ETF',
        assetType: 'commodities',
        instrumentType: 'ETF',
        tickerSymbol: 'EGOLD',
        marketName: 'DFM',
        currencyCode: 'AED',
        accountingClassification: 'FVTPL',
        riskLevel: 'HIGH',
        status: 'ACTIVE',
        acquisitionDate: '2025-03-01',
        brokerName: 'FAB Securities',
      },
      holdingDef: {
        quantity: 200,
        averageCost: 75,
        totalCost: 15000,
        currentPrice: 82,
        currentMarketValue: 16400,
        baseCurrencyValue: 16400,
        unrealizedGainLoss: 1400,
        lastValuationDate: '2025-06-30',
      },
      allocations: [
        { investorType: 'COMPANY', investorName: 'Company Treasury', ownershipPercentage: 100, profitSharePercentage: 100, dividendSharePercentage: 100 },
      ],
      transactions: [
        { transactionNo: 'ITX-SEED-005', transactionType: 'BUY', transactionDate: '2025-03-01', quantity: 200, unitPrice: 75, grossAmount: 15000, netAmount: 15050, baseAmount: 15050, chargesAmount: 50, approvalStatus: 'APPROVED', postingStatus: 'APPROVED' },
        { transactionNo: 'ITX-SEED-006', transactionType: 'CHARGE', transactionDate: '2025-03-02', quantity: 0, unitPrice: 0, grossAmount: 50, netAmount: 50, baseAmount: 50, approvalStatus: 'APPROVED', postingStatus: 'APPROVED' },
      ],
      valuations: [
        { valuationNo: 'VAL-SEED-010', valuationDate: '2025-06-30', quantity: 200, price: 82, marketValue: 16400, baseMarketValue: 16400, unrealizedGainLoss: 1400, approvalStatus: 'APPROVED' },
      ],
    },
    {
      assetDef: {
        categoryId: catRealEstate.id,
        investmentCode: 'INV-SEED-004',
        investmentName: 'Emaar Development REIT',
        assetType: 'real_estate',
        instrumentType: 'REIT',
        tickerSymbol: 'EMAAR-REIT',
        marketName: 'DFM',
        currencyCode: 'AED',
        accountingClassification: 'FVOCI',
        riskLevel: 'MEDIUM',
        status: 'ACTIVE',
        acquisitionDate: '2024-11-10',
        brokerName: 'Emirates NBD Capital',
      },
      holdingDef: {
        quantity: 5000,
        averageCost: 1.2,
        totalCost: 6000,
        currentPrice: 1.35,
        currentMarketValue: 6750,
        baseCurrencyValue: 6750,
        unrealizedGainLoss: 750,
        lastValuationDate: '2025-06-30',
      },
      allocations: [
        { investorType: 'COMPANY', investorName: 'Company Treasury', ownershipPercentage: 50, profitSharePercentage: 50, dividendSharePercentage: 50 },
        { investorType: 'PARTNER', investorName: 'Alpha Partner LLC', ownershipPercentage: 30, profitSharePercentage: 30, dividendSharePercentage: 30 },
        { investorType: 'OWNER', investorName: 'Holding Family Office', ownershipPercentage: 20, profitSharePercentage: 20, dividendSharePercentage: 20 },
      ],
      transactions: [
        { transactionNo: 'ITX-SEED-007', transactionType: 'BUY', transactionDate: '2024-11-10', quantity: 5000, unitPrice: 1.2, grossAmount: 6000, netAmount: 6000, baseAmount: 6000, approvalStatus: 'APPROVED', postingStatus: 'POSTED' },
        { transactionNo: 'ITX-SEED-008', transactionType: 'DIVIDEND', transactionDate: '2025-02-28', quantity: 0, unitPrice: 0, grossAmount: 450, netAmount: 450, baseAmount: 450, approvalStatus: 'APPROVED', postingStatus: 'POSTED' },
        { transactionNo: 'ITX-SEED-009', transactionType: 'DIVIDEND', transactionDate: '2025-05-30', quantity: 0, unitPrice: 0, grossAmount: 480, netAmount: 480, baseAmount: 480, approvalStatus: 'APPROVED', postingStatus: 'APPROVED' },
      ],
      valuations: [
        { valuationNo: 'VAL-SEED-011', valuationDate: '2025-03-31', quantity: 5000, price: 1.28, marketValue: 6400, baseMarketValue: 6400, unrealizedGainLoss: 400, approvalStatus: 'APPROVED' },
        { valuationNo: 'VAL-SEED-012', valuationDate: '2025-06-30', quantity: 5000, price: 1.35, marketValue: 6750, baseMarketValue: 6750, unrealizedGainLoss: 750, approvalStatus: 'APPROVED' },
      ],
    },
    {
      assetDef: {
        categoryId: catEquity.id,
        investmentCode: 'INV-SEED-005',
        investmentName: 'Apple Inc (USD)',
        assetType: 'equity',
        instrumentType: 'STOCK',
        tickerSymbol: 'AAPL',
        isinCode: 'US0378331005',
        marketName: 'NASDAQ',
        currencyCode: 'USD',
        accountingClassification: 'FVTPL',
        riskLevel: 'MEDIUM',
        status: 'ACTIVE',
        acquisitionDate: '2025-04-01',
        brokerName: 'Interactive Brokers',
        custodianName: 'IB LLC',
      },
      holdingDef: {
        quantity: 40,
        averageCost: 180,
        totalCost: 7200,
        currentPrice: 195,
        currentMarketValue: 7800,
        baseCurrencyValue: 28665,
        unrealizedGainLoss: 825,
        lastValuationDate: '2025-06-30',
      },
      allocations: [
        { investorType: 'COMPANY', investorName: 'Company Treasury', ownershipPercentage: 60, profitSharePercentage: 60, dividendSharePercentage: 60 },
        { investorType: 'PARTNER', investorName: 'Beta Capital Partners', ownershipPercentage: 40, profitSharePercentage: 40, dividendSharePercentage: 40 },
      ],
      transactions: [
        { transactionNo: 'ITX-SEED-010', transactionType: 'BUY', transactionDate: '2025-04-01', quantity: 40, unitPrice: 180, grossAmount: 7200, netAmount: 7215, baseAmount: 26512.5, currencyCode: 'USD', exchangeRate: 3.675, chargesAmount: 15, approvalStatus: 'APPROVED', postingStatus: 'POSTED' },
        { transactionNo: 'ITX-SEED-011', transactionType: 'DIVIDEND', transactionDate: '2025-05-15', quantity: 0, unitPrice: 0, grossAmount: 96, netAmount: 96, baseAmount: 352.8, currencyCode: 'USD', exchangeRate: 3.675, approvalStatus: 'APPROVED', postingStatus: 'APPROVED' },
        { transactionNo: 'ITX-SEED-012', transactionType: 'FX_GAIN_LOSS', transactionDate: '2025-06-01', quantity: 0, unitPrice: 0, grossAmount: 120, netAmount: 120, baseAmount: 120, approvalStatus: 'APPROVED', postingStatus: 'APPROVED' },
      ],
      valuations: [
        { valuationNo: 'VAL-SEED-013', valuationDate: '2025-06-30', quantity: 40, price: 195, marketValue: 7800, baseMarketValue: 28665, unrealizedGainLoss: 825, exchangeRate: 3.675, approvalStatus: 'APPROVED' },
        { valuationNo: 'VAL-SEED-014', valuationDate: '2025-07-15', quantity: 40, price: 198, marketValue: 7920, baseMarketValue: 29106, unrealizedGainLoss: 945, exchangeRate: 3.675, approvalStatus: 'PENDING' },
      ],
    },
    {
      assetDef: {
        categoryId: catFund.id,
        investmentCode: 'INV-SEED-006',
        investmentName: 'ADCB Money Market Fund',
        assetType: 'fund',
        instrumentType: 'MUTUAL_FUND',
        currencyCode: 'AED',
        accountingClassification: 'AMORTISED_COST',
        riskLevel: 'LOW',
        status: 'ACTIVE',
        acquisitionDate: '2025-01-05',
        brokerName: 'ADCB Asset Management',
      },
      holdingDef: {
        quantity: 10000,
        averageCost: 1,
        totalCost: 10000,
        currentPrice: 1.018,
        currentMarketValue: 10180,
        baseCurrencyValue: 10180,
        unrealizedGainLoss: 180,
        lastValuationDate: '2025-06-30',
      },
      allocations: [
        { investorType: 'COMPANY', investorName: 'Company Treasury', ownershipPercentage: 100, profitSharePercentage: 100, dividendSharePercentage: 100 },
      ],
      transactions: [
        { transactionNo: 'ITX-SEED-013', transactionType: 'BUY', transactionDate: '2025-01-05', quantity: 10000, unitPrice: 1, grossAmount: 10000, netAmount: 10000, baseAmount: 10000, approvalStatus: 'APPROVED', postingStatus: 'POSTED' },
        { transactionNo: 'ITX-SEED-014', transactionType: 'INTEREST', transactionDate: '2025-04-01', quantity: 0, unitPrice: 0, grossAmount: 85, netAmount: 85, baseAmount: 85, approvalStatus: 'APPROVED', postingStatus: 'POSTED' },
        { transactionNo: 'ITX-SEED-015', transactionType: 'INTEREST', transactionDate: '2025-07-01', quantity: 0, unitPrice: 0, grossAmount: 95, netAmount: 95, baseAmount: 95, approvalStatus: 'APPROVED', postingStatus: 'APPROVED' },
      ],
      valuations: [
        { valuationNo: 'VAL-SEED-015', valuationDate: '2025-06-30', quantity: 10000, price: 1.018, marketValue: 10180, baseMarketValue: 10180, unrealizedGainLoss: 180, approvalStatus: 'APPROVED' },
      ],
    },
    {
      assetDef: {
        categoryId: catCommodities.id,
        investmentCode: 'INV-SEED-007',
        investmentName: 'iShares Silver Trust',
        assetType: 'commodities',
        instrumentType: 'ETF',
        tickerSymbol: 'SLV',
        marketName: 'NYSE',
        currencyCode: 'USD',
        accountingClassification: 'FVTPL',
        riskLevel: 'HIGH',
        status: 'ACTIVE',
        acquisitionDate: '2025-05-10',
        brokerName: 'Interactive Brokers',
      },
      holdingDef: {
        quantity: 150,
        averageCost: 28,
        totalCost: 4200,
        currentPrice: 30.5,
        currentMarketValue: 4575,
        baseCurrencyValue: 16813.13,
        unrealizedGainLoss: 375,
        lastValuationDate: '2025-06-30',
      },
      allocations: [
        { investorType: 'OWNER', investorName: 'Holding Family Office', ownershipPercentage: 55, profitSharePercentage: 55, dividendSharePercentage: 55 },
        { investorType: 'PARTNER', investorName: 'Gamma Trading LLC', ownershipPercentage: 45, profitSharePercentage: 45, dividendSharePercentage: 45 },
      ],
      transactions: [
        { transactionNo: 'ITX-SEED-016', transactionType: 'BUY', transactionDate: '2025-05-10', quantity: 150, unitPrice: 28, grossAmount: 4200, netAmount: 4220, baseAmount: 15508.5, currencyCode: 'USD', exchangeRate: 3.675, chargesAmount: 20, approvalStatus: 'APPROVED', postingStatus: 'APPROVED' },
      ],
      valuations: [
        { valuationNo: 'VAL-SEED-016', valuationDate: '2025-06-30', quantity: 150, price: 30.5, marketValue: 4575, baseMarketValue: 16813.13, unrealizedGainLoss: 375, exchangeRate: 3.675, approvalStatus: 'APPROVED' },
      ],
    },
    {
      assetDef: {
        categoryId: catFixed.id,
        investmentCode: 'INV-SEED-008',
        investmentName: 'FAB Fixed Deposit 12M',
        assetType: 'fixed_income',
        instrumentType: 'FIXED_DEPOSIT',
        currencyCode: 'AED',
        accountingClassification: 'AMORTISED_COST',
        riskLevel: 'LOW',
        status: 'ACTIVE',
        acquisitionDate: '2025-06-01',
        maturityDate: '2026-06-01',
        brokerName: 'First Abu Dhabi Bank',
      },
      holdingDef: {
        quantity: 1,
        averageCost: 250000,
        totalCost: 250000,
        currentPrice: 250000,
        currentMarketValue: 250000,
        baseCurrencyValue: 250000,
        unrealizedGainLoss: 0,
        lastValuationDate: '2025-06-01',
      },
      allocations: [
        { investorType: 'COMPANY', investorName: 'Company Treasury', ownershipPercentage: 80, profitSharePercentage: 80, dividendSharePercentage: 80 },
        { investorType: 'PARTNER', investorName: 'Alpha Partner LLC', ownershipPercentage: 20, profitSharePercentage: 20, dividendSharePercentage: 20 },
      ],
      transactions: [
        { transactionNo: 'ITX-SEED-017', transactionType: 'BUY', transactionDate: '2025-06-01', quantity: 1, unitPrice: 250000, grossAmount: 250000, netAmount: 250000, baseAmount: 250000, approvalStatus: 'APPROVED', postingStatus: 'APPROVED' },
        { transactionNo: 'ITX-SEED-018', transactionType: 'INTEREST', transactionDate: '2025-09-01', quantity: 0, unitPrice: 0, grossAmount: 3125, netAmount: 3125, baseAmount: 3125, approvalStatus: 'PENDING', postingStatus: 'DRAFT' },
      ],
      valuations: [],
    },
    {
      assetDef: {
        categoryId: catEquity.id,
        investmentCode: 'INV-SEED-009',
        investmentName: 'Mubadala Private Equity Fund II',
        assetType: 'equity',
        instrumentType: 'PRIVATE_EQUITY',
        currencyCode: 'AED',
        accountingClassification: 'COST',
        riskLevel: 'HIGH',
        status: 'ACTIVE',
        acquisitionDate: '2024-06-15',
        brokerName: 'Mubadala Capital',
        notes: 'Illiquid PE commitment — quarterly NAV updates',
      },
      holdingDef: {
        quantity: 1,
        averageCost: 500000,
        totalCost: 500000,
        currentPrice: 525000,
        currentMarketValue: 525000,
        baseCurrencyValue: 525000,
        unrealizedGainLoss: 25000,
        lastValuationDate: '2025-06-30',
      },
      allocations: [
        { investorType: 'COMPANY', investorName: 'Company Treasury', ownershipPercentage: 70, profitSharePercentage: 70, dividendSharePercentage: 70 },
        { investorType: 'OWNER', investorName: 'Holding Family Office', ownershipPercentage: 30, profitSharePercentage: 30, dividendSharePercentage: 30 },
      ],
      transactions: [
        { transactionNo: 'ITX-SEED-019', transactionType: 'BUY', transactionDate: '2024-06-15', quantity: 1, unitPrice: 500000, grossAmount: 500000, netAmount: 500000, baseAmount: 500000, approvalStatus: 'APPROVED', postingStatus: 'POSTED' },
        { transactionNo: 'ITX-SEED-020', transactionType: 'CHARGE', transactionDate: '2025-01-01', quantity: 0, unitPrice: 0, grossAmount: 5000, netAmount: 5000, baseAmount: 5000, approvalStatus: 'APPROVED', postingStatus: 'APPROVED' },
      ],
      valuations: [
        { valuationNo: 'VAL-SEED-017', valuationDate: '2025-03-31', quantity: 1, price: 510000, marketValue: 510000, baseMarketValue: 510000, unrealizedGainLoss: 10000, approvalStatus: 'APPROVED' },
        { valuationNo: 'VAL-SEED-018', valuationDate: '2025-06-30', quantity: 1, price: 525000, marketValue: 525000, baseMarketValue: 525000, unrealizedGainLoss: 25000, approvalStatus: 'APPROVED' },
      ],
    },
  ];

  const created = [];
  for (const bundle of bundles) {
    const asset = await seedAssetBundle(companyId, bank, bundle);
    created.push(asset.investmentCode);
  }
  return created;
}

async function main() {
  const company = await CompanySetting.findOne({ where: { isActive: true }, order: [['id', 'ASC']] });
  if (!company) {
    console.error('No active company found');
    process.exit(1);
  }
  const companyId = company.id;
  console.log(`Seeding investments for company ${companyId}`);

  const { bank } = await seedInvestmentCoaAndBank(companyId);
  console.log(`Investment GL accounts + bank ${bank.accountName} ready`);

  const categories = await Promise.all(
    [
      { name: 'Equities', code: 'EQ', assetClass: 'equity' },
      { name: 'Fixed Income', code: 'FI', assetClass: 'fixed_income' },
      { name: 'Commodities', code: 'COM', assetClass: 'commodities' },
      { name: 'Real Estate Fund', code: 'REF', assetClass: 'real_estate' },
      { name: 'Mutual Funds', code: 'MF', assetClass: 'fund' },
    ].map((c) =>
      InvestmentCategory.findOrCreate({
        where: { companyId, code: c.code },
        defaults: { ...c, companyId, isActive: true },
      })
    )
  );

  const categoryMap = {
    EQ: categories[0][0],
    FI: categories[1][0],
    COM: categories[2][0],
    REF: categories[3][0],
    MF: categories[4][0],
  };

  const catEquity = categoryMap.EQ;

  const catFixed = categoryMap.FI;

  const [asset] = await InvestmentAsset.findOrCreate({
    where: { companyId, investmentCode: 'INV-SEED-001' },
    defaults: {
      companyId,
      categoryId: catEquity.id,
      investmentCode: 'INV-SEED-001',
      investmentName: 'Sample UAE Equity ETF',
      assetType: 'equity',
      instrumentType: 'ETF',
      currencyCode: 'AED',
      accountingClassification: 'FVTPL',
      riskLevel: 'MEDIUM',
      status: 'ACTIVE',
      acquisitionDate: '2025-01-15',
    },
  });

  await InvestmentHolding.findOrCreate({
    where: { companyId, investmentAssetId: asset.id },
    defaults: {
      companyId,
      investmentAssetId: asset.id,
      quantity: 100,
      averageCost: 50,
      totalCost: 5000,
      currentPrice: 55,
      currentMarketValue: 5500,
      baseCurrencyValue: 5500,
      unrealizedGainLoss: 500,
    },
  });

  await InvestmentPartnerAllocation.findOrCreate({
    where: { companyId, investmentAssetId: asset.id, investorName: 'Company Treasury' },
    defaults: {
      companyId,
      investmentAssetId: asset.id,
      investorType: 'COMPANY',
      investorName: 'Company Treasury',
      ownershipPercentage: 100,
      profitSharePercentage: 100,
      dividendSharePercentage: 100,
      isActive: true,
    },
  });

  const [buyTxn] = await InvestmentTransaction.findOrCreate({
    where: { companyId, transactionNo: 'ITX-SEED-001' },
    defaults: {
      companyId,
      investmentAssetId: asset.id,
      transactionNo: 'ITX-SEED-001',
      transactionType: 'BUY',
      transactionDate: '2025-01-15',
      quantity: 100,
      unitPrice: 50,
      grossAmount: 5000,
      netAmount: 5000,
      baseAmount: 5000,
      currencyCode: 'AED',
      exchangeRate: 1,
      bankAccountId: bank.id,
      postingStatus: 'APPROVED',
      approvalStatus: 'APPROVED',
    },
  });
  await buyTxn.update({
    bankAccountId: bank.id,
    approvalStatus: 'APPROVED',
    postingStatus: 'APPROVED',
  });

  const valuationSnapshots = [
    { date: '2025-01-31', price: 50, marketValue: 5000, baseMarketValue: 5000, unrealizedGainLoss: 0 },
    { date: '2025-03-31', price: 52, marketValue: 5200, baseMarketValue: 5200, unrealizedGainLoss: 200 },
    { date: '2025-06-30', price: 55, marketValue: 5500, baseMarketValue: 5500, unrealizedGainLoss: 500 },
  ];

  for (const [i, snap] of valuationSnapshots.entries()) {
    await InvestmentValuationHistory.findOrCreate({
      where: { companyId, investmentAssetId: asset.id, valuationDate: snap.date },
      defaults: {
        companyId,
        investmentAssetId: asset.id,
        valuationNo: `VAL-SEED-${String(i + 1).padStart(3, '0')}`,
        valuationDate: snap.date,
        quantity: 100,
        price: snap.price,
        marketValue: snap.marketValue,
        exchangeRate: 1,
        baseMarketValue: snap.baseMarketValue,
        unrealizedGainLoss: snap.unrealizedGainLoss,
        valuationSource: 'MANUAL',
        approvalStatus: 'APPROVED',
      },
    });
  }

  const [assetFi] = await InvestmentAsset.findOrCreate({
    where: { companyId, investmentCode: 'INV-SEED-002' },
    defaults: {
      companyId,
      categoryId: catFixed.id,
      investmentCode: 'INV-SEED-002',
      investmentName: 'UAE Government Sukuk',
      assetType: 'fixed_income',
      instrumentType: 'BOND',
      currencyCode: 'AED',
      accountingClassification: 'AMORTISED_COST',
      riskLevel: 'LOW',
      status: 'ACTIVE',
      acquisitionDate: '2025-02-01',
      maturityDate: '2027-02-01',
    },
  });

  await InvestmentHolding.findOrCreate({
    where: { companyId, investmentAssetId: assetFi.id },
    defaults: {
      companyId,
      investmentAssetId: assetFi.id,
      quantity: 50,
      averageCost: 1000,
      totalCost: 50000,
      currentPrice: 1010,
      currentMarketValue: 50500,
      baseCurrencyValue: 50500,
      unrealizedGainLoss: 500,
    },
  });

  await InvestmentPartnerAllocation.findOrCreate({
    where: { companyId, investmentAssetId: assetFi.id, investorName: 'Company Treasury' },
    defaults: {
      companyId,
      investmentAssetId: assetFi.id,
      investorType: 'COMPANY',
      investorName: 'Company Treasury',
      ownershipPercentage: 70,
      profitSharePercentage: 70,
      dividendSharePercentage: 70,
      isActive: true,
    },
  });

  await InvestmentPartnerAllocation.findOrCreate({
    where: { companyId, investmentAssetId: assetFi.id, investorName: 'Alpha Partner LLC' },
    defaults: {
      companyId,
      investmentAssetId: assetFi.id,
      investorType: 'PARTNER',
      investorName: 'Alpha Partner LLC',
      ownershipPercentage: 30,
      profitSharePercentage: 30,
      dividendSharePercentage: 30,
      isActive: true,
    },
  });

  const [divTxn] = await InvestmentTransaction.findOrCreate({
    where: { companyId, transactionNo: 'ITX-SEED-002' },
    defaults: {
      companyId,
      investmentAssetId: asset.id,
      transactionNo: 'ITX-SEED-002',
      transactionType: 'DIVIDEND',
      transactionDate: '2025-04-15',
      quantity: 0,
      unitPrice: 0,
      grossAmount: 250,
      netAmount: 250,
      baseAmount: 250,
      currencyCode: 'AED',
      exchangeRate: 1,
      bankAccountId: bank.id,
      postingStatus: 'APPROVED',
      approvalStatus: 'APPROVED',
    },
  });
  await divTxn.update({
    bankAccountId: bank.id,
    approvalStatus: 'APPROVED',
    postingStatus: 'APPROVED',
  });

  const [intTxn] = await InvestmentTransaction.findOrCreate({
    where: { companyId, transactionNo: 'ITX-SEED-003' },
    defaults: {
      companyId,
      investmentAssetId: assetFi.id,
      transactionNo: 'ITX-SEED-003',
      transactionType: 'INTEREST',
      transactionDate: '2025-05-01',
      quantity: 0,
      unitPrice: 0,
      grossAmount: 1200,
      netAmount: 1200,
      baseAmount: 1200,
      currencyCode: 'AED',
      exchangeRate: 1,
      postingStatus: 'APPROVED',
      approvalStatus: 'APPROVED',
      bankAccountId: bank.id,
    },
  });
  await intTxn.update({
    bankAccountId: bank.id,
    approvalStatus: 'APPROVED',
    postingStatus: 'APPROVED',
  });

  const sellQty = 20;
  const sellPrice = 56;
  const sellProceeds = sellQty * sellPrice;

  const [sellTxn] = await InvestmentTransaction.findOrCreate({
    where: { companyId, transactionNo: 'ITX-SEED-004' },
    defaults: {
      companyId,
      investmentAssetId: asset.id,
      transactionNo: 'ITX-SEED-004',
      transactionType: 'SELL',
      transactionDate: '2025-05-20',
      quantity: sellQty,
      unitPrice: sellPrice,
      grossAmount: sellProceeds,
      netAmount: sellProceeds,
      baseAmount: sellProceeds,
      currencyCode: 'AED',
      exchangeRate: 1,
      bankAccountId: bank.id,
      postingStatus: 'APPROVED',
      approvalStatus: 'APPROVED',
    },
  });
  await sellTxn.update({
    bankAccountId: bank.id,
    approvalStatus: 'APPROVED',
    postingStatus: 'APPROVED',
  });

  const holding = await InvestmentHolding.findOne({ where: { companyId, investmentAssetId: asset.id } });
  if (holding) {
    await holding.update({
      quantity: 80,
      totalCost: 4000,
      averageCost: 50,
      currentPrice: 55,
      currentMarketValue: 4400,
      baseCurrencyValue: 4400,
      unrealizedGainLoss: 400,
    });
  }

  const extendedCodes = await seedExtendedPortfolio(companyId, bank, categoryMap);
  console.log(`Extended portfolio seeded: ${extendedCodes.join(', ')}`);

  await seedMissingNumberSeries(companyId);

  console.log('Investment seed data ready — ITX-SEED-001 through 020 (mix of APPROVED/POSTED/PENDING)');
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
