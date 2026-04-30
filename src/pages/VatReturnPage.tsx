import { useEffect, useState } from "react";
import { toast } from "sonner";
import { vatReturnsAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function VatReturnPage() {
  const year = new Date().getFullYear();
  const q = Math.ceil((new Date().getMonth() + 1) / 3);
  const [y, setY] = useState(String(year));
  const [quarter, setQuarter] = useState(String(q));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [inputGl, setInputGl] = useState("");
  const [outputGl, setOutputGl] = useState("");
  const [payableGl, setPayableGl] = useState("");
  const [reverseJv, setReverseJv] = useState(false);
  const [jvPayload, setJvPayload] = useState<any>(null);
  const [jvLoading, setJvLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await vatReturnsAPI.getQuarterSummary({
        year: y,
        quarter,
      });
      setData(res.data?.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load VAT summary");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const suggestJv = async () => {
    if (!inputGl.trim() || !outputGl.trim() || !payableGl.trim()) {
      toast.error("Enter chart-of-accounts IDs for input VAT, output VAT, and VAT payable.");
      return;
    }
    try {
      setJvLoading(true);
      const res = await vatReturnsAPI.suggestJournalVoucher({
        year: parseInt(y, 10),
        quarter: parseInt(quarter, 10),
        inputVatLedgerId: parseInt(inputGl, 10),
        outputVatLedgerId: parseInt(outputGl, 10),
        vatPayableLedgerId: parseInt(payableGl, 10),
        reverse: reverseJv,
      });
      setJvPayload(res.data?.data ?? null);
      toast.success("JV lines generated — copy JSON or enter lines on the Journal Voucher screen.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Suggest JV failed");
      setJvPayload(null);
    } finally {
      setJvLoading(false);
    }
  };

  const copyJvJson = async () => {
    if (!jvPayload) return;
    try {
      const body = {
        narration: jvPayload.narration,
        details: jvPayload.details,
        totals: jvPayload.totals,
      };
      await navigator.clipboard.writeText(JSON.stringify(body, null, 2));
      toast.success("Copied JV suggestion JSON");
    } catch {
      toast.error("Clipboard not available");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 uiux-page-enter max-w-3xl">
      <div className="uiux-page-header">
        <h1 className="uiux-page-title">VAT return (quarterly)</h1>
        <p className="uiux-page-subtitle">
          Summarize output VAT from tenant invoices and input VAT from supplier invoices for the quarter.
          Post journal vouchers and VAT payable payments via existing JV and payment screens.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quarter</CardTitle>
          <CardDescription>Select period and refresh.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="w-32">
            <Select value={y} onValueChange={setY}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2].map((i) => (
                  <SelectItem key={i} value={String(year - i)}>
                    {year - i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Q{n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </Button>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>
              {data.year} Q{data.quarter}
            </CardTitle>
            <CardDescription>
              {data.periodStart?.slice(0, 10)} → {data.periodEnd?.slice(0, 10)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Output VAT (AR invoices):</span>{" "}
              <strong>{Number(data.outputVat || 0).toFixed(2)} AED</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Input VAT (supplier invoices):</span>{" "}
              <strong>{Number(data.inputVat || 0).toFixed(2)} AED</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Net VAT payable (approx.):</span>{" "}
              <strong>{Number(data.netVatPayable || 0).toFixed(2)} AED</strong>
            </p>
            <p className="text-xs text-muted-foreground pt-2">{data.note}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Journal voucher suggestion</CardTitle>
          <CardDescription>
            Balanced Dr/Cr lines for your JV API — enter ledger IDs from chart of accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Input VAT ledger ID</Label>
              <Input value={inputGl} onChange={(e) => setInputGl(e.target.value)} placeholder="e.g. 101" />
            </div>
            <div>
              <Label className="text-xs">Output VAT ledger ID</Label>
              <Input value={outputGl} onChange={(e) => setOutputGl(e.target.value)} placeholder="e.g. 102" />
            </div>
            <div>
              <Label className="text-xs">VAT payable / clearing ID</Label>
              <Input value={payableGl} onChange={(e) => setPayableGl(e.target.value)} placeholder="e.g. 103" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="reverseJv"
              checked={reverseJv}
              onCheckedChange={(c) => setReverseJv(c === true)}
            />
            <Label htmlFor="reverseJv" className="text-sm font-normal cursor-pointer">
              Reverse (prior-period adjustment)
            </Label>
          </div>
          <Button type="button" variant="secondary" onClick={suggestJv} disabled={jvLoading}>
            {jvLoading ? "Building…" : "Suggest JV lines"}
          </Button>
          {jvPayload?.details?.length ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Debit {jvPayload.totals?.debit?.toFixed?.(2) ?? jvPayload.totals?.debit} / Credit{" "}
                {jvPayload.totals?.credit?.toFixed?.(2) ?? jvPayload.totals?.credit}
              </p>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-48">
                {JSON.stringify(jvPayload.details, null, 2)}
              </pre>
              <Button type="button" variant="outline" size="sm" onClick={copyJvJson}>
                Copy JSON
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
