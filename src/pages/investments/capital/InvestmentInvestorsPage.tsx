import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function InvestmentInvestorsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [type, setType] = useState("PARTNER");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-investors", page],
    queryFn: async () => {
      const res = await investmentsAPI.listInvestors({ page, limit: 20 });
      return res.data?.data || { investors: [], pagination: {} };
    },
  });

  const create = async () => {
    if (!name.trim()) {
      toast.error("Legal name required");
      return;
    }
    try {
      await investmentsAPI.createInvestor({ legalName: name.trim(), investorType: type });
      toast.success("Investor created");
      setName("");
      qc.invalidateQueries({ queryKey: ["investment-investors"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  const investors = data?.investors || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader title="Investors" subtitle="Partner capital master — KYC, commitments, ownership" />
      <div className="flex flex-wrap gap-2 items-end">
        <Input className="w-64" placeholder="Legal name" value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["OWNER", "PARTNER", "COMPANY", "FAMILY_OFFICE", "TRUST", "EXTERNAL_INVESTOR"].map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={create}>
          Add investor
        </Button>
        <Button asChild variant="outline">
          <Link to="/investments/capital">Capital & distributions</Link>
        </Button>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && investors.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No investors yet.</p>
      )}
      {investors.length > 0 && (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {investors.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-sm">{inv.investorCode}</TableCell>
                <TableCell>{inv.displayName || inv.legalName}</TableCell>
                <TableCell>{inv.investorType}</TableCell>
                <TableCell>{inv.kycStatus}</TableCell>
                <TableCell>{inv.status}</TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/investments/investors/${inv.id}`}>Open 360°</Link>
                  </Button>
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
