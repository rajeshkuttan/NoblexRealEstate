import { NobleXDataTable } from "@/components/noblex";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalStatusBadge, PostingStatusBadge } from "./InvestmentStatusBadges";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

export interface LedgerRow {
  id: number;
  transactionNo: string;
  transactionDate: string;
  transactionType: string;
  baseAmount: number;
  quantity?: number;
  unitPrice?: number;
  approvalStatus?: string;
  postingStatus?: string;
  asset?: { id?: number; investmentCode?: string; investmentName?: string };
}

interface InvestmentLedgerTableProps {
  rows: LedgerRow[];
  emptyMessage?: string;
}

export function InvestmentLedgerTable({ rows, emptyMessage = "No transactions in this period." }: InvestmentLedgerTableProps) {
  return (
    <NobleXDataTable>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Asset</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-noblex-slate py-8">{emptyMessage}</TableCell>
          </TableRow>
        ) : (
          rows.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.transactionDate}</TableCell>
              <TableCell className="font-mono text-xs">{t.transactionNo}</TableCell>
              <TableCell>
                {t.asset?.investmentName || "—"}
                {t.asset?.investmentCode && (
                  <span className="block text-xs text-noblex-slate">{t.asset.investmentCode}</span>
                )}
              </TableCell>
              <TableCell>{t.transactionType}</TableCell>
              <TableCell className="font-mono">{t.quantity ?? "—"}</TableCell>
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
