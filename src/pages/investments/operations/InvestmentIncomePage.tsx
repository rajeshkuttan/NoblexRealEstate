import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { toast } from "sonner";

const INCOME_TYPES = [
  "DIVIDEND",
  "INTEREST",
  "COUPON",
  "FUND_DISTRIBUTION",
  "PROFIT_DISTRIBUTION",
  "SPECIAL_DIVIDEND",
];

export default function InvestmentIncomePage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [incomeType, setIncomeType] = useState("DIVIDEND");
  const [gross, setGross] = useState("1000");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-income", page, status],
    queryFn: async () => {
      const res = await investmentsAPI.listIncomeEvents({
        page,
        limit: 20,
        ...(status ? { status } : {}),
      });
      return res.data?.data || { incomeEvents: [], pagination: {} };
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
      await investmentsAPI.createIncomeEvent({
        portfolioId: Number(portfolioId),
        instrumentId: Number(instrumentId),
        incomeType,
        grossAmount: Number(gross),
        paymentDate,
        status: "EXPECTED",
      });
      toast.success("Income event created");
      qc.invalidateQueries({ queryKey: ["investment-income"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  const generateSchedule = async () => {
    if (!portfolioId || !instrumentId) {
      toast.error("Select portfolio and instrument");
      return;
    }
    try {
      const res = await investmentsAPI.generateIncomeSchedule({
        portfolioId: Number(portfolioId),
        instrumentId: Number(instrumentId),
        frequency: "SEMI_ANNUAL",
      });
      toast.success(`Created ${res.data?.data?.created || 0} expected events`);
      qc.invalidateQueries({ queryKey: ["investment-income"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Schedule failed");
    }
  };

  const runAccruals = async () => {
    try {
      const res = await investmentsAPI.runIncomeAccruals({});
      toast.success(`Accrued ${res.data?.data?.updated || 0} events`);
      qc.invalidateQueries({ queryKey: ["investment-income"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Accrual failed");
    }
  };

  const act = async (id: number, action: string) => {
    try {
      const map: Record<string, () => Promise<any>> = {
        accrue: () => investmentsAPI.accrueIncome(id),
        receive: () => investmentsAPI.markIncomeReceived(id),
        reconcile: () => investmentsAPI.reconcileIncome(id, { force: true }),
        distribute: () => investmentsAPI.distributeIncome(id),
        reinvest: () => investmentsAPI.reinvestIncome(id),
        cancel: () => investmentsAPI.cancelIncome(id),
      };
      await map[action]();
      toast.success(`Income ${action} ok`);
      qc.invalidateQueries({ queryKey: ["investment-income"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Action failed");
    }
  };

  const events = data?.incomeEvents || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title="Investment Income"
        subtitle="Expected income, accruals, receipts, reconcile, distribute or reinvest"
      />
      <div className="flex flex-wrap gap-2 items-end">
        <Select value={portfolioId || undefined} onValueChange={setPortfolioId}>
          <SelectTrigger className="w-44">
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
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Instrument" />
          </SelectTrigger>
          <SelectContent>
            {(instruments || []).map((i: any) => (
              <SelectItem key={i.id} value={String(i.id)}>
                {i.instrumentCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={incomeType} onValueChange={setIncomeType}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INCOME_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="w-28" type="number" value={gross} onChange={(e) => setGross(e.target.value)} />
        <Input className="w-40" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        <Button type="button" onClick={create}>
          New income
        </Button>
        <Button type="button" variant="outline" onClick={generateSchedule}>
          Generate schedule
        </Button>
        <Button type="button" variant="outline" onClick={runAccruals}>
          Run accruals
        </Button>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {["EXPECTED", "ACCRUED", "RECEIVABLE", "RECEIVED", "RECONCILED", "DISTRIBUTED", "REINVESTED"].map(
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
      {!isLoading && events.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No income events.</p>
      )}
      {events.length > 0 && (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>Net</TableHead>
              <TableHead>Accrued</TableHead>
              <TableHead>Pay date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-sm">{e.eventNumber}</TableCell>
                <TableCell>{e.incomeType}</TableCell>
                <TableCell>{e.instrument?.instrumentCode || e.instrumentId}</TableCell>
                <TableCell>{formatCurrencySafe(Number(e.grossAmount))}</TableCell>
                <TableCell>{formatCurrencySafe(Number(e.netAmount))}</TableCell>
                <TableCell>{formatCurrencySafe(Number(e.accruedAmount))}</TableCell>
                <TableCell>{e.paymentDate || "—"}</TableCell>
                <TableCell>{e.status}</TableCell>
                <TableCell className="space-x-1">
                  {e.status === "EXPECTED" && (
                    <Button size="sm" variant="outline" onClick={() => act(e.id, "accrue")}>
                      Accrue
                    </Button>
                  )}
                  {["EXPECTED", "ACCRUED", "RECEIVABLE"].includes(e.status) && (
                    <Button size="sm" variant="outline" onClick={() => act(e.id, "receive")}>
                      Receive
                    </Button>
                  )}
                  {e.status === "RECEIVED" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => act(e.id, "reconcile")}>
                        Reconcile
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => act(e.id, "distribute")}>
                        Distribute
                      </Button>
                      <Button size="sm" onClick={() => act(e.id, "reinvest")}>
                        Reinvest
                      </Button>
                    </>
                  )}
                  {!["CANCELLED", "DISTRIBUTED", "REINVESTED"].includes(e.status) && (
                    <Button size="sm" variant="ghost" onClick={() => act(e.id, "cancel")}>
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
