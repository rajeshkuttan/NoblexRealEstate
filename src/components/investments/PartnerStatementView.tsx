import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NobleXDataTable } from "@/components/noblex";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { investmentsAPI } from "@/services/api";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { exportInvestmentReportPdf } from "@/utils/investmentReportExport";
import { toast } from "sonner";

export function PartnerStatementView() {
  const [investorName, setInvestorName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState({ investorName: "", fromDate: "", toDate: "" });

  const { data: partners = [] } = useQuery({
    queryKey: ["investment-partners"],
    queryFn: async () => {
      const res = await investmentsAPI.getPartners();
      return (res.data?.data || []) as { investorName: string }[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["investment-partner-statement", applied],
    queryFn: async () => {
      const res = await investmentsAPI.getPartnerStatement(0, {
        investorName: applied.investorName || undefined,
        fromDate: applied.fromDate || undefined,
        toDate: applied.toDate || undefined,
      });
      return res.data?.data;
    },
    enabled: !!applied.investorName,
  });

  const apply = () => setApplied({ investorName, fromDate, toDate });

  const holdings = (data?.transactions || []).filter((line: { holdingShare?: unknown }) => line.holdingShare);
  const incomeLines = (data?.transactions || []).filter((line: { transaction?: unknown }) => line.transaction);

  const exportRows = [
    ...holdings.map((line: {
      investorName: string;
      asset?: { investmentName?: string; investmentCode?: string };
      holdingShare?: { ownershipPercentage: number; marketValueShare: number };
    }) => ({
      section: "Holding",
      investor: line.investorName,
      asset: line.asset?.investmentName,
      code: line.asset?.investmentCode,
      ownershipPct: line.holdingShare?.ownershipPercentage,
      amount: line.holdingShare?.marketValueShare,
    })),
    ...incomeLines.map((line: {
      investorName: string;
      asset?: { investmentName?: string };
      transaction?: { transactionType?: string; transactionDate?: string; baseAmount?: number };
      shareAmount?: number;
    }) => ({
      section: "Income",
      investor: line.investorName,
      asset: line.asset?.investmentName,
      type: line.transaction?.transactionType,
      date: line.transaction?.transactionDate,
      shareAmount: line.shareAmount,
      txnAmount: line.transaction?.baseAmount,
    })),
  ];

  const exportExcel = () => {
    if (!exportRows.length) {
      toast.error("No statement data to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "partner-statement");
    XLSX.writeFile(wb, `partner-statement-${applied.investorName.replace(/\s+/g, "-")}.xlsx`);
    toast.success("Exported to Excel");
  };

  const exportPdf = () => {
    if (!exportRows.length) {
      toast.error("No statement data to export");
      return;
    }
    exportInvestmentReportPdf(
      `Partner statement — ${applied.investorName}`,
      exportRows,
      `partner-statement-${applied.investorName.replace(/\s+/g, "-")}.pdf`
    );
    toast.success("Exported to PDF");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end rounded-lg border border-noblex-border bg-noblex-surface p-4">
        <div className="min-w-[200px]">
          <Label>Investor</Label>
          <select
            className="mt-1 w-full rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm h-10"
            value={investorName}
            onChange={(e) => setInvestorName(e.target.value)}
          >
            <option value="">Select investor…</option>
            {partners.map((p) => (
              <option key={p.investorName} value={p.investorName}>{p.investorName}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1" />
        </div>
        <Button variant="outline" onClick={apply}>Generate</Button>
        {applied.investorName && (
          <>
            <Button variant="noblex-secondary" onClick={exportExcel}>Export Excel</Button>
            <Button variant="outline" onClick={exportPdf}>Export PDF</Button>
          </>
        )}
      </div>

      {!applied.investorName ? (
        <p className="text-sm text-noblex-slate">Select an investor to generate a partner statement.</p>
      ) : isLoading ? (
        <p className="text-sm text-noblex-slate">Loading statement…</p>
      ) : (
        <>
          <div>
            <h4 className="text-sm font-medium text-noblex-gold-light mb-3">Holdings share</h4>
            <NobleXDataTable>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Ownership %</TableHead>
                  <TableHead>Market value share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((line: {
                  investorName: string;
                  asset?: { investmentName?: string };
                  holdingShare?: { ownershipPercentage: number; marketValueShare: number };
                }, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{line.asset?.investmentName || "—"}</TableCell>
                    <TableCell className="font-mono">{line.holdingShare?.ownershipPercentage}%</TableCell>
                    <TableCell className="font-mono">{formatCurrencySafe(line.holdingShare?.marketValueShare)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </NobleXDataTable>
          </div>

          <div>
            <h4 className="text-sm font-medium text-noblex-gold-light mb-3">Income & distributions</h4>
            <NobleXDataTable>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Share amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeLines.map((line: {
                  asset?: { investmentName?: string };
                  transaction?: { transactionType?: string; transactionDate?: string };
                  shareAmount?: number;
                }, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{line.asset?.investmentName || "—"}</TableCell>
                    <TableCell>{line.transaction?.transactionType}</TableCell>
                    <TableCell>{line.transaction?.transactionDate}</TableCell>
                    <TableCell className="font-mono">{formatCurrencySafe(line.shareAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </NobleXDataTable>
          </div>
        </>
      )}
    </div>
  );
}
