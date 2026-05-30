const { sequelize } = require('../config/database');
const User = require('./User');
const Lead = require('./Lead');
const Property = require('./Property');
const LeadProperty = require('./LeadProperty');
const LeadActivity = require('./LeadActivity');
const Tenant = require('./Tenant');
const Unit = require('./Unit');
const Lease = require('./Lease');
const Payment = require('./Payment');
const Invoice = require('./Invoice');
const Ticket = require('./Ticket');
const ChartOfAccount = require('./ChartOfAccount');
const FinancialTransaction = require('./FinancialTransaction');
const Budget = require('./Budget');
const TaxSetting = require('./TaxSetting');
const SystemSetting = require('./SystemSetting');
const CompanySetting = require('./CompanySetting');
const CompanyUser = require('./CompanyUser');
const DocumentNumbering = require('./DocumentNumbering');
const Role = require('./Role');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
const UserRole = require('./UserRole');

// New Finance Module Models
const Vendor = require('./Vendor');
const VendorInvoice = require('./VendorInvoice');
const BankAccount = require('./BankAccount');
const BankTransaction = require('./BankTransaction');
const Reconciliation = require('./Reconciliation');
const FinancialForecast = require('./FinancialForecast');
const ExchangeRate = require('./ExchangeRate');
const BudgetCategory = require('./BudgetCategory');
const Document = require('./Document');
const ReportShare = require('./ReportShare');
const PaymentGatewayTransaction = require('./PaymentGatewayTransaction');
const StandingOrder = require('./StandingOrder');
const Cheque = require('./Cheque');
const SecurityDeposit = require('./SecurityDeposit');
const PaymentReminder = require('./PaymentReminder');
const PaymentInvoiceAllocation = require('./PaymentInvoiceAllocation');
const PettyCash = require('./PettyCash');
const CreditLimit = require('./CreditLimit');
const BankStatementImport = require('./BankStatementImport');
const Investment = require('./Investment');
const ServiceTemplate = require('./ServiceTemplate');
// Procurement Module Models
const Item = require('./Item');
const PurchaseOrder = require('./PurchaseOrder');
const GoodsReceipt = require('./GoodsReceipt');
const PurchaseInvoice = require('./PurchaseInvoice');
// Ledger Setup Model
const LedgerSetup = require('./LedgerSetup');
// Journal Voucher Models
const JournalVoucher = require('./JournalVoucher');
const JournalVoucherDetail = require('./JournalVoucherDetail');
const AccountsTrans = require('./AccountsTrans');
// Ticket Note
const TicketNote = require('./TicketNote');

// Legal Module Models
const LegalCase = require('./LegalCase');
const AuditLog = require('./AuditLog');

// Phase D — company financial governance
const CompanyNumberSeries = require('./CompanyNumberSeries');
const CompanyFinancialYear = require('./CompanyFinancialYear');
const CompanyFinancialPeriod = require('./CompanyFinancialPeriod');
const CompanyVatPeriod = require('./CompanyVatPeriod');
const CompanyDocumentTemplate = require('./CompanyDocumentTemplate');
const CompanyOpeningBalanceBatch = require('./CompanyOpeningBalanceBatch');
const SystemIntegrityAudit = require('./SystemIntegrityAudit');
const DirectPurchaseInvoice = require('./DirectPurchaseInvoice');
const DirectPurchaseInvoiceLine = require('./DirectPurchaseInvoiceLine');
const payrollModels = require('./payrollModels');

console.log('DEBUG: TicketNote loaded in models/index.js:', !!TicketNote);

// Define associations
// User associations
User.hasMany(Lead, { foreignKey: 'assignedTo', as: 'assignedLeads' });
User.hasMany(Property, { foreignKey: 'agentId', as: 'properties' });
User.hasMany(LeadActivity, { foreignKey: 'userId', as: 'activities' });
User.hasMany(UserRole, { foreignKey: 'userId', as: 'userRoles' });
User.belongsToMany(Role, { through: UserRole, foreignKey: 'userId', otherKey: 'roleId', as: 'roles' });
UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

Role.hasMany(UserRole, { foreignKey: 'roleId', as: 'roleUsers' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'roleId', otherKey: 'userId', as: 'users' });

