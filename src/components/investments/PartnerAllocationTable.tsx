import { Button } from "@/components/ui/button";
import { NobleXDataTable } from "@/components/noblex";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

export interface AllocationRow {
  id: number;
  investorName: string;
  investorType: string;
  ownershipPercentage: number;
  profitSharePercentage?: number;
  dividendSharePercentage?: number;
  contributionAmount?: number;
}

interface PartnerAllocationTableProps {
  allocations: AllocationRow[];
  totalPercentage?: number;
  onDelete?: (id: number) => void;
  emptyMessage?: string;
}

export function PartnerAllocationTable({
  allocations,
  totalPercentage,
  onDelete,
  emptyMessage = "No allocations for this asset.",
}: PartnerAllocationTableProps) {
  const total = totalPercentage ?? allocations.reduce((s, a) => s + Number(a.ownershipPercentage || 0), 0);
  const totalOk = Math.abs(total - 100) < 0.01;

  return (
    <div className="space-y-3">
      <div className={`text-sm ${totalOk ? "text-emerald-400" : "text-amber-400"}`}>
        Total ownership: <span className="font-mono">{total.toFixed(2)}%</span>
        {!totalOk && " — must equal 100%"}
      </div>
      <NobleXDataTable>
        <TableHeader>
          <TableRow>
            <TableHead>Investor</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Ownership %</TableHead>
            <TableHead>Profit %</TableHead>
            <TableHead>Dividend %</TableHead>
            <TableHead>Contribution</TableHead>
            {onDelete && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {allocations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={onDelete ? 7 : 6} className="text-center text-noblex-slate py-8">{emptyMessage}</TableCell>
            </TableRow>
          ) : (
            allocations.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.investorName}</TableCell>
                <TableCell>{a.investorType}</TableCell>
                <TableCell className="font-mono">{a.ownershipPercentage}%</TableCell>
                <TableCell className="font-mono">{a.profitSharePercentage ?? a.ownershipPercentage}%</TableCell>
                <TableCell className="font-mono">{a.dividendSharePercentage ?? a.ownershipPercentage}%</TableCell>
                <TableCell className="font-mono">{formatCurrencySafe(a.contributionAmount)}</TableCell>
                {onDelete && (
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-rose-400" onClick={() => onDelete(a.id)}>Remove</Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </NobleXDataTable>
    </div>
  );
}
