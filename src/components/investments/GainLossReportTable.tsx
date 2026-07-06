import { Link } from "react-router-dom";
import { NobleXDataTable } from "@/components/noblex";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

export interface GainLossRow {
  asset?: { id?: number; investmentCode?: string; investmentName?: string; assetType?: string };
  totalCost: number;
  currentMarketValue: number;
  unrealizedGainLoss: number;
  realizedGainLoss: number;
}

interface GainLossReportTableProps {
  rows: GainLossRow[];
  emptyMessage?: string;
}

export function GainLossReportTable({ rows, emptyMessage = "No holdings to report." }: GainLossReportTableProps) {
  return (
    <NobleXDataTable>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Market value</TableHead>
          <TableHead>Unrealized G/L</TableHead>
          <TableHead>Realized G/L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-noblex-slate py-8">{emptyMessage}</TableCell>
          </TableRow>
        ) : (
          rows.map((row, i) => (
            <TableRow key={row.asset?.id ?? i}>
              <TableCell>
                {row.asset?.id ? (
                  <Link to={`/investments/assets/${row.asset.id}`} className="text-noblex-gold hover:underline">
                    {row.asset.investmentName}
                  </Link>
                ) : (
                  row.asset?.investmentName || "—"
                )}
              </TableCell>
              <TableCell>{row.asset?.assetType || "—"}</TableCell>
              <TableCell className="font-mono">{formatCurrencySafe(row.totalCost)}</TableCell>
              <TableCell className="font-mono">{formatCurrencySafe(row.currentMarketValue)}</TableCell>
              <TableCell className="font-mono">{formatCurrencySafe(row.unrealizedGainLoss)}</TableCell>
              <TableCell className="font-mono">{formatCurrencySafe(row.realizedGainLoss)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </NobleXDataTable>
  );
}