Role.hasMany(RolePermission, { foreignKey: 'roleId', as: 'rolePermissions' });
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId', otherKey: 'permissionId', as: 'permissions' });
RolePermission.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
RolePermission.belongsTo(Permission, { foreignKey: 'permissionId', as: 'permission' });

Permission.hasMany(RolePermission, { foreignKey: 'permissionId', as: 'permissionRoles' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId', otherKey: 'roleId', as: 'roles' });

// Lead associations
Lead.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
Lead.hasMany(LeadActivity, { foreignKey: 'leadId', as: 'activities' });
Lead.belongsToMany(Property, { 
  through: LeadProperty, 
  foreignKey: 'leadId', 
  otherKey: 'propertyId',
  as: 'properties' 
});

// Property associations
Property.belongsTo(User, { foreignKey: 'agentId', as: 'agent' });
Property.belongsToMany(Lead, { 
  through: LeadProperty, 
  foreignKey: 'propertyId', 
  otherKey: 'leadId',
  as: 'leads' 
});

// LeadProperty associations
LeadProperty.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
LeadProperty.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// LeadActivity associations
LeadActivity.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
LeadActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Tenant associations
Tenant.hasMany(Lease, { foreignKey: 'tenantId', as: 'leases' });
Tenant.hasMany(Payment, { foreignKey: 'tenantId', as: 'payments' });
Tenant.hasMany(Invoice, { foreignKey: 'tenantId', as: 'invoices' });
Tenant.hasMany(Ticket, { foreignKey: 'tenantId', as: 'tickets' });

// Unit associations
Unit.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Unit.hasMany(Lease, { foreignKey: 'unitId', as: 'leases' });
Unit.hasMany(Ticket, { foreignKey: 'unitId', as: 'tickets' });

// Lease associations
Lease.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Lease.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });
Lease.hasMany(Payment, { foreignKey: 'leaseId', as: 'payments' });
Lease.hasMany(Invoice, { foreignKey: 'leaseId', as: 'invoices' });

// Payment associations
Payment.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });
Payment.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Payment.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });

// Invoice associations
Invoice.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });
Invoice.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Invoice.hasMany(Cheque, { foreignKey: 'invoiceId', as: 'cheques' });
Cheque.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Ticket associations
Ticket.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Ticket.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });
Ticket.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Ticket.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
Ticket.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
Vendor.hasMany(Ticket, { foreignKey: 'vendorId', as: 'tickets' });
Property.hasMany(Ticket, { foreignKey: 'propertyId', as: 'tickets' });

// Ticket Note associations
Ticket.hasMany(TicketNote, { foreignKey: 'ticketId', as: 'notes' });
TicketNote.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
TicketNote.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Property associations (update existing)
Property.hasMany(Unit, { foreignKey: 'propertyId', as: 'units' });

// Chart of Accounts associations
ChartOfAccount.hasMany(ChartOfAccount, { foreignKey: 'parentAccountId', as: 'subAccounts' });
ChartOfAccount.belongsTo(ChartOfAccount, { foreignKey: 'parentAccountId', as: 'parentAccount' });
ChartOfAccount.hasMany(FinancialTransaction, { foreignKey: 'accountId', as: 'transactions' });

// Financial Transaction associations
FinancialTransaction.belongsTo(ChartOfAccount, { foreignKey: 'accountId', as: 'account' });
FinancialTransaction.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
FinancialTransaction.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// Budget associations
Budget.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Budget.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
Budget.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Budget.hasMany(BudgetCategory, { foreignKey: 'budgetId', as: 'categories', onDelete: 'CASCADE' });

// Budget Category associations
BudgetCategory.belongsTo(Budget, { foreignKey: 'budgetId', as: 'budget' });
BudgetCategory.belongsTo(ChartOfAccount, { foreignKey: 'accountId', as: 'account' });

// Chart of Accounts - Enhanced associations
ChartOfAccount.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
ChartOfAccount.hasMany(BudgetCategory, { foreignKey: 'accountId', as: 'budgetCategories' });
ChartOfAccount.hasMany(BankAccount, { foreignKey: 'chartAccountId', as: 'bankAccounts' });

// Financial Transaction - Enhanced associations
FinancialTransaction.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
FinancialTransaction.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
FinancialTransaction.belongsTo(Reconciliation, { foreignKey: 'reconciliationId', as: 'reconciliation' });
FinancialTransaction.belongsTo(ExchangeRate, { foreignKey: 'exchangeRateId', as: 'exchangeRate' });

