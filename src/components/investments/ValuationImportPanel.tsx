import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { investmentsAPI } from "@/services/api";
import { toast } from "sonner";

const CSV_TEMPLATE = `investmentCode,valuationDate,price,quantity,exchangeRate
INV-SEED-001,2026-06-01,105.50,,
`;

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (cols[i] !== undefined && cols[i] !== "") row[h] = cols[i];
    });
    return {
      investmentCode: row.investmentCode,
      investmentAssetId: row.investmentAssetId ? Number(row.investmentAssetId) : undefined,
      valuationDate: row.valuationDate,
      price: Number(row.price),
      quantity: row.quantity ? Number(row.quantity) : undefined,
      exchangeRate: row.exchangeRate ? Number(row.exchangeRate) : 1,
    };
  });
}

export function ValuationImportPanel({ onSuccess }: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  const [csvText, setCsvText] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "valuation-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    const rows = parseCsv(csvText);
    if (!rows.length) {
      toast.error("Paste CSV data with a header row and at least one data row");
      return;
    }
    setImporting(true);
    try {
      const res = await investmentsAPI.importValuations({ rows, autoApprove });
      const data = res.data?.data;
      const created = data?.created?.length || 0;
      const errors = data?.errors?.length || 0;
      if (created) toast.success(`Imported ${created} valuation(s)`);
      if (errors) toast.warning(`${errors} row(s) failed — see console`);
      if (errors) console.warn("Valuation import errors", data?.errors);
      setCsvText("");
      qc.invalidateQueries({ queryKey: ["investment-valuations-report"] });
      qc.invalidateQueries({ queryKey: ["investment-dashboard"] });
      onSuccess?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-lg border border-noblex-border bg-noblex-surface p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-noblex-gold-light">Bulk import valuations</h3>
          <p className="text-xs text-noblex-slate mt-1">
            CSV columns: investmentCode, valuationDate, price, quantity (optional), exchangeRate (optional)
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          Download template
        </Button>
      </div>
      <div>
        <Label htmlFor="valuation-csv">CSV data</Label>
        <textarea
          id="valuation-csv"
          className="mt-1 w-full min-h-[120px] rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm font-mono"
          placeholder={CSV_TEMPLATE}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-noblex-slate">
        <input
          type="checkbox"
          checked={autoApprove}
          onChange={(e) => setAutoApprove(e.target.checked)}
          className="rounded border-noblex-border"
        />
        Auto-approve imported valuations (posts revaluation GL when applicable)
      </label>
      <Button type="button" variant="noblex-primary" disabled={importing} onClick={runImport}>
        {importing ? "Importing…" : "Import valuations"}
      </Button>
    </div>
  );
}
