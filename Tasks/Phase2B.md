Phase 2B — Company-Wise Finance Posting Engine Separation
Current Status

Phase 1, 1.5, and 2A are complete.

Already implemented:

company_settings used as company master
company_users implemented
active company context implemented
company switcher implemented
company admin UI and audit implemented
properties/units/tenants/leases scoped
company_id added to 21 finance tables
finance master data scoped by company
COA/bank/vendor/number uniqueness made company-wise
cross-company validation added
AccountsTrans.create sets companyId on new lines
posting engines not yet fully company-separated
Objective

Make all finance posting engines company-safe.

This phase must ensure every accounting entry, ledger transaction, posting reference, reversal, update, and status transition writes and reads only within the active company.

Main Goal

Every posting must follow:

active company → source document → validated company-owned masters → company-owned accounting lines

No posting should be possible using mixed-company data.

Critical Rule

Do not rewrite the finance module.

Do not redesign accounting.

Do not change the debit/credit logic unless it is required to pass company safety.

This phase is about company boundary enforcement inside posting engines, not accounting redesign.

Phase 2B Scope

Include company-safe posting for:

1. Invoice / receivable posting
2. Receipt / payment posting
3. PDC deposit posting
4. Security deposit posting
5. Journal voucher posting
6. Vendor invoice posting
7. Purchase invoice posting
8. Purchase order commitment/accounting if currently posting
9. Bank transaction posting
10. Reversal/cancellation flows
11. AccountsTrans / ledger transaction creation

Out of scope:

VAT return aggregation rewrite
financial report calculation rewrite
bank reconciliation algorithm rewrite
document numbering redesign
cash flow report redesign
dashboard KPI rewrite

Those belong to Phase 2C and Phase 2D.

Task 0 — Inspect Before Coding

Cursor must inspect before editing:

backend/src/services
backend/src/controllers
backend/src/models
backend/src/routes
backend/src/utils
backend/src/helpers
backend/src/middleware/companyScope.js
backend/src/services/companyAuditService.js

Search for:

AccountsTrans.create
accounts_trans
FinancialTransaction.create
JournalVoucher
JournalVoucherLine
createJournal
postInvoice
postReceipt
postPayment
postCheque
depositCheque
postSecurityDeposit
vendorInvoice
purchaseInvoice
bankTransaction
reverse
cancel
void
approve
posted
posting
debit
credit
accountId
bankAccountId
vendorId
invoiceId
paymentId
chequeId
securityDepositId

Prepare internal note:

1. All posting entry points found
2. All places AccountsTrans is created
3. All posting services/controllers
4. Which posting flows already receive req.companyId
5. Which posting flows currently infer company from source document
6. Which flows still use global/default company behavior

Do not start changes until this mapping is clear.

Task 1 — Create Central Posting Context Helper

Create helper/service:

financePostingContext.service.js

Purpose:

Build a safe posting context before any finance posting.

Function examples:

buildPostingContext({
  req,
  sourceType,
  sourceId,
  sourceModel,
  requiredCompanyId
})

assertPostingCompany({
  reqCompanyId,
  sourceCompanyId,
  action
})

resolvePostingCompanyId(req, sourceRecord)

Rules:

If req.companyId exists, it is the active company.
Source document company_id must match req.companyId.
Posting lines must use req.companyId.
Never accept company_id from request body.
Never fall back to company_settings id = 1.

Error message:

{
  "message": "Posting blocked because the source document does not belong to the active company."
}

Audit event:

CROSS_COMPANY_FINANCE_POSTING_BLOCKED
Task 2 — Centralize AccountsTrans Creation

Find all direct calls to:

AccountsTrans.create(...)
AccountsTrans.bulkCreate(...)
FinancialTransaction.create(...)
LedgerTransaction.create(...)

Create or enforce a centralized method:

createCompanyAccountingEntry({
  companyId,
  sourceType,
  sourceId,
  lines,
  postedBy,
  postingDate,
  narration,
  metadata
})

Every line must include:

company_id = companyId

Rules:

Reject if companyId missing.
Reject if any line has different company_id.
Reject if account does not belong to companyId.
Reject if bank account/vendor/invoice/payment reference does not belong to companyId.

Do not allow raw posting calls to bypass this method unless impossible.

If some existing modules must keep direct AccountsTrans.create, wrap them with validation.

Task 3 — Accounting Line Validation

For each posting line, validate:

account_id belongs to company_id
bank_account_id belongs to company_id if present
vendor_id belongs to company_id if present
tenant_id belongs to company_id if present
lease_id belongs to company_id if present
invoice_id belongs to company_id if present
payment_id belongs to company_id if present
cheque_id belongs to company_id if present

Use existing helpers from Phase 2A:

