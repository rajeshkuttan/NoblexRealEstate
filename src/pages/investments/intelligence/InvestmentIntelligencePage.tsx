import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { toast } from "sonner";

export default function InvestmentIntelligencePage() {
  const [portfolioId, setPortfolioId] = useState("");
  const [reportCode, setReportCode] = useState("PORTFOLIO_SUMMARY");
  const [packName, setPackName] = useState("Month-end pack");
  const [packCodes, setPackCodes] = useState("PORTFOLIO_SUMMARY,BREACH_REGISTER,SETTLEMENT_STATUS");
  const [toolName, setToolName] = useState("getPortfolioSummary");
  const [reportRows, setReportRows] = useState<any[]>([]);

  const { data: portfolios } = useQuery({
    queryKey: ["investment-portfolios-v2-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listPortfoliosV2({ page: 1, limit: 50 });
      return res.data?.data?.portfolios || [];
    },
  });

  const { data: catalog } = useQuery({
    queryKey: ["investment-report-catalog"],
    queryFn: async () => {
      const res = await investmentsAPI.listReportCatalog({});
      return res.data?.data;
    },
  });

  const { data: dash, refetch: refetchDash } = useQuery({
    queryKey: ["investment-exec-dash", portfolioId],
    queryFn: async () => {
      const res = await investmentsAPI.getExecutiveDashboard({
        portfolioId: portfolioId || undefined,
      });
      return res.data?.data;
    },
  });

  const { data: queue, refetch: refetchQueue } = useQuery({
    queryKey: ["investment-work-queue"],
    queryFn: async () => {
      const res = await investmentsAPI.getInvestmentWorkQueue();
      return res.data?.data;
    },
  });

  const { data: packs, refetch: refetchPacks } = useQuery({
    queryKey: ["investment-report-packs"],
    queryFn: async () => {
      const res = await investmentsAPI.listReportPacks();
      return res.data?.data?.packs || [];
    },
  });

  const { data: tools } = useQuery({
    queryKey: ["investment-copilot-tools"],
    queryFn: async () => {
      const res = await investmentsAPI.listCopilotTools();
      return res.data?.data?.tools || [];
    },
  });

  const catalogList = useMemo(() => catalog?.catalog || [], [catalog]);
  const cards = dash?.cards || {};

  const runReport = async () => {
    try {
      const res = await investmentsAPI.runInvestmentReport({
        reportCode,
        portfolioId: portfolioId ? Number(portfolioId) : null,
      });
      setReportRows(res.data?.data?.report?.rows || []);
      toast.success(`Ran ${reportCode}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Report failed");
    }
  };

  const createPack = async () => {
    try {
      await investmentsAPI.createReportPack({
        name: packName,
        reportCodes: packCodes.split(",").map((s) => s.trim()).filter(Boolean),
        portfolioId: portfolioId ? Number(portfolioId) : null,
        status: "ACTIVE",
      });
      toast.success("Pack created");
      refetchPacks();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const runPack = async (id: number) => {
    try {
      const res = await investmentsAPI.runReportPack(id, {
        portfolioId: portfolioId ? Number(portfolioId) : null,
      });
      toast.success(`Pack ran ${res.data?.data?.reports?.length || 0} reports`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Pack failed");
    }
  };

  const schedulePack = async (packId: number) => {
    try {
      await investmentsAPI.createReportSchedule({
        packId,
        cadence: "MONTHLY",
        format: "PDF",
        emailTo: "treasury@example.com",
      });
      toast.success("Schedule created");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Schedule failed");
    }
  };

  const runDue = async () => {
    try {
      const res = await investmentsAPI.runDueSchedules({});
      toast.success(`Ran ${res.data?.data?.ran || 0} schedules`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const invokeTool = async () => {
    try {
      const res = await investmentsAPI.invokeCopilotTool({
        tool: toolName,
        portfolioId: portfolioId ? Number(portfolioId) : null,
      });
      toast.success(`${toolName}: grounded=${res.data?.data?.grounded}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Tool failed");
    }
  };

  return (
    <div className="space-y-8 p-1">
      <NobleXPageHeader
        title="Investment Intelligence"
        subtitle="Report library, executive dashboard, work queue, scheduled packs and copilot tools"
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
        <Button type="button" variant="outline" onClick={() => { refetchDash(); refetchQueue(); }}>
          Refresh
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Executive cards</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(cards).map(([k, v]) => (
            <div key={k} className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{k}</div>
              <div className="text-lg font-semibold">
                {typeof v === "number" && k.toLowerCase().includes("return")
                  ? `${v}%`
                  : typeof v === "number" && !["openExceptions", "riskBreaches", "maturingSoon"].includes(k)
                    ? formatCurrencySafe(v)
                    : String(v)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Work queue ({queue?.total || 0})</h2>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(queue?.items || []).slice(0, 15).map((it: any, idx: number) => (
              <TableRow key={`${it.type}-${it.id}-${idx}`}>
                <TableCell>{it.type}</TableCell>
                <TableCell>{it.title}</TableCell>
                <TableCell>{it.severity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Report library</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Select value={reportCode} onValueChange={setReportCode}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {catalogList.map((r: any) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.category}: {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={runReport}>
            Run report
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                const res = await investmentsAPI.runInvestmentReport({
                  reportCode,
                  portfolioId: portfolioId ? Number(portfolioId) : null,
                  format: "EXCEL",
                });
                const exp = res.data?.data?.export;
                if (!exp?.base64) return toast.error("No Excel payload");
                const bin = Uint8Array.from(atob(exp.base64), (c) => c.charCodeAt(0));
                const blob = new Blob([bin], { type: exp.mime });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = exp.fileName || "report.xlsx";
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Excel downloaded");
              } catch (e: any) {
                toast.error(e?.response?.data?.message || "Excel export failed");
              }
            }}
          >
            Export Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                const res = await investmentsAPI.runInvestmentReport({
                  reportCode,
                  portfolioId: portfolioId ? Number(portfolioId) : null,
                  format: "PDF",
                });
                const exp = res.data?.data?.export;
                if (!exp?.base64) return toast.error("No PDF payload");
                const bin = Uint8Array.from(atob(exp.base64), (c) => c.charCodeAt(0));
                const blob = new Blob([bin], { type: exp.mime });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = exp.fileName || "report.pdf";
                a.click();
                URL.revokeObjectURL(url);
                toast.success("PDF downloaded");
              } catch (e: any) {
                toast.error(e?.response?.data?.message || "PDF export failed");
              }
            }}
          >
            Export PDF
          </Button>
        </div>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportRows.slice(0, 8).map((row, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{JSON.stringify(row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Report packs & schedules</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-48" value={packName} onChange={(e) => setPackName(e.target.value)} />
          <Input className="w-96" value={packCodes} onChange={(e) => setPackCodes(e.target.value)} />
          <Button type="button" onClick={createPack}>
            Create pack
          </Button>
          <Button type="button" variant="outline" onClick={runDue}>
            Run due schedules
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
            {(packs || []).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{p.packCode}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.status}</TableCell>
                <TableCell className="space-x-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => runPack(p.id)}>
                    Run
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => schedulePack(p.id)}>
                    Schedule
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Investment Copilot tools</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Select value={toolName} onValueChange={setToolName}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(tools || []).map((t: { name: string; readOnly?: boolean } | string) => {
                const name = typeof t === "string" ? t : t.name;
                return (
                  <SelectItem key={name} value={name}>
                    {name}
                    {typeof t === "object" && t.readOnly ? " (read-only)" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button type="button" onClick={invokeTool}>
            Invoke (grounded)
          </Button>
        </div>
      </section>
    </div>
  );
}
