import { Link } from "react-router-dom";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NobleXDataTable, NobleXEmptyValue } from "@/components/noblex";
import { InvestmentStatusBadge } from "./InvestmentStatusBadges";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

interface AssetRow {
  id: number;
  investmentCode: string;
  investmentName: string;
  assetType: string;
  currencyCode: string;
  status: string;
  holding?: {
    totalCost?: number;
    currentMarketValue?: number;
    unrealizedGainLoss?: number;
  };
}

export function InvestmentListTable({ assets }: { assets: AssetRow[] }) {
  return (
    <NobleXDataTable>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Market value</TableHead>
          <TableHead>Unrealized G/L</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <Link to={`/investments/assets/${a.id}`} className="text-noblex-gold hover:underline font-mono text-sm">
                {a.investmentCode}
              </Link>
            </TableCell>
            <TableCell>{a.investmentName}</TableCell>
            <TableCell>{a.assetType}</TableCell>
            <TableCell className="font-mono">{formatCurrencySafe(a.holding?.totalCost)}</TableCell>
            <TableCell className="font-mono">{formatCurrencySafe(a.holding?.currentMarketValue)}</TableCell>
            <TableCell className="font-mono">
              {a.holding?.unrealizedGainLoss != null ? formatCurrencySafe(a.holding.unrealizedGainLoss) : <NobleXEmptyValue />}
            </TableCell>
            <TableCell><InvestmentStatusBadge status={a.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </NobleXDataTable>
  );
}
