'use strict';

/**
 * Seed Investment Management 2.0 demo data (Phases 17–24).
 * Idempotent — safe to re-run. Marks rows with isTestData=true where supported.
 *
 * Run: npm run seed:investments-v2
 * Optional: COMPANY_ID=1 / TARGET_COMPANY_ID=<id>
 *
 * Production guard:
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

const { sequelize } = require('../config/database');
const {
  CompanySetting,
  InvestmentPortfolio,
  InvestmentBook,
  InvestmentInstrument,
  InvestmentBroker,
  InvestmentCustodian,
  InvestmentHoldingV2,
  InvestmentInvestor,
  InvestmentCommitment,
  InvestmentMandate,
  InvestmentRiskLimit,
  InvestmentMarketPrice,
  InvestmentSavedReport,
  InvestmentReportPack,
  InvestmentReportSchedule,
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

async function main() {
  const companyId = await resolveCompanyId();
  console.log(`Seeding Investment 2.0 data for company ${companyId}…`);

  const broker = await upsert(
    InvestmentBroker,
    { companyId, brokerCode: 'BRK-SEED-01' },
    { brokerName: 'Seed Emirates Broker', countryCode: 'AE', status: 'ACTIVE', isTestData: true }
  );
  const custodian = await upsert(
    InvestmentCustodian,
    { companyId, custodianCode: 'CUS-SEED-01' },
    { custodianName: 'Seed Gulf Custodian', countryCode: 'AE', status: 'ACTIVE', isTestData: true }
  );

  const portfolio = await upsert(
    InvestmentPortfolio,
    { companyId, portfolioCode: 'PF-SEED-CORE' },
    {
      portfolioName: 'Seed Core Portfolio',
      baseCurrency: 'AED',
      reportingCurrency: 'AED',
      status: 'ACTIVE',
      defaultBrokerId: broker.id,
      custodianId: custodian.id,
      isTestData: true,
    }
  );

  const book = await upsert(
    InvestmentBook,
    { companyId, portfolioId: portfolio.id, bookCode: 'BOOK-SEED-MAIN' },
    { bookName: 'Main Book', reportingCurrency: 'AED', status: 'ACTIVE' }
  );

  const instruments = [
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

  const instrumentRows = [];
  for (const def of instruments) {
    const row = await upsert(
      InvestmentInstrument,
      { companyId, instrumentCode: def.instrumentCode },
      { ...def, status: 'ACTIVE', isTestData: true }
    );
    instrumentRows.push(row);
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const inst of instrumentRows.filter((i) => !i.isRestricted)) {
    const existing = await InvestmentMarketPrice.findOne({
      where: { companyId, instrumentId: inst.id, priceDate: today, source: 'MANUAL' },
    });
    const payload = {
      companyId,
      instrumentId: inst.id,
      priceDate: today,
      close: inst.assetClass === 'EQUITY' ? 18.5 : 99.25,
      currencyCode: inst.currencyCode,
      source: 'MANUAL',
      sourcePriority: 100,
      isTestData: true,
    };
    if (existing) await existing.update(payload);
    else await InvestmentMarketPrice.create(payload);
  }

  const holdings = [
    { instrument: instrumentRows[0], qty: 1000, cost: 15000, mv: 18500, price: 18.5 },
    { instrument: instrumentRows[1], qty: 50, cost: 18000, mv: 19850, price: 99.25 },
  ];
  for (const h of holdings) {
    await upsert(
      InvestmentHoldingV2,
      { companyId, portfolioId: portfolio.id, bookId: book.id, instrumentId: h.instrument.id },
      {
        quantity: h.qty,
        totalCost: h.cost,
        averageCost: h.cost / h.qty,
        currentPrice: h.price,
        currentMarketValue: h.mv,
        baseCurrencyValue: h.mv,
        unrealizedGainLoss: h.mv - h.cost,
        lastValuationDate: today,
      }
    );
  }

  const investor = await upsert(
    InvestmentInvestor,
    { companyId, investorCode: 'INV-SEED-01' },
    {
      legalName: 'Seed Family Office LLC',
      displayName: 'Seed FO',
      investorType: 'FAMILY_OFFICE',
      personOrEntity: 'ENTITY',
      preferredCurrency: 'AED',
      kycStatus: 'APPROVED',
      amlRiskRating: 'LOW',
      uboStatus: 'COMPLETE',
      sourceOfFundsStatus: 'VERIFIED',
      kycExpiryDate: '2027-12-31',
      kycReviewDate: today,
      sanctionsResultRef: 'SEED-SAN-OK',
      complianceApprovalStatus: 'APPROVED',
      status: 'ACTIVE',
      isTestData: true,
    }
  );

  await upsert(
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
      isTestData: true,
    }
  );

  const mandate = await upsert(
    InvestmentMandate,
    { companyId, mandateCode: 'MND-SEED-CORE' },
    {
      portfolioId: portfolio.id,
      name: 'Seed Core Mandate',
      effectiveFrom: '2026-01-01',
      allowedAssetClassesJson: JSON.stringify(['EQUITY', 'FIXED_INCOME']),
      prohibitedAssetClassesJson: JSON.stringify(['CRYPTO']),
      status: 'ACTIVE',
      isTestData: true,
    }
  );

  await upsert(
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
      isTestData: true,
    }
  );

  await upsert(
    InvestmentSavedReport,
    { companyId, name: 'Seed Portfolio Summary' },
    {
      reportCode: 'PORTFOLIO_SUMMARY',
      portfolioId: portfolio.id,
      filtersJson: JSON.stringify({ portfolioId: portfolio.id }),
      format: 'EXCEL',
      isTestData: true,
    }
  );

  const pack = await upsert(
    InvestmentReportPack,
    { companyId, packCode: 'PACK-SEED-ME' },
    {
      portfolioId: portfolio.id,
      name: 'Seed Month-End Pack',
      reportCodesJson: JSON.stringify(['PORTFOLIO_SUMMARY', 'BREACH_REGISTER', 'MATURITY_LADDER']),
      status: 'ACTIVE',
      isTestData: true,
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
      isTestData: true,
    }
  );

  console.log('Investment 2.0 seed complete:');
  console.log(`  portfolio=${portfolio.portfolioCode} id=${portfolio.id}`);
  console.log(`  instruments=${instrumentRows.map((i) => i.instrumentCode).join(', ')}`);
  console.log(`  investor=${investor.investorCode} mandate=${mandate.mandateCode}`);
  console.log(`  pack=${pack.packCode}`);
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
