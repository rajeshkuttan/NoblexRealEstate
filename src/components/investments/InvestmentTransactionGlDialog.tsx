import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { investmentsAPI } from "@/services/api";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

interface InvestmentTransactionGlDialogProps {
  transactionId: number | null;
  transactionNo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvestmentTransactionGlDialog({
  transactionId,
  transactionNo,
  open,
  onOpenChange,
}: InvestmentTransactionGlDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["investment-txn-ledger", transactionId],
    queryFn: async () => {
      if (!transactionId) return null;
      const res = await investmentsAPI.getTransactionLedger(transactionId);
      return res.data?.data as {
        lines: Array<{
          id: number;
          crDr: string;
          debitAmount: number;
          creditAmount: number;
          narration?: string;
          ledger?: { accountCode?: string; accountName?: string };
        }>;
      };
    },
    enabled: open && !!transactionId,
  });

  const lines = data?.lines ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>General ledger — {transactionNo || `#${transactionId}`}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading ledger lines…</p>
        ) : lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No GL lines found for this transaction.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Dr / Cr</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Narration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {line.ledger?.accountCode} — {line.ledger?.accountName}
                  </TableCell>
                  <TableCell>{line.crDr}</TableCell>
                  <TableCell className="text-right">{formatCurrencySafe(line.debitAmount)}</TableCell>
                  <TableCell className="text-right">{formatCurrencySafe(line.creditAmount)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{line.narration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
