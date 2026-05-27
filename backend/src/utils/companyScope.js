const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

const CROSS_COMPANY_MSG = 'Selected record does not belong to active company';

function logCrossCompanyBlocked(req, details = {}, finance = false) {
  if (!req || req._companyAuditLogged) return;
  req._companyAuditLogged = true;
  logCompanyEvent({
    req,
    action: finance
      ? COMPANY_AUDIT_ACTIONS.CROSS_COMPANY_FINANCE_ACCESS_BLOCKED
      : COMPANY_AUDIT_ACTIONS.CROSS_COMPANY_ACCESS_BLOCKED,
    entityId: req.companyId || 0,
    metadata: {
      reason: CROSS_COMPANY_MSG,
      ...details,
    },
  });
}

function financeCrossCompanyError(req, details = {}) {
  logCrossCompanyBlocked(req, details, true);
  const err = new Error(CROSS_COMPANY_MSG);
  err.statusCode = 400;
  return err;
}

async function assertEntityInCompany(Model, id, req, details = {}) {
  if (id == null) return null;
  const record = await Model.findOne({
    where: { id, companyId: req.companyId },
  });
  if (!record) {
    throw financeCrossCompanyError(req, { model: Model.name, id, ...details });
  }
  return record;
}

async function assertAccountInCompany(accountId, req) {
  const { ChartOfAccount } = require('../models');
  return assertEntityInCompany(ChartOfAccount, accountId, req, { accountId });
}

async function assertBankInCompany(bankAccountId, req) {
  const { BankAccount } = require('../models');
  return assertEntityInCompany(BankAccount, bankAccountId, req, { bankAccountId });
}

async function assertVendorInCompany(vendorId, req) {
  const { Vendor } = require('../models');
  return assertEntityInCompany(Vendor, vendorId, req, { vendorId });
}

async function assertBudgetInCompany(budgetId, req) {
  const { Budget } = require('../models');
  return assertEntityInCompany(Budget, budgetId, req, { budgetId });
}

async function assertInvoiceInCompany(invoiceId, req) {
  const { Invoice } = require('../models');
  return assertEntityInCompany(Invoice, invoiceId, req, { invoiceId });
}

async function assertVendorInvoiceInCompany(vendorInvoiceId, req) {
  const { VendorInvoice } = require('../models');
  return assertEntityInCompany(VendorInvoice, vendorInvoiceId, req, { vendorInvoiceId });
}

async function assertLeaseInCompany(leaseId, req) {
  const { Lease } = require('../models');
  return assertEntityInCompany(Lease, leaseId, req, { leaseId });
}

async function assertTenantInCompany(tenantId, req) {
  const { Tenant } = require('../models');
  return assertEntityInCompany(Tenant, tenantId, req, { tenantId });
}

async function assertPaymentInCompany(paymentId, req) {
  const { Payment } = require('../models');
  return assertEntityInCompany(Payment, paymentId, req, { paymentId });
}

async function assertChequeInCompany(chequeId, req) {
  const { Cheque } = require('../models');
  return assertEntityInCompany(Cheque, chequeId, req, { chequeId });
}

async function assertJournalVoucherInCompany(jvId, req) {
  const { JournalVoucher } = require('../models');
  return assertEntityInCompany(JournalVoucher, jvId, req, { jvId });
}

async function assertPurchaseInvoiceInCompany(purchaseInvoiceId, req) {
  const { PurchaseInvoice } = require('../models');
  return assertEntityInCompany(PurchaseInvoice, purchaseInvoiceId, req, { purchaseInvoiceId });
}

async function assertDirectPurchaseInvoiceInCompany(directPurchaseInvoiceId, req) {
  const { DirectPurchaseInvoice } = require('../models');
  return assertEntityInCompany(DirectPurchaseInvoice, directPurchaseInvoiceId, req, {
    directPurchaseInvoiceId,
  });
}

async function assertEmployeeInCompany(employeeId, req) {
  const { Employee } = require('../models');
  return assertEntityInCompany(Employee, employeeId, req, { employeeId });
}

async function assertDepartmentInCompany(departmentId, req) {
  const { Department } = require('../models');
  return assertEntityInCompany(Department, departmentId, req, { departmentId });
}

async function assertPurchaseOrderInCompany(purchaseOrderId, req) {
  const { PurchaseOrder } = require('../models');
  return assertEntityInCompany(PurchaseOrder, purchaseOrderId, req, { purchaseOrderId });
}

