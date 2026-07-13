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

export default function InvestmentNavPerformancePage() {
  const qc = useQueryClient();
  const [portfolioId, setPortfolioId] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [price, setPrice] = useState("10");
  const [priceDate, setPriceDate] = useState(new Date().toISOString().slice(0, 10));
  const [cash, setCash] = useState("0");
  const [openVal, setOpenVal] = useState("100000");
  const [closeVal, setCloseVal] = useState("110000");
  const [flows, setFlows] = useState("0");

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
  const { data: batches, refetch: refetchBatches } = useQuery({
    queryKey: ["investment-val-batches"],
    queryFn: async () => {
      const res = await investmentsAPI.listValuationBatches({ page: 1, limit: 20 });
      return res.data?.data?.batches || [];
    },
  });
  const { data: navs, refetch: refetchNav } = useQuery({
    queryKey: ["investment-nav"],
    queryFn: async () => {
      const res = await investmentsAPI.listNavSnapshots({});
      return res.data?.data?.snapshots || [];
    },
  });
  const { data: perfs, refetch: refetchPerf } = useQuery({
    queryKey: ["investment-perf"],
    queryFn: async () => {
      const res = await investmentsAPI.listPerformancePeriods({});
      return res.data?.data?.periods || [];
    },
  });

  const savePrice = async () => {
    if (!instrumentId) return toast.error("Select instrument");
    try {
      await investmentsAPI.upsertMarketPrice({
        instrumentId: Number(instrumentId),
        priceDate,
        close: Number(price),
        source: "MANUAL",
      });
      toast.success("Price saved");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const runBatch = async () => {
    if (!portfolioId) return toast.error("Select portfolio");
    try {
      await investmentsAPI.createValuationBatch({
        portfolioId: Number(portfolioId),
        valuationDate: priceDate,
        sourceType: "MANUAL",
      });
      toast.success("Valuation batch created");
      refetchBatches();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const actBatch = async (id: number, action: string) => {
    try {
      if (action === "approve") await investmentsAPI.approveValuationBatch(id, { force: true });
      if (action === "post") await investmentsAPI.postValuationBatch(id);
      toast.success(action);
      refetchBatches();
      qc.invalidateQueries({ queryKey: ["investment-portfolios-v2"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const runNav = async () => {
    if (!portfolioId) return toast.error("Select portfolio");
    try {
      const res = await investmentsAPI.computeNav({
        portfolioId: Number(portfolioId),
        navDate: priceDate,
        cash: Number(cash),
        includeInvestors: true,
      });
      toast.success(`NAV ${formatCurrencySafe(Number(res.data?.data?.components?.nav || 0))}`);
      refetchNav();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const runPerf = async () => {
    if (!portfolioId) return toast.error("Select portfolio");
    try {
      const end = priceDate;
      const start = end.slice(0, 8) + "01";
      await investmentsAPI.calculatePerformance({
        portfolioId: Number(portfolioId),
        periodStart: start,
        periodEnd: end,
        openingValue: Number(openVal),
        closingValue: Number(closeVal),
        externalFlows: Number(flows),
        daysInPeriod: 30,
        benchmarkReturn: 0.01,
      });
      toast.success("Performance calculated");
      refetchPerf();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="space-y-8 p-1">
      <NobleXPageHeader
        title="Valuation, NAV & Performance"
        subtitle="Market prices, valuation batches, NAV snapshots, TWR/MWR/IRR"
      />

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
        <Input className="w-40" type="date" value={priceDate} onChange={(e) => setPriceDate(e.target.value)} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Market price</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Select value={instrumentId || undefined} onValueChange={setInstrumentId}>
            <SelectTrigger className="w-48">
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
          <Input className="w-28" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Button type="button" onClick={savePrice}>
            Save price
          </Button>
          <Button type="button" variant="outline" onClick={runBatch}>
            Run valuation batch
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Valuation batches</h2>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>MV</TableHead>
              <TableHead>UGL</TableHead>
              <TableHead>Exceptions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(batches || []).map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-sm">{b.valuationNumber}</TableCell>
                <TableCell>{b.valuationDate}</TableCell>
                <TableCell>{formatCurrencySafe(Number(b.totalMarketValue))}</TableCell>
                <TableCell>{formatCurrencySafe(Number(b.totalUnrealizedGainLoss))}</TableCell>
                <TableCell>{b.exceptionCount}</TableCell>
                <TableCell>{b.status}</TableCell>
                <TableCell className="space-x-1">
                  {["VALIDATED", "EXCEPTION"].includes(b.status) && (
                    <Button size="sm" variant="outline" onClick={() => actBatch(b.id, "approve")}>
                      Approve
                    </Button>
                  )}
                  {b.status === "APPROVED" && (
                    <Button size="sm" onClick={() => actBatch(b.id, "post")}>
                      Post
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">NAV</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-28" type="number" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="Cash" />
          <Button type="button" onClick={runNav}>
            Compute NAV
          </Button>
        </div>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Portfolio</TableHead>
              <TableHead>Investor</TableHead>
              <TableHead>MV</TableHead>
              <TableHead>NAV</TableHead>
              <TableHead>NAV/unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(navs || []).slice(0, 15).map((n: any) => (
              <TableRow key={n.id}>
                <TableCell>{n.navDate}</TableCell>
                <TableCell>{n.portfolio?.portfolioCode || n.portfolioId}</TableCell>
                <TableCell>{n.investorId || "—"}</TableCell>
                <TableCell>{formatCurrencySafe(Number(n.marketValue))}</TableCell>
                <TableCell>{formatCurrencySafe(Number(n.nav))}</TableCell>
                <TableCell>{n.navPerUnit ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Performance</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-28" type="number" value={openVal} onChange={(e) => setOpenVal(e.target.value)} />
          <Input className="w-28" type="number" value={closeVal} onChange={(e) => setCloseVal(e.target.value)} />
          <Input className="w-24" type="number" value={flows} onChange={(e) => setFlows(e.target.value)} placeholder="Flows" />
          <Button type="button" onClick={runPerf}>
            Calculate
          </Button>
        </div>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>TWR</TableHead>
              <TableHead>MWR</TableHead>
              <TableHead>IRR</TableHead>
              <TableHead>Excess</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(perfs || []).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.periodStart} → {p.periodEnd}
                </TableCell>
                <TableCell>{p.twr != null ? `${(Number(p.twr) * 100).toFixed(2)}%` : "—"}</TableCell>
                <TableCell>{p.mwr != null ? `${(Number(p.mwr) * 100).toFixed(2)}%` : "—"}</TableCell>
                <TableCell>{p.irr != null ? `${(Number(p.irr) * 100).toFixed(2)}%` : "—"}</TableCell>
                <TableCell>
                  {p.excessReturn != null ? `${(Number(p.excessReturn) * 100).toFixed(2)}%` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>
    </div>
  );
}
