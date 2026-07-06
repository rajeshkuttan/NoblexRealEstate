import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { investmentsAPI } from "@/services/api";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { exportInvestmentReportPdf } from "@/utils/investmentReportExport";
import { toast } from "sonner";

export function InvestmentMonthEndPanel() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-month-end"],
    queryFn: async () => {
      const res = await investmentsAPI.getMonthEndReconciliation();
      return res.data?.data;
    },
  });

  const exportExcel = () => {
    if (!data) return;
    const rows = [
      { section: "Trial balance", gl: data.trialBalance?.glInvestmentAssetBalance, subledger: data.trialBalance?.subLedgerTotalCost, diff: data.trialBalance?.difference },
      ...(data.unpostedApprovedTransactions || []).map((t: { transactionNo: string; transactionType: string; baseAmount: number }) => ({
        section: "Unposted", transactionNo: t.transactionNo, type: t.transactionType, amount: t.baseAmount,
      })),
      ...(data.pendingValuations || []).map((v: { valuationNo: string; valuationDate: string }) => ({
        section: "Pending valuation", valuationNo: v.valuationNo, date: v.valuationDate,
      })),
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "month-end");
    XLSX.writeFile(wb, "investment-month-end-reconciliation.xlsx");
    toast.success("Exported to Excel");
  };

  const exportPdf = () => {
    if (!data) return;
    exportInvestmentReportPdf("Investment month-end reconciliation", [data.trialBalance || {}], "investment-month-end.pdf");
    toast.success("Exported to PDF");
  };

  if (isLoading) return <p className="text-sm text-noblex-slate">Loading month-end reconciliation…</p>;

  const tb = data?.trialBalance;
  const mismatch = tb && Math.abs(Number(tb.difference || 0)) >= 0.01;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
        <Button variant="noblex-secondary" size="sm" onClick={exportExcel}>Export Excel</Button>
        <Button variant="outline" size="sm" onClick={exportPdf}>Export PDF</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-noblex-border p-4">
          <p className="text-xs text-noblex-slate">GL investment asset</p>
          <p className="font-mono text-lg">{formatCurrencySafe(tb?.glInvestmentAssetBalance)}</p>
        </div>
        <div className="rounded-lg border border-noblex-border p-4">
          <p className="text-xs text-noblex-slate">Sub-ledger total cost</p>
          <p className="font-mono text-lg">{formatCurrencySafe(tb?.subLedgerTotalCost)}</p>
        </div>
        <div className={`rounded-lg border p-4 ${mismatch ? "border-amber-500/50" : "border-noblex-border"}`}>
          <p className="text-xs text-noblex-slate">Difference</p>
          <p className="font-mono text-lg">{formatCurrencySafe(tb?.difference)}</p>
        </div>
      </div>
      {(data?.unpostedApprovedTransactions?.length || 0) > 0 && (
        <div>
          <h4 className="text-sm font-medium text-noblex-gold-light mb-2">Unposted approved transactions</h4>
          <ul className="text-sm space-y-1">
            {data.unpostedApprovedTransactions.map((t: { id: number; transactionNo: string; transactionType: string }) => (
              <li key={t.id}>
                <Link to="/investments/transactions" className="text-noblex-gold hover:underline">{t.transactionNo}</Link>
                {" — "}{t.transactionType}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(data?.pendingValuations?.length || 0) > 0 && (
        <div>
          <h4 className="text-sm font-medium text-noblex-gold-light mb-2">Pending valuations</h4>
          <p className="text-sm text-noblex-slate">{data.pendingValuations.length} valuation(s) awaiting approval</p>
        </div>
      )}
      {data?.periodStatus && (
        <p className="text-xs text-noblex-slate">Period status: {data.periodStatus.status} — can post: {data.periodStatus.canPost ? "yes" : "no"}</p>
      )}
    </div>
  );
}
