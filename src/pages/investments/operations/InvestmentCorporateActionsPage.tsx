import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const ACTION_TYPES = [
  "CASH_DIVIDEND",
  "STOCK_DIVIDEND",
  "BONUS_ISSUE",
  "STOCK_SPLIT",
  "REVERSE_SPLIT",
  "RIGHTS_ISSUE",
  "REDEMPTION",
  "MATURITY",
];

export default function InvestmentCorporateActionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [actionType, setActionType] = useState("STOCK_SPLIT");
  const [ratioNum, setRatioNum] = useState("2");
  const [ratioDen, setRatioDen] = useState("1");
  const [cash, setCash] = useState("0");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-corp-actions", page, status],
    queryFn: async () => {
      const res = await investmentsAPI.listCorporateActions({
        page,
        limit: 20,
        ...(status ? { status } : {}),
      });
      return res.data?.data || { corporateActions: [], pagination: {} };
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
    if (!instrumentId) {
      toast.error("Select instrument");
      return;
    }
    try {
      await investmentsAPI.createCorporateAction({
        instrumentId: Number(instrumentId),
        actionType,
        ratioNumerator: Number(ratioNum),
        ratioDenominator: Number(ratioDen),
        cashComponent: Number(cash),
        recordDate,
        effectiveDate: recordDate,
        announcementDate: recordDate,
      });
      toast.success("Corporate action created");
      qc.invalidateQueries({ queryKey: ["investment-corp-actions"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  const act = async (id: number, action: string) => {
    try {
      const map: Record<string, () => Promise<any>> = {
        entitlements: () => investmentsAPI.generateEntitlements(id),
        apply: () => investmentsAPI.applyCorporateAction(id),
        settle: () => investmentsAPI.settleCorporateAction(id),
        cancel: () => investmentsAPI.cancelCorporateAction(id),
      };
      await map[action]();
      toast.success(`Action ${action} ok`);
      qc.invalidateQueries({ queryKey: ["investment-corp-actions"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const rows = data?.corporateActions || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title="Corporate Actions"
        subtitle="Splits, bonuses, dividends — entitlements from record-date holdings"
      />
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
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="w-20" value={ratioNum} onChange={(e) => setRatioNum(e.target.value)} placeholder="Num" />
        <span className="text-sm self-center">/</span>
        <Input className="w-20" value={ratioDen} onChange={(e) => setRatioDen(e.target.value)} placeholder="Den" />
        <Input className="w-24" type="number" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="Cash" />
        <Input className="w-40" type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
        <Button type="button" onClick={create}>
          Announce
        </Button>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {["ANNOUNCED", "ENTITLED", "APPLIED", "SETTLED", "CANCELLED"].map((s) => (
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
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No corporate actions.</p>
      )}
      {rows.length > 0 && (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Ratio</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Entitlements</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-sm">{a.actionNumber}</TableCell>
                <TableCell>{a.actionType}</TableCell>
                <TableCell>{a.instrument?.instrumentCode || a.instrumentId}</TableCell>
                <TableCell>
                  {a.ratioNumerator}:{a.ratioDenominator}
                </TableCell>
                <TableCell>{a.recordDate || "—"}</TableCell>
                <TableCell>{a.status}</TableCell>
                <TableCell>{a.entitlements?.length ?? "—"}</TableCell>
                <TableCell className="space-x-1">
                  {a.status === "ANNOUNCED" && (
                    <Button size="sm" variant="outline" onClick={() => act(a.id, "entitlements")}>
                      Entitlements
                    </Button>
                  )}
                  {["ENTITLED", "ELECTED"].includes(a.status) && (
                    <Button size="sm" onClick={() => act(a.id, "apply")}>
                      Apply
                    </Button>
                  )}
                  {a.status === "APPLIED" && (
                    <Button size="sm" variant="outline" onClick={() => act(a.id, "settle")}>
                      Settle
                    </Button>
                  )}
                  {!["SETTLED", "CANCELLED", "APPLIED"].includes(a.status) && (
                    <Button size="sm" variant="ghost" onClick={() => act(a.id, "cancel")}>
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