assertAccountInCompany
assertBankInCompany
assertVendorInCompany
assertInvoiceInCompany

Add missing helpers only if required:

assertPaymentInCompany
assertChequeInCompany
assertSecurityDepositInCompany
assertJournalVoucherInCompany
assertPurchaseInvoiceInCompany
assertBankTransactionInCompany
Task 4 — Invoice / Receivable Posting

Make invoice posting company-safe.

Rules:

Invoice.company_id must equal req.companyId.
Tenant/lease/property/unit must belong to req.companyId.
Revenue account must belong to req.companyId.
Receivable account must belong to req.companyId.
VAT account must belong to req.companyId if VAT line exists.
AccountsTrans rows must carry invoice.company_id.

Do not change invoice calculation.

Do not change VAT amount logic.

Only enforce company ownership.

Audit:

INVOICE_POSTED
CROSS_COMPANY_FINANCE_POSTING_BLOCKED
Task 5 — Receipt / Tenant Payment Posting

Make receipt/payment posting company-safe.

Rules:

Payment.company_id must equal req.companyId.
Invoice being paid must belong to req.companyId.
Tenant/lease must belong to req.companyId.
Bank/cash account must belong to req.companyId.
Receivable account must belong to req.companyId.
Discount/write-off account must belong to req.companyId if used.
AccountsTrans rows must carry payment.company_id.

Allocation rule:

Payment allocation cannot allocate Company A payment to Company B invoice.

Do not rewrite allocation algorithm.

Only add company guard.

Task 6 — PDC Deposit Posting

Make PDC deposit posting company-safe.

Rules:

Cheque.company_id must equal req.companyId.
Bank account selected for deposit must belong to req.companyId.
PDC control account must belong to req.companyId.
AccountsTrans rows must carry cheque.company_id.

Preserve existing posting formula:

Dr Bank
Cr PDC

Do not change current PDC business logic.

Block:

Company A cheque deposited into Company B bank
Company B user posting Company A cheque
Cheque company_id different from active company
Task 7 — Security Deposit Posting

Make security deposit posting company-safe.

Rules:

SecurityDeposit.company_id must equal req.companyId.
Lease and tenant must belong to req.companyId.
Bank/cash account must belong to req.companyId.
Security deposit liability account must belong to req.companyId.
AccountsTrans rows must carry securityDeposit.company_id.

Preserve existing logic:

Dr Bank/Cash
Cr Security Deposit Liability

Only enforce company ownership.

Task 8 — Journal Voucher Posting

Make JV posting company-safe.

Rules:

JournalVoucher.company_id must equal req.companyId.
All debit/credit accounts must belong to req.companyId.
AccountsTrans rows must carry JV.company_id.
Cannot post/update/delete JV from another company.

If JV lines table has company_id:

lines.company_id = header.company_id

Do not allow body company_id.

Task 9 — Vendor Invoice Posting

Make vendor invoice/AP posting company-safe.

Rules:

VendorInvoice.company_id must equal req.companyId.
Vendor must belong to req.companyId.
Expense/payable/VAT accounts must belong to req.companyId.
AccountsTrans rows must carry vendorInvoice.company_id.

Preserve debit/credit logic.

Task 10 — Purchase Invoice Posting

Make purchase invoice posting company-safe.

Rules:

PurchaseInvoice.company_id must equal req.companyId.
Vendor must belong to req.companyId.
Related PO/GRN must belong to req.companyId if linked.
Inventory/expense/payable/VAT accounts must belong to req.companyId.
AccountsTrans rows must carry purchaseInvoice.company_id.

Do not redesign procurement accounting.

Task 11 — Purchase Order / Procurement Posting

If purchase orders only create operational records, leave them.

If purchase orders create commitments/accounting entries:

PO.company_id must equal req.companyId.
Vendor must belong to req.companyId.
Budget/COA must belong to req.companyId.
Commitment entries must carry company_id.

Do not introduce new commitment accounting if not already present.

Task 12 — Bank Transaction Posting

Make bank transaction posting company-safe.

Rules:

BankTransaction.company_id must equal req.companyId.
BankAccount must belong to req.companyId.
Offset account must belong to req.companyId.
AccountsTrans rows must carry bankTransaction.company_id.

Do not change reconciliation math.

Task 13 — Reversal / Cancellation / Void Flows

Find all flows:

cancel invoice
void receipt
reverse payment
cancel cheque deposit
reverse JV
cancel vendor invoice
cancel purchase invoice
delete posted transaction

Rules:

Original document company_id must equal req.companyId.
Reversal accounting lines must carry same company_id.
Reversal cannot cross company boundary.
Reversal must use same company-owned accounts as original posting.

Audit:

FINANCE_POSTING_REVERSED
CROSS_COMPANY_FINANCE_POSTING_BLOCKED
Task 14 — Remove Hidden Global Company Assumptions

Search and fix:

company_id: 1
companyId: 1
findByPk(1)
default company
first company
company_settings id 1

Inside finance posting only.

Rules:

Replace with req.companyId or sourceDocument.company_id.
If req.companyId unavailable, use sourceDocument.company_id.
Never use hardcoded 1.

Add TODO only if not safe to change:

// TODO Phase 2B follow-up: remove legacy default company fallback after all callers pass company context
Task 15 — Controller Integration

Ensure posting endpoints use:

authenticate
resolveCompanyContext
existing permission middleware

Correct order:

authenticate → resolveCompanyContext → permission → controller

or match existing pattern, but company context must exist before posting.

Task 16 — Audit Events

Add events:

FINANCE_POSTING_CREATED
FINANCE_POSTING_REVERSED
CROSS_COMPANY_FINANCE_POSTING_BLOCKED
INVOICE_POSTED
PAYMENT_POSTED
PDC_DEPOSIT_POSTED
SECURITY_DEPOSIT_POSTED
JV_POSTED
VENDOR_INVOICE_POSTED
PURCHASE_INVOICE_POSTED
BANK_TRANSACTION_POSTED

Audit metadata:

company_id
source_type
source_id
posting_reference
amount
currency
line_count
posted_by
route

Use existing audit service.

Task 17 — Frontend Safety

Do not redesign UI.

Ensure submit payloads do not send:

company_id
companyId

for posting actions.

If existing payload contains it:

remove it

Ensure posting forms refetch company-specific:

COA accounts
bank accounts
vendors
invoices
cheques
leases
tenants

on company switch.

Task 18 — Error UX

When backend blocks cross-company posting, frontend should show clear message:

This transaction cannot be posted because one or more selected records belong to another company.

Do not show generic “server error.”

Task 19 — Tests

Add backend tests for:

Invoice posting creates AccountsTrans with active company_id
Invoice posting rejects revenue account from another company
Payment posting rejects invoice from another company
Payment allocation cannot cross companies
PDC deposit rejects bank from another company
PDC deposit creates AccountsTrans with cheque company_id
Security deposit posting rejects lease from another company
JV posting rejects account from another company
JV posting creates all lines with company_id
Vendor invoice posting rejects vendor from another company
Purchase invoice posting rejects PO/vendor from another company
Bank transaction posting rejects bank account from another company
Reversal creates reversing lines with same company_id
Hardcoded company_id = 1 not used in posting services

Minimum expected:

15+ backend tests
Task 20 — Manual QA Checklist

Test:

1. Create Company A and Company B.
2. Create COA accounts separately for both.
3. Create bank accounts separately for both.
4. Create tenant/lease/invoice in Company A.
5. Post invoice in Company A.
6. Verify accounts_trans.company_id = Company A.
7. Switch to Company B.
8. Try to post Company A invoice using URL/direct API.
9. Must be blocked.
10. Create Company B invoice and post.
11. Verify accounts_trans.company_id = Company B.
12. Try Company A bank account in Company B receipt.
13. Must be blocked.
14. Try Company A cheque deposit into Company B bank.
15. Must be blocked.
16. Post JV in Company B.
17. Verify all lines are Company B.
18. Reverse/cancel one posted transaction.
19. Verify reversal lines have same company_id.
20. Open finance pages and confirm existing workflows still work.
Task 21 — Verification

Run:

cd backend
npm test

If available:

npm run build
npm run typecheck
npm run lint

Frontend:

cd frontend
npm run build
npm run lint

Fix only Phase 2B-related issues.

Deliverable Summary

At completion, report:

Posting engines updated:
- Invoice
- Payment/Receipt
- PDC Deposit
- Security Deposit
- Journal Voucher
- Vendor Invoice
- Purchase Invoice
- Bank Transaction
- Reversals

Safeguards:
- company-owned source documents
- company-owned accounts
- company-owned banks
- company-owned vendors
- company-owned invoices/payments/cheques

Accounting lines:
- company_id enforced
- no hardcoded company_id = 1
- cross-company posting blocked and audited

Verification:
- backend tests count
- frontend build status
- manual QA notes

---

## Live database scripts

**No new migration is required** if Phase 2A (`company_id` on finance tables) is already applied.

**Deploy order:** deploy the Phase 2B backend before relying on company-scoped posting guards in production. The frontend posting error messages are backward-compatible with older backends but will only show the cross-company posting text when the backend returns the Phase 2B blocked message.

**Rollback:** redeploy the prior backend build; no database rollback script is needed for Phase 2B alone.