// Vendor associations
Vendor.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Vendor.hasMany(VendorInvoice, { foreignKey: 'vendorId', as: 'invoices' });
Vendor.hasMany(Payment, { foreignKey: 'vendorId', as: 'payments' });
Vendor.hasMany(FinancialTransaction, { foreignKey: 'vendorId', as: 'transactions' });

// Vendor Invoice associations
VendorInvoice.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
VendorInvoice.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
VendorInvoice.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
VendorInvoice.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// Bank Account associations
BankAccount.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
BankAccount.belongsTo(ChartOfAccount, { foreignKey: 'chartAccountId', as: 'chartAccount' });
BankAccount.hasMany(BankTransaction, { foreignKey: 'bankAccountId', as: 'transactions' });
BankAccount.hasMany(Reconciliation, { foreignKey: 'bankAccountId', as: 'reconciliations' });

// Bank Transaction associations
BankTransaction.belongsTo(BankAccount, { foreignKey: 'bankAccountId', as: 'bankAccount' });
BankTransaction.belongsTo(Reconciliation, { foreignKey: 'reconciliationId', as: 'reconciliation' });

// Reconciliation associations
Reconciliation.belongsTo(BankAccount, { foreignKey: 'bankAccountId', as: 'bankAccount' });
Reconciliation.belongsTo(User, { foreignKey: 'reconciledBy', as: 'reconciler' });
Reconciliation.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
Reconciliation.hasMany(BankTransaction, { foreignKey: 'reconciliationId', as: 'bankTransactions' });
Reconciliation.hasMany(FinancialTransaction, { foreignKey: 'reconciliationId', as: 'financialTransactions' });
Reconciliation.hasMany(Payment, { foreignKey: 'reconciliationId', as: 'payments' });

// Financial Forecast associations
FinancialForecast.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Exchange Rate associations
ExchangeRate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
ExchangeRate.hasMany(FinancialTransaction, { foreignKey: 'exchangeRateId', as: 'transactions' });

// Payment - Enhanced associations
Payment.belongsTo(BankTransaction, { foreignKey: 'bankTransactionId', as: 'bankTransaction' });
Payment.belongsTo(Reconciliation, { foreignKey: 'reconciliationId', as: 'reconciliation' });
Payment.hasMany(PaymentGatewayTransaction, { foreignKey: 'paymentId', as: 'gatewayTransactions' });

// Property - Enhanced associations
Property.hasMany(VendorInvoice, { foreignKey: 'propertyId', as: 'vendorInvoices' });
Property.hasMany(ChartOfAccount, { foreignKey: 'propertyId', as: 'accounts' });
Property.hasMany(FinancialTransaction, { foreignKey: 'propertyId', as: 'financialTransactions' });
Property.hasMany(Budget, { foreignKey: 'propertyId', as: 'budgets' });
Property.hasMany(JournalVoucher, { foreignKey: 'propertyId', as: 'journalVouchers' });

// System Setting associations
SystemSetting.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

// Document associations
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });
Document.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Document.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
// Polymorphic associations handled in controller

// Report Share associations
ReportShare.belongsTo(User, { foreignKey: 'sharedBy', as: 'sharer' });

// Vendor - Document associations
Vendor.hasMany(Document, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entityType: 'vendor' },
  as: 'uploadedDocuments' 
});

// Lead - Document associations
Lead.hasMany(Document, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entityType: 'lead' },
  as: 'uploadedDocuments' 
});

// Invoice - Document associations
Invoice.hasMany(Document, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entity_type: 'invoice' }, // Fixed: Matches DB column name
  as: 'documents' 
});

// Payment Gateway Transaction associations
PaymentGatewayTransaction.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
PaymentGatewayTransaction.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
PaymentGatewayTransaction.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });

// Tenant - Enhanced associations
Tenant.hasMany(PaymentGatewayTransaction, { foreignKey: 'tenantId', as: 'gatewayTransactions' });

// Lease - Enhanced associations
Lease.hasMany(PaymentGatewayTransaction, { foreignKey: 'leaseId', as: 'gatewayTransactions' });
Lease.hasMany(StandingOrder, { foreignKey: 'leaseId', as: 'standingOrders' });

