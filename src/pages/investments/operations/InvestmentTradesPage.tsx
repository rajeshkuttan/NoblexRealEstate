import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { toast } from "sonner";

export default function InvestmentTradesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-trades", page, status],
    queryFn: async () => {
      const res = await investmentsAPI.listTrades({
        page,
        limit: 20,
        ...(status ? { status } : {}),
      });
      return res.data?.data || { trades: [], pagination: {} };
    },
  });

  const confirm = async (id: number) => {
    try {
      await investmentsAPI.confirmTrade(id);
      toast.success("Trade confirmed — settlement pending");
      qc.invalidateQueries({ queryKey: ["investment-trades"] });
      qc.invalidateQueries({ queryKey: ["investment-settlements"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Confirm failed");
    }
  };

  const trades = data?.trades || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title="Investment Trades"
        subtitle="Executions linked to orders — confirm to update lots and create settlement"
      />
      <div className="flex flex-wrap gap-2 items-end">
        <Button asChild>
          <Link to="/investments/trades/new">New trade wizard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/investments/orders">Orders</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/investments/settlements">Settlements</Link>
        </Button>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["DRAFT", "CONFIRMED", "SETTLED", "CANCELLED", "FAILED"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && trades.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No trades yet.</p>
      )}
      {trades.length > 0 && (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Net</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.tradeNumber}</TableCell>
                <TableCell>{t.side}</TableCell>
                <TableCell>{t.instrument?.instrumentCode || t.instrumentId}</TableCell>
                <TableCell>{t.quantity}</TableCell>
                <TableCell>{formatCurrencySafe(Number(t.price))}</TableCell>
                <TableCell>{formatCurrencySafe(Number(t.netSettlement))}</TableCell>
                <TableCell>{t.order?.orderNumber || "—"}</TableCell>
                <TableCell>{t.status}</TableCell>
                <TableCell>
                  {t.status === "DRAFT" && (
                    <Button size="sm" onClick={() => confirm(t.id)}>
                      Confirm
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      )}
      {pagination.totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Button>
          <span className="text-sm self-center">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
