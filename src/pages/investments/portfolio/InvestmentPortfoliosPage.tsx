import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { toast } from "sonner";

export default function InvestmentPortfoliosPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["investment-portfolios-v2", page],
    queryFn: async () => {
      const res = await investmentsAPI.listPortfoliosV2({ page, limit: 20 });
      return res.data?.data || { portfolios: [], pagination: {} };
    },
  });

  const create = async () => {
    if (!name.trim()) {
      toast.error("Portfolio name required");
      return;
    }
    try {
      await investmentsAPI.createPortfolioV2({ portfolioName: name.trim() });
      toast.success("Portfolio created");
      setName("");
      qc.invalidateQueries({ queryKey: ["investment-portfolios-v2"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  const portfolios = data?.portfolios || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title="Investment Portfolios"
        subtitle="Institutional portfolio books and holdings (Phase 17)"
      />
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <Input
            placeholder="New portfolio name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64"
          />
        </div>
        <Button type="button" onClick={create}>
          Create portfolio
        </Button>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && (
        <p className="text-sm text-destructive">
          Failed to load.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </p>
      )}
      {!isLoading && portfolios.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No portfolios yet.</p>
      )}
      {portfolios.length > 0 && (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Books</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {portfolios.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.portfolioCode}</TableCell>
                <TableCell>{p.portfolioName}</TableCell>
                <TableCell>{p.reportingCurrency}</TableCell>
                <TableCell>{p.status}</TableCell>
                <TableCell>{p.books?.length ?? 0}</TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/investments/portfolios/${p.id}`}>Open 360°</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      )}
      {pagination.totalPages > 1 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm self-center">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            type="button"
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
