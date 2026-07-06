import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { companyFinanceAPI } from "@/services/api";
import { labelForDocumentType } from "@/lib/companyDocumentTypes";
import { Button } from "@/components/ui/button";

const INVESTMENT_DOC_TYPES = [
  "investment_asset",
  "investment_transaction",
  "investment_valuation",
  "investment_distribution",
] as const;

export function InvestmentNumberingPanel() {
  const { data: previews = [], isLoading } = useQuery({
    queryKey: ["investment-number-preview"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        INVESTMENT_DOC_TYPES.map((documentType) =>
          companyFinanceAPI.previewNumber(documentType).then((res) => ({
            documentType,
            preview: res.data?.data?.preview || res.data?.preview || "—",
          }))
        )
      );
      return results
        .filter((r): r is PromiseFulfilledResult<{ documentType: string; preview: string }> => r.status === "fulfilled")
        .map((r) => r.value);
    },
  });

  return (
    <div className="rounded-lg border border-noblex-border bg-noblex-surface p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-noblex-gold-light">Document numbering</h3>
          <p className="text-xs text-noblex-slate mt-1">
            Next numbers for assets, transactions, valuations, and distributions.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings/company-finance-config">Manage series</Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-noblex-slate">Loading previews…</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {previews.map((row) => (
            <li key={row.documentType} className="flex justify-between rounded-md border border-noblex-border/60 px-3 py-2">
              <span className="text-noblex-slate">{labelForDocumentType(row.documentType)}</span>
              <span className="font-mono text-noblex-platinum">{row.preview}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
