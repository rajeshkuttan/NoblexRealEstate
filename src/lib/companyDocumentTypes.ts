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
};

export const NUMBER_SERIES_RESET_TYPES = ["never", "daily", "monthly", "yearly"] as const;
export type NumberSeriesResetType = (typeof NUMBER_SERIES_RESET_TYPES)[number];

export function labelForDocumentType(type: string): string {
  return (
    COMPANY_DOCUMENT_TYPE_LABELS[type as CompanyDocumentType] ||
    type.replace(/_/g, " ")
  );
}