// Standing Order associations
StandingOrder.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });
StandingOrder.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
StandingOrder.belongsTo(BankAccount, { foreignKey: 'bankAccountId', as: 'bankAccount' });
StandingOrder.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
StandingOrder.belongsTo(User, { foreignKey: 'mandateApprovedBy', as: 'mandateApprover' });

// Tenant - Additional associations
Tenant.hasMany(StandingOrder, { foreignKey: 'tenantId', as: 'standingOrders' });

// BankAccount - Additional associations
BankAccount.hasMany(StandingOrder, { foreignKey: 'bankAccountId', as: 'standingOrders' });
BankAccount.hasMany(Cheque, { foreignKey: 'bankAccountId', as: 'cheques' });

// Cheque associations
Cheque.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
Cheque.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Cheque.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });
Cheque.belongsTo(BankAccount, { foreignKey: 'bankAccountId', as: 'bankAccount' });
Cheque.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Cheque.belongsTo(User, { foreignKey: 'depositedBy', as: 'depositor' });
Cheque.belongsTo(Cheque, { foreignKey: 'replacementChequeId', as: 'replacementCheque' });
Cheque.belongsTo(Cheque, { foreignKey: 'originalChequeId', as: 'originalCheque' });

// Payment - Cheque association
Payment.hasMany(Cheque, { foreignKey: 'paymentId', as: 'cheques' });

// Tenant - Cheque association
Tenant.hasMany(Cheque, { foreignKey: 'tenantId', as: 'cheques' });

// Lease - Cheque association
Lease.hasMany(Cheque, { foreignKey: 'leaseId', as: 'cheques' });

// Security Deposit associations
SecurityDeposit.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });
SecurityDeposit.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
SecurityDeposit.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
SecurityDeposit.belongsTo(BankAccount, { foreignKey: 'bankAccountId', as: 'bankAccount' });
SecurityDeposit.belongsTo(Cheque, { foreignKey: 'chequeId', as: 'cheque' });
SecurityDeposit.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
SecurityDeposit.belongsTo(User, { foreignKey: 'releasedBy', as: 'releaser' });
SecurityDeposit.belongsTo(User, { foreignKey: 'inspectedBy', as: 'inspector' });

// Lease - Security Deposit association
Lease.hasMany(SecurityDeposit, { foreignKey: 'leaseId', as: 'securityDeposits' });

// Tenant - Security Deposit association
Tenant.hasMany(SecurityDeposit, { foreignKey: 'tenantId', as: 'securityDeposits' });

// Property - Security Deposit association
Property.hasMany(SecurityDeposit, { foreignKey: 'propertyId', as: 'securityDeposits' });

// Cheque - Security Deposit association
Cheque.hasMany(SecurityDeposit, { foreignKey: 'chequeId', as: 'securityDeposits' });

// Payment Reminder associations
PaymentReminder.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
PaymentReminder.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
PaymentReminder.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });

// Payment - Reminder association
Payment.hasMany(PaymentReminder, { foreignKey: 'paymentId', as: 'reminders' });

// Tenant - Reminder association
Tenant.hasMany(PaymentReminder, { foreignKey: 'tenantId', as: 'reminders' });

// Petty Cash associations
PettyCash.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
PettyCash.belongsTo(User, { foreignKey: 'custodian', as: 'custodianUser' });
PettyCash.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
PettyCash.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
PettyCash.belongsTo(ChartOfAccount, { foreignKey: 'chartAccountId', as: 'chartAccount' });

// Property - Petty Cash association
Property.hasMany(PettyCash, { foreignKey: 'propertyId', as: 'pettyCash' });

// Credit Limit associations
CreditLimit.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
CreditLimit.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
Tenant.hasOne(CreditLimit, { foreignKey: 'tenantId', as: 'creditLimit' });

// Bank Statement Import associations
BankStatementImport.belongsTo(BankAccount, { foreignKey: 'bankAccountId', as: 'bankAccount' });
BankStatementImport.belongsTo(User, { foreignKey: 'importedBy', as: 'importer' });
BankAccount.hasMany(BankStatementImport, { foreignKey: 'bankAccountId', as: 'imports' });

// Investment associations
Investment.belongsTo(BankAccount, { foreignKey: 'bankAccountId', as: 'bankAccount' });
BankAccount.hasMany(Investment, { foreignKey: 'bankAccountId', as: 'investments' });