async function assertSecurityDepositInCompany(securityDepositId, req) {
  const { SecurityDeposit } = require('../models');
  return assertEntityInCompany(SecurityDeposit, securityDepositId, req, { securityDepositId });
}

async function validatePostingLineRefs(req, line = {}) {
  const ledgerId = line.ledgerId ?? line.ledger ?? line.accountId ?? line.account_id;
  if (ledgerId != null) {
    await assertAccountInCompany(ledgerId, req);
  }
  if (line.bankAccountId != null) {
    await assertBankInCompany(line.bankAccountId, req);
  }
  if (line.vendorId != null) {
    await assertVendorInCompany(line.vendorId, req);
  }
  if (line.tenantId != null) {
    await assertTenantInCompany(line.tenantId, req);
  }
  if (line.leaseId != null) {
    await assertLeaseInCompany(line.leaseId, req);
  }
  if (line.invoiceId != null) {
    await assertInvoiceInCompany(line.invoiceId, req);
  }
  if (line.paymentId != null) {
    await assertPaymentInCompany(line.paymentId, req);
  }
  if (line.chequeId != null) {
    await assertChequeInCompany(line.chequeId, req);
  }
  if (line.billId != null && line.particularType === 'Vendor') {
    await assertVendorInvoiceInCompany(line.billId, req);
  }
  if (line.directPurchaseInvoiceId != null) {
    await assertDirectPurchaseInvoiceInCompany(line.directPurchaseInvoiceId, req);
  }
}

function companyWhere(req) {
  if (!req.companyId) {
    throw new Error('Company context missing');
  }
  return { companyId: req.companyId };
}

function stripCompanyFromBody(body) {
  if (!body || typeof body !== 'object') return body;
  const copy = { ...body };
  delete copy.companyId;
  delete copy.company_id;
  return copy;
}

function withCompanyId(req, payload = {}) {
  const data = stripCompanyFromBody(payload);
  return { ...data, companyId: req.companyId };
}

async function assertRecordInCompany(Model, id, req, options = {}) {
  const record = await Model.findOne({
    where: { id, ...companyWhere(req) },
    ...options,
  });
  if (!record) {
    const err = new Error('Record not found');
    err.statusCode = 404;
    throw err;
  }
  return record;
}

async function assertParentsInCompany(req, { propertyId, unitId, tenantId } = {}) {
  const { Property, Unit, Tenant } = require('../models');

  if (propertyId != null) {
    const prop = await Property.findOne({
      where: { id: propertyId, companyId: req.companyId },
    });
    if (!prop) {
      logCrossCompanyBlocked(req, { propertyId });
      const err = new Error(CROSS_COMPANY_MSG);
      err.statusCode = 400;
      throw err;
    }
  }

  if (unitId != null) {
    const unit = await Unit.findOne({
      where: { id: unitId, companyId: req.companyId },
      include: propertyId
        ? [{ model: Property, as: 'property', attributes: ['id', 'companyId'], required: false }]
        : [],
    });
    if (!unit) {
      logCrossCompanyBlocked(req, { unitId, propertyId });
      const err = new Error(CROSS_COMPANY_MSG);
      err.statusCode = 400;
      throw err;
    }
    if (propertyId != null && unit.propertyId !== Number(propertyId)) {
      logCrossCompanyBlocked(req, { unitId, propertyId });
      const err = new Error(CROSS_COMPANY_MSG);
      err.statusCode = 400;
      throw err;
    }
  }

  if (tenantId != null) {
    const tenant = await Tenant.findOne({
      where: { id: tenantId, companyId: req.companyId },
    });
    if (!tenant) {
      logCrossCompanyBlocked(req, { tenantId });
      const err = new Error(CROSS_COMPANY_MSG);
      err.statusCode = 400;
      throw err;
    }
  }
}

module.exports = {
  CROSS_COMPANY_MSG,
  companyWhere,
  stripCompanyFromBody,
  withCompanyId,
  assertRecordInCompany,
  assertParentsInCompany,
  assertAccountInCompany,
  assertBankInCompany,
  assertVendorInCompany,
  assertBudgetInCompany,
  assertInvoiceInCompany,
  assertVendorInvoiceInCompany,
  assertLeaseInCompany,
  assertTenantInCompany,
  assertPaymentInCompany,
  assertChequeInCompany,
  assertJournalVoucherInCompany,
  assertPurchaseInvoiceInCompany,
  assertDirectPurchaseInvoiceInCompany,
  assertEmployeeInCompany,
  assertDepartmentInCompany,
  assertPurchaseOrderInCompany,
  assertSecurityDepositInCompany,
  validatePostingLineRefs,
};
