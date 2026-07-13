'use strict';

/**
 * Full demo seed for Investment Management 2.0 — covers every sidebar page.
 * Idempotent. Marks isTestData=true where supported.
 *
 * Run:
 *   npm run seed:investments-v2
 *   npm run seed:investments-full   (legacy Phase 15 + this script)
 *
 * Production:
 *   ALLOW_PRODUCTION_DEMO_SEED=1 TARGET_COMPANY_ID=<demo> npm run seed:investments-v2
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { getInvestmentV2ReleaseConfig } = require('../config/investmentV2ReleaseConfig');

function assertSeedAllowed() {
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  const isProd = env === 'production' || env === 'prod';
  const allowFlag =
    String(process.env.ALLOW_PRODUCTION_DEMO_SEED || '') === '1' ||
    String(process.env.ALLOW_PRODUCTION_DEMO_SEED || '').toLowerCase() === 'true';
  const cfg = getInvestmentV2ReleaseConfig();
  if (isProd) {
    if (!allowFlag && !cfg.allowProductionSeed) {
      throw new Error(
        'Refusing seed:investments-v2 on production. Set ALLOW_PRODUCTION_DEMO_SEED=1 and TARGET_COMPANY_ID=<demo-company>.'
      );
    }
    if (!process.env.TARGET_COMPANY_ID && !process.env.COMPANY_ID) {
      throw new Error('TARGET_COMPANY_ID (demo company) is required when seeding on production');
    }
  }
}

assertSeedAllowed();

/** Demo rows should appear on UI by default. Set SEED_AS_TEST_DATA=1 to mark isTestData. */
const SEED_TEST = ['1', 'true', 'yes'].includes(String(process.env.SEED_AS_TEST_DATA || '').toLowerCase());
const TD = { isTestData: SEED_TEST };

const { sequelize } = require('../config/database');
const {
  CompanySetting,
  User,
  InvestmentPortfolio,
  InvestmentBook,
  InvestmentInstrument,
  InvestmentBroker,
  InvestmentCustodian,
  InvestmentAccount,
  InvestmentHoldingV2,
  InvestmentPositionLot,
  InvestmentOrder,
  InvestmentTrade,
  InvestmentSettlement,
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
  InvestmentOmsPilotUser,
} = require('../models');

async function resolveCompanyId() {
  if (process.env.TARGET_COMPANY_ID) return Number(process.env.TARGET_COMPANY_ID);
  if (process.env.COMPANY_ID) return Number(process.env.COMPANY_ID);
  const company = await CompanySetting.findOne({ order: [['id', 'ASC']] });
  if (!company) throw new Error('No company found — seed company settings first');
  return company.id;
}

async function upsert(Model, where, defaults) {
  const [row] = await Model.findOrCreate({ where, defaults: { ...where, ...defaults } });
  await row.update(defaults);
  return row;
}

function d(offsetDays = 0) {
  const x = new Date();
  x.setDate(x.getDate() + offsetDays);
  return x.toISOString().slice(0, 10);
}

