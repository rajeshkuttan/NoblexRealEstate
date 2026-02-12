/**
 * Seed Script: Chart of Accounts for UAE Real Estate / Property Management
 * 
 * Creates a comprehensive, hierarchical Chart of Accounts tailored for
 * the real estate and lease management domain in the UAE.
 * 
 * Safe to re-run: uses findOrCreate so existing accounts are not duplicated.
 * All seeded accounts are marked isSystem: true.
 * 
 * Usage:
 *   cd backend
 *   node scripts/seed-chart-of-accounts.js
 */

const path = require('path');

// Load config (same logic as config.js)
const fs = require('fs');
const dotenvPath = path.join(__dirname, '../.env');
const devConfigPath = path.join(__dirname, '../config.env');
const configPath = fs.existsSync(dotenvPath) ? dotenvPath : devConfigPath;
require('dotenv').config({ path: configPath });

const ChartOfAccount = require('../src/models/ChartOfAccount');
const { sequelize } = require('../src/config/database');

// Helper: create an account if it doesn't already exist (by accountCode)
async function createAccount({ accountCode, accountName, accountType, parentId, level, description, taxCategory, isReconcilable }) {
  const [account, created] = await ChartOfAccount.findOrCreate({
    where: { accountCode },
    defaults: {
      accountName,
      accountType,
      parentAccountId: parentId || null,
      level: level || 1,
      description: description || null,
      isActive: true,
      isSystem: true,
      currency: 'AED',
      balance: 0,
      taxCategory: taxCategory || 'vat_exempt',
      isReconcilable: isReconcilable || false,
    }
  });
  if (created) {
    console.log(`  + Created: ${accountCode} - ${accountName}`);
  } else {
    console.log(`  = Exists:  ${accountCode} - ${accountName}`);
  }
  return account;
}

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.\n');

    // =========================================================================
    // 1xxx - ASSETS
    // =========================================================================
    console.log('--- ASSETS ---');

    const a1000 = await createAccount({
      accountCode: '1000', accountName: 'Current Assets', accountType: 'asset',
      level: 1, description: 'Short-term assets expected to be converted to cash within one year'
    });

    // 1100 - Cash and Cash Equivalents
    const a1100 = await createAccount({
      accountCode: '1100', accountName: 'Cash and Cash Equivalents', accountType: 'asset',
      parentId: a1000.id, level: 2, description: 'Cash on hand and in banks'
    });
    await createAccount({
      accountCode: '1110', accountName: 'Petty Cash', accountType: 'asset',
      parentId: a1100.id, level: 3, description: 'Small cash fund for minor expenses'
    });
    await createAccount({
      accountCode: '1120', accountName: 'Cash in Hand', accountType: 'asset',
      parentId: a1100.id, level: 3, description: 'Physical cash held at office'
    });

    // 1200 - Bank Accounts
    const a1200 = await createAccount({
      accountCode: '1200', accountName: 'Bank Accounts', accountType: 'asset',
      parentId: a1000.id, level: 2, description: 'Company bank accounts', isReconcilable: true
    });
    await createAccount({
      accountCode: '1210', accountName: 'Operating Bank Account', accountType: 'asset',
      parentId: a1200.id, level: 3, description: 'Main operating bank account', isReconcilable: true
    });
    await createAccount({
      accountCode: '1220', accountName: 'Rent Collection Account', accountType: 'asset',
      parentId: a1200.id, level: 3, description: 'Bank account for receiving tenant rent payments', isReconcilable: true
    });
    await createAccount({
      accountCode: '1230', accountName: 'Security Deposit Account', accountType: 'asset',
      parentId: a1200.id, level: 3, description: 'Separate account holding tenant security deposits', isReconcilable: true
    });

    // 1300 - Accounts Receivable
    const a1300 = await createAccount({
      accountCode: '1300', accountName: 'Accounts Receivable', accountType: 'asset',
      parentId: a1000.id, level: 2, description: 'Amounts owed by tenants and customers'
    });
    await createAccount({
      accountCode: '1310', accountName: 'Tenant Receivables - Rent', accountType: 'asset',
      parentId: a1300.id, level: 3, description: 'Outstanding rent due from tenants', taxCategory: 'vat_exempt'
    });
    await createAccount({
      accountCode: '1320', accountName: 'Service Charge Receivables', accountType: 'asset',
      parentId: a1300.id, level: 3, description: 'Outstanding service charges from tenants', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '1330', accountName: 'Other Receivables', accountType: 'asset',
      parentId: a1300.id, level: 3, description: 'Other amounts due from tenants or third parties'
    });
    await createAccount({
      accountCode: '1340', accountName: 'Allowance for Doubtful Accounts', accountType: 'asset',
      parentId: a1300.id, level: 3, description: 'Provision for potentially uncollectable receivables'
    });

    // 1400 - Prepaid Expenses
    const a1400 = await createAccount({
      accountCode: '1400', accountName: 'Prepaid Expenses', accountType: 'asset',
      parentId: a1000.id, level: 2, description: 'Expenses paid in advance'
    });
    await createAccount({
      accountCode: '1410', accountName: 'Prepaid Insurance', accountType: 'asset',
      parentId: a1400.id, level: 3, description: 'Insurance premiums paid in advance'
    });
    await createAccount({
      accountCode: '1420', accountName: 'Prepaid Maintenance Contracts', accountType: 'asset',
      parentId: a1400.id, level: 3, description: 'Annual maintenance contracts paid upfront'
    });

    // 1500 - Other Current Assets
    const a1500 = await createAccount({
      accountCode: '1500', accountName: 'Other Current Assets', accountType: 'asset',
      parentId: a1000.id, level: 2, description: 'Miscellaneous current assets'
    });
    await createAccount({
      accountCode: '1510', accountName: 'Refundable Deposits', accountType: 'asset',
      parentId: a1500.id, level: 3, description: 'Deposits paid to utilities and government agencies (DEWA, Etisalat)'
    });
    await createAccount({
      accountCode: '1520', accountName: 'Advance to Suppliers', accountType: 'asset',
      parentId: a1500.id, level: 3, description: 'Advance payments made to vendors/contractors'
    });

    // Non-Current Assets
    const a1600 = await createAccount({
      accountCode: '1600', accountName: 'Non-Current Assets', accountType: 'asset',
      level: 1, description: 'Long-term assets held for more than one year'
    });

    // 1700 - Property, Plant and Equipment
    const a1700 = await createAccount({
      accountCode: '1700', accountName: 'Property, Plant and Equipment', accountType: 'asset',
      parentId: a1600.id, level: 2, description: 'Tangible long-term assets'
    });
    await createAccount({
      accountCode: '1710', accountName: 'Land', accountType: 'asset',
      parentId: a1700.id, level: 3, description: 'Land owned by the company'
    });
    await createAccount({
      accountCode: '1720', accountName: 'Buildings', accountType: 'asset',
      parentId: a1700.id, level: 3, description: 'Buildings and structures owned'
    });
    await createAccount({
      accountCode: '1730', accountName: 'Furniture and Fixtures', accountType: 'asset',
      parentId: a1700.id, level: 3, description: 'Office and building furniture and fixtures'
    });
    await createAccount({
      accountCode: '1740', accountName: 'Office Equipment', accountType: 'asset',
      parentId: a1700.id, level: 3, description: 'Computers, printers, and office equipment'
    });
    await createAccount({
      accountCode: '1750', accountName: 'Motor Vehicles', accountType: 'asset',
      parentId: a1700.id, level: 3, description: 'Company-owned vehicles'
    });

    // 1800 - Accumulated Depreciation
    const a1800 = await createAccount({
      accountCode: '1800', accountName: 'Accumulated Depreciation', accountType: 'asset',
      parentId: a1600.id, level: 2, description: 'Accumulated depreciation on fixed assets (contra asset)'
    });
    await createAccount({
      accountCode: '1810', accountName: 'Accum. Depreciation - Buildings', accountType: 'asset',
      parentId: a1800.id, level: 3, description: 'Accumulated depreciation on buildings'
    });
    await createAccount({
      accountCode: '1820', accountName: 'Accum. Depreciation - Furniture', accountType: 'asset',
      parentId: a1800.id, level: 3, description: 'Accumulated depreciation on furniture and fixtures'
    });
    await createAccount({
      accountCode: '1830', accountName: 'Accum. Depreciation - Equipment', accountType: 'asset',
      parentId: a1800.id, level: 3, description: 'Accumulated depreciation on office equipment'
    });
    await createAccount({
      accountCode: '1840', accountName: 'Accum. Depreciation - Vehicles', accountType: 'asset',
      parentId: a1800.id, level: 3, description: 'Accumulated depreciation on motor vehicles'
    });

    // 1900 - Investment Properties
    await createAccount({
      accountCode: '1900', accountName: 'Investment Properties', accountType: 'asset',
      parentId: a1600.id, level: 2, description: 'Properties held for rental income or capital appreciation'
    });

    // =========================================================================
    // 2xxx - LIABILITIES
    // =========================================================================
    console.log('\n--- LIABILITIES ---');

    const a2000 = await createAccount({
      accountCode: '2000', accountName: 'Current Liabilities', accountType: 'liability',
      level: 1, description: 'Obligations due within one year'
    });

    // 2100 - Accounts Payable
    const a2100 = await createAccount({
      accountCode: '2100', accountName: 'Accounts Payable', accountType: 'liability',
      parentId: a2000.id, level: 2, description: 'Amounts owed to vendors and suppliers'
    });
    await createAccount({
      accountCode: '2110', accountName: 'Vendor Payables', accountType: 'liability',
      parentId: a2100.id, level: 3, description: 'Amounts owed to general vendors and suppliers'
    });
    await createAccount({
      accountCode: '2120', accountName: 'Contractor Payables', accountType: 'liability',
      parentId: a2100.id, level: 3, description: 'Amounts owed to maintenance and construction contractors'
    });

    // 2200 - Tenant Deposits Held
    const a2200 = await createAccount({
      accountCode: '2200', accountName: 'Tenant Deposits Held', accountType: 'liability',
      parentId: a2000.id, level: 2, description: 'Refundable deposits collected from tenants'
    });
    await createAccount({
      accountCode: '2210', accountName: 'Security Deposits Held', accountType: 'liability',
      parentId: a2200.id, level: 3, description: 'Refundable security deposits from tenants'
    });
    await createAccount({
      accountCode: '2220', accountName: 'Key Deposits Held', accountType: 'liability',
      parentId: a2200.id, level: 3, description: 'Refundable key deposits from tenants'
    });

    // 2300 - Taxes Payable
    const a2300 = await createAccount({
      accountCode: '2300', accountName: 'Taxes Payable', accountType: 'liability',
      parentId: a2000.id, level: 2, description: 'Tax obligations', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '2310', accountName: 'VAT Output (Collected)', accountType: 'liability',
      parentId: a2300.id, level: 3, description: 'VAT collected on taxable supplies', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '2320', accountName: 'VAT Input (Paid)', accountType: 'liability',
      parentId: a2300.id, level: 3, description: 'VAT paid on purchases (to be offset)', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '2330', accountName: 'VAT Payable (Net)', accountType: 'liability',
      parentId: a2300.id, level: 3, description: 'Net VAT amount due to FTA', taxCategory: 'vat_applicable'
    });

    // 2400 - Accrued Expenses
    const a2400 = await createAccount({
      accountCode: '2400', accountName: 'Accrued Expenses', accountType: 'liability',
      parentId: a2000.id, level: 2, description: 'Expenses incurred but not yet paid'
    });
    await createAccount({
      accountCode: '2410', accountName: 'Accrued Salaries and Wages', accountType: 'liability',
      parentId: a2400.id, level: 3, description: 'Salaries earned by employees but not yet paid'
    });
    await createAccount({
      accountCode: '2420', accountName: 'Accrued Utilities', accountType: 'liability',
      parentId: a2400.id, level: 3, description: 'Utility bills received but not yet paid'
    });
    await createAccount({
      accountCode: '2430', accountName: 'Accrued Maintenance', accountType: 'liability',
      parentId: a2400.id, level: 3, description: 'Maintenance work completed but not yet invoiced/paid'
    });

    // 2500 - Deferred Revenue
    const a2500 = await createAccount({
      accountCode: '2500', accountName: 'Deferred Revenue', accountType: 'liability',
      parentId: a2000.id, level: 2, description: 'Income received in advance before services are rendered'
    });
    await createAccount({
      accountCode: '2510', accountName: 'Advance Rent Received', accountType: 'liability',
      parentId: a2500.id, level: 3, description: 'Rent collected in advance from tenants'
    });
    await createAccount({
      accountCode: '2520', accountName: 'Prepaid Service Charges Received', accountType: 'liability',
      parentId: a2500.id, level: 3, description: 'Service charges collected in advance'
    });

    // 2600 - Non-Current Liabilities
    const a2600 = await createAccount({
      accountCode: '2600', accountName: 'Non-Current Liabilities', accountType: 'liability',
      level: 1, description: 'Long-term obligations due beyond one year'
    });
    await createAccount({
      accountCode: '2610', accountName: 'Mortgage Loans', accountType: 'liability',
      parentId: a2600.id, level: 2, description: 'Loans secured against property'
    });
    await createAccount({
      accountCode: '2620', accountName: 'Long-term Borrowings', accountType: 'liability',
      parentId: a2600.id, level: 2, description: 'Other long-term loans and borrowings'
    });
    await createAccount({
      accountCode: '2630', accountName: 'End of Service Benefits', accountType: 'liability',
      parentId: a2600.id, level: 2, description: 'Employee end of service gratuity provision (UAE Labour Law)'
    });

    // =========================================================================
    // 3xxx - EQUITY
    // =========================================================================
    console.log('\n--- EQUITY ---');

    const a3000 = await createAccount({
      accountCode: '3000', accountName: "Owner's Equity", accountType: 'equity',
      level: 1, description: 'Net worth of the company'
    });
    await createAccount({
      accountCode: '3100', accountName: 'Share Capital', accountType: 'equity',
      parentId: a3000.id, level: 2, description: 'Capital invested by owners/shareholders'
    });
    await createAccount({
      accountCode: '3200', accountName: 'Retained Earnings', accountType: 'equity',
      parentId: a3000.id, level: 2, description: 'Accumulated profits retained in the business'
    });
    await createAccount({
      accountCode: '3300', accountName: 'Current Year Profit / Loss', accountType: 'equity',
      parentId: a3000.id, level: 2, description: 'Net income or loss for the current fiscal year'
    });
    await createAccount({
      accountCode: '3400', accountName: 'Reserves', accountType: 'equity',
      parentId: a3000.id, level: 2, description: 'Statutory and general reserves'
    });

    // =========================================================================
    // 4xxx - REVENUE
    // =========================================================================
    console.log('\n--- REVENUE ---');

    const a4000 = await createAccount({
      accountCode: '4000', accountName: 'Operating Revenue', accountType: 'revenue',
      level: 1, description: 'Income from core property management operations'
    });

    // 4100 - Rental Income
    const a4100 = await createAccount({
      accountCode: '4100', accountName: 'Rental Income', accountType: 'revenue',
      parentId: a4000.id, level: 2, description: 'Revenue from property rentals', taxCategory: 'vat_exempt'
    });
    await createAccount({
      accountCode: '4110', accountName: 'Residential Rental Income', accountType: 'revenue',
      parentId: a4100.id, level: 3, description: 'Rent from residential units (VAT exempt in UAE)', taxCategory: 'vat_exempt'
    });
    await createAccount({
      accountCode: '4120', accountName: 'Commercial Rental Income', accountType: 'revenue',
      parentId: a4100.id, level: 3, description: 'Rent from commercial/office units (VAT applicable in UAE)', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '4130', accountName: 'Retail Rental Income', accountType: 'revenue',
      parentId: a4100.id, level: 3, description: 'Rent from retail shop units (VAT applicable in UAE)', taxCategory: 'vat_applicable'
    });

    // 4200 - Service Charges
    const a4200 = await createAccount({
      accountCode: '4200', accountName: 'Service Charge Income', accountType: 'revenue',
      parentId: a4000.id, level: 2, description: 'Revenue from service charges billed to tenants', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '4210', accountName: 'Maintenance Charge Income', accountType: 'revenue',
      parentId: a4200.id, level: 3, description: 'Maintenance charges collected from tenants', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '4220', accountName: 'Common Area Charge Income', accountType: 'revenue',
      parentId: a4200.id, level: 3, description: 'Common area maintenance (CAM) charges', taxCategory: 'vat_applicable'
    });

    // 4300 - Parking Income
    await createAccount({
      accountCode: '4300', accountName: 'Parking Income', accountType: 'revenue',
      parentId: a4000.id, level: 2, description: 'Revenue from parking space rentals', taxCategory: 'vat_applicable'
    });

    // 4400 - Utility Recovery
    const a4400 = await createAccount({
      accountCode: '4400', accountName: 'Utility Recovery Income', accountType: 'revenue',
      parentId: a4000.id, level: 2, description: 'Utility costs recovered from tenants', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '4410', accountName: 'DEWA Recovery', accountType: 'revenue',
      parentId: a4400.id, level: 3, description: 'DEWA (electricity and water) charges recovered from tenants', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '4420', accountName: 'Chiller Recovery', accountType: 'revenue',
      parentId: a4400.id, level: 3, description: 'District cooling charges recovered from tenants', taxCategory: 'vat_applicable'
    });

    // 4500 - Other Operating Income
    const a4500 = await createAccount({
      accountCode: '4500', accountName: 'Other Operating Income', accountType: 'revenue',
      parentId: a4000.id, level: 2, description: 'Miscellaneous operating income'
    });
    await createAccount({
      accountCode: '4510', accountName: 'Late Payment Fees', accountType: 'revenue',
      parentId: a4500.id, level: 3, description: 'Penalty charges for late rent payments', taxCategory: 'vat_exempt'
    });
    await createAccount({
      accountCode: '4520', accountName: 'Lease Transfer Fees', accountType: 'revenue',
      parentId: a4500.id, level: 3, description: 'Fees for transferring lease to another tenant', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '4530', accountName: 'NOC Fees', accountType: 'revenue',
      parentId: a4500.id, level: 3, description: 'No Objection Certificate issuance fees', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '4540', accountName: 'Early Termination Fees', accountType: 'revenue',
      parentId: a4500.id, level: 3, description: 'Penalties for early lease termination', taxCategory: 'vat_exempt'
    });

    // 4600 - Non-Operating Revenue
    const a4600 = await createAccount({
      accountCode: '4600', accountName: 'Non-Operating Revenue', accountType: 'revenue',
      level: 1, description: 'Income from non-core activities'
    });
    await createAccount({
      accountCode: '4610', accountName: 'Commission Income', accountType: 'revenue',
      parentId: a4600.id, level: 2, description: 'Brokerage and agency commission earned', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '4620', accountName: 'Property Management Fees', accountType: 'revenue',
      parentId: a4600.id, level: 2, description: 'Fees earned for managing third-party properties', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '4630', accountName: 'Interest Income', accountType: 'revenue',
      parentId: a4600.id, level: 2, description: 'Interest earned on bank deposits', taxCategory: 'vat_exempt'
    });
    await createAccount({
      accountCode: '4640', accountName: 'Gain on Property Disposal', accountType: 'revenue',
      parentId: a4600.id, level: 2, description: 'Profit from sale of investment properties', taxCategory: 'vat_exempt'
    });

    // =========================================================================
    // 5xxx - EXPENSES
    // =========================================================================
    console.log('\n--- EXPENSES ---');

    const a5000 = await createAccount({
      accountCode: '5000', accountName: 'Property Operating Expenses', accountType: 'expense',
      level: 1, description: 'Direct costs of operating and maintaining properties'
    });

    // 5100 - Maintenance and Repairs
    const a5100 = await createAccount({
      accountCode: '5100', accountName: 'Maintenance and Repairs', accountType: 'expense',
      parentId: a5000.id, level: 2, description: 'Costs for maintaining properties', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5110', accountName: 'Building Maintenance', accountType: 'expense',
      parentId: a5100.id, level: 3, description: 'General building maintenance and repairs', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5120', accountName: 'HVAC Maintenance', accountType: 'expense',
      parentId: a5100.id, level: 3, description: 'Heating, ventilation, and air conditioning maintenance', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5130', accountName: 'Plumbing Maintenance', accountType: 'expense',
      parentId: a5100.id, level: 3, description: 'Plumbing repairs and maintenance', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5140', accountName: 'Electrical Maintenance', accountType: 'expense',
      parentId: a5100.id, level: 3, description: 'Electrical system repairs and maintenance', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5150', accountName: 'Elevator Maintenance', accountType: 'expense',
      parentId: a5100.id, level: 3, description: 'Elevator and escalator maintenance contracts', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5160', accountName: 'Fire Safety Maintenance', accountType: 'expense',
      parentId: a5100.id, level: 3, description: 'Fire alarm, suppression, and safety system maintenance', taxCategory: 'vat_applicable'
    });

    // 5200 - Utilities
    const a5200 = await createAccount({
      accountCode: '5200', accountName: 'Utility Expenses', accountType: 'expense',
      parentId: a5000.id, level: 2, description: 'Utility costs for common areas and vacant units'
    });
    await createAccount({
      accountCode: '5210', accountName: 'DEWA Expenses', accountType: 'expense',
      parentId: a5200.id, level: 3, description: 'Electricity and water charges (DEWA)', taxCategory: 'out_of_scope'
    });
    await createAccount({
      accountCode: '5220', accountName: 'Chiller Charges', accountType: 'expense',
      parentId: a5200.id, level: 3, description: 'District cooling charges', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5230', accountName: 'Common Area Utilities', accountType: 'expense',
      parentId: a5200.id, level: 3, description: 'Electricity and water for lobbies, corridors, parking', taxCategory: 'out_of_scope'
    });

    // 5300 - Insurance
    const a5300 = await createAccount({
      accountCode: '5300', accountName: 'Insurance Expenses', accountType: 'expense',
      parentId: a5000.id, level: 2, description: 'Insurance premiums for properties'
    });
    await createAccount({
      accountCode: '5310', accountName: 'Property Insurance', accountType: 'expense',
      parentId: a5300.id, level: 3, description: 'Insurance covering property damage and loss', taxCategory: 'vat_exempt'
    });
    await createAccount({
      accountCode: '5320', accountName: 'Liability Insurance', accountType: 'expense',
      parentId: a5300.id, level: 3, description: 'Public liability and third-party insurance', taxCategory: 'vat_exempt'
    });

    // 5400 - Security and Cleaning
    const a5400 = await createAccount({
      accountCode: '5400', accountName: 'Security and Cleaning', accountType: 'expense',
      parentId: a5000.id, level: 2, description: 'Facility management services', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5410', accountName: 'Security Services', accountType: 'expense',
      parentId: a5400.id, level: 3, description: 'Security guard and CCTV monitoring services', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5420', accountName: 'Cleaning Services', accountType: 'expense',
      parentId: a5400.id, level: 3, description: 'Building and common area cleaning services', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5430', accountName: 'Pest Control', accountType: 'expense',
      parentId: a5400.id, level: 3, description: 'Pest control and fumigation services', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5440', accountName: 'Landscaping and Gardening', accountType: 'expense',
      parentId: a5400.id, level: 3, description: 'Garden maintenance and landscaping', taxCategory: 'vat_applicable'
    });

    // 5500 - Government and Municipality
    const a5500 = await createAccount({
      accountCode: '5500', accountName: 'Government and Municipality Fees', accountType: 'expense',
      parentId: a5000.id, level: 2, description: 'Government charges, permits, and fees'
    });
    await createAccount({
      accountCode: '5510', accountName: 'Municipality Fees', accountType: 'expense',
      parentId: a5500.id, level: 3, description: 'Dubai/Abu Dhabi municipality housing fees', taxCategory: 'out_of_scope'
    });
    await createAccount({
      accountCode: '5520', accountName: 'Ejari Registration Fees', accountType: 'expense',
      parentId: a5500.id, level: 3, description: 'Ejari lease registration fees', taxCategory: 'out_of_scope'
    });
    await createAccount({
      accountCode: '5530', accountName: 'Licenses and Permits', accountType: 'expense',
      parentId: a5500.id, level: 3, description: 'Trade licenses, building permits, and compliance fees', taxCategory: 'out_of_scope'
    });

    // 5600 - Administrative Expenses
    const a5600 = await createAccount({
      accountCode: '5600', accountName: 'Administrative Expenses', accountType: 'expense',
      level: 1, description: 'General and administrative overhead costs'
    });
    await createAccount({
      accountCode: '5610', accountName: 'Salaries and Wages', accountType: 'expense',
      parentId: a5600.id, level: 2, description: 'Employee salaries, wages, and allowances', taxCategory: 'out_of_scope'
    });
    await createAccount({
      accountCode: '5620', accountName: 'Employee Benefits', accountType: 'expense',
      parentId: a5600.id, level: 2, description: 'Health insurance, visa costs, end-of-service gratuity', taxCategory: 'vat_exempt'
    });
    await createAccount({
      accountCode: '5630', accountName: 'Office Rent', accountType: 'expense',
      parentId: a5600.id, level: 2, description: 'Rent for company office space', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5640', accountName: 'Office Supplies and Stationery', accountType: 'expense',
      parentId: a5600.id, level: 2, description: 'Stationery, printing, and office consumables', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5650', accountName: 'Communication Expenses', accountType: 'expense',
      parentId: a5600.id, level: 2, description: 'Telephone, internet, and communication costs', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5660', accountName: 'IT and Software Expenses', accountType: 'expense',
      parentId: a5600.id, level: 2, description: 'Software licenses, IT support, and hosting', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5670', accountName: 'Legal and Professional Fees', accountType: 'expense',
      parentId: a5600.id, level: 2, description: 'Legal counsel, audit, and consulting fees', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5680', accountName: 'Travel and Transportation', accountType: 'expense',
      parentId: a5600.id, level: 2, description: 'Staff travel, fuel, and transportation costs', taxCategory: 'vat_applicable'
    });

    // 5700 - Marketing and Leasing
    const a5700 = await createAccount({
      accountCode: '5700', accountName: 'Marketing and Leasing Expenses', accountType: 'expense',
      level: 1, description: 'Costs related to marketing properties and acquiring tenants'
    });
    await createAccount({
      accountCode: '5710', accountName: 'Advertising and Promotion', accountType: 'expense',
      parentId: a5700.id, level: 2, description: 'Online and offline advertising, property portals', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5720', accountName: 'Brokerage and Commission Paid', accountType: 'expense',
      parentId: a5700.id, level: 2, description: 'Commissions paid to real estate brokers/agents', taxCategory: 'vat_applicable'
    });
    await createAccount({
      accountCode: '5730', accountName: 'Signage and Branding', accountType: 'expense',
      parentId: a5700.id, level: 2, description: 'Property signage, branding, and marketing materials', taxCategory: 'vat_applicable'
    });

    // 5800 - Financial Expenses
    const a5800 = await createAccount({
      accountCode: '5800', accountName: 'Financial Expenses', accountType: 'expense',
      level: 1, description: 'Bank and financing related costs'
    });
    await createAccount({
      accountCode: '5810', accountName: 'Bank Charges and Fees', accountType: 'expense',
      parentId: a5800.id, level: 2, description: 'Bank service charges, transfer fees, and card charges', taxCategory: 'vat_exempt'
    });
    await createAccount({
      accountCode: '5820', accountName: 'Interest Expense', accountType: 'expense',
      parentId: a5800.id, level: 2, description: 'Interest on loans, mortgages, and overdrafts', taxCategory: 'vat_exempt'
    });
    await createAccount({
      accountCode: '5830', accountName: 'Foreign Exchange Loss', accountType: 'expense',
      parentId: a5800.id, level: 2, description: 'Losses from currency conversion', taxCategory: 'vat_exempt'
    });

    // 5900 - Depreciation Expenses
    const a5900 = await createAccount({
      accountCode: '5900', accountName: 'Depreciation Expenses', accountType: 'expense',
      level: 1, description: 'Periodic depreciation charges on fixed assets'
    });
    await createAccount({
      accountCode: '5910', accountName: 'Depreciation - Buildings', accountType: 'expense',
      parentId: a5900.id, level: 2, description: 'Annual depreciation on buildings'
    });
    await createAccount({
      accountCode: '5920', accountName: 'Depreciation - Furniture', accountType: 'expense',
      parentId: a5900.id, level: 2, description: 'Annual depreciation on furniture and fixtures'
    });
    await createAccount({
      accountCode: '5930', accountName: 'Depreciation - Equipment', accountType: 'expense',
      parentId: a5900.id, level: 2, description: 'Annual depreciation on office equipment'
    });
    await createAccount({
      accountCode: '5940', accountName: 'Depreciation - Vehicles', accountType: 'expense',
      parentId: a5900.id, level: 2, description: 'Annual depreciation on motor vehicles'
    });

    console.log('\n====================================');
    console.log('Chart of Accounts seeding complete!');
    console.log('====================================');

  } catch (error) {
    console.error('Error seeding Chart of Accounts:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seed();
