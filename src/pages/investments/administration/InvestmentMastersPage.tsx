import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type MasterKind = "brokers" | "custodians";

export default function InvestmentMastersPage({ kind }: { kind: MasterKind }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const title = kind === "brokers" ? "Brokers" : "Custodians";

  const { data, isLoading, refetch } = useQuery({
    queryKey: [`investment-${kind}`],
    queryFn: async () => {
      const res =
        kind === "brokers" ? await investmentsAPI.listBrokers() : await investmentsAPI.listCustodians();
      return res.data?.data || {};
    },
  });

  const rows = kind === "brokers" ? data?.brokers || [] : data?.custodians || [];

  const create = async () => {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    try {
      if (kind === "brokers") {
        await investmentsAPI.createBroker({ brokerName: name.trim() });
      } else {
        await investmentsAPI.createCustodian({ custodianName: name.trim() });
      }
      toast.success("Created");
      setName("");
      qc.invalidateQueries({ queryKey: [`investment-${kind}`] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader title={title} subtitle="Investment administration masters (Phase 17)" />
      <div className="flex gap-2">
        <Input placeholder={`New ${kind === "brokers" ? "broker" : "custodian"} name`} value={name} onChange={(e) => setName(e.target.value)} className="w-64" />
        <Button type="button" onClick={create}>
          Create
        </Button>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Refresh
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
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.brokerCode || r.custodianCode}</TableCell>
                <TableCell>{r.brokerName || r.custodianName}</TableCell>
                <TableCell>{r.status}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  None yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </NobleXDataTable>
      )}
    </div>
  );
}
