import { z } from "zod";

export const investmentAssetSchema = z.object({
  investmentName: z.string().min(1, "Name is required"),
  assetType: z.string().min(1, "Asset type is required"),
  instrumentType: z.string().optional(),
  marketName: z.string().optional(),
  tickerSymbol: z.string().optional(),
  isinCode: z.string().optional(),
  brokerName: z.string().optional(),
  custodianName: z.string().optional(),
  currencyCode: z.string().default("AED"),
  accountingClassification: z.enum(["COST", "AMORTISED_COST", "FVTPL", "FVOCI"]).default("COST"),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  status: z.enum(["DRAFT", "ACTIVE", "SOLD", "MATURED", "CLOSED"]).optional(),
  acquisitionDate: z.string().optional(),
  maturityDate: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export const investmentTransactionSchema = z.object({
  investmentAssetId: z.string().min(1, "Asset is required"),
  transactionType: z.string().min(1),
  transactionDate: z.string().min(1, "Date is required"),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  grossAmount: z.coerce.number().optional(),
  netAmount: z.coerce.number().optional(),
  baseAmount: z.coerce.number().min(0.01, "Amount must be greater than zero").optional(),
  chargesAmount: z.coerce.number().optional(),
  taxAmount: z.coerce.number().optional(),
  currencyCode: z.string().default("AED"),
  exchangeRate: z.coerce.number().min(0.000001).default(1),
  bankAccountId: z.string().optional(),
}).superRefine((data, ctx) => {
  const bankRequired = ["BUY", "SELL", "DIVIDEND", "INTEREST", "CHARGE", "MATURITY", "FX_GAIN_LOSS"].includes(data.transactionType);
  if (bankRequired && !data.bankAccountId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bank account is required", path: ["bankAccountId"] });
  }
  if (data.currencyCode !== "AED" && (!data.exchangeRate || data.exchangeRate <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Exchange rate required for non-AED", path: ["exchangeRate"] });
  }
  if (["BUY", "SELL", "MATURITY", "WRITE_OFF"].includes(data.transactionType) && data.quantity <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quantity must be greater than zero", path: ["quantity"] });
  }
});

export const valuationSchema = z.object({
  investmentAssetId: z.string().min(1, "Asset is required"),
  valuationDate: z.string().min(1, "Valuation date is required"),
  price: z.coerce.number().positive("Price must be greater than zero"),
  quantity: z.coerce.number().optional(),
  exchangeRate: z.coerce.number().min(0.000001).default(1),
});

export const allocationSchema = z.object({
  investorName: z.string().min(1, "Investor name is required"),
  investorType: z.enum(["OWNER", "PARTNER", "COMPANY"]).default("PARTNER"),
  ownershipPercentage: z.coerce.number().min(0.01, "Ownership % required").max(100),
  profitSharePercentage: z.coerce.number().optional(),
  dividendSharePercentage: z.coerce.number().optional(),
  contributionAmount: z.coerce.number().optional(),
});

export const categorySchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  assetClass: z.string().min(1, "Asset class is required"),
});

export const accountConfigSchema = z.object({
  investmentAssetAccount: z.coerce.number().optional().nullable(),
  dividendIncomeAccount: z.coerce.number().optional().nullable(),
  interestIncomeAccount: z.coerce.number().optional().nullable(),
  realizedGainAccount: z.coerce.number().optional().nullable(),
  realizedLossAccount: z.coerce.number().optional().nullable(),
  unrealizedGainAccount: z.coerce.number().optional().nullable(),
  unrealizedLossAccount: z.coerce.number().optional().nullable(),
  brokerageChargesAccount: z.coerce.number().optional().nullable(),
  bankChargesAccount: z.coerce.number().optional().nullable(),
  fxGainAccount: z.coerce.number().optional().nullable(),
  fxLossAccount: z.coerce.number().optional().nullable(),
  partnerPayableAccount: z.coerce.number().optional().nullable(),
});

export const distributionPrepareSchema = z.object({
  investmentTransactionId: z.string().min(1, "Select a posted transaction"),
});

export type InvestmentAssetFormValues = z.infer<typeof investmentAssetSchema>;
export type InvestmentTransactionFormValues = z.infer<typeof investmentTransactionSchema>;
export type ValuationFormValues = z.infer<typeof valuationSchema>;
export type AllocationFormValues = z.infer<typeof allocationSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
export type AccountConfigFormValues = z.infer<typeof accountConfigSchema>;
export type DistributionPrepareFormValues = z.infer<typeof distributionPrepareSchema>;