async function main() {
  const companyId = await resolveCompanyId();
  const today = d(0);
  const user = await User.findOne({ order: [['id', 'ASC']] });
  const userId = user?.id || 1;

  console.log(`Seeding full Investment 2.0 demo for company ${companyId}…`);

  // —— Brokers / Custodians / Accounts ——
  const broker = await upsert(
    InvestmentBroker,
    { companyId, brokerCode: 'BRK-SEED-01' },
    { brokerName: 'Seed Emirates Broker', countryCode: 'AE', status: 'ACTIVE', ...TD /* visibility */ }
  );
  const broker2 = await upsert(
    InvestmentBroker,
    { companyId, brokerCode: 'BRK-SEED-02' },
    { brokerName: 'Seed International Desk', countryCode: 'US', status: 'ACTIVE', ...TD /* visibility */ }
  );
  const custodian = await upsert(
    InvestmentCustodian,
    { companyId, custodianCode: 'CUS-SEED-01' },
    { custodianName: 'Seed Gulf Custodian', countryCode: 'AE', status: 'ACTIVE', ...TD /* visibility */ }
  );
  const custodian2 = await upsert(
    InvestmentCustodian,
    { companyId, custodianCode: 'CUS-SEED-02' },
    { custodianName: 'Seed Euroclear Proxy', countryCode: 'BE', status: 'ACTIVE', ...TD /* visibility */ }
  );

  // —— Portfolios / Books ——
  const portfolio = await upsert(
    InvestmentPortfolio,
    { companyId, portfolioCode: 'PF-SEED-CORE' },
    {
      portfolioName: 'Seed Core Portfolio',
      baseCurrency: 'AED',
      reportingCurrency: 'AED',
      portfolioType: 'GENERAL',
      riskProfile: 'MEDIUM',
      status: 'ACTIVE',
      costBasisMethod: 'AVERAGE',
      accountingMethod: 'COST',
      defaultBrokerId: broker.id,
      custodianId: custodian.id,
      ...TD /* visibility */,
    }
  );
  const portfolioInc = await upsert(
    InvestmentPortfolio,
    { companyId, portfolioCode: 'PF-SEED-INCOME' },
    {
      portfolioName: 'Seed Income Portfolio',
      baseCurrency: 'AED',
      reportingCurrency: 'AED',
      portfolioType: 'INCOME',
      riskProfile: 'LOW',
      status: 'ACTIVE',
      costBasisMethod: 'FIFO',
      defaultBrokerId: broker2.id,
      custodianId: custodian2.id,
      ...TD /* visibility */,
    }
  );

  const book = await upsert(
    InvestmentBook,
    { companyId, portfolioId: portfolio.id, bookCode: 'BOOK-SEED-MAIN' },
    { bookName: 'Main Book', bookType: 'TRADING', reportingCurrency: 'AED', status: 'ACTIVE' }
  );
  await upsert(
    InvestmentBook,
    { companyId, portfolioId: portfolioInc.id, bookCode: 'BOOK-SEED-INC' },
    { bookName: 'Income Book', bookType: 'HOLDING', reportingCurrency: 'AED', status: 'ACTIVE' }
  );

  await upsert(
    InvestmentAccount,
    { companyId, accountCode: 'ACC-SEED-BROK' },
    {
      portfolioId: portfolio.id,
      accountName: 'Seed Brokerage Cash',
      accountType: 'BROKERAGE',
      brokerId: broker.id,
      custodianId: custodian.id,
      currencyCode: 'AED',
      status: 'ACTIVE',
      ...TD /* visibility */,
    }
  );

  // —— Instruments ——
  const instrumentDefs = [
    {
      instrumentCode: 'INST-SEED-FAB',
      instrumentName: 'FAB Equity Seed',
      assetClass: 'EQUITY',
      instrumentType: 'COMMON_STOCK',
      ticker: 'FAB',
      countryCode: 'AE',
      sectorCode: 'BANK',
      currencyCode: 'AED',
      issuerName: 'First Abu Dhabi Bank',
      isRestricted: false,
    },
    {
      instrumentCode: 'INST-SEED-ADNOC',
      instrumentName: 'ADNOC Gas Seed',
      assetClass: 'EQUITY',
      instrumentType: 'COMMON_STOCK',
      ticker: 'ADNOCGAS',
      countryCode: 'AE',
      sectorCode: 'ENERGY',
      currencyCode: 'AED',
      issuerName: 'ADNOC Gas',
      isRestricted: false,
    },
    {
      instrumentCode: 'INST-SEED-UST',
      instrumentName: 'US Treasury Seed 2028',
      assetClass: 'FIXED_INCOME',
      instrumentType: 'GOVERNMENT_BOND',
      ticker: 'UST28',
      countryCode: 'US',
      sectorCode: 'GOV',
      currencyCode: 'USD',
      issuerName: 'US Treasury',
      maturityDate: '2028-06-15',
      isRestricted: false,
    },
    {
      instrumentCode: 'INST-SEED-GOLD',
      instrumentName: 'LBMA Gold Seed',
      assetClass: 'COMMODITY',
      instrumentType: 'PHYSICAL',
      ticker: 'XAU',
      countryCode: 'AE',
      sectorCode: 'METAL',
      currencyCode: 'AED',
      issuerName: 'Seed Bullion',
      isRestricted: false,
    },
    {
      instrumentCode: 'INST-SEED-RESTRICTED',
      instrumentName: 'Restricted Crypto Proxy',
      assetClass: 'CRYPTO',
      instrumentType: 'TOKEN',
      currencyCode: 'AED',
      countryCode: 'AE',
      sectorCode: 'ALT',
      issuerName: 'Seed Restricted Issuer',
      isRestricted: true,
    },
  ];

  const instruments = {};
  for (const def of instrumentDefs) {
    instruments[def.instrumentCode] = await upsert(
      InvestmentInstrument,
      { companyId, instrumentCode: def.instrumentCode },
      { ...def, status: 'ACTIVE', ...TD /* visibility */ }
    );
  }
  const fab = instruments['INST-SEED-FAB'];
  const adnoc = instruments['INST-SEED-ADNOC'];
  const ust = instruments['INST-SEED-UST'];
  const gold = instruments['INST-SEED-GOLD'];

  // —— Market prices ——
  const priceMap = {
    'INST-SEED-FAB': 18.5,
    'INST-SEED-ADNOC': 3.2,
    'INST-SEED-UST': 99.25,
    'INST-SEED-GOLD': 9200,
  };
  for (const [code, close] of Object.entries(priceMap)) {
    const inst = instruments[code];
    await upsert(
      InvestmentMarketPrice,
      { companyId, instrumentId: inst.id, priceDate: today, source: 'MANUAL' },
      {
        close,
        currencyCode: inst.currencyCode,
        sourcePriority: 100,
        ...TD /* visibility */,
      }
    );
  }

  // —— Holdings + lots ——
  const holdingSpecs = [
    { inst: fab, qty: 1000, cost: 15000, mv: 18500, price: 18.5 },
    { inst: adnoc, qty: 5000, cost: 14000, mv: 16000, price: 3.2 },
    { inst: ust, qty: 50, cost: 18000, mv: 19850, price: 99.25 },
    { inst: gold, qty: 2, cost: 17000, mv: 18400, price: 9200 },
  ];
  const holdings = {};
  for (const h of holdingSpecs) {
    const row = await upsert(
      InvestmentHoldingV2,
      { companyId, portfolioId: portfolio.id, bookId: book.id, instrumentId: h.inst.id },
      {
        quantity: h.qty,
        totalCost: h.cost,
        averageCost: h.cost / h.qty,
        currentPrice: h.price,
        currentMarketValue: h.mv,
        baseCurrencyValue: h.mv,
        unrealizedGainLoss: h.mv - h.cost,
        realizedGainLoss: 0,
        lastValuationDate: today,
      }
    );
    holdings[h.inst.instrumentCode] = row;
    await upsert(
      InvestmentPositionLot,
      { companyId, holdingV2Id: row.id, lotRef: `LOT-${h.inst.instrumentCode}-1` },
      {
        openDate: d(-120),
        quantity: h.qty,
        remainingQuantity: h.qty,
        unitCost: h.cost / h.qty,
        totalCost: h.cost,
        status: 'OPEN',
        lotOrigin: 'IMPORT',
        migrationNotes: 'Seed opening lot',
      }
    );
  }

  // —— OMS: orders / trades / settlements ——
  const orderDraft = await upsert(
    InvestmentOrder,
    { companyId, orderNumber: 'ORD-SEED-001' },
    {
      portfolioId: portfolio.id,
      instrumentId: fab.id,
      orderType: 'LIMIT',
      side: 'BUY',
      quantity: 200,
      executedQuantity: 0,
      limitPrice: 18.0,
      currencyCode: 'AED',
      orderDate: today,
      brokerId: broker.id,
      status: 'DRAFT',
      remarks: 'Seed draft buy FAB',
      ...TD /* visibility */,
    }
  );
  const orderApproved = await upsert(
    InvestmentOrder,
    { companyId, orderNumber: 'ORD-SEED-002' },
    {
      portfolioId: portfolio.id,
      instrumentId: adnoc.id,
      orderType: 'MARKET',
      side: 'BUY',
      quantity: 1000,
      executedQuantity: 1000,
      currencyCode: 'AED',
      orderDate: d(-5),
      brokerId: broker.id,
      status: 'EXECUTED',
      submittedBy: userId,
      approvedBy: userId,
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentOrder,
    { companyId, orderNumber: 'ORD-SEED-003' },
    {
      portfolioId: portfolio.id,
      instrumentId: gold.id,
      orderType: 'LIMIT',
      side: 'SELL',
      quantity: 1,
      executedQuantity: 0,
      limitPrice: 9500,
      currencyCode: 'AED',
      orderDate: d(-1),
      brokerId: broker2.id,
      status: 'APPROVED',
      submittedBy: userId,
      approvedBy: userId,
      ...TD /* visibility */,
    }
  );

  const tradeSettled = await upsert(
    InvestmentTrade,
    { companyId, tradeNumber: 'TRD-SEED-001' },
    {
      portfolioId: portfolio.id,
      orderId: orderApproved.id,
      instrumentId: adnoc.id,
      holdingV2Id: holdings['INST-SEED-ADNOC'].id,
      brokerReference: 'BRK-REF-SEED-001',
      side: 'BUY',
      tradeDate: d(-5),
      settlementDate: d(-3),
      quantity: 1000,
      price: 3.15,
      grossAmount: 3150,
      commission: 15,
      fees: 5,
      taxes: 0,
      netSettlement: 3170,
      costBasisMethod: 'AVERAGE',
      brokerId: broker.id,
      custodianId: custodian.id,
      status: 'SETTLED',
      remarks: 'Seed settled ADNOC buy',
      ...TD /* visibility */,
    }
  );
  const tradePending = await upsert(
    InvestmentTrade,
    { companyId, tradeNumber: 'TRD-SEED-002' },
    {
      portfolioId: portfolio.id,
      orderId: orderDraft.id,
      instrumentId: fab.id,
      holdingV2Id: holdings['INST-SEED-FAB'].id,
      side: 'BUY',
      tradeDate: today,
      settlementDate: d(2),
      quantity: 100,
      price: 18.4,
      grossAmount: 1840,
      commission: 10,
      fees: 0,
      netSettlement: 1850,
      brokerId: broker.id,
      status: 'CONFIRMED',
      ...TD /* visibility */,
    }
  );

  await upsert(
    InvestmentSettlement,
    { companyId, settlementNumber: 'STL-SEED-001' },
    {
      tradeId: tradeSettled.id,
      expectedDate: d(-3),
      actualDate: d(-3),
      settlementAmount: 3170,
      settlementCurrency: 'AED',
      status: 'SETTLED',
      externalReference: 'STL-EXT-001',
      reconciledAt: new Date(),
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentSettlement,
    { companyId, settlementNumber: 'STL-SEED-002' },
    {
      tradeId: tradePending.id,
      expectedDate: d(2),
      settlementAmount: 1850,
      settlementCurrency: 'AED',
      status: 'PENDING',
      ...TD /* visibility */,
    }
  );

  // —— Income + corporate actions ——
  await upsert(
    InvestmentIncomeEvent,
    { companyId, eventNumber: 'INC-SEED-DIV-001' },
    {
      portfolioId: portfolio.id,
      instrumentId: fab.id,
      holdingV2Id: holdings['INST-SEED-FAB'].id,
      incomeType: 'DIVIDEND',
      declarationDate: d(-30),
      exDate: d(-20),
      recordDate: d(-18),
      paymentDate: d(-5),
      quantity: 1000,
      rateOrPerUnit: 0.5,
      grossAmount: 500,
      accruedAmount: 500,
      withholdingTax: 0,
      netAmount: 500,
      currencyCode: 'AED',
      status: 'RECEIVED',
      source: 'MANUAL',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentIncomeEvent,
    { companyId, eventNumber: 'INC-SEED-CPN-001' },
    {
      portfolioId: portfolio.id,
      instrumentId: ust.id,
      holdingV2Id: holdings['INST-SEED-UST'].id,
      incomeType: 'COUPON',
      accrualStart: d(-90),
      accrualEnd: d(-1),
      paymentDate: d(15),
      quantity: 50,
      rateOrPerUnit: 1.25,
      grossAmount: 62.5,
      accruedAmount: 62.5,
      netAmount: 62.5,
      currencyCode: 'USD',
      exchangeRate: 3.67,
      status: 'ACCRUED',
      source: 'SCHEDULE',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentIncomeEvent,
    { companyId, eventNumber: 'INC-SEED-EXP-001' },
    {
      portfolioId: portfolio.id,
      instrumentId: adnoc.id,
      holdingV2Id: holdings['INST-SEED-ADNOC'].id,
      incomeType: 'DIVIDEND',
      declarationDate: today,
      exDate: d(10),
      paymentDate: d(25),
      quantity: 5000,
      rateOrPerUnit: 0.08,
      grossAmount: 400,
      netAmount: 400,
      currencyCode: 'AED',
      status: 'EXPECTED',
      source: 'MANUAL',
      ...TD /* visibility */,
    }
  );

  const ca = await upsert(
    InvestmentCorporateAction,
    { companyId, actionNumber: 'CA-SEED-BONUS-001' },
    {
      instrumentId: fab.id,
      actionType: 'BONUS_ISSUE',
      announcementDate: d(-40),
      exDate: d(-30),
      recordDate: d(-28),
      effectiveDate: d(-25),
      ratioNumerator: 1,
      ratioDenominator: 10,
      status: 'APPLIED',
      remarks: 'Seed 1:10 bonus',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentEntitlement,
    { companyId, corporateActionId: ca.id, portfolioId: portfolio.id, holdingV2Id: holdings['INST-SEED-FAB'].id },
    {
      holdingDate: d(-28),
      eligibleQuantity: 1000,
      entitlementQuantity: 100,
      entitlementCash: 0,
      status: 'APPLIED',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentCorporateAction,
    { companyId, actionNumber: 'CA-SEED-SPLIT-001' },
    {
      instrumentId: adnoc.id,
      actionType: 'STOCK_SPLIT',
      announcementDate: d(-10),
      effectiveDate: d(20),
      ratioNumerator: 2,
      ratioDenominator: 1,
      status: 'ANNOUNCED',
      ...TD /* visibility */,
    }
  );

  // —— Investors / capital ——
  const investor = await upsert(
    InvestmentInvestor,
    { companyId, investorCode: 'INV-SEED-01' },
    {
      legalName: 'Seed Family Office LLC',
      displayName: 'Seed FO',
      investorType: 'FAMILY_OFFICE',
      personOrEntity: 'ENTITY',
      preferredCurrency: 'AED',
      email: 'seed-fo@example.com',
      kycStatus: 'APPROVED',
      amlRiskRating: 'LOW',
      uboStatus: 'COMPLETE',
      sourceOfFundsStatus: 'VERIFIED',
      kycExpiryDate: '2027-12-31',
      kycReviewDate: today,
      sanctionsResultRef: 'SEED-SAN-OK',
      complianceApprovalStatus: 'APPROVED',
      onboardingStatus: 'COMPLETE',
      status: 'ACTIVE',
      ...TD /* visibility */,
    }
  );
  const investor2 = await upsert(
    InvestmentInvestor,
    { companyId, investorCode: 'INV-SEED-02' },
    {
      legalName: 'Seed Partner Holdings',
      displayName: 'Partner Seed',
      investorType: 'PARTNER',
      personOrEntity: 'ENTITY',
      preferredCurrency: 'AED',
      kycStatus: 'APPROVED',
      amlRiskRating: 'MEDIUM',
      complianceApprovalStatus: 'APPROVED',
      onboardingStatus: 'COMPLETE',
      status: 'ACTIVE',
      ...TD /* visibility */,
    }
  );

  const commitment = await upsert(
    InvestmentCommitment,
    { companyId, commitmentNumber: 'COM-SEED-001' },
    {
      investorId: investor.id,
      portfolioId: portfolio.id,
      commitmentAmount: 100000,
      fundedAmount: 40000,
      unfundedAmount: 60000,
      currencyCode: 'AED',
      commitmentDate: '2026-01-15',
      status: 'ACTIVE',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentCommitment,
    { companyId, commitmentNumber: 'COM-SEED-002' },
    {
      investorId: investor2.id,
      portfolioId: portfolio.id,
      commitmentAmount: 50000,
      fundedAmount: 20000,
      unfundedAmount: 30000,
      currencyCode: 'AED',
      commitmentDate: '2026-02-01',
      status: 'ACTIVE',
      ...TD /* visibility */,
    }
  );

  const call = await upsert(
    InvestmentCapitalCall,
    { companyId, callNumber: 'CALL-SEED-001' },
    {
      portfolioId: portfolio.id,
      callDate: d(-45),
      dueDate: d(-30),
      totalAmount: 40000,
      purpose: 'Seed funding call Q1',
      status: 'FUNDED',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentCapitalCallLine,
    { companyId, capitalCallId: call.id, investorId: investor.id },
    {
      commitmentId: commitment.id,
      calledAmount: 40000,
      receivedAmount: 40000,
      outstandingAmount: 0,
      status: 'RECEIVED',
    }
  );
  await upsert(
    InvestmentCapitalCall,
    { companyId, callNumber: 'CALL-SEED-002' },
    {
      portfolioId: portfolio.id,
      callDate: today,
      dueDate: d(14),
      totalAmount: 25000,
      purpose: 'Seed follow-on call',
      status: 'ISSUED',
      ...TD /* visibility */,
    }
  );

  await upsert(
    InvestmentCapitalAccount,
    { companyId, investorId: investor.id, portfolioId: portfolio.id, period: '2026-Q2' },
    {
      openingBalance: 35000,
      contributions: 40000,
      allocatedIncome: 1200,
      allocatedGain: 2500,
      allocatedLoss: 0,
      distributions: 800,
      returnOfCapital: 0,
      closingBalance: 77900,
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentCapitalAccount,
    { companyId, investorId: investor2.id, portfolioId: portfolio.id, period: '2026-Q2' },
    {
      openingBalance: 15000,
      contributions: 20000,
      allocatedIncome: 400,
      allocatedGain: 900,
      distributions: 200,
      closingBalance: 36100,
      ...TD /* visibility */,
    }
  );

  await upsert(
    InvestmentOwnershipHistory,
    {
      companyId,
      portfolioId: portfolio.id,
      investorId: investor.id,
      effectiveFrom: '2026-01-01',
      status: 'ACTIVE',
    },
    {
      instrumentId: null,
      ownershipPercentage: 60,
      profitSharePercentage: 60,
      lossSharePercentage: 60,
      dividendSharePercentage: 60,
      votingPercentage: 60,
      beneficialPercentage: 60,
      remarks: 'Seed majority owner',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentOwnershipHistory,
    {
      companyId,
      portfolioId: portfolio.id,
      investorId: investor2.id,
      effectiveFrom: '2026-01-01',
      status: 'ACTIVE',
    },
    {
      ownershipPercentage: 40,
      profitSharePercentage: 40,
      lossSharePercentage: 40,
      dividendSharePercentage: 40,
      votingPercentage: 40,
      beneficialPercentage: 40,
      ...TD /* visibility */,
    }
  );

  const distRun = await upsert(
    InvestmentDistributionRun,
    { companyId, distributionNumber: 'DIST-SEED-001' },
    {
      portfolioId: portfolio.id,
      periodStart: '2026-04-01',
      periodEnd: '2026-06-30',
      distributionType: 'PRO_RATA',
      grossDistributableAmount: 1000,
      expensesDeducted: 0,
      netDistributableAmount: 1000,
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      paymentStatus: 'UNPAID',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentDistributionRunLine,
    { companyId, distributionRunId: distRun.id, investorId: investor.id },
    {
      ownershipPercentage: 60,
      residualAmount: 600,
      grossAmount: 600,
      netAmount: 600,
    }
  );
  await upsert(
    InvestmentDistributionRunLine,
    { companyId, distributionRunId: distRun.id, investorId: investor2.id },
    {
      ownershipPercentage: 40,
      residualAmount: 400,
      grossAmount: 400,
      netAmount: 400,
    }
  );

  // —— NAV / performance / valuations ——
  const valBatch = await upsert(
    InvestmentValuationBatch,
    { companyId, valuationNumber: 'VAL-SEED-001' },
    {
      portfolioId: portfolio.id,
      valuationDate: today,
      valuationType: 'MARK_TO_MARKET',
      sourceType: 'MANUAL',
      status: 'APPROVED',
      totalCost: 64000,
      totalMarketValue: 72750,
      totalUnrealizedGainLoss: 8750,
      createdBy: userId,
      approvedBy: userId,
      ...TD /* visibility */,
    }
  );
  for (const h of holdingSpecs) {
    await upsert(
      InvestmentValuationBatchLine,
      { companyId, batchId: valBatch.id, instrumentId: h.inst.id },
      {
        holdingV2Id: holdings[h.inst.instrumentCode].id,
        quantity: h.qty,
        priorPrice: h.price * 0.98,
        price: h.price,
        marketValue: h.mv,
        cost: h.cost,
        unrealizedGainLoss: h.mv - h.cost,
        priceSource: 'MANUAL',
        status: 'OK',
      }
    );
  }

  await upsert(
    InvestmentBenchmark,
    { companyId, code: 'BM-SEED-DFM' },
    {
      name: 'Seed DFM Proxy',
      currency: 'AED',
      provider: 'MANUAL',
      status: 'ACTIVE',
      ...TD /* visibility */,
    }
  );

  const navPortfolio = {
    companyId,
    portfolioId: portfolio.id,
    navDate: today,
    marketValue: 72750,
    cash: 25000,
    receivables: 500,
    accruedIncome: 62.5,
    payables: 1850,
    fees: 100,
    liabilities: 1950,
    nav: 96362.5,
    units: 10000,
    navPerUnit: 9.63625,
    valuationBatchId: valBatch.id,
    status: 'FINAL',
    ...TD /* visibility */,
  };
  let navRow = await InvestmentNavSnapshot.findOne({
    where: { companyId, portfolioId: portfolio.id, navDate: today, investorId: null },
  });
  if (navRow) await navRow.update(navPortfolio);
  else navRow = await InvestmentNavSnapshot.create({ ...navPortfolio, investorId: null });

  await upsert(
    InvestmentNavSnapshot,
    { companyId, portfolioId: portfolio.id, navDate: today, investorId: investor.id },
    {
      marketValue: 43650,
      cash: 15000,
      receivables: 300,
      accruedIncome: 37.5,
      payables: 1110,
      fees: 60,
      liabilities: 1170,
      nav: 57817.5,
      status: 'FINAL',
      ...TD /* visibility */,
    }
  );

  await upsert(
    InvestmentPerformancePeriod,
    { companyId, portfolioId: portfolio.id, periodStart: '2026-04-01', periodEnd: '2026-06-30' },
    {
      openingValue: 88000,
      closingValue: 96362.5,
      externalFlows: 40000,
      income: 562.5,
      realizedGainLoss: 0,
      unrealizedGainLoss: 8750,
      twr: 0.0425,
      mwr: 0.038,
      irr: 0.091,
      absoluteReturn: 0.095,
      annualizedReturn: 0.12,
      benchmarkReturn: 0.031,
      excessReturn: 0.0115,
      volatility: 0.08,
      maxDrawdown: -0.02,
      sharpeRatio: 1.15,
      ...TD /* visibility */,
    }
  );

  // —— Reconciliation / close ——
  const recon = await upsert(
    InvestmentReconciliationBatch,
    { companyId, batchNumber: 'REC-SEED-001' },
    {
      portfolioId: portfolio.id,
      reconciliationType: 'BROKER',
      statementDate: today,
      status: 'EXCEPTION',
      totalRecords: 4,
      matchedRecords: 3,
      exceptionRecords: 1,
      unmatchedRecords: 0,
      remarks: 'Seed broker recon',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentReconciliationLine,
    { companyId, batchId: recon.id, sourceReference: 'BRK-LN-1' },
    {
      internalReference: 'TRD-SEED-001',
      instrumentId: adnoc.id,
      lineDate: d(-5),
      expectedAmount: 3170,
      actualAmount: 3170,
      expectedQuantity: 1000,
      actualQuantity: 1000,
      differenceAmount: 0,
      differenceQuantity: 0,
      matchStatus: 'MATCHED',
      resolutionStatus: 'CLOSED',
    }
  );
  await upsert(
    InvestmentReconciliationLine,
    { companyId, batchId: recon.id, sourceReference: 'BRK-LN-EX' },
    {
      internalReference: 'TRD-SEED-002',
      instrumentId: fab.id,
      lineDate: today,
      expectedAmount: 1850,
      actualAmount: 1840,
      expectedQuantity: 100,
      actualQuantity: 100,
      differenceAmount: 10,
      differenceQuantity: 0,
      matchStatus: 'EXCEPTION',
      resolutionStatus: 'OPEN',
      exceptionReason: 'Seed commission variance',
    }
  );
  await upsert(
    InvestmentClosePeriod,
    { companyId, portfolioId: portfolio.id, period: '2026-06' },
    {
      status: 'IN_PROGRESS',
      checklistJson: JSON.stringify({ valuations: true, recon: false, nav: true }),
      ...TD /* visibility */,
    }
  );

  // —— Risk / compliance ——
  const mandate = await upsert(
    InvestmentMandate,
    { companyId, mandateCode: 'MND-SEED-CORE' },
    {
      portfolioId: portfolio.id,
      name: 'Seed Core Mandate',
      effectiveFrom: '2026-01-01',
      allowedAssetClassesJson: JSON.stringify(['EQUITY', 'FIXED_INCOME', 'COMMODITY']),
      prohibitedAssetClassesJson: JSON.stringify(['CRYPTO']),
      status: 'ACTIVE',
      ...TD /* visibility */,
    }
  );
  const limit = await upsert(
    InvestmentRiskLimit,
    { companyId, limitCode: 'LMT-SEED-CONC' },
    {
      portfolioId: portfolio.id,
      limitType: 'CONCENTRATION',
      thresholdWarning: 40,
      thresholdBreach: 55,
      measurementBasis: 'PERCENT_NAV',
      effectiveFrom: '2026-01-01',
      status: 'ACTIVE',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentRiskBreach,
    { companyId, breachNumber: 'BRC-SEED-001' },
    {
      portfolioId: portfolio.id,
      limitId: limit.id,
      mandateId: mandate.id,
      severity: 'WARNING',
      actualValue: 42,
      limitValue: 40,
      status: 'OPEN',
      detectedAt: new Date(),
      dimensionKey: 'EQUITY_CONCENTRATION',
      remediationPlan: 'Seed concentration warning — rebalance',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentComplianceCheck,
    { companyId, investorId: investor.id, checkType: 'KYC' },
    {
      portfolioId: portfolio.id,
      status: 'PASS',
      checkedAt: new Date(),
      remarks: 'Seed KYC pass',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentComplianceCheck,
    {
      companyId,
      instrumentId: instruments['INST-SEED-RESTRICTED'].id,
      checkType: 'RESTRICTED_ASSET',
    },
    {
      portfolioId: portfolio.id,
      status: 'FAIL',
      checkedAt: new Date(),
      remarks: 'Seed blocked restricted instrument',
      ...TD /* visibility */,
    }
  );

  // —— Intelligence ——
  await upsert(
    InvestmentSavedReport,
    { companyId, name: 'Seed Portfolio Summary' },
    {
      reportCode: 'PORTFOLIO_SUMMARY',
      portfolioId: portfolio.id,
      filtersJson: JSON.stringify({ portfolioId: portfolio.id }),
      format: 'EXCEL',
      ...TD /* visibility */,
    }
  );
  const pack = await upsert(
    InvestmentReportPack,
    { companyId, packCode: 'PACK-SEED-ME' },
    {
      portfolioId: portfolio.id,
      name: 'Seed Month-End Pack',
      reportCodesJson: JSON.stringify(['PORTFOLIO_SUMMARY', 'BREACH_REGISTER', 'MATURITY_LADDER', 'SETTLEMENT_STATUS']),
      status: 'ACTIVE',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentReportSchedule,
    { companyId, scheduleCode: 'SCH-SEED-ME' },
    {
      packId: pack.id,
      cadence: 'MONTHLY',
      nextRunAt: new Date(),
      format: 'PDF',
      emailTo: 'investments@example.com',
      status: 'ACTIVE',
      ...TD /* visibility */,
    }
  );
  await upsert(
    InvestmentExportHistory,
    { companyId, reportCode: 'PORTFOLIO_SUMMARY', generatedBy: userId },
    {
      packId: pack.id,
      format: 'EXCEL',
      rowCount: 4,
      status: 'SUCCESS',
      filtersJson: JSON.stringify({ portfolioId: portfolio.id }),
      ...TD /* visibility */,
    }
  );

  // —— Pilot allow-list (so OMS works in pilot mode) ——
  if (InvestmentOmsPilotUser) {
    await upsert(
      InvestmentOmsPilotUser,
      { companyId, userId },
      { isActive: true, notes: 'Seed default pilot user' }
    );
  }

  console.log('Full Investment 2.0 seed complete:');
  console.log(`  portfolios: ${portfolio.portfolioCode}, ${portfolioInc.portfolioCode}`);
  console.log(`  instruments: ${Object.keys(instruments).length}`);
  console.log(`  holdings: ${Object.keys(holdings).length}`);
  console.log(`  orders: ORD-SEED-001..003 | trades: TRD-SEED-001..002 | settlements: 2`);
  console.log(`  income: 3 | corp actions: 2 | investors: 2 | capital calls: 2`);
  console.log(`  NAV + performance + valuation batch + recon + risk + reports seeded`);
  console.log(`  OMS pilot userId=${userId}`);
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
