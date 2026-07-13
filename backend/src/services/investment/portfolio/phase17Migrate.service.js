'use strict';

/**
 * Phase 17.5 — map legacy investment_assets into portfolios / instruments / holdings_v2.
 * Idempotent: skips assets already mapped (legacy_asset_id present on instrument).
 */
const {
  CompanySetting,
  InvestmentAsset,
  InvestmentHolding,
  InvestmentPortfolio,
  InvestmentBook,
  InvestmentInstrument,
  InvestmentHoldingV2,
  sequelize,
} = require('../../../models');
const { withCompanyId } = require('../../../utils/companyScope');

async function ensureDefaultPortfolio(companyId, transaction) {
  let portfolio = await InvestmentPortfolio.findOne({
    where: { companyId, portfolioCode: 'DEFAULT' },
    transaction,
  });
  if (!portfolio) {
    portfolio = await InvestmentPortfolio.create(
      {
        companyId,
        portfolioCode: 'DEFAULT',
        portfolioName: 'Default Portfolio',
        reportingCurrency: 'AED',
        baseCurrency: 'AED',
        portfolioType: 'GENERAL',
        riskProfile: 'MEDIUM',
        status: 'ACTIVE',
        costBasisMethod: 'AVERAGE',
        accountingMethod: 'COST',
        isTestData: false,
      },
      { transaction }
    );
  }
  let book = await InvestmentBook.findOne({
    where: { companyId, portfolioId: portfolio.id, bookCode: 'MAIN' },
    transaction,
  });
  if (!book) {
    book = await InvestmentBook.create(
      {
        companyId,
        portfolioId: portfolio.id,
        bookCode: 'MAIN',
        bookName: 'Main Book',
        bookType: 'TRADING',
        accountingBasis: 'COST',
        reportingCurrency: 'AED',
        status: 'ACTIVE',
      },
      { transaction }
    );
  }
  return { portfolio, book };
}

async function migrateCompanyAssets(companyId) {
  const t = await sequelize.transaction();
  try {
    const { portfolio, book } = await ensureDefaultPortfolio(companyId, t);
    const assets = await InvestmentAsset.findAll({
      where: { companyId },
      include: [{ model: InvestmentHolding, as: 'holding' }],
      transaction: t,
      paranoid: false,
    });

    let createdInstruments = 0;
    let createdHoldings = 0;
    let skipped = 0;

    for (const asset of assets) {
      // eslint-disable-next-line no-await-in-loop
      let instrument = await InvestmentInstrument.findOne({
        where: { companyId, legacyAssetId: asset.id },
        transaction: t,
        paranoid: false,
      });
      if (!instrument) {
        instrument = await InvestmentInstrument.create(
          {
            companyId,
            instrumentCode: asset.investmentCode || `LEG-${asset.id}`,
            instrumentName: asset.investmentName,
            shortName: asset.tickerSymbol || null,
            assetClass: asset.assetType || null,
            instrumentType: asset.instrumentType || asset.assetType || null,
            isin: asset.isinCode || null,
            ticker: asset.tickerSymbol || null,
            exchange: asset.marketName || null,
            currencyCode: asset.currencyCode || 'AED',
            maturityDate: asset.maturityDate || null,
            status: asset.status === 'CLOSED' || asset.status === 'SOLD' ? 'INACTIVE' : 'ACTIVE',
            legacyAssetId: asset.id,
            isTestData: !!asset.isTestData,
          },
          { transaction: t }
        );
        createdInstruments += 1;
      } else {
        skipped += 1;
      }

      // eslint-disable-next-line no-await-in-loop
      let holdingV2 = await InvestmentHoldingV2.findOne({
        where: { companyId, legacyAssetId: asset.id },
        transaction: t,
      });
      const h = asset.holding;
      if (!holdingV2) {
        await InvestmentHoldingV2.create(
          {
            companyId,
            portfolioId: portfolio.id,
            bookId: book.id,
            instrumentId: instrument.id,
            legacyAssetId: asset.id,
            quantity: h?.quantity || 0,
            averageCost: h?.averageCost || 0,
            totalCost: h?.totalCost || 0,
            currentPrice: h?.currentPrice || 0,
            currentMarketValue: h?.currentMarketValue || 0,
            baseCurrencyValue: h?.baseCurrencyValue || 0,
            unrealizedGainLoss: h?.unrealizedGainLoss || 0,
            realizedGainLoss: h?.realizedGainLoss || 0,
            lastValuationDate: h?.lastValuationDate || null,
          },
          { transaction: t }
        );
        createdHoldings += 1;
      }
    }

    await t.commit();
    return {
      companyId,
      portfolioId: portfolio.id,
      bookId: book.id,
      assets: assets.length,
      createdInstruments,
      createdHoldings,
      skippedInstruments: skipped,
    };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function migrateAllCompanies() {
  const companies = await CompanySetting.findAll({ attributes: ['id'], order: [['id', 'ASC']] });
  const results = [];
  for (const c of companies) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await migrateCompanyAssets(c.id));
  }
  return results;
}

module.exports = {
  ensureDefaultPortfolio,
  migrateCompanyAssets,
  migrateAllCompanies,
};
