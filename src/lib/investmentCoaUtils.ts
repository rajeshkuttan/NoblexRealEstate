export interface CoaLeaf {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
}

export function flattenCoaHierarchy(tree: unknown[]): CoaLeaf[] {
  const leaves: CoaLeaf[] = [];
  const walk = (nodes: unknown[]) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      const n = node as {
        id?: number;
        accountCode?: string;
        accountName?: string;
        accountType?: string;
        subAccounts?: unknown[];
      };
      const hasChildren = Array.isArray(n.subAccounts) && n.subAccounts.length > 0;
      if (!hasChildren && n.id) {
        leaves.push({
          id: n.id,
          accountCode: n.accountCode || "",
          accountName: n.accountName || "",
          accountType: n.accountType || "",
        });
      } else if (hasChildren) {
        walk(n.subAccounts!);
      }
    }
  };
  walk(tree);
  return leaves;
}

export const INVESTMENT_COA_FIELDS = [
  { key: "investmentAssetAccount", label: "Investment asset", types: ["asset"] },
  { key: "dividendIncomeAccount", label: "Dividend income", types: ["revenue"] },
  { key: "interestIncomeAccount", label: "Interest income", types: ["revenue"] },
  { key: "realizedGainAccount", label: "Realized gain", types: ["revenue"] },
  { key: "realizedLossAccount", label: "Realized loss", types: ["expense"] },
  { key: "unrealizedGainAccount", label: "Unrealized gain", types: ["revenue"] },
  { key: "unrealizedLossAccount", label: "Unrealized loss", types: ["expense"] },
  { key: "brokerageChargesAccount", label: "Brokerage charges", types: ["expense"] },
  { key: "bankChargesAccount", label: "Bank charges", types: ["expense"] },
  { key: "fxGainAccount", label: "FX gain", types: ["revenue"] },
  { key: "fxLossAccount", label: "FX loss", types: ["expense"] },
  { key: "partnerPayableAccount", label: "Partner payable", types: ["liability"] },
] as const;

export type InvestmentCoaFieldKey = (typeof INVESTMENT_COA_FIELDS)[number]["key"];

export const REQUIRED_POSTING_FIELDS: InvestmentCoaFieldKey[] = [
  "investmentAssetAccount",
  "dividendIncomeAccount",
  "interestIncomeAccount",
  "realizedGainAccount",
  "realizedLossAccount",
];
