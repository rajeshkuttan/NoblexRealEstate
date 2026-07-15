/** Phase 2D company document types — aligned with backend migration seed list. */
export const COMPANY_DOCUMENT_TYPES = [
  "invoice",
  "receipt",
  "payment",
  "journal_voucher",
  "purchase_order",
  "purchase_invoice",
  "vendor_invoice",
  "cheque",
  "lease",
  "property",
  "tenant",
  "budget",
  "legal",
  "helpdesk",
  "goods_receipt",
  "direct_purchase_invoice",
  "investment_asset",
  "investment_transaction",
  "investment_valuation",
  "investment_distribution",
  "prepaid_expense",
  "prepaid_posting_batch",
  "lease_revenue_schedule",
  "lease_revenue_batch",
  "PAYSLIP",
  "PAYROLL_REGISTER",
  "FINAL_SETTLEMENT",
  "EMPLOYEE_LEDGER",
  "WPS_REGISTER",
  "SALARY_CERTIFICATE",
  "EOS_STATEMENT",
] as const;

export type CompanyDocumentType = (typeof COMPANY_DOCUMENT_TYPES)[number];

export const COMPANY_DOCUMENT_TYPE_LABELS: Record<CompanyDocumentType, string> = {
  invoice: "Tenant invoice",
  receipt: "Receipt",
  payment: "Payment voucher",
  journal_voucher: "Journal voucher",
  purchase_order: "Purchase order",
  purchase_invoice: "Purchase invoice",
  vendor_invoice: "Vendor invoice",
  cheque: "Cheque",
  lease: "Lease",
  property: "Property",
  tenant: "Tenant",
  budget: "Budget",
  legal: "Legal case",
  helpdesk: "Helpdesk ticket",
  goods_receipt: "Goods receipt",
  direct_purchase_invoice: "Direct purchase invoice",
  investment_asset: "Investment asset",
  investment_transaction: "Investment transaction",
  investment_valuation: "Investment valuation",
  investment_distribution: "Investment distribution",
  prepaid_expense: "Prepaid expense",
  prepaid_posting_batch: "Prepaid posting batch",
  lease_revenue_schedule: "Lease revenue schedule",
  lease_revenue_batch: "Lease revenue posting batch",
  PAYSLIP: "Payslip",
  PAYROLL_REGISTER: "Payroll register",
  FINAL_SETTLEMENT: "Final settlement",
  EMPLOYEE_LEDGER: "Employee ledger",
  WPS_REGISTER: "WPS register",
  SALARY_CERTIFICATE: "Salary certificate",
  EOS_STATEMENT: "EOS statement",
};

export const NUMBER_SERIES_RESET_TYPES = ["never", "daily", "monthly", "yearly"] as const;
export type NumberSeriesResetType = (typeof NUMBER_SERIES_RESET_TYPES)[number];

export function labelForDocumentType(type: string): string {
  return (
    COMPANY_DOCUMENT_TYPE_LABELS[type as CompanyDocumentType] ||
    type.replace(/_/g, " ")
  );
}
