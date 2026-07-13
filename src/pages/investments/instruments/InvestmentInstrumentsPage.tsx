import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function InvestmentInstrumentsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState("EQUITY");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-instruments", page, search],
    queryFn: async () => {
      const res = await investmentsAPI.listInstruments({ page, limit: 20, search: search || undefined });
      return res.data?.data || { instruments: [], pagination: {} };
    },
  });

  const create = async () => {
    if (!name.trim()) {
      toast.error("Instrument name required");
      return;
    }
    try {
      await investmentsAPI.createInstrument({
        instrumentName: name.trim(),
        assetClass,
        instrumentType: assetClass,
      });
      toast.success("Instrument created");
      setName("");
      qc.invalidateQueries({ queryKey: ["investment-instruments"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    }
  };

  const instruments = data?.instruments || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader title="Instruments" subtitle="Security / instrument master (Phase 17)" />
      <div className="flex flex-wrap gap-2 items-end">
        <Input
          placeholder="Search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-48"
        />
        <Input placeholder="New instrument name" value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
        <Input placeholder="Asset class" value={assetClass} onChange={(e) => setAssetClass(e.target.value)} className="w-40" />
        <Button type="button" onClick={create}>
          Create
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>ISIN / Ticker</TableHead>
              <TableHead>CCY</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {instruments.map((i: any) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-sm">{i.instrumentCode}</TableCell>
                <TableCell>{i.instrumentName}</TableCell>
                <TableCell>{i.assetClass || i.instrumentType || "—"}</TableCell>
                <TableCell className="text-sm">
                  {i.isin || "—"} / {i.ticker || "—"}
                </TableCell>
                <TableCell>{i.currencyCode}</TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/investments/instruments/${i.id}`}>Open 360°</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {instruments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No instruments
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </NobleXDataTable>
      )}
      {pagination.totalPages > 1 && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
