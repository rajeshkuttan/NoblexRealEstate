'use strict';

/**
 * Investment Management 2.0 RC1 — legacy → V2 migration.
 * Never creates journal vouchers. Idempotent via legacyAssetId / migration items.
 */

const { Op } = require('sequelize');
const { getInvestmentV2ReleaseConfig } = require('../../../config/investmentV2ReleaseConfig');

function loadModels() {
  try {
    return require('../../../models');
  } catch (_e) {
    return {};
  }
}

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeName(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function withinTol(a, b, tol) {
  return Math.abs(num(a) - num(b)) <= num(tol);
}

function batchCodeFor(companyId) {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `INV2-RC1-${companyId || 'ALL'}-${ts}`;
}

async function recordItem(models, { batchId, companyId, sourceType, sourceId, targetType, targetId, status, beforeSnapshot, afterSnapshot, errorDetails, warningCount }, transaction) {
  const Item = models.InvestmentMigrationItem;
  if (!Item) return null;
  return Item.create(
    {
      batchId,
      companyId,
      sourceType,
      sourceId: sourceId != null ? sourceId : null,
      targetType: targetType || null,
      targetId: targetId != null ? targetId : null,
      status: status || 'MIGRATED',
      warningCount: warningCount || 0,
      errorDetails: errorDetails || null,
      beforeSnapshot: beforeSnapshot || null,
      afterSnapshot: afterSnapshot || null,
      migratedAt: status === 'MIGRATED' || status === 'WARNING' ? new Date() : null,
    },
    { transaction }
  );
}

async function recordException(models, payload, transaction) {
  const Exc = models.InvestmentMigrationException;
  if (!Exc) return null;
  return Exc.create(
    {
      batchId: payload.batchId,
      companyId: payload.companyId,
      itemId: payload.itemId || null,
      severity: payload.severity || 'MAJOR',
      category: payload.category || 'MIGRATION',
      resultClass: payload.resultClass || 'EXCEPTION',
      differenceCategory: payload.differenceCategory || 'MANUAL_REVIEW',
      sourceType: payload.sourceType || null,
      sourceId: payload.sourceId != null ? payload.sourceId : null,
      message: payload.message,
      detailJson: payload.detailJson || null,
      resolved: false,
    },
    { transaction }
  );
}

/**
 * Prefer LEGACY-CORE / LEGACY-BOOK. Reuse DEFAULT/MAIN when they already hold mapped V2 holdings;
 * optionally rename codes when LEGACY-* is free.
 */
async function ensureLegacyPortfolio(companyId, transaction) {
  const models = loadModels();
  const { InvestmentPortfolio, InvestmentBook, InvestmentHoldingV2 } = models;
  if (!InvestmentPortfolio || !InvestmentBook) {
    const err = new Error('InvestmentPortfolio/InvestmentBook models unavailable');
    err.code = 'MODEL_MISSING';
    throw err;
  }

  let portfolio =
    (await InvestmentPortfolio.findOne({
      where: { companyId, portfolioCode: 'LEGACY-CORE' },
      transaction,
      paranoid: false,
    })) || null;

  if (!portfolio) {
    const defaultPf = await InvestmentPortfolio.findOne({
      where: { companyId, portfolioCode: 'DEFAULT' },
      transaction,
      paranoid: false,
    });
    if (defaultPf && InvestmentHoldingV2) {
      const mapped = await InvestmentHoldingV2.count({
        where: { companyId, portfolioId: defaultPf.id },
        transaction,
      });
      if (mapped > 0) {
        portfolio = defaultPf;
        const conflict = await InvestmentPortfolio.findOne({
          where: { companyId, portfolioCode: 'LEGACY-CORE' },
          transaction,
          paranoid: false,
        });
        if (!conflict) {
          await portfolio.update(
            {
              portfolioCode: 'LEGACY-CORE',
              portfolioName: portfolio.portfolioName || 'Legacy Investment Portfolio',
            },
            { transaction }
          );
        }
      }
    }
  }

  if (!portfolio) {
    portfolio = await InvestmentPortfolio.create(
      {
        companyId,
        portfolioCode: 'LEGACY-CORE',
        portfolioName: 'Legacy Investment Portfolio',
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

  let book =
    (await InvestmentBook.findOne({
      where: { companyId, portfolioId: portfolio.id, bookCode: 'LEGACY-BOOK' },
      transaction,
    })) || null;

  if (!book) {
    const mainBook = await InvestmentBook.findOne({
      where: { companyId, portfolioId: portfolio.id, bookCode: 'MAIN' },
      transaction,
    });
    if (mainBook) {
      book = mainBook;
      const conflict = await InvestmentBook.findOne({
        where: { companyId, portfolioId: portfolio.id, bookCode: 'LEGACY-BOOK' },
        transaction,
      });
      if (!conflict) {
        await book.update(
          {
            bookCode: 'LEGACY-BOOK',
            bookName: book.bookName || 'Legacy Investment Book',
          },
          { transaction }
        );
      }
    } else {
      // Also check MAIN under DEFAULT portfolio that may have been renamed
      const anyMain = await InvestmentBook.findOne({
        where: { companyId, bookCode: 'MAIN' },
        transaction,
      });
      if (anyMain && InvestmentHoldingV2) {
        const mapped = await InvestmentHoldingV2.count({
          where: { companyId, bookId: anyMain.id },
          transaction,
        });
        if (mapped > 0 && Number(anyMain.portfolioId) === Number(portfolio.id)) {
          book = anyMain;
          const conflict = await InvestmentBook.findOne({
            where: { companyId, portfolioId: portfolio.id, bookCode: 'LEGACY-BOOK' },
            transaction,
          });
          if (!conflict) {
            await book.update(
              { bookCode: 'LEGACY-BOOK', bookName: 'Legacy Investment Book' },
              { transaction }
            );
          }
        }
      }
    }
  }

  if (!book) {
    book = await InvestmentBook.create(
      {
        companyId,
        portfolioId: portfolio.id,
        bookCode: 'LEGACY-BOOK',
        bookName: 'Legacy Investment Book',
        bookType: 'TRADING',
        accountingBasis: 'COST',
        reportingCurrency: portfolio.reportingCurrency || 'AED',
        status: 'ACTIVE',
      },
      { transaction }
    );
  }

  return { portfolio, book };
}

async function findInstrumentMatch(models, companyId, asset, transaction) {
  const Instrument = models.InvestmentInstrument;
  if (!Instrument) return null;

  let instrument = await Instrument.findOne({
    where: { companyId, legacyAssetId: asset.id },
    transaction,
    paranoid: false,
  });
  if (instrument) return { instrument, matchMethod: 'legacyAssetId' };

  if (asset.isinCode) {
    instrument = await Instrument.findOne({
      where: { companyId, isin: asset.isinCode },
      transaction,
      paranoid: false,
    });
    if (instrument) return { instrument, matchMethod: 'isin' };
  }

  const code = asset.investmentCode;
  if (code) {
    instrument = await Instrument.findOne({
      where: { companyId, instrumentCode: code },
      transaction,
      paranoid: false,
    });
    if (instrument) return { instrument, matchMethod: 'company+code' };
  }

  if (asset.tickerSymbol) {
    const tickerWhere = { companyId, ticker: asset.tickerSymbol };
    if (asset.marketName) tickerWhere.exchange = asset.marketName;
    instrument = await Instrument.findOne({
      where: tickerWhere,
      transaction,
      paranoid: false,
    });
    if (instrument) return { instrument, matchMethod: 'ticker' };
  }

  if (asset.investmentName) {
    const candidates = await Instrument.findAll({
      where: {
        companyId,
        currencyCode: asset.currencyCode || 'AED',
      },
      transaction,
      paranoid: false,
      limit: 100,
    });
    const want = normalizeName(asset.investmentName);
    instrument = candidates.find((c) => normalizeName(c.instrumentName) === want) || null;
    if (instrument) return { instrument, matchMethod: 'name+currency' };
  }

  return { instrument: null, matchMethod: null };
}

async function mapAssetToInstrumentHolding(models, ctx, asset, transaction) {
  const {
    companyId,
    portfolio,
    book,
    batchId,
    dryRun,
    counters,
    cfg,
  } = ctx;
  const { InvestmentInstrument, InvestmentHoldingV2 } = models;

  const before = {
    assetId: asset.id,
    investmentCode: asset.investmentCode,
    quantity: asset.holding ? num(asset.holding.quantity) : null,
  };

  const { instrument: matched, matchMethod } = await findInstrumentMatch(models, companyId, asset, transaction);
  let instrument = matched;
  let createdInstrument = false;

  if (!instrument) {
    if (dryRun) {
      counters.wouldCreateInstruments += 1;
      await recordItem(
        models,
        {
          batchId,
          companyId,
          sourceType: 'InvestmentAsset',
          sourceId: asset.id,
          targetType: 'InvestmentInstrument',
          status: 'SKIPPED',
          beforeSnapshot: before,
          afterSnapshot: { dryRun: true, wouldCreate: true, matchMethod: null },
        },
        transaction
      );
      return { instrument: null, holdingV2: null };
    }

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
      { transaction }
    );
    createdInstrument = true;
    counters.createdInstruments += 1;
  } else {
    counters.skippedInstruments += 1;
    if (!instrument.legacyAssetId) {
      await instrument.update({ legacyAssetId: asset.id }, { transaction });
    }
  }

  const h = asset.holding;
  let holdingV2 = await InvestmentHoldingV2.findOne({
    where: { companyId, legacyAssetId: asset.id },
    transaction,
  });
  let createdHolding = false;

  if (!holdingV2 && !dryRun) {
    holdingV2 = await InvestmentHoldingV2.create(
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
      { transaction }
    );
    createdHolding = true;
    counters.createdHoldings += 1;
  } else if (holdingV2) {
    counters.skippedHoldings += 1;
  } else if (dryRun) {
    counters.wouldCreateHoldings += 1;
  }

  // Soft qty/cost check vs tolerances → exception if outside
  if (holdingV2 && h) {
    const qtyTol = cfg.releaseQtyTolerance ?? cfg.qtyTolerance;
    const amtTol = cfg.releaseAmountTolerance ?? cfg.amountTolerance;
    if (!withinTol(holdingV2.quantity, h.quantity, qtyTol) || !withinTol(holdingV2.totalCost, h.totalCost, amtTol)) {
      await recordException(
        models,
        {
          batchId,
          companyId,
          severity: 'MAJOR',
          category: 'HOLDING_MISMATCH',
          resultClass: 'EXCEPTION',
          differenceCategory: 'MIGRATION_DIFFERENCE',
          sourceType: 'InvestmentHolding',
          sourceId: h.id,
          message: `Holding qty/cost outside tolerance for asset ${asset.id}`,
          detailJson: {
            legacyQty: num(h.quantity),
            v2Qty: num(holdingV2.quantity),
            legacyCost: num(h.totalCost),
            v2Cost: num(holdingV2.totalCost),
          },
        },
        transaction
      );
      counters.exceptions += 1;
    }
  }

  const item = await recordItem(
    models,
    {
      batchId,
      companyId,
      sourceType: 'InvestmentAsset',
      sourceId: asset.id,
      targetType: 'InvestmentInstrument',
      targetId: instrument.id,
      status: 'MIGRATED',
      beforeSnapshot: before,
      afterSnapshot: {
        instrumentId: instrument.id,
        holdingV2Id: holdingV2?.id || null,
        createdInstrument,
        createdHolding,
        matchMethod: matchMethod || (createdInstrument ? 'created' : null),
        dryRun: !!dryRun,
      },
    },
    transaction
  );

  return { instrument, holdingV2, item, createdInstrument, createdHolding };
}

async function reconstructLots(models, ctx, asset, instrument, holdingV2, transactions, transaction) {
  const { companyId, batchId, dryRun, counters } = ctx;
  const Lot = models.InvestmentPositionLot;
  if (!Lot || !holdingV2) return;

  const buys = (transactions || []).filter((t) => String(t.transactionType).toUpperCase() === 'BUY');
  const existingLots = await Lot.findAll({
    where: { companyId, holdingV2Id: holdingV2.id },
    transaction,
  });

  if (existingLots.length > 0) {
    counters.skippedLots += existingLots.length;
    return;
  }

  if (buys.length > 0) {
    for (const buy of buys) {
      if (dryRun) {
        counters.wouldCreateLots += 1;
        continue;
      }
      const qty = num(buy.quantity);
      const unitCost = num(buy.unitPrice);
      const totalCost = num(buy.netAmount) || qty * unitCost;
      // eslint-disable-next-line no-await-in-loop
      const lot = await Lot.create(
        {
          companyId,
          holdingV2Id: holdingV2.id,
          lotRef: `LEG-BUY-${buy.id}`,
          openDate: buy.transactionDate,
          quantity: qty,
          remainingQuantity: qty,
          unitCost,
          totalCost,
          status: 'OPEN',
          lotOrigin: 'TRADE',
          legacyTransactionId: buy.id,
          migrationNotes: `Migrated from legacy BUY txn ${buy.transactionNo || buy.id}`,
        },
        { transaction }
      );
      counters.createdLots += 1;
      // eslint-disable-next-line no-await-in-loop
      await recordItem(
        models,
        {
          batchId,
          companyId,
          sourceType: 'InvestmentTransaction',
          sourceId: buy.id,
          targetType: 'InvestmentPositionLot',
          targetId: lot.id,
          status: 'MIGRATED',
          afterSnapshot: { created: true, lotOrigin: 'TRADE' },
        },
        transaction
      );
    }
    return;
  }

  const qty = num(asset.holding?.quantity);
  if (qty > 0) {
    if (dryRun) {
      counters.wouldCreateLots += 1;
      return;
    }
    const unitCost = num(asset.holding?.averageCost);
    const totalCost = num(asset.holding?.totalCost) || qty * unitCost;
    const lot = await Lot.create(
      {
        companyId,
        holdingV2Id: holdingV2.id,
        lotRef: `MIG-OPEN-${asset.id}`,
        openDate: asset.acquisitionDate || todayIso(),
        quantity: qty,
        remainingQuantity: qty,
        unitCost,
        totalCost,
        status: 'OPEN',
        lotOrigin: 'MIGRATION_OPENING',
        migrationNotes: 'No legacy BUY transactions; opening lot from holding quantity',
      },
      { transaction }
    );
    counters.createdLots += 1;
    await recordItem(
      models,
      {
        batchId,
        companyId,
        sourceType: 'InvestmentHolding',
        sourceId: asset.holding?.id || asset.id,
        targetType: 'InvestmentPositionLot',
        targetId: lot.id,
        status: 'MIGRATED',
        afterSnapshot: { created: true, lotOrigin: 'MIGRATION_OPENING' },
      },
      transaction
    );
    await recordException(
      models,
      {
        batchId,
        companyId,
        severity: 'MINOR',
        category: 'LOT_OPENING',
        resultClass: 'WARNING',
        differenceCategory: 'MANUAL_REVIEW',
        sourceType: 'InvestmentAsset',
        sourceId: asset.id,
        message: `MIGRATION_OPENING lot created for asset ${asset.id} (no BUY history)`,
      },
      transaction
    );
    counters.exceptions += 1;
  }
}

async function mapIncomeEvents(models, ctx, asset, instrument, holdingV2, transactions, transaction) {
  const { companyId, portfolio, batchId, dryRun, counters } = ctx;
  const Income = models.InvestmentIncomeEvent;
  if (!Income || !instrument) return;

  const incomeTxns = (transactions || []).filter((t) =>
    ['DIVIDEND', 'INTEREST'].includes(String(t.transactionType).toUpperCase())
  );

  for (const txn of incomeTxns) {
    const existing = await Income.findOne({
      where: { companyId, linkedTransactionId: txn.id },
      transaction,
    });
    if (existing) {
      counters.skippedIncome += 1;
      continue;
    }
    if (dryRun) {
      counters.wouldCreateIncome += 1;
      continue;
    }
    const incomeType = String(txn.transactionType).toUpperCase() === 'INTEREST' ? 'INTEREST' : 'DIVIDEND';
    // eslint-disable-next-line no-await-in-loop
    const ev = await Income.create(
      {
        companyId,
        portfolioId: portfolio.id,
        instrumentId: instrument.id,
        holdingV2Id: holdingV2?.id || null,
        eventNumber: `MIG-INC-${txn.id}`,
        incomeType,
        paymentDate: txn.transactionDate,
        declarationDate: txn.transactionDate,
        quantity: txn.quantity || 0,
        grossAmount: txn.grossAmount || 0,
        withholdingTax: txn.taxAmount || 0,
        netAmount: txn.netAmount || 0,
        currencyCode: txn.currencyCode || 'AED',
        exchangeRate: txn.exchangeRate || 1,
        status: txn.postingStatus === 'POSTED' ? 'RECEIVED' : 'EXPECTED',
        source: 'MIGRATION',
        linkedTransactionId: txn.id,
        bankAccountId: txn.bankAccountId || null,
        remarks: `Migrated from legacy ${txn.transactionType} ${txn.transactionNo || txn.id}; JV ${txn.journalVoucherId || 'none'} (not reposted)`,
        isTestData: !!txn.isTestData,
      },
      { transaction }
    );
    counters.createdIncome += 1;
    // eslint-disable-next-line no-await-in-loop
    await recordItem(
      models,
      {
        batchId,
        companyId,
        sourceType: 'InvestmentTransaction',
        sourceId: txn.id,
        targetType: 'InvestmentIncomeEvent',
        targetId: ev.id,
        status: 'MIGRATED',
        afterSnapshot: {
          created: true,
          journalVoucherId: txn.journalVoucherId || null,
          glPosted: false,
        },
      },
      transaction
    );
  }
}

async function mapPartnerAllocations(models, ctx, asset, instrument, transaction) {
  const { companyId, portfolio, batchId, dryRun, counters, cfg } = ctx;
  const { InvestmentPartnerAllocation, InvestmentInvestor, InvestmentOwnershipHistory } = models;
  if (!InvestmentPartnerAllocation || !InvestmentInvestor || !InvestmentOwnershipHistory || !instrument) {
    return;
  }

  const allocs = await InvestmentPartnerAllocation.findAll({
    where: { companyId, investmentAssetId: asset.id, isActive: true },
    transaction,
  });
  if (!allocs.length) return;

  let ownershipSum = 0;
  for (const alloc of allocs) {
    ownershipSum += num(alloc.ownershipPercentage);
    const codeBase = `LEG-INV-${alloc.investorType || 'P'}-${alloc.investorRefId || alloc.id}`;
    // eslint-disable-next-line no-await-in-loop
    let investor = await InvestmentInvestor.findOne({
      where: {
        companyId,
        [Op.or]: [
          { investorCode: codeBase },
          ...(alloc.investorName
            ? [{ legalName: alloc.investorName }]
            : []),
        ],
      },
      transaction,
      paranoid: false,
    });

    let createdInvestor = false;
    if (!investor) {
      if (dryRun) {
        counters.wouldCreateInvestors += 1;
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      investor = await InvestmentInvestor.create(
        {
          companyId,
          investorCode: codeBase,
          legalName: alloc.investorName || codeBase,
          displayName: alloc.investorName || null,
          investorType: ['OWNER', 'PARTNER', 'COMPANY'].includes(alloc.investorType)
            ? alloc.investorType
            : 'PARTNER',
          personOrEntity: 'ENTITY',
          preferredCurrency: 'AED',
          onboardingStatus: 'MIGRATED',
          status: 'ACTIVE',
          remarks: `Migrated from InvestmentPartnerAllocation #${alloc.id}`,
          isTestData: !!alloc.isTestData,
        },
        { transaction }
      );
      createdInvestor = true;
      counters.createdInvestors += 1;
    } else {
      counters.skippedInvestors += 1;
    }

    // eslint-disable-next-line no-await-in-loop
    const existingOwn = await InvestmentOwnershipHistory.findOne({
      where: {
        companyId,
        portfolioId: portfolio.id,
        instrumentId: instrument.id,
        investorId: investor.id,
        status: 'ACTIVE',
      },
      transaction,
    });

    if (!existingOwn && !dryRun) {
      // eslint-disable-next-line no-await-in-loop
      const own = await InvestmentOwnershipHistory.create(
        {
          companyId,
          portfolioId: portfolio.id,
          instrumentId: instrument.id,
          investorId: investor.id,
          ownershipPercentage: alloc.ownershipPercentage || 0,
          profitSharePercentage: alloc.profitSharePercentage || alloc.ownershipPercentage || 0,
          lossSharePercentage: alloc.profitSharePercentage || alloc.ownershipPercentage || 0,
          dividendSharePercentage: alloc.dividendSharePercentage || alloc.ownershipPercentage || 0,
          votingPercentage: alloc.ownershipPercentage || 0,
          beneficialPercentage: alloc.ownershipPercentage || 0,
          effectiveFrom: asset.acquisitionDate || todayIso(),
          status: 'ACTIVE',
          remarks: `Migrated from allocation #${alloc.id}; date source inferred`,
          isTestData: !!alloc.isTestData,
        },
        { transaction }
      );
      counters.createdOwnership += 1;
      // eslint-disable-next-line no-await-in-loop
      await recordItem(
        models,
        {
          batchId,
          companyId,
          sourceType: 'InvestmentPartnerAllocation',
          sourceId: alloc.id,
          targetType: 'InvestmentOwnershipHistory',
          targetId: own.id,
          status: 'MIGRATED',
          afterSnapshot: { created: true, investorId: investor.id, createdInvestor },
        },
        transaction
      );
    } else if (dryRun && !existingOwn) {
      counters.wouldCreateOwnership += 1;
    }
  }

  const amtTol = cfg.releaseAmountTolerance ?? cfg.amountTolerance ?? 0.01;
  if (!withinTol(ownershipSum, 100, amtTol)) {
    await recordException(
      models,
      {
        batchId,
        companyId,
        severity: 'MAJOR',
        category: 'OWNERSHIP_TOTAL',
        resultClass: 'EXCEPTION',
        differenceCategory: 'PRE_EXISTING_DIFFERENCE',
        sourceType: 'InvestmentAsset',
        sourceId: asset.id,
        message: `Active ownership for asset ${asset.id} sums to ${ownershipSum.toFixed(4)}% (expected 100%)`,
        detailJson: { ownershipSum },
      },
      transaction
    );
    counters.exceptions += 1;
  }
}

async function markDistributionsMigrated(models, ctx, asset, transaction) {
  const { companyId, batchId, dryRun, counters } = ctx;
  const Dist = models.InvestmentDistribution;
  if (!Dist) return;

  const dists = await Dist.findAll({
    where: { companyId, investmentAssetId: asset.id },
    transaction,
  });

  for (const dist of dists) {
    // Do not recreate payments — migration item only
    // eslint-disable-next-line no-await-in-loop
    const existingItem = models.InvestmentMigrationItem
      ? await models.InvestmentMigrationItem.findOne({
          where: {
            batchId,
            sourceType: 'InvestmentDistribution',
            sourceId: dist.id,
            status: { [Op.in]: ['MIGRATED', 'SKIPPED'] },
          },
          transaction,
        })
      : null;
    if (existingItem) {
      counters.skippedDistributions += 1;
      continue;
    }
    if (dryRun) {
      counters.wouldMarkDistributions += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await recordItem(
      models,
      {
        batchId,
        companyId,
        sourceType: 'InvestmentDistribution',
        sourceId: dist.id,
        targetType: 'HISTORICAL_DISTRIBUTION',
        targetId: dist.id,
        status: 'MIGRATED',
        beforeSnapshot: {
          distributionNo: dist.distributionNo,
          journalVoucherId: dist.journalVoucherId,
          postingStatus: dist.postingStatus,
        },
        afterSnapshot: {
          historical: true,
          paymentsRecreated: false,
          journalVoucherPreserved: dist.journalVoucherId || null,
        },
      },
      transaction
    );
    counters.markedDistributions += 1;
  }
}

async function linkValuations(models, ctx, asset, instrument, transaction) {
  const { companyId, batchId, dryRun, counters } = ctx;
  const { InvestmentValuationHistory, InvestmentMarketPrice } = models;
  if (!InvestmentValuationHistory || !InvestmentMarketPrice || !instrument) return;

  const vals = await InvestmentValuationHistory.findAll({
    where: { companyId, investmentAssetId: asset.id },
    transaction,
  });

  for (const val of vals) {
    const source = val.valuationSource || 'MANUAL';
    // eslint-disable-next-line no-await-in-loop
    const dup = await InvestmentMarketPrice.findOne({
      where: {
        companyId,
        instrumentId: instrument.id,
        priceDate: val.valuationDate,
        source,
      },
      transaction,
    });
    if (dup) {
      counters.skippedPrices += 1;
      continue;
    }
    if (dryRun) {
      counters.wouldCreatePrices += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const price = await InvestmentMarketPrice.create(
      {
        companyId,
        instrumentId: instrument.id,
        priceDate: val.valuationDate,
        priceType: 'CLOSE',
        close: val.price,
        mid: val.price,
        source,
        currencyCode: asset.currencyCode || 'AED',
        isTestData: !!val.isTestData,
      },
      { transaction }
    );
    counters.createdPrices += 1;
    // eslint-disable-next-line no-await-in-loop
    await recordItem(
      models,
      {
        batchId,
        companyId,
        sourceType: 'InvestmentValuationHistory',
        sourceId: val.id,
        targetType: 'InvestmentMarketPrice',
        targetId: price.id,
        status: 'MIGRATED',
        afterSnapshot: { created: true },
      },
      transaction
    );
  }
}

/**
 * Full company migration. NEVER creates journal vouchers.
 */
async function migrateCompany(companyId, options = {}) {
  const models = loadModels();
  const {
    sequelize,
    InvestmentAsset,
    InvestmentHolding,
    InvestmentTransaction,
    InvestmentMigrationBatch,
  } = models;

  if (!sequelize || !InvestmentAsset) {
    const err = new Error('Required investment models unavailable');
    err.code = 'MODEL_MISSING';
    throw err;
  }

  const dryRun = !!options.dryRun;
  const since = options.since || null;
  const cfg = getInvestmentV2ReleaseConfig();

  let batch = null;
  if (InvestmentMigrationBatch) {
    if (options.batchId) {
      batch = await InvestmentMigrationBatch.findByPk(options.batchId);
    }
    if (!batch) {
      batch = await InvestmentMigrationBatch.create({
        companyId,
        batchCode: batchCodeFor(companyId),
        status: dryRun ? 'DRY_RUN' : 'RUNNING',
        mode: since ? 'DELTA' : 'FULL',
        dryRun,
        startedAt: new Date(),
        summaryJson: null,
      });
    } else if (!dryRun) {
      await batch.update({ status: 'RUNNING', startedAt: batch.startedAt || new Date() });
    }
  }

  const batchId = batch?.id || options.batchId || 0;
  const counters = {
    assets: 0,
    createdInstruments: 0,
    skippedInstruments: 0,
    createdHoldings: 0,
    skippedHoldings: 0,
    createdLots: 0,
    skippedLots: 0,
    createdIncome: 0,
    skippedIncome: 0,
    createdInvestors: 0,
    skippedInvestors: 0,
    createdOwnership: 0,
    markedDistributions: 0,
    skippedDistributions: 0,
    createdPrices: 0,
    skippedPrices: 0,
    exceptions: 0,
    wouldCreateInstruments: 0,
    wouldCreateHoldings: 0,
    wouldCreateLots: 0,
    wouldCreateIncome: 0,
    wouldCreateInvestors: 0,
    wouldCreateOwnership: 0,
    wouldMarkDistributions: 0,
    wouldCreatePrices: 0,
    journalVouchersCreated: 0,
  };

  const t = await sequelize.transaction();
  let result;
  try {
    const { portfolio, book } = await ensureLegacyPortfolio(companyId, t);
    const assetWhere = { companyId };
    if (since) {
      assetWhere.updatedAt = { [Op.gte]: new Date(since) };
    }

    const assets = await InvestmentAsset.findAll({
      where: assetWhere,
      include: InvestmentHolding ? [{ model: InvestmentHolding, as: 'holding', required: false }] : [],
      transaction: t,
      paranoid: false,
    });
    counters.assets = assets.length;

    const ctx = {
      companyId,
      portfolio,
      book,
      batchId,
      dryRun,
      counters,
      cfg,
    };

    for (const asset of assets) {
      // eslint-disable-next-line no-await-in-loop
      const txns = InvestmentTransaction
        ? await InvestmentTransaction.findAll({
            where: { companyId, investmentAssetId: asset.id },
            order: [['transactionDate', 'ASC'], ['id', 'ASC']],
            transaction: t,
          })
        : [];

      // eslint-disable-next-line no-await-in-loop
      const mapped = await mapAssetToInstrumentHolding(models, ctx, asset, t);
      if (!mapped.instrument && dryRun) continue;

      // eslint-disable-next-line no-await-in-loop
      await reconstructLots(models, ctx, asset, mapped.instrument, mapped.holdingV2, txns, t);
      // eslint-disable-next-line no-await-in-loop
      await mapIncomeEvents(models, ctx, asset, mapped.instrument, mapped.holdingV2, txns, t);
      // eslint-disable-next-line no-await-in-loop
      await mapPartnerAllocations(models, ctx, asset, mapped.instrument, t);
      // eslint-disable-next-line no-await-in-loop
      await markDistributionsMigrated(models, ctx, asset, t);
      // eslint-disable-next-line no-await-in-loop
      await linkValuations(models, ctx, asset, mapped.instrument, t);
    }

    result = {
      companyId,
      batchId,
      dryRun,
      portfolioId: portfolio.id,
      bookId: book.id,
      portfolioCode: portfolio.portfolioCode,
      bookCode: book.bookCode,
      ...counters,
      journalVouchersCreated: 0,
    };

    // Dry-run skips V2 entity creates but still commits batch items/exceptions for evidence.
    await t.commit();

    if (batch) {
      const status = dryRun
        ? 'DRY_RUN'
        : counters.exceptions > 0
          ? 'PARTIAL'
          : 'COMPLETED';
      await batch.update({
        status,
        completedAt: new Date(),
        summaryJson: result,
        errorSummary: counters.exceptions ? `${counters.exceptions} exception(s)` : null,
      });
    }

    return result;
  } catch (e) {
    try {
      await t.rollback();
    } catch (_rb) {
      /* ignore */
    }
    if (batch) {
      await batch.update({
        status: 'FAILED',
        completedAt: new Date(),
        errorSummary: e.message,
        summaryJson: { counters, error: e.message },
      });
    }
    throw e;
  }
}

async function migrateAllCompanies(options = {}) {
  const models = loadModels();
  const { CompanySetting } = models;
  if (!CompanySetting) {
    const err = new Error('CompanySetting model unavailable');
    err.code = 'MODEL_MISSING';
    throw err;
  }
  const companies = await CompanySetting.findAll({ attributes: ['id'], order: [['id', 'ASC']] });
  const results = [];
  for (const c of companies) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await migrateCompany(c.id, options));
  }
  return results;
}

/**
 * Reverse only V2 records created by this batch (via migration items). Never deletes legacy.
 */
async function rollbackBatch(batchId) {
  const models = loadModels();
  const {
    sequelize,
    InvestmentMigrationBatch,
    InvestmentMigrationItem,
    InvestmentPositionLot,
    InvestmentIncomeEvent,
    InvestmentMarketPrice,
    InvestmentOwnershipHistory,
    InvestmentInvestor,
    InvestmentHoldingV2,
    InvestmentInstrument,
  } = models;

  if (!InvestmentMigrationBatch || !InvestmentMigrationItem || !sequelize) {
    const err = new Error('Migration batch models unavailable');
    err.code = 'MODEL_MISSING';
    throw err;
  }

  const batch = await InvestmentMigrationBatch.findByPk(batchId);
  if (!batch) {
    const err = new Error(`Migration batch ${batchId} not found`);
    err.statusCode = 404;
    throw err;
  }

  const items = await InvestmentMigrationItem.findAll({
    where: {
      batchId,
      status: { [Op.in]: ['MIGRATED', 'WARNING'] },
    },
    order: [['id', 'DESC']],
  });

  const t = await sequelize.transaction();
  const deleted = {
    lots: 0,
    income: 0,
    prices: 0,
    ownership: 0,
    investors: 0,
    holdings: 0,
    instruments: 0,
  };

  try {
    for (const item of items) {
      const snap = item.afterSnapshot || {};
      // eslint-disable-next-line no-await-in-loop
      if (item.targetType === 'InvestmentPositionLot' && InvestmentPositionLot && item.targetId && (snap.created || snap.lotOrigin)) {
        const n = await InvestmentPositionLot.destroy({ where: { id: item.targetId }, transaction: t });
        deleted.lots += n;
      } else if (item.targetType === 'InvestmentIncomeEvent' && InvestmentIncomeEvent && item.targetId && snap.created) {
        const n = await InvestmentIncomeEvent.destroy({ where: { id: item.targetId }, transaction: t });
        deleted.income += n;
      } else if (item.targetType === 'InvestmentMarketPrice' && InvestmentMarketPrice && item.targetId && snap.created) {
        const n = await InvestmentMarketPrice.destroy({ where: { id: item.targetId }, transaction: t });
        deleted.prices += n;
      } else if (item.targetType === 'InvestmentOwnershipHistory' && InvestmentOwnershipHistory && item.targetId && snap.created) {
        const n = await InvestmentOwnershipHistory.destroy({ where: { id: item.targetId }, transaction: t });
        deleted.ownership += n;
        if (snap.createdInvestor && snap.investorId && InvestmentInvestor) {
          // eslint-disable-next-line no-await-in-loop
          const nInv = await InvestmentInvestor.destroy({ where: { id: snap.investorId }, transaction: t, force: true });
          deleted.investors += nInv;
        }
      } else if (item.targetType === 'InvestmentInstrument' && item.targetId) {
        if (snap.createdHolding && InvestmentHoldingV2 && snap.holdingV2Id) {
          // eslint-disable-next-line no-await-in-loop
          const nH = await InvestmentHoldingV2.destroy({ where: { id: snap.holdingV2Id }, transaction: t });
          deleted.holdings += nH;
        }
        if (snap.createdInstrument && InvestmentInstrument) {
          // Only destroy if no other holdings reference it
          // eslint-disable-next-line no-await-in-loop
          const otherHoldings = InvestmentHoldingV2
            ? await InvestmentHoldingV2.count({
                where: { instrumentId: item.targetId },
                transaction: t,
              })
            : 0;
          if (otherHoldings === 0) {
            // eslint-disable-next-line no-await-in-loop
            const nI = await InvestmentInstrument.destroy({
              where: { id: item.targetId },
              transaction: t,
              force: true,
            });
            deleted.instruments += nI;
          }
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await item.update({ status: 'ROLLED_BACK' }, { transaction: t });
    }

    await batch.update(
      {
        status: 'ROLLED_BACK',
        completedAt: new Date(),
        summaryJson: { ...(batch.summaryJson || {}), rollback: deleted },
      },
      { transaction: t }
    );

    await t.commit();
    return { batchId, deleted, itemsRolledBack: items.length };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

module.exports = {
  ensureLegacyPortfolio,
  migrateCompany,
  migrateAllCompanies,
  rollbackBatch,
};
