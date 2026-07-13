import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

export default function InvestmentInstrument360Page() {
  const { id } = useParams();
  const instrumentId = Number(id);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-instrument-360", instrumentId],
    enabled: !!instrumentId,
    queryFn: async () => {
      const res = await investmentsAPI.getInstrument360(instrumentId);
      return res.data?.data;
    },
  });

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  if (!data?.instrument) {
    return (
      <div className="p-4">
        <p>Instrument not found.</p>
        <Button asChild variant="outline" className="mt-2">
          <Link to="/investments/instruments">Back</Link>
        </Button>
      </div>
    );
  }

  const { instrument, behaviour, holdings = [] } = data;

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title={instrument.instrumentName}
        subtitle={`${instrument.instrumentCode} · ${instrument.currencyCode}`}
      />
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/investments/instruments">Back</Link>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
        {instrument.legacyAssetId && (
          <Button asChild variant="secondary" size="sm">
            <Link to={`/investments/assets/${instrument.legacyAssetId}`}>Legacy asset</Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Class</p>
          <p className="font-medium">{instrument.assetClass || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">ISIN</p>
          <p className="font-medium">{instrument.isin || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Ticker</p>
          <p className="font-medium">{instrument.ticker || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Maturity</p>
          <p className="font-medium">{instrument.maturityDate || "—"}</p>
        </div>
      </div>
      {behaviour && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(behaviour).map(([k, v]) =>
            v ? (
              <Badge key={k} variant="secondary">
                {k}: {String(v)}
              </Badge>
            ) : null
          )}
        </div>
      )}
      <div>
        <h3 className="font-semibold mb-2">Holdings (v2)</h3>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Portfolio</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>MV</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h: any) => (
              <TableRow key={h.id}>
                <TableCell>
                  <Link className="underline" to={`/investments/portfolios/${h.portfolioId}`}>
                    #{h.portfolioId}
                  </Link>
                </TableCell>
                <TableCell>{h.quantity}</TableCell>
                <TableCell>{formatCurrencySafe(h.totalCost)}</TableCell>
                <TableCell>{formatCurrencySafe(h.currentMarketValue)}</TableCell>
              </TableRow>
            ))}
            {holdings.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No holdings linked
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </NobleXDataTable>
      </div>
    </div>
  );
}
