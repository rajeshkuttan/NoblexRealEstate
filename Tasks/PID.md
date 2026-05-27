Finance — Direct Purchase Invoice with Vendor Payable, Input Tax & Payment Knock-Off
Objective

Implement Direct Purchase Invoice in Finance so the accountant can book vendor expenses directly without Purchase Order / GRN dependency.

The Direct Purchase Invoice should:

Dr Expense Account
Dr Input VAT / Recoverable Tax Account
Cr Vendor Payable

Later, through Payment Voucher:

Dr Vendor Payable
Cr Bank / Cash

The invoice should be knocked off against payment, and outstanding payable should reduce accordingly.

Business Requirement

Add a new finance document:

Direct Purchase Invoice

Purpose:

Book direct expenses against vendor payable.
Capture input VAT / tax provision.
Track outstanding payable.
Allow payment voucher settlement.

Examples:

Office rent invoice
Utility bill
Consultancy expense
Legal fee
Maintenance expense
Software subscription
Government fee
Insurance
Direct admin expense

This should not require:

Purchase Order
Goods Receipt
Inventory item
Procurement flow
Critical Rules

Do not break existing:

Purchase Invoice
Vendor Invoice
Payment Voucher
Journal Voucher
VAT Return
Company-wise finance controls
Period locking
VAT period locking
Company numbering
Multi-company isolation

Reuse existing Phase 2 architecture:

company_id
resolveCompanyContext
companyDocumentNumber.service.js
periodValidationService.js
vatPeriodService.js
companyAccountingEntry.service.js
companyScope.js finance asserts
1. Backend — Data Model

Create model/table if not existing:

direct_purchase_invoices

Fields:

id
company_id
dpi_number
vendor_id
invoice_date
due_date
supplier_invoice_no
supplier_invoice_date
currency
exchange_rate
subtotal_amount
tax_amount
total_amount
paid_amount
outstanding_amount
status
description
created_by
posted_by
posted_at
cancelled_by
cancelled_at
created_at
updated_at

Suggested statuses:

DRAFT
POSTED
PARTIALLY_PAID
PAID
CANCELLED

Create line table:

direct_purchase_invoice_lines

Fields:

id
direct_purchase_invoice_id
company_id
expense_account_id
description
amount
tax_code
tax_rate
tax_amount
total_amount
cost_center_id nullable
property_id nullable
unit_id nullable
lease_id nullable
created_at
updated_at
2. Accounting Posting Logic

On posting Direct Purchase Invoice:

For each line:

Dr Expense Account

If tax applies:

Dr Input VAT / Recoverable VAT Account

Header payable:

Cr Vendor Payable Account

Example:

Expense amount: 1,000
VAT 5%: 50
Total: 1,050

Posting:

Dr Repairs & Maintenance Expense    1,000
Dr Input VAT                         50
Cr Vendor Payable                 1,050

Use existing centralized accounting entry service:

companyAccountingEntry.service.js

Every accounting line must carry:

company_id = req.companyId
source_type = DIRECT_PURCHASE_INVOICE
source_id = direct_purchase_invoice.id
3. Tax / VAT Handling

Direct Purchase Invoice must support:

No VAT
Standard-rated VAT
Zero-rated
Exempt
Out of scope
Reverse charge if existing VAT structure supports it

Minimum required:

tax_code
tax_rate
tax_amount
input_tax_account_id

Rules:

VAT amount should flow to input VAT / recoverable VAT account.
VAT period validation must apply.
Invoice cannot be posted/edited if VAT period is LOCKED or SUBMITTED.

Do not rewrite VAT return logic deeply, but ensure Direct Purchase Invoice VAT source is available for VAT return inclusion.

Add TODO if VAT return inclusion requires Phase follow-up:

// TODO: Include Direct Purchase Invoice input VAT in VAT return purchase dataset if not already covered by accounts_trans source.
4. Vendor Payable Knock-Off

Payment Voucher must allow settlement against:

Direct Purchase Invoice

Modify vendor payment allocation source list to include:

POSTED / PARTIALLY_PAID direct_purchase_invoices
where outstanding_amount > 0
company_id = req.companyId
vendor_id = selected vendor

On payment posting:

Dr Vendor Payable
Cr Bank / Cash

Allocation must update:

direct_purchase_invoices.paid_amount
direct_purchase_invoices.outstanding_amount
direct_purchase_invoices.status

Status logic:

if paid_amount = 0 → POSTED
if paid_amount > 0 and outstanding_amount > 0 → PARTIALLY_PAID
if outstanding_amount = 0 → PAID

Do not allow overpayment unless existing payment voucher supports advance payment.

If advance payment exists, excess should follow existing advance logic.

5. Multi-Company Controls

Mandatory:

vendor.company_id = req.companyId
expense_account.company_id = req.companyId
tax_account.company_id = req.companyId
bank_account.company_id = req.companyId
direct_purchase_invoice.company_id = req.companyId
payment.company_id = req.companyId

Block cross-company actions.

Use existing audit:

CROSS_COMPANY_FINANCE_POSTING_BLOCKED
6. Numbering

Use existing company-wise numbering service:

companyDocumentNumber.service.js

Add document type:

direct_purchase_invoice

Example numbers:

DPI-000001
DPI-000002

Numbering must be company-wise.

7. Period Controls

Apply financial period validation on:

create
update
post
cancel
payment allocation

Rules:

OPEN → allowed
SOFT_CLOSED → admin only
HARD_CLOSED → blocked

Use:

periodValidationService.js
8. APIs

Create routes:

GET    /api/direct-purchase-invoices
GET    /api/direct-purchase-invoices/:id
POST   /api/direct-purchase-invoices
PUT    /api/direct-purchase-invoices/:id
POST   /api/direct-purchase-invoices/:id/post
POST   /api/direct-purchase-invoices/:id/cancel
DELETE /api/direct-purchase-invoices/:id
GET    /api/direct-purchase-invoices/open-payables

Query filters:

vendor_id
status
from_date
to_date
due_from
due_to
outstanding_only

All routes must use:

authenticate
resolveCompanyContext
permission middleware
9. Frontend UI

Add page:

/finance/direct-purchase-invoices

Features:

List Direct Purchase Invoices
Create Direct Purchase Invoice
Edit draft
Post invoice
Cancel invoice
View accounting impact
View payment status

Form fields:

Vendor
Supplier Invoice No
Supplier Invoice Date
Invoice Date
Due Date
Currency
Description
Lines:
  Expense Account
  Description
  Amount
  Tax Code
  Tax %
  Tax Amount
  Total

Summary:

Subtotal
Tax Amount
Total
Paid Amount
Outstanding Amount
Status
10. Payment Voucher Integration

In Payment Voucher screen:

When payment type is vendor payment:

Show open payable documents:

Vendor Invoice
Purchase Invoice
Direct Purchase Invoice

Add column:

Document Type
Document Number
Invoice Date
Due Date
Outstanding
Allocate Amount

Allocation should support mixed payable documents if current design allows.

If not, support Direct Purchase Invoice as an additional payable source.

11. Reports

Update payable reports to include Direct Purchase Invoice:

Vendor outstanding
Payable aging
Vendor SOA
Expense register
VAT input tax dataset

Do not rewrite report logic.

Only include DPI in company-scoped payable datasets.

12. Permissions

Add permissions:

direct_purchase_invoice.view
direct_purchase_invoice.create
direct_purchase_invoice.update
direct_purchase_invoice.post
direct_purchase_invoice.cancel
direct_purchase_invoice.delete

Assign to finance roles consistent with existing permissions.

13. Audit Events

Add audit events:

DIRECT_PURCHASE_INVOICE_CREATED
DIRECT_PURCHASE_INVOICE_UPDATED
DIRECT_PURCHASE_INVOICE_POSTED
DIRECT_PURCHASE_INVOICE_CANCELLED
DIRECT_PURCHASE_INVOICE_PAID
DIRECT_PURCHASE_INVOICE_PAYMENT_ALLOCATED

Audit metadata:

company_id
vendor_id
dpi_id
dpi_number
amount
tax_amount
status
14. Tests

Add backend tests:

Create DPI under active company
Body company_id ignored
Reject vendor from another company
Reject expense account from another company
Post DPI creates Dr Expense / Dr VAT / Cr Payable
No VAT invoice posts only Dr Expense / Cr Payable
Posted DPI appears in open vendor payable list
Payment voucher allocates against DPI
Partial payment updates status to PARTIALLY_PAID
Full payment updates status to PAID
Cancel posted DPI creates reversal or blocks if paid
Cannot edit posted DPI except allowed fields
VAT locked period blocks posting/editing
Hard closed financial period blocks posting
Company B cannot access Company A DPI

Minimum:

15 backend tests
15. Manual QA

Test:

1. Create Company A and Company B.
2. Create vendor in Company A.
3. Create expense account and input VAT account in Company A.
4. Create Direct Purchase Invoice with VAT.
5. Post it.
6. Verify accounting:
   Dr Expense
   Dr Input VAT
   Cr Vendor Payable
7. Check vendor outstanding.
8. Create payment voucher against this DPI.
9. Allocate partial amount.
10. Confirm DPI becomes PARTIALLY_PAID.
11. Pay remaining amount.
12. Confirm DPI becomes PAID.
13. Switch to Company B.
14. Confirm Company A DPI is invisible.
15. Try API cross-company access.
16. Confirm blocked.