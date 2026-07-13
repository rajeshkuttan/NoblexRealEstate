import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const RECON_TYPES = [
  "BROKER",
  "CUSTODIAN",
  "BANK",
  "INCOME",
  "SUBLEDGER_GL",
  "OWNERSHIP_CAPITAL",
  "VALUATION",
] as const;

export default function InvestmentReconciliationPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [reconType, setReconType] = useState<string>("BROKER");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [portfolioId, setPortfolioId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [importJson, setImportJson] = useState(
    '[{"sourceReference":"BRK-1","amount":1000,"quantity":10,"instrumentId":1}]'
  );
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [reopenReason, setReopenReason] = useState("");

  const { data: portfolios } = useQuery({
    queryKey: ["investment-portfolios-v2-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listPortfoliosV2({ page: 1, limit: 50 });
      return res.data?.data?.portfolios || [];
    },
  });

  const { data: batches, refetch: refetchBatches } = useQuery({
    queryKey: ["investment-recon-batches", typeFilter],
    queryFn: async () => {
      const params: any = { page: 1, limit: 30 };
      if (typeFilter !== "ALL") params.reconciliationType = typeFilter;
      const res = await investmentsAPI.listReconBatches(params);
      return res.data?.data?.batches || [];
    },
  });

  const { data: batchDetail, refetch: refetchDetail } = useQuery({
    queryKey: ["investment-recon-batch", selectedBatchId],
    enabled: !!selectedBatchId,
    queryFn: async () => {
      const res = await investmentsAPI.getReconBatch(selectedBatchId!);
      return res.data?.data;
    },
  });

  const { data: closeData, refetch: refetchClose } = useQuery({
    queryKey: ["investment-close-periods", period],
    queryFn: async () => {
      const res = await investmentsAPI.listClosePeriods({ period });
      return res.data?.data?.periods || [];
    },
  });

  const activeClose = useMemo(() => (closeData || [])[0] || null, [closeData]);

  const createBatch = async () => {
    try {
      const res = await investmentsAPI.createReconBatch({
        reconciliationType: reconType,
        statementDate,
        portfolioId: portfolioId ? Number(portfolioId) : null,
      });
      toast.success("Batch created");
      setSelectedBatchId(res.data?.data?.id);
      refetchBatches();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const importRows = async () => {
    if (!selectedBatchId) return toast.error("Select a batch");
    try {
      const sourceRows = JSON.parse(importJson);
      await investmentsAPI.importReconRows(selectedBatchId, { sourceRows, runMatch: false });
      toast.success("Imported");
      refetchBatches();
      refetchDetail();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Import failed");
    }
  };

  const runMatch = async () => {
    if (!selectedBatchId) return toast.error("Select a batch");
    try {
      let sourceRows: any[] = [];
      try {
        sourceRows = JSON.parse(importJson);
      } catch {
        /* use stored lines */
      }
      const internalRows = sourceRows.map((s: any) => ({
        internalReference: s.sourceReference || s.reference,
        instrumentId: s.instrumentId,
        expectedAmount: s.amount ?? s.actualAmount,
        expectedQuantity: s.quantity ?? s.actualQuantity,
        lineDate: s.lineDate || statementDate,
      }));
      await investmentsAPI.runReconMatch(selectedBatchId, { sourceRows, internalRows });
      toast.success("Match complete");
      refetchBatches();
      refetchDetail();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Match failed");
    }
  };

  const resolveLine = async (lineId: number) => {
    try {
      await investmentsAPI.resolveReconLine(lineId, { notes: "Reviewed" });
      toast.success("Resolved");
      refetchDetail();
      refetchBatches();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const approveBatch = async () => {
    if (!selectedBatchId) return;
    try {
      await investmentsAPI.approveReconBatch(selectedBatchId);
      toast.success("Approved");
      refetchBatches();
      refetchDetail();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const ensureClosePeriod = async () => {
    try {
      await investmentsAPI.getOrCreateClosePeriod({
        period,
        portfolioId: portfolioId ? Number(portfolioId) : null,
      });
      toast.success("Close period ready");
      refetchClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const toggleChecklist = async (key: string, done: boolean) => {
    if (!activeClose?.id) return toast.error("Create close period first");
    try {
      await investmentsAPI.updateCloseChecklist(activeClose.id, { key, done });
      refetchClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const closePeriod = async () => {
    if (!activeClose?.id) return;
    try {
      await investmentsAPI.closeInvestmentPeriod(activeClose.id);
      toast.success("Period closed");
      refetchClose();
      qc.invalidateQueries({ queryKey: ["investment-val-batches"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Close failed");
    }
  };

  const reopenPeriod = async () => {
    if (!activeClose?.id) return;
    if (!reopenReason.trim()) return toast.error("Reason required");
    try {
      await investmentsAPI.reopenInvestmentPeriod(activeClose.id, { reason: reopenReason });
      toast.success("Period reopened");
      setReopenReason("");
      refetchClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Reopen failed");
    }
  };

  return (
    <div className="space-y-8 p-1">
      <NobleXPageHeader
        title="Reconciliation & Period Close"
        subtitle="Broker, custodian, bank and subledger matching with month-end lock"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={typeFilter === "ALL" ? "default" : "outline"}
          size="sm"
          onClick={() => setTypeFilter("ALL")}
        >
          All
        </Button>
        {RECON_TYPES.map((t) => (
          <Button
            key={t}
            type="button"
            variant={typeFilter === t ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(t)}
          >
            {t.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">New reconciliation batch</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Select value={reconType} onValueChange={setReconType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECON_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Input
            className="w-40"
            type="date"
            value={statementDate}
            onChange={(e) => setStatementDate(e.target.value)}
          />
          <Button type="button" onClick={createBatch}>
            Create batch
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Batches</h2>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Matched</TableHead>
              <TableHead>Exceptions</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(batches || []).map((b: any) => (
              <TableRow
                key={b.id}
                className={selectedBatchId === b.id ? "bg-muted/50 cursor-pointer" : "cursor-pointer"}
                onClick={() => setSelectedBatchId(b.id)}
              >
                <TableCell>{b.batchNumber}</TableCell>
                <TableCell>{b.reconciliationType}</TableCell>
                <TableCell>{b.statementDate}</TableCell>
                <TableCell>
                  {b.matchedRecords}/{b.totalRecords}
                </TableCell>
                <TableCell>{b.exceptionRecords}</TableCell>
                <TableCell>{b.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>

      {selectedBatchId && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Batch #{selectedBatchId} — import & match</h2>
          <textarea
            className="w-full min-h-[88px] rounded-md border bg-background p-2 font-mono text-xs"
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={importRows}>
              Import rows
            </Button>
            <Button type="button" onClick={runMatch}>
              Run match
            </Button>
            <Button type="button" variant="secondary" onClick={approveBatch}>
              Approve batch
            </Button>
          </div>
          <NobleXDataTable>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Internal</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Diff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(batchDetail?.lines || []).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.sourceReference || "—"}</TableCell>
                  <TableCell>{l.internalReference || "—"}</TableCell>
                  <TableCell>{l.expectedAmount ?? "—"}</TableCell>
                  <TableCell>{l.actualAmount ?? "—"}</TableCell>
                  <TableCell>{l.differenceAmount}</TableCell>
                  <TableCell>{l.matchStatus}</TableCell>
                  <TableCell>
                    {l.matchStatus !== "MATCHED" && l.matchStatus !== "RESOLVED" && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => resolveLine(l.id)}>
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </NobleXDataTable>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Month-end close</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-36" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="YYYY-MM" />
          <Button type="button" variant="outline" onClick={ensureClosePeriod}>
            Open / load period
          </Button>
          {activeClose && (
            <span className="text-sm text-muted-foreground">Status: {activeClose.status}</span>
          )}
        </div>
        {activeClose?.checklist && (
          <ul className="space-y-1 text-sm">
            {activeClose.checklist.map((item: any) => (
              <li key={item.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!item.done}
                  disabled={activeClose.status === "CLOSED"}
                  onChange={(e) => toggleChecklist(item.key, e.target.checked)}
                />
                <span>
                  {item.label}
                  {item.required ? " *" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 items-end">
          <Button type="button" onClick={closePeriod} disabled={activeClose?.status === "CLOSED"}>
            Close & lock period
          </Button>
          <Input
            className="w-64"
            placeholder="Reopen reason"
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={reopenPeriod}>
            Reopen
          </Button>
        </div>
      </section>
    </div>
  );
}
