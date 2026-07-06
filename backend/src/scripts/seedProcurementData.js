#!/usr/bin/env node
/**
 * Seed procurement demo data (items, POs, goods receipts, purchase invoices).
 * Usage: npm run seed:procurement [-- --company-id=1]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  CompanySetting,
  CompanyUser,
  User,
  Vendor,
  Property,
  ChartOfAccount,
  Item,
  PurchaseOrder,
  GoodsReceipt,
  PurchaseInvoice,
} = require('../models');
const { findOrCreate } = require('./payroll-full-cycle/idempotent');

const SEED_TAG = 'PRC26';

function parseArgv(argv = process.argv.slice(2)) {
  const opts = {};
  for (const arg of argv) {
    if (arg.startsWith('--company-id=')) {
      opts.companyId = Number(arg.split('=')[1]);
    }
  }
  return opts;
}

function assertSeedAllowed() {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production' && process.env.ALLOW_PROCUREMENT_DEMO_SEED !== 'true') {
    throw new Error(
      'Procurement demo seed blocked in production. Set ALLOW_PROCUREMENT_DEMO_SEED=true to override.'
    );
  }
}

async function resolveCompany(companyId) {
  if (companyId) {
    const company = await CompanySetting.findByPk(companyId);
    if (!company) throw new Error(`Company not found: id=${companyId}`);
    return company;
  }
  const company = await CompanySetting.findOne({
    where: { isActive: true },
    order: [['id', 'ASC']],
  });
  if (!company) throw new Error('No active company found. Use --company-id=<id>.');
  return company;
}

async function resolveUserId(companyId) {
  const link = await CompanyUser.findOne({
    where: { companyId },
    order: [['id', 'ASC']],
  });
  if (link?.userId) return link.userId;
  const user = await User.findOne({ order: [['id', 'ASC']] });
  if (!user) throw new Error('No user found for createdBy fields.');
  return user.id;
}

function buildLineItem(item, qty, unitPrice) {
  const quantity = qty;
  const total = Number((quantity * unitPrice).toFixed(2));
  return {
    item_id: item.id,
    item_name: item.itemName,
    quantity,
    unit_price: unitPrice,
    total,
    tax_classification: 'Standard-Rated',
    tax_percent: 5,
    taxable: true,
  };
}

function sumTotals(lineItems) {
  let subtotal = 0;
  let taxAmount = 0;
  for (const line of lineItems) {
    const lineTotal = parseFloat(line.total) || 0;
    subtotal += lineTotal;
    const pct = parseFloat(line.tax_percent) || 5;
    taxAmount += (lineTotal * pct) / 100;
  }
  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount: Number((subtotal + taxAmount).toFixed(2)),
  };
}

/** MySQL JSON columns may return as strings when records already exist */
function parseJsonLines(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

const VENDOR_DEFS = [
  {
    key: 'maint',
    name: 'Gulf Building Maintenance LLC',
    email: 'procurement.maint@demo.ae',
    contact: 'Omar Al Hashimi',
    phone: '+971501111001',
    terms: 'Net 30',
  },
  {
    key: 'supplies',
    name: 'Emirates Facility Supplies Co.',
    email: 'orders@efs-demo.ae',
    contact: 'Sara Khan',
    phone: '+971502222002',
    terms: 'Net 15',
  },
  {
    key: 'hvac',
    name: 'CoolAir HVAC Services',
    email: 'billing@coolair-demo.ae',
    contact: 'Rajesh Nair',
    phone: '+971503333003',
    terms: 'Net 45',
  },
];

const ITEM_DEFS = [
  { code: 'MAT-PAINT', name: 'Interior Emulsion Paint (20L)', category: 'material', uom: 'bucket', price: 185 },
  { code: 'MAT-TILE', name: 'Ceramic Floor Tiles', category: 'material', uom: 'sqm', price: 42 },
  { code: 'MAT-CABLE', name: 'Electrical Cable 2.5mm', category: 'material', uom: 'roll', price: 320 },
  { code: 'EQP-LADDER', name: 'Aluminium Extension Ladder', category: 'equipment', uom: 'pcs', price: 650 },
  { code: 'SUP-CLEAN', name: 'Cleaning Consumables Pack', category: 'supplies', uom: 'set', price: 95 },
  { code: 'SRV-HVAC', name: 'HVAC Preventive Maintenance', category: 'service', uom: 'job', price: 2800 },
  { code: 'SRV-PLUMB', name: 'Plumbing Call-out Service', category: 'service', uom: 'visit', price: 450 },
  { code: 'MAT-LOCK', name: 'Digital Door Lock Set', category: 'material', uom: 'pcs', price: 890 },
];

const COA_DEFS = [
  { code: '6100', name: 'Maintenance & Repairs Expense', type: 'expense' },
  { code: '6110', name: 'Building Supplies Expense', type: 'expense' },
  { code: '6120', name: 'HVAC Services Expense', type: 'expense' },
];

async function runProcurementSeed(options = {}) {
  assertSeedAllowed();
  const argv = parseArgv(options.argv);
  const company = await resolveCompany(options.companyId || argv.companyId);
  const companyId = company.id;
  const userId = options.userId || (await resolveUserId(companyId));

  console.log(`\n[Procurement Seed] Company: ${company.companyName} (id=${companyId})\n`);

  const property = await Property.findOne({
    where: { companyId },
    order: [['id', 'ASC']],
  });

  const accounts = {};
  for (const def of COA_DEFS) {
    const accountCode = `${SEED_TAG}-${def.code}`;
    const { record } = await findOrCreate(
      ChartOfAccount,
      { companyId, accountCode },
      { accountName: def.name, accountType: def.type, level: 1, isActive: true }
    );
    accounts[def.code] = record;
  }

  const vendors = {};
  for (const v of VENDOR_DEFS) {
    const email = v.email.replace('@', `+c${companyId}@`);
    const { record } = await findOrCreate(
      Vendor,
      { companyId, vendorName: v.name },
      {
        contactPerson: v.contact,
        email,
        phone: v.phone,
        address: 'Dubai, UAE',
        trn: `100${companyId}${v.key.length}000003`,
        paymentTerms: v.terms,
        status: 'active',
        createdBy: userId,
      }
    );
    vendors[v.key] = record;
  }

  const items = {};
  const defaultAccount = accounts['6110'].id;
  for (const def of ITEM_DEFS) {
    const itemCode = `${SEED_TAG}-${def.code}`;
    const { record } = await findOrCreate(
      Item,
      { itemCode },
      {
        itemName: def.name,
        itemCategory: def.category,
        unitOfMeasure: def.uom,
        accountId:
          def.category === 'service' && def.code.includes('HVAC')
            ? accounts['6120'].id
            : def.category === 'service'
              ? accounts['6100'].id
              : accounts['6110'].id,
        description: `Demo procurement item — ${def.name}`,
        isActive: true,
        createdBy: userId,
      }
    );
    items[def.code] = record;
  }

  const poDefs = [
    {
      poNumber: `${SEED_TAG}-PO-001`,
      vendorKey: 'maint',
      status: 'draft',
      lines: [
        [items['MAT-PAINT'], 8, 185],
        [items['MAT-TILE'], 120, 42],
      ],
    },
    {
      poNumber: `${SEED_TAG}-PO-002`,
      vendorKey: 'supplies',
      status: 'sent',
      lines: [
        [items['SUP-CLEAN'], 25, 95],
        [items['MAT-CABLE'], 6, 320],
      ],
    },
    {
      poNumber: `${SEED_TAG}-PO-003`,
      vendorKey: 'hvac',
      status: 'acknowledged',
      lines: [[items['SRV-HVAC'], 1, 2800]],
    },
    {
      poNumber: `${SEED_TAG}-PO-004`,
      vendorKey: 'maint',
      status: 'partially_received',
      lines: [
        [items['MAT-LOCK'], 10, 890],
        [items['EQP-LADDER'], 4, 650],
      ],
    },
    {
      poNumber: `${SEED_TAG}-PO-005`,
      vendorKey: 'supplies',
      status: 'fully_received',
      lines: [
        [items['SRV-PLUMB'], 3, 450],
        [items['MAT-CABLE'], 4, 320],
      ],
    },
  ];

  const poDate = '2026-06-01';
  const expectedDelivery = '2026-06-15';
  const createdPOs = {};

  for (const def of poDefs) {
    const lineItems = def.lines.map(([item, qty, price]) => buildLineItem(item, qty, price));
    const totals = sumTotals(lineItems);
    const { record: po } = await findOrCreate(
      PurchaseOrder,
      { companyId, poNumber: def.poNumber },
      {
        vendorId: vendors[def.vendorKey].id,
        poDate,
        expectedDeliveryDate: expectedDelivery,
        status: def.status,
        lineItems,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        notes: `${SEED_TAG} demo purchase order`,
        propertyId: property?.id || null,
        deliveryAddress: property?.location || 'Dubai, UAE',
        deliveryContactName: 'Site Supervisor',
        deliveryContactPhone: '+971504444004',
        createdBy: userId,
      }
    );
    if (po.status !== def.status) {
      await po.update({ status: def.status });
    }
    createdPOs[def.poNumber] = { po, lineItems };
  }

  const grDefs = [
    {
      grNumber: `${SEED_TAG}-GR-001`,
      poNumber: `${SEED_TAG}-PO-004`,
      status: 'completed',
      receivedRatio: 0.5,
    },
    {
      grNumber: `${SEED_TAG}-GR-002`,
      poNumber: `${SEED_TAG}-PO-005`,
      status: 'completed',
      receivedRatio: 1,
    },
  ];

  const createdGRs = {};
  for (const def of grDefs) {
    const { po, lineItems: poLineItems } = createdPOs[def.poNumber];
    const lineItems = poLineItems.map((line) => {
      const ordered = parseFloat(line.quantity) || 0;
      const receivedQty =
        def.receivedRatio >= 1
          ? ordered
          : Math.max(1, Math.floor(ordered * def.receivedRatio));
      return {
        item_id: line.item_id,
        ordered_qty: ordered,
        received_qty: receivedQty,
        unit_price: line.unit_price,
        total: Number((receivedQty * (line.unit_price || 0)).toFixed(2)),
      };
    });

    const { record: gr } = await findOrCreate(
      GoodsReceipt,
      { grNumber: def.grNumber },
      {
        purchaseOrderId: po.id,
        receiptDate: '2026-06-10',
        receivedBy: userId,
        status: def.status,
        lineItems,
        notes: `${SEED_TAG} goods receipt`,
        deliveryPropertyId: property?.id || null,
        deliveryAddress: property?.location || 'Dubai, UAE',
        deliveryContactName: 'Store Keeper',
        deliveryContactPhone: '+971505555005',
        createdBy: userId,
      }
    );
    createdGRs[def.grNumber] = { gr, lineItems };
  }

  const piDefs = [
    {
      invoiceNumber: `${SEED_TAG}-PI-001`,
      poNumber: `${SEED_TAG}-PO-005`,
      grNumber: `${SEED_TAG}-GR-002`,
      status: 'approved',
      paymentStatus: 'unpaid',
    },
    {
      invoiceNumber: `${SEED_TAG}-PI-002`,
      poNumber: `${SEED_TAG}-PO-004`,
      grNumber: `${SEED_TAG}-GR-001`,
      status: 'pending_approval',
      paymentStatus: 'unpaid',
    },
    {
      invoiceNumber: `${SEED_TAG}-PI-003`,
      poNumber: `${SEED_TAG}-PO-003`,
      grNumber: null,
      status: 'draft',
      paymentStatus: 'unpaid',
    },
  ];

  for (const def of piDefs) {
    const { po, lineItems: poLineItems } = createdPOs[def.poNumber];
    const grEntry = def.grNumber ? createdGRs[def.grNumber] : null;
    const grLineItems = grEntry?.lineItems || parseJsonLines(grEntry?.gr?.lineItems);
    const sourceLines = grLineItems.length ? grLineItems : poLineItems;
    const lineItems = sourceLines.map((line) => {
      const qty = parseFloat(line.received_qty ?? line.quantity) || 0;
      const unitPrice = parseFloat(line.unit_price) || 0;
      const total = parseFloat(line.total) || qty * unitPrice;
      const item = Object.values(items).find((i) => i.id === line.item_id);
      return {
        item_id: line.item_id,
        item_name: item?.itemName || 'Item',
        quantity: qty,
        unit_price: unitPrice,
        total,
        account_id: item?.accountId || defaultAccount,
        tax_classification: 'Standard-Rated',
        tax_percent: 5,
        taxable: true,
      };
    });
    const totals = sumTotals(lineItems);

    const { record: pi } = await findOrCreate(
      PurchaseInvoice,
      { companyId, invoiceNumber: def.invoiceNumber },
      {
        vendorId: po.vendorId,
        purchaseOrderId: po.id,
        goodsReceiptId: grEntry?.gr?.id || null,
        goodsReceiptIds: grEntry?.gr?.id ? [grEntry.gr.id] : [],
        invoiceDate: '2026-06-12',
        supplierInvoiceNumber: `SUP-${def.invoiceNumber}`,
        supplierInvoiceDate: '2026-06-11',
        dueDate: '2026-07-12',
        lineItems,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        status: def.status,
        paymentStatus: def.paymentStatus,
        notes: `${SEED_TAG} purchase invoice`,
        propertyId: property?.id || null,
        createdBy: userId,
        approvedBy: def.status === 'approved' ? userId : null,
        approvedAt: def.status === 'approved' ? new Date() : null,
      }
    );
    if (pi.status !== def.status) {
      await pi.update({
        status: def.status,
        approvedBy: def.status === 'approved' ? userId : null,
        approvedAt: def.status === 'approved' ? new Date() : null,
      });
    }
  }

  const summary = {
    companyId,
    vendors: Object.keys(vendors).length,
    items: Object.keys(items).length,
    purchaseOrders: Object.keys(createdPOs).length,
    goodsReceipts: Object.keys(createdGRs).length,
    purchaseInvoices: piDefs.length,
  };

  console.log('Procurement seed completed:', summary);
  return summary;
}

async function main() {
  try {
    await sequelize.authenticate();
    await runProcurementSeed();
    process.exit(0);
  } catch (e) {
    console.error('\nProcurement seed failed:', e.message);
    if (process.env.DEBUG) console.error(e);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (_) {
      /* ignore */
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { runProcurementSeed };
