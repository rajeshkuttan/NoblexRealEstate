import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

export default function InvestmentPortfolio360Page() {
  const { id } = useParams();
  const portfolioId = Number(id);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-portfolio-360", portfolioId],
    enabled: !!portfolioId,
    queryFn: async () => {
      const res = await investmentsAPI.getPortfolio360(portfolioId);
      return res.data?.data;
    },
  });

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  if (!data?.portfolio) {
    return (
      <div className="p-4">
        <p>Portfolio not found.</p>
        <Button asChild variant="outline" className="mt-2">
          <Link to="/investments/portfolios">Back</Link>
        </Button>
      </div>
    );
  }

  const { portfolio, summary, holdings = [], recentTransactions = [] } = data;

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title={portfolio.portfolioName}
        subtitle={`${portfolio.portfolioCode} · ${portfolio.status} · ${portfolio.costBasisMethod || "AVERAGE"} cost basis`}
      />
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/investments/portfolios">Back to list</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Holdings</p>
          <p className="text-xl font-semibold">{summary?.holdingCount ?? 0}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total cost</p>
          <p className="text-xl font-semibold">{formatCurrencySafe(summary?.totalCost)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Market value</p>
          <p className="text-xl font-semibold">{formatCurrencySafe(summary?.marketValue)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Unrealized</p>
          <p className="text-xl font-semibold">{formatCurrencySafe(summary?.unrealizedGainLoss)}</p>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Holdings</h3>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Instrument</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Avg cost</TableHead>
              <TableHead>Market value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h: any) => (
              <TableRow key={h.id}>
                <TableCell>
                  {h.instrument ? (
                    <Link className="underline" to={`/investments/instruments/${h.instrumentId}`}>
                      {h.instrument.instrumentName}
                    </Link>
                  ) : (
                    `#${h.instrumentId}`
                  )}
                </TableCell>
                <TableCell>{h.quantity}</TableCell>
                <TableCell>{formatCurrencySafe(h.averageCost)}</TableCell>
                <TableCell>{formatCurrencySafe(h.currentMarketValue)}</TableCell>
              </TableRow>
            ))}
            {holdings.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No holdings — run Phase 17 migration from Settings if needed.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </NobleXDataTable>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Recent transactions (legacy assets)</h3>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTransactions.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.transactionNo}</TableCell>
                <TableCell>{t.asset?.investmentName || "—"}</TableCell>
                <TableCell>{t.transactionType}</TableCell>
                <TableCell>{t.transactionDate}</TableCell>
                <TableCell>{formatCurrencySafe(t.baseAmount)}</TableCell>
              </TableRow>
            ))}
            {recentTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No recent transactions
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </NobleXDataTable>
      </div>
    </div>
  );
}
