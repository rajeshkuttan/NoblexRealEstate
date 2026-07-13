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

export default function InvestmentSettlementsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-settlements", page, status],
    queryFn: async () => {
      const res = await investmentsAPI.listSettlements({
        page,
        limit: 20,
        ...(status ? { status } : {}),
      });
      return res.data?.data || { settlements: [], pagination: {} };
    },
  });

  const act = async (id: number, kind: "settle" | "fail") => {
    try {
      if (kind === "settle") await investmentsAPI.settleSettlement(id);
      else await investmentsAPI.failSettlement(id, { failureReason: "Manual fail from UI" });
      toast.success(kind === "settle" ? "Settled" : "Marked failed");
      qc.invalidateQueries({ queryKey: ["investment-settlements"] });
      qc.invalidateQueries({ queryKey: ["investment-trades"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Action failed");
    }
  };

  const settlements = data?.settlements || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title="Settlements"
        subtitle="Cash settlement of confirmed trades — settle or fail"
      />
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/investments/trades">Trades</Link>
        </Button>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["PENDING", "PARTIALLY_SETTLED", "SETTLED", "FAILED", "CANCELLED"].map((s) => (
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
      {!isLoading && settlements.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No settlements yet.</p>
      )}
      {settlements.length > 0 && (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.settlementNumber}</TableCell>
                <TableCell>{s.trade?.tradeNumber || s.tradeId}</TableCell>
                <TableCell>{s.expectedDate || "—"}</TableCell>
                <TableCell>{formatCurrencySafe(Number(s.settlementAmount))}</TableCell>
                <TableCell>{s.status}</TableCell>
                <TableCell className="space-x-1">
                  {s.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => act(s.id, "settle")}>
                        Settle
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => act(s.id, "fail")}>
                        Fail
                      </Button>
                    </>
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