// Procurement Module associations
// Item associations
Item.belongsTo(ChartOfAccount, { foreignKey: 'accountId', as: 'account' });
Item.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
ChartOfAccount.hasMany(Item, { foreignKey: 'accountId', as: 'items' });

// Service Template associations
ServiceTemplate.belongsTo(ChartOfAccount, { foreignKey: 'accountId', as: 'account' });
ChartOfAccount.hasMany(ServiceTemplate, { foreignKey: 'accountId', as: 'serviceTemplates' });

// Purchase Order associations
PurchaseOrder.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
PurchaseOrder.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
PurchaseOrder.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
PurchaseOrder.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });
PurchaseOrder.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });
Vendor.hasMany(PurchaseOrder, { foreignKey: 'vendorId', as: 'purchaseOrders' });
Property.hasMany(PurchaseOrder, { foreignKey: 'propertyId', as: 'purchaseOrders' });
Unit.hasMany(PurchaseOrder, { foreignKey: 'unitId', as: 'purchaseOrders' });
Lease.hasMany(PurchaseOrder, { foreignKey: 'leaseId', as: 'purchaseOrders' });

// Goods Receipt associations
GoodsReceipt.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId', as: 'purchaseOrder' });
GoodsReceipt.belongsTo(User, { foreignKey: 'receivedBy', as: 'receiver' });
GoodsReceipt.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
GoodsReceipt.belongsTo(Property, { foreignKey: 'deliveryPropertyId', as: 'deliveryProperty' });
GoodsReceipt.belongsTo(Unit, { foreignKey: 'deliveryUnitId', as: 'deliveryUnit' });
PurchaseOrder.hasMany(GoodsReceipt, { foreignKey: 'purchaseOrderId', as: 'goodsReceipts' });
Property.hasMany(GoodsReceipt, { foreignKey: 'deliveryPropertyId', as: 'goodsReceipts' });
Unit.hasMany(GoodsReceipt, { foreignKey: 'deliveryUnitId', as: 'goodsReceipts' });

// Purchase Invoice associations
PurchaseInvoice.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
PurchaseInvoice.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId', as: 'purchaseOrder' });
PurchaseInvoice.belongsTo(GoodsReceipt, { foreignKey: 'goodsReceiptId', as: 'goodsReceipt' });
PurchaseInvoice.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
PurchaseInvoice.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
// New real estate associations for PurchaseInvoice
PurchaseInvoice.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
PurchaseInvoice.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });
PurchaseInvoice.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });
Vendor.hasMany(PurchaseInvoice, { foreignKey: 'vendorId', as: 'purchaseInvoices' });
PurchaseOrder.hasMany(PurchaseInvoice, { foreignKey: 'purchaseOrderId', as: 'purchaseInvoices' });
GoodsReceipt.hasMany(PurchaseInvoice, { foreignKey: 'goodsReceiptId', as: 'purchaseInvoices' });
Property.hasMany(PurchaseInvoice, { foreignKey: 'propertyId', as: 'purchaseInvoices' });
Unit.hasMany(PurchaseInvoice, { foreignKey: 'unitId', as: 'purchaseInvoices' });
Lease.hasMany(PurchaseInvoice, { foreignKey: 'leaseId', as: 'purchaseInvoices' });

// Journal Voucher associations
JournalVoucher.hasMany(JournalVoucherDetail, { foreignKey: 'jvId', as: 'details' });
JournalVoucherDetail.belongsTo(JournalVoucher, { foreignKey: 'jvId', as: 'voucher' });
JournalVoucher.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

JournalVoucher.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
JournalVoucher.belongsTo(User, { foreignKey: 'postedBy', as: 'poster' });

JournalVoucherDetail.belongsTo(ChartOfAccount, { foreignKey: 'ledgerId', as: 'ledger' });

// AccountsTrans Associations
AccountsTrans.belongsTo(ChartOfAccount, { foreignKey: 'ledgerId', as: 'ledger' });
ChartOfAccount.hasMany(AccountsTrans, { foreignKey: 'ledgerId', as: 'accountingEntries' });

AccountsTrans.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
Invoice.hasMany(AccountsTrans, { foreignKey: 'invoiceId', as: 'accountingEntries' });

