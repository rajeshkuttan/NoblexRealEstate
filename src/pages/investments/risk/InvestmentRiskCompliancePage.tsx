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

export default function InvestmentRiskCompliancePage() {
  const qc = useQueryClient();
  const [portfolioId, setPortfolioId] = useState("");
  const [mandateName, setMandateName] = useState("Core mandate");
  const [allowedClasses, setAllowedClasses] = useState("EQUITY,FIXED_INCOME");
  const [limitType, setLimitType] = useState("CONCENTRATION");
  const [warn, setWarn] = useState("20");
  const [breach, setBreach] = useState("25");
  const [overrideReason, setOverrideReason] = useState("");
  const [preTradeJson, setPreTradeJson] = useState(
    '{"side":"BUY","quantity":100,"limitPrice":10,"instrumentId":1}'
  );

  const { data: portfolios } = useQuery({
    queryKey: ["investment-portfolios-v2-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listPortfoliosV2({ page: 1, limit: 50 });
      return res.data?.data?.portfolios || [];
    },
  });

  const { data: dashboard, refetch: refetchDash } = useQuery({
    queryKey: ["investment-risk-dashboard", portfolioId],
    queryFn: async () => {
      const res = await investmentsAPI.getRiskDashboard({
        portfolioId: portfolioId || undefined,
      });
      return res.data?.data;
    },
  });

  const { data: mandates, refetch: refetchMandates } = useQuery({
    queryKey: ["investment-mandates"],
    queryFn: async () => {
      const res = await investmentsAPI.listMandates({ page: 1, limit: 20 });
      return res.data?.data?.mandates || [];
    },
  });

  const { data: limits, refetch: refetchLimits } = useQuery({
    queryKey: ["investment-risk-limits"],
    queryFn: async () => {
      const res = await investmentsAPI.listRiskLimits({});
      return res.data?.data?.limits || [];
    },
  });

  const { data: breaches, refetch: refetchBreaches } = useQuery({
    queryKey: ["investment-breaches"],
    queryFn: async () => {
      const res = await investmentsAPI.listBreaches({});
      return res.data?.data?.breaches || [];
    },
  });

  const createMandate = async () => {
    try {
      await investmentsAPI.createMandate({
        name: mandateName,
        portfolioId: portfolioId ? Number(portfolioId) : null,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        allowedAssetClasses: allowedClasses.split(",").map((s) => s.trim()).filter(Boolean),
        prohibitedAssetClasses: [],
      });
      toast.success("Mandate created");
      refetchMandates();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const activate = async (id: number) => {
    try {
      await investmentsAPI.activateMandate(id);
      toast.success("Activated");
      refetchMandates();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const createLimit = async () => {
    try {
      await investmentsAPI.createRiskLimit({
        limitType,
        portfolioId: portfolioId ? Number(portfolioId) : null,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        thresholdWarning: Number(warn),
        thresholdBreach: Number(breach),
        measurementBasis: "PERCENT_NAV",
      });
      toast.success("Limit created");
      refetchLimits();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const scan = async () => {
    try {
      const res = await investmentsAPI.runLimitScan({
        portfolioId: portfolioId ? Number(portfolioId) : null,
      });
      toast.success(`Scan done — ${res.data?.data?.breachesCreated?.length || 0} new breaches`);
      refetchBreaches();
      refetchDash();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Scan failed");
    }
  };

  const override = async (id: number) => {
    if (!overrideReason.trim()) return toast.error("Reason required");
    try {
      await investmentsAPI.overrideBreach(id, { reason: overrideReason, status: "EXCEPTION_APPROVED" });
      toast.success("Exception approved");
      setOverrideReason("");
      refetchBreaches();
      qc.invalidateQueries({ queryKey: ["investment-risk-dashboard"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Override failed");
    }
  };

  const runPreTrade = async () => {
    try {
      const body = JSON.parse(preTradeJson);
      const res = await investmentsAPI.previewPreTrade({
        ...body,
        portfolioId: portfolioId ? Number(portfolioId) : body.portfolioId,
      });
      const data = res.data?.data;
      if (data?.passed) toast.success("Pre-trade passed");
      else toast.error(`Failed: ${(data?.failures || []).map((f: any) => f.code).join(", ")}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Pre-trade error");
    }
  };

  const conc = dashboard?.concentrations || {};

  return (
    <div className="space-y-8 p-1">
      <NobleXPageHeader
        title="Risk, Compliance & Governance"
        subtitle="Mandates, limits, breaches, KYC expiries and pre-trade checks"
      />

      <div className="flex flex-wrap gap-2 items-end">
        <Select value={portfolioId || undefined} onValueChange={setPortfolioId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Portfolio (optional)" />
          </SelectTrigger>
          <SelectContent>
            {(portfolios || []).map((p: any) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.portfolioName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => refetchDash()}>
          Refresh dashboard
        </Button>
        <Button type="button" onClick={scan}>
          Run limit scan
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">
          Exposures — MV {formatCurrencySafe(Number(dashboard?.totalMarketValue || 0))}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            ["Asset class", conc.assetClass],
            ["Issuer", conc.issuer],
            ["Currency", conc.currency],
            ["Country", conc.country],
            ["Sector", conc.sector],
          ].map(([title, rows]: any) => (
            <div key={title} className="rounded-md border p-3 space-y-1">
              <div className="text-xs font-medium text-muted-foreground">{title}</div>
              {(rows || []).slice(0, 5).map((r: any) => (
                <div key={r.key} className="flex justify-between text-sm">
                  <span>{r.key}</span>
                  <span>{r.pct}%</span>
                </div>
              ))}
              {!(rows || []).length && <div className="text-xs text-muted-foreground">No data</div>}
            </div>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          Open breaches: {(dashboard?.openBreaches || []).length} · KYC expiries:{" "}
          {(dashboard?.kycExpiries || []).length} · Stale valuations:{" "}
          {(dashboard?.staleValuations || []).length}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Mandates</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-48" value={mandateName} onChange={(e) => setMandateName(e.target.value)} />
          <Input
            className="w-64"
            value={allowedClasses}
            onChange={(e) => setAllowedClasses(e.target.value)}
            placeholder="Allowed classes CSV"
          />
          <Button type="button" onClick={createMandate}>
            Create mandate
          </Button>
        </div>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(mandates || []).map((m: any) => (
              <TableRow key={m.id}>
                <TableCell>{m.mandateCode}</TableCell>
                <TableCell>{m.name}</TableCell>
                <TableCell>{m.status}</TableCell>
                <TableCell>
                  {m.status === "DRAFT" && (
                    <Button type="button" size="sm" variant="outline" onClick={() => activate(m.id)}>
                      Activate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Risk limits</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Select value={limitType} onValueChange={setLimitType}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["CONCENTRATION", "ISSUER", "CURRENCY", "COUNTRY", "SECTOR"].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="w-24" type="number" value={warn} onChange={(e) => setWarn(e.target.value)} />
          <Input className="w-24" type="number" value={breach} onChange={(e) => setBreach(e.target.value)} />
          <Button type="button" onClick={createLimit}>
            Add limit
          </Button>
        </div>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Warn / Breach</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(limits || []).map((l: any) => (
              <TableRow key={l.id}>
                <TableCell>{l.limitCode}</TableCell>
                <TableCell>{l.limitType}</TableCell>
                <TableCell>
                  {l.thresholdWarning} / {l.thresholdBreach}
                </TableCell>
                <TableCell>{l.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Breaches</h2>
        <Input
          className="w-80"
          placeholder="Override reason"
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
        />
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Actual / Limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(breaches || []).map((b: any) => (
              <TableRow key={b.id}>
                <TableCell>{b.breachNumber}</TableCell>
                <TableCell>{b.severity}</TableCell>
                <TableCell>
                  {b.actualValue} / {b.limitValue}
                </TableCell>
                <TableCell>{b.status}</TableCell>
                <TableCell>
                  {["OPEN", "UNDER_REVIEW"].includes(b.status) && (
                    <Button type="button" size="sm" variant="outline" onClick={() => override(b.id)}>
                      Approve exception
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Pre-trade preview</h2>
        <textarea
          className="w-full min-h-[80px] rounded-md border bg-background p-2 font-mono text-xs"
          value={preTradeJson}
          onChange={(e) => setPreTradeJson(e.target.value)}
        />
        <Button type="button" onClick={runPreTrade}>
          Run pre-trade check
        </Button>
      </section>
    </div>
  );
}
