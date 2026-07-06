import { Link } from "react-router-dom";
import { NobleXDataTable } from "@/components/noblex";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@phosphor-icons/react";

interface MaturityRow {
  id: number;
  investmentCode: string;
  investmentName: string;
  maturityDate: string;
  assetType?: string;
}

export function InvestmentMaturityCalendar({ items = [] }: { items?: MaturityRow[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-noblex-border bg-noblex-surface p-4 text-sm text-noblex-slate">
        No maturities in the next 30 days.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-noblex-border bg-noblex-surface p-4">
      <h3 className="text-sm font-medium text-noblex-gold-light mb-3 flex items-center gap-2">
        <Calendar size={16} weight="bold" />
        Maturing within 30 days
      </h3>
      <NobleXDataTable>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Asset</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.maturityDate}</TableCell>
              <TableCell>
                <Link to={`/investments/assets/${row.id}`} className="font-mono text-noblex-gold hover:underline text-sm">
                  {row.investmentCode}
                </Link>
              </TableCell>
              <TableCell>{row.investmentName}</TableCell>
              <TableCell>{row.assetType || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </NobleXDataTable>
    </div>
  );
}
