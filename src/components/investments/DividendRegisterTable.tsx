import { Link } from "react-router-dom";
import { NobleXDataTable } from "@/components/noblex";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalStatusBadge, PostingStatusBadge } from "./InvestmentStatusBadges";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

export interface DividendRow {
  id: number;
  transactionDate: string;
  transactionType: string;
  baseAmount: number;
  transactionNo?: string;
  approvalStatus?: string;
  postingStatus?: string;
  asset?: { id?: number; investmentCode?: string; investmentName?: string };
}

interface DividendRegisterTableProps {
  rows: DividendRow[];
  emptyMessage?: string;
}

export function DividendRegisterTable({ rows, emptyMessage = "No dividends or interest recorded yet." }: DividendRegisterTableProps) {
  return (
    <NobleXDataTable>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Asset</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-noblex-slate py-8">{emptyMessage}</TableCell>
          </TableRow>
        ) : (
          rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.transactionDate}</TableCell>
              <TableCell className="font-mono text-xs">{t.transactionNo || "—"}</TableCell>
              <TableCell>
                {t.asset?.id ? (
                  <Link to={`/investments/assets/${t.asset.id}`} className="text-noblex-gold hover:underline">
                    {t.asset.investmentName}
                  </Link>
                ) : (
                  t.asset?.investmentName || "—"
                )}
              </TableCell>
              <TableCell>{t.transactionType}</TableCell>
              <TableCell className="font-mono">{formatCurrencySafe(t.baseAmount)}</TableCell>
              <TableCell className="space-x-1">
                {t.approvalStatus && <ApprovalStatusBadge status={t.approvalStatus} />}
                {t.postingStatus && <PostingStatusBadge status={t.postingStatus} />}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </NobleXDataTable>
  );
}
