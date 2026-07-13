import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { InvestmentV2ReleaseBanner } from "@/components/investments/InvestmentV2ReleaseBanner";

export default function InvestmentOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [portfolioId, setPortfolioId] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("100");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-orders", page, status],
    queryFn: async () => {
      const res = await investmentsAPI.listOrders({
        page,
        limit: 20,
        ...(status ? { status } : {}),
      });
      return res.data?.data || { orders: [], pagination: {} };
    },
  });

  const { data: portfolios } = useQuery({
    queryKey: ["investment-portfolios-v2-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listPortfoliosV2({ page: 1, limit: 50 });
      return res.data?.data?.portfolios || [];
    },
  });

  const { data: instruments } = useQuery({
    queryKey: ["investment-instruments-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listInstruments({ page: 1, limit: 50 });
      return res.data?.data?.instruments || [];
    },
  });

  const create = async () => {
    if (!portfolioId || !instrumentId) {
      toast.error("Select portfolio and instrument");
      return;
    }
    try {
      await investmentsAPI.createOrder({
        portfolioId: Number(portfolioId),
        instrumentId: Number(instrumentId),
        side,
        quantity: Number(quantity),
        orderType: "MARKET",
        orderDate: new Date().toISOString().slice(0, 10),
      });
      toast.success("Order created");
      qc.invalidateQueries({ queryKey: ["investment-orders"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  const act = async (id: number, action: string) => {
    try {
      const fn: Record<string, () => Promise<any>> = {
        submit: () => investmentsAPI.submitOrder(id),
        approve: () => investmentsAPI.approveOrder(id),
        place: () => investmentsAPI.placeOrder(id),
        cancel: () => investmentsAPI.cancelOrder(id),
      };
      await fn[action]();
      toast.success(`Order ${action}d`);
      qc.invalidateQueries({ queryKey: ["investment-orders"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Action failed");
    }
  };

  const orders = data?.orders || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title="Investment Orders"
        subtitle="Order lifecycle — draft → submit → approve → place → execute"
      />
      <InvestmentV2ReleaseBanner />
      <div className="flex flex-wrap gap-2 items-end">
        <Select value={portfolioId || undefined} onValueChange={setPortfolioId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Portfolio" />
          </SelectTrigger>
          <SelectContent>
            {(portfolios || []).map((p: any) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.portfolioName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={instrumentId || undefined} onValueChange={setInstrumentId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Instrument" />
          </SelectTrigger>
          <SelectContent>
            {(instruments || []).map((i: any) => (
              <SelectItem key={i.id} value={String(i.id)}>
                {i.instrumentCode || i.instrumentName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={side} onValueChange={setSide}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BUY">BUY</SelectItem>
            <SelectItem value="SELL">SELL</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="w-28"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty"
        />
        <Button type="button" onClick={create}>
          New order
        </Button>
        <Button asChild variant="outline">
          <Link to="/investments/trades/new">Trade wizard</Link>
        </Button>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["DRAFT", "SUBMITTED", "APPROVED", "PLACED", "PARTIALLY_EXECUTED", "EXECUTED", "CANCELLED"].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && orders.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No orders yet.</p>
      )}
      {orders.length > 0 && (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Executed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-sm">{o.orderNumber}</TableCell>
                <TableCell>{o.side}</TableCell>
                <TableCell>{o.instrument?.instrumentCode || o.instrumentId}</TableCell>
                <TableCell>{o.quantity}</TableCell>
                <TableCell>{o.executedQuantity}</TableCell>
                <TableCell>{o.status}</TableCell>
                <TableCell>{o.orderDate}</TableCell>
                <TableCell className="space-x-1">
                  {o.status === "DRAFT" && (
                    <Button size="sm" variant="outline" onClick={() => act(o.id, "submit")}>
                      Submit
                    </Button>
                  )}
                  {o.status === "SUBMITTED" && (
                    <Button size="sm" variant="outline" onClick={() => act(o.id, "approve")}>
                      Approve
                    </Button>
                  )}
                  {o.status === "APPROVED" && (
                    <Button size="sm" variant="outline" onClick={() => act(o.id, "place")}>
                      Place
                    </Button>
                  )}
                  {["DRAFT", "SUBMITTED", "APPROVED", "PLACED", "PARTIALLY_EXECUTED"].includes(o.status) && (
                    <Button size="sm" variant="ghost" onClick={() => act(o.id, "cancel")}>
                      Cancel
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
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
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