AccountsTrans.belongsTo(VendorInvoice, { foreignKey: 'billId', as: 'bill' });
VendorInvoice.hasMany(AccountsTrans, { foreignKey: 'billId', as: 'accountingEntries' });
DirectPurchaseInvoice.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
DirectPurchaseInvoice.belongsTo(ChartOfAccount, {
  foreignKey: 'payableAccountId',
  as: 'payableAccount',
});
DirectPurchaseInvoice.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
DirectPurchaseInvoice.belongsTo(User, { foreignKey: 'postedBy', as: 'poster' });
DirectPurchaseInvoice.hasMany(DirectPurchaseInvoiceLine, {
  foreignKey: 'directPurchaseInvoiceId',
  as: 'lines',
});
DirectPurchaseInvoice.hasMany(AccountsTrans, {
  foreignKey: 'directPurchaseInvoiceId',
  as: 'accountingEntries',
});
DirectPurchaseInvoiceLine.belongsTo(DirectPurchaseInvoice, {
  foreignKey: 'directPurchaseInvoiceId',
  as: 'invoice',
});
DirectPurchaseInvoiceLine.belongsTo(ChartOfAccount, {
  foreignKey: 'expenseAccountId',
  as: 'expenseAccount',
});
DirectPurchaseInvoiceLine.belongsTo(ChartOfAccount, {
  foreignKey: 'inputTaxAccountId',
  as: 'inputTaxAccount',
});
Vendor.hasMany(DirectPurchaseInvoice, { foreignKey: 'vendorId', as: 'directPurchaseInvoices' });

AccountsTrans.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
Payment.hasMany(AccountsTrans, { foreignKey: 'paymentId', as: 'accountingEntries' });

PaymentInvoiceAllocation.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
Payment.hasMany(PaymentInvoiceAllocation, {
  foreignKey: 'paymentId',
  as: 'invoiceAllocations'
});

AccountsTrans.belongsTo(JournalVoucher, { foreignKey: 'jvId', as: 'voucher' });
JournalVoucher.hasMany(AccountsTrans, { foreignKey: 'jvId', as: 'accountingEntries' });

// Entity Linkages for SOA
AccountsTrans.belongsTo(Tenant, { foreignKey: 'particularId', constraints: false, as: 'tenant' });
AccountsTrans.belongsTo(Vendor, { foreignKey: 'particularId', constraints: false, as: 'vendor' });

// Ledger Setup associations
LedgerSetup.belongsTo(ChartOfAccount, { foreignKey: 'postingType', as: 'ledger' });
ChartOfAccount.hasMany(LedgerSetup, { foreignKey: 'postingType', as: 'ledgerSetups' });

// Legal Case associations
LegalCase.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });
LegalCase.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
LegalCase.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });
LegalCase.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
LegalCase.belongsTo(User, { foreignKey: 'closedBy', as: 'closer' });

Lease.hasMany(LegalCase, { foreignKey: 'leaseId', as: 'legalCases' });
Tenant.hasMany(LegalCase, { foreignKey: 'tenantId', as: 'legalCases' });
Unit.hasMany(LegalCase, { foreignKey: 'unitId', as: 'legalCases' });

// Legal Case - Document associations
LegalCase.hasMany(Document, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entityType: 'legal_case' },
  as: 'documents' 
});

// Audit Log associations
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

// Multi-company (Phase 1)
CompanySetting.hasMany(CompanyUser, { foreignKey: 'companyId', as: 'companyUsers' });
CompanyUser.belongsTo(CompanySetting, { foreignKey: 'companyId', as: 'companySetting' });
User.hasMany(CompanyUser, { foreignKey: 'userId', as: 'companyMemberships' });
CompanyUser.belongsTo(User, { foreignKey: 'userId', as: 'user' });
CompanySetting.hasMany(Property, { foreignKey: 'companyId', as: 'properties' });
Property.belongsTo(CompanySetting, { foreignKey: 'companyId', as: 'companySetting' });
CompanySetting.hasMany(Unit, { foreignKey: 'companyId', as: 'units' });
Unit.belongsTo(CompanySetting, { foreignKey: 'companyId', as: 'companySetting' });
CompanySetting.hasMany(Tenant, { foreignKey: 'companyId', as: 'tenants' });
Tenant.belongsTo(CompanySetting, { foreignKey: 'companyId', as: 'companySetting' });
CompanySetting.hasMany(Lease, { foreignKey: 'companyId', as: 'leases' });
Lease.belongsTo(CompanySetting, { foreignKey: 'companyId', as: 'companySetting' });

