import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { treasuryReportsAPI } from "@/services/api";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { useCompany } from "@/contexts/CompanyContext";

export function InvestmentTreasuryCashCard() {
  const { activeCompanyId } = useCompany();
  const { data, isLoading } = useQuery({
    queryKey: ["treasury-investment-cash", activeCompanyId],
    queryFn: async () => {
      const res = await treasuryReportsAPI.getInvestmentCash();
      return res.data?.data;
    },
  });

  if (isLoading) return null;
  if (!data) return null;

  return (
    <Card className="border-noblex-border bg-noblex-surface">
      <CardHeader>
        <CardTitle className="text-noblex-gold-light">Investment cash impact</CardTitle>
        <CardDescription>Posted investment movements — drill down to transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-noblex-slate">Purchases</p>
            <Link to="/investments/transactions?transactionType=BUY&postingStatus=POSTED" className="font-mono hover:underline text-noblex-gold">
              {formatCurrencySafe(data.totalPurchases)}
            </Link>
          </div>
          <div>
            <p className="text-noblex-slate">Sales proceeds</p>
            <Link to="/investments/transactions?transactionType=SELL&postingStatus=POSTED" className="font-mono hover:underline text-noblex-gold">
              {formatCurrencySafe(data.totalSalesProceeds)}
            </Link>
          </div>
          <div>
            <p className="text-noblex-slate">Dividends</p>
            <p className="font-mono">{formatCurrencySafe(data.dividendsReceived)}</p>
          </div>
          <div>
            <p className="text-noblex-slate">Net cash flow</p>
            <p className="font-mono font-medium">{formatCurrencySafe(data.netCashFlow)}</p>
          </div>
        </div>
        {(data.pendingUnpostedCash?.length || 0) > 0 && (
          <p className="text-xs text-amber-400">{data.pendingUnpostedCash.length} approved transaction(s) not yet posted</p>
        )}
      </CardContent>
    </Card>
  );
}
