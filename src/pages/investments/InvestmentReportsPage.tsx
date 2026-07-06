import { useState } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { investmentsAPI } from "@/services/api";
import { toast } from "sonner";
import { InvestmentListTable } from "@/components/investments/InvestmentListTable";
import { InvestmentLedgerTable } from "@/components/investments/InvestmentLedgerTable";
import { DividendRegisterTable } from "@/components/investments/DividendRegisterTable";
import { GainLossReportTable } from "@/components/investments/GainLossReportTable";
import { PartnerStatementView } from "@/components/investments/PartnerStatementView";
import { ApprovalStatusBadge } from "@/components/investments/InvestmentStatusBadges";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { exportInvestmentReportPdf } from "@/utils/investmentReportExport";
import { InvestmentMonthEndPanel } from "@/components/investments/InvestmentMonthEndPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ReportType = "portfolio" | "ledger" | "dividends" | "gain-loss" | "valuations" | "partner" | "month-end";

export default function InvestmentReportsPage() {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<ReportType>("portfolio");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [assetType, setAssetType] = useState("");
  const [currency, setCurrency] = useState("");
  const [status, setStatus] = useState("");
  const [accountingClassification, setAccountingClassification] = useState("");
  const [investorName, setInvestorName] = useState("");

  const params = {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    assetType: assetType || undefined,
    currency: currency || undefined,
    status: status || undefined,
    accountingClassification: accountingClassification || undefined,
    investorName: investorName || undefined,
  };

  const { data: partners = [] } = useQuery({
    queryKey: ["investment-partners"],
    queryFn: async () => {
      const res = await investmentsAPI.getPartners();
      return (res.data?.data || []) as { investorName: string }[];
    },
    enabled: reportType === "ledger",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["investment-report", reportType, params],
    queryFn: async () => {
      if (reportType === "partner") return null;
      const fetchers: Record<Exclude<ReportType, "partner">, () => Promise<unknown>> = {
        portfolio: () => investmentsAPI.getReportPortfolio(params).then((r) => r.data?.data),
        ledger: () => investmentsAPI.getReportLedger(params).then((r) => r.data?.data),
        dividends: () => investmentsAPI.getReportDividends(params).then((r) => r.data?.data),
        "gain-loss": () => investmentsAPI.getReportGainLoss(params).then((r) => r.data?.data),
        valuations: () => investmentsAPI.getReportValuations(params).then((r) => r.data?.data),
      };
      return fetchers[reportType]();
    },
    enabled: reportType !== "partner",
  });

  const exportExcel = () => {
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      toast.error(t("investments.toast.noDataExport"));
      return;
    }
    const flat = rows.map((row: Record<string, unknown>) => {
      if (row.asset && typeof row.asset === "object") {
        const a = row.asset as Record<string, unknown>;
        return { ...row, assetCode: a.investmentCode, assetName: a.investmentName, asset: undefined };
      }
      if (row.holding && typeof row.holding === "object") {
        const h = row.holding as Record<string, unknown>;
        return { ...row, ...h, holding: undefined };
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportType);
    XLSX.writeFile(wb, `investment-${reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t("investments.toast.exportedExcel"));
  };

  const exportPdf = () => {
    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    if (!rows.length) {
      toast.error(t("investments.toast.noDataExport"));
      return;
    }
    const ok = exportInvestmentReportPdf(
      `Investment ${reportType} report`,
      rows,
      `investment-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`
    );
    if (ok) toast.success(t("investments.toast.exportedPdf"));
  };

  const portfolioAssets = Array.isArray(data)
    ? data.map((a: { id: number; investmentCode: string; investmentName: string; assetType: string; currencyCode: string; status: string; holding?: object }) => ({
        id: a.id,
        investmentCode: a.investmentCode,
        investmentName: a.investmentName,
        assetType: a.assetType,
        currencyCode: a.currencyCode,
        status: a.status,
        holding: a.holding,
      }))
    : [];

  const showAssetFilters = ["portfolio", "gain-loss"].includes(reportType);
  const showDateFilters = reportType !== "portfolio" && reportType !== "gain-loss" || reportType === "ledger" || reportType === "dividends" || reportType === "valuations";

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title={t("investments.reports.title")}
        subtitle={t("investments.reports.subtitle")}
        actions={
          reportType !== "partner" ? (
            <div className="flex gap-2">
              <Button variant="noblex-secondary" onClick={exportExcel}>Export Excel</Button>
              <Button variant="outline" onClick={exportPdf}>Export PDF</Button>
            </div>
          ) : undefined
        }
      />

      <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="dividends">Dividends</TabsTrigger>
          <TabsTrigger value="gain-loss">Gain / Loss</TabsTrigger>
          <TabsTrigger value="valuations">Valuations</TabsTrigger>
          <TabsTrigger value="partner">Partner statement</TabsTrigger>
          <TabsTrigger value="month-end">Month-end</TabsTrigger>
        </TabsList>

        {reportType !== "partner" && (
          <div className="flex flex-wrap gap-4 items-end rounded-lg border border-noblex-border bg-noblex-surface p-4 mt-4">
            {(showDateFilters || reportType === "ledger" || reportType === "dividends" || reportType === "valuations") && (
              <>
                <div><Label>From</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1" /></div>
                <div><Label>To</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1" /></div>
              </>
            )}
            {reportType === "ledger" && (
              <div>
                <Label>Investor / partner</Label>
                <select
                  className="mt-1 w-full min-w-[200px] rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm h-10"
                  value={investorName}
                  onChange={(e) => setInvestorName(e.target.value)}
                >
                  <option value="">All investors</option>
                  {partners.map((p) => (
                    <option key={p.investorName} value={p.investorName}>{p.investorName}</option>
                  ))}
                </select>
              </div>
            )}
            {showAssetFilters && (
              <>
                <div><Label>Asset type</Label><Input value={assetType} onChange={(e) => setAssetType(e.target.value)} placeholder="equity" className="mt-1" /></div>
                <div><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="AED" className="mt-1" /></div>
                <div>
                  <Label>Status</Label>
                  <select className="mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm h-10" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All</option>
                    {["DRAFT", "ACTIVE", "SOLD", "MATURED", "CLOSED"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Accounting class</Label>
                  <select className="mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm h-10" value={accountingClassification} onChange={(e) => setAccountingClassification(e.target.value)}>
                    <option value="">All</option>
                    {["COST", "AMORTISED_COST", "FVTPL", "FVOCI"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        <TabsContent value="portfolio" className="mt-4">
          {isLoading ? <p className="text-noblex-slate">Loading…</p> : <InvestmentListTable assets={portfolioAssets} />}
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          {isLoading ? <p className="text-noblex-slate">Loading…</p> : <InvestmentLedgerTable rows={(data as []) || []} />}
        </TabsContent>
        <TabsContent value="dividends" className="mt-4">
          {isLoading ? <p className="text-noblex-slate">Loading…</p> : <DividendRegisterTable rows={(data as []) || []} />}
        </TabsContent>
        <TabsContent value="gain-loss" className="mt-4">
          {isLoading ? <p className="text-noblex-slate">Loading…</p> : <GainLossReportTable rows={(data as []) || []} />}
        </TabsContent>
        <TabsContent value="valuations" className="mt-4">
          {isLoading ? <p className="text-noblex-slate">Loading…</p> : (
            <NobleXDataTable>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Market value</TableHead>
                  <TableHead>Unrealized G/L</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((data as []) || []).map((v: { id: number; valuationDate: string; baseMarketValue: number; unrealizedGainLoss: number; approvalStatus: string; asset?: { investmentName: string } }) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.valuationDate}</TableCell>
                    <TableCell>{v.asset?.investmentName}</TableCell>
                    <TableCell className="font-mono">{formatCurrencySafe(v.baseMarketValue)}</TableCell>
                    <TableCell className="font-mono">{formatCurrencySafe(v.unrealizedGainLoss)}</TableCell>
                    <TableCell><ApprovalStatusBadge status={v.approvalStatus} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </NobleXDataTable>
          )}
        </TabsContent>
        <TabsContent value="partner" className="mt-4">
          <PartnerStatementView />
        </TabsContent>
        <TabsContent value="month-end" className="mt-4">
          <InvestmentMonthEndPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