// Multi-company (Phase 2A — finance)
const phase2aFinanceModels = [
  [ChartOfAccount, 'chartOfAccounts'],
  [LedgerSetup, 'ledgerSetups'],
  [BankAccount, 'bankAccounts'],
  [BankTransaction, 'bankTransactions'],
  [Reconciliation, 'reconciliations'],
  [BankStatementImport, 'bankStatementImports'],
  [Vendor, 'vendors'],
  [Budget, 'budgets'],
  [BudgetCategory, 'budgetCategories'],
  [JournalVoucher, 'journalVouchers'],
  [JournalVoucherDetail, 'journalVoucherDetails'],
  [Cheque, 'cheques'],
  [Payment, 'payments'],
  [PaymentInvoiceAllocation, 'paymentInvoiceAllocations'],
  [Invoice, 'invoices'],
  [VendorInvoice, 'vendorInvoices'],
  [SecurityDeposit, 'securityDeposits'],
  [AccountsTrans, 'accountsTrans'],
  [FinancialTransaction, 'financialTransactions'],
  [PurchaseOrder, 'purchaseOrders'],
  [PurchaseInvoice, 'purchaseInvoices'],
];
for (const [Model, alias] of phase2aFinanceModels) {
  CompanySetting.hasMany(Model, { foreignKey: 'companyId', as: alias });
  Model.belongsTo(CompanySetting, { foreignKey: 'companyId', as: 'companySetting' });
}

// Phase D — financial governance
const phase2dGovernanceModels = [
  [CompanyNumberSeries, 'numberSeries'],
  [CompanyFinancialYear, 'financialYears'],
  [CompanyFinancialPeriod, 'financialPeriods'],
  [CompanyVatPeriod, 'vatPeriods'],
  [CompanyDocumentTemplate, 'documentTemplates'],
  [CompanyOpeningBalanceBatch, 'openingBalanceBatches'],
];
for (const [Model, alias] of phase2dGovernanceModels) {
  CompanySetting.hasMany(Model, { foreignKey: 'companyId', as: alias });
  Model.belongsTo(CompanySetting, { foreignKey: 'companyId', as: 'companySetting' });
}
CompanyFinancialYear.hasMany(CompanyFinancialPeriod, {
  foreignKey: 'financialYearId',
  as: 'periods',
});
CompanyFinancialPeriod.belongsTo(CompanyFinancialYear, {
  foreignKey: 'financialYearId',
  as: 'financialYear',
});

module.exports = {
  sequelize,
  User,
  Lead,
  Property,
  LeadProperty,
  LeadActivity,
  Tenant,
  Unit,
  Lease,
  Payment,
  Invoice,
  Ticket,
  ChartOfAccount,
  FinancialTransaction,
  Budget,
  TaxSetting,
  SystemSetting,
  CompanySetting,
  CompanyUser,
  DocumentNumbering,
  Role,
  Permission,
  RolePermission,
  UserRole,
  // New Finance Module Models
  Vendor,
  VendorInvoice,
  BankAccount,
  BankTransaction,
  Reconciliation,
  FinancialForecast,
  ExchangeRate,
  BudgetCategory,
  Document,
  ReportShare,
  PaymentGatewayTransaction,
  StandingOrder,
  Cheque,
  SecurityDeposit,
  PaymentReminder,
  PaymentInvoiceAllocation,
  PettyCash,
  CreditLimit,
  BankStatementImport,
  Investment,
  ServiceTemplate,
  // Procurement Module Models
  Item,
  PurchaseOrder,
  GoodsReceipt,
  PurchaseInvoice,
  JournalVoucher,
  JournalVoucherDetail,
  AccountsTrans,
  LedgerSetup,
  TicketNote,
  LegalCase,
  AuditLog,
  CompanyNumberSeries,
  CompanyFinancialYear,
  CompanyFinancialPeriod,
  CompanyVatPeriod,
  CompanyDocumentTemplate,
  CompanyOpeningBalanceBatch,
  SystemIntegrityAudit,
  DirectPurchaseInvoice,
  DirectPurchaseInvoiceLine,
  ...payrollModels,
};
