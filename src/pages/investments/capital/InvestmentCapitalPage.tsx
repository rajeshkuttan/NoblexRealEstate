import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { toast } from "sonner";

export default function InvestmentCapitalPage() {
  const qc = useQueryClient();
  const [portfolioId, setPortfolioId] = useState("");
  const [investorId, setInvestorId] = useState("");
  const [commitAmt, setCommitAmt] = useState("100000");
  const [callAmt, setCallAmt] = useState("50000");
  const [ownPct, setOwnPct] = useState("50");
  const [distAmt, setDistAmt] = useState("25000");

  const { data: portfolios } = useQuery({
    queryKey: ["investment-portfolios-v2-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listPortfoliosV2({ page: 1, limit: 50 });
      return res.data?.data?.portfolios || [];
    },
  });
  const { data: investors } = useQuery({
    queryKey: ["investment-investors-mini"],
    queryFn: async () => {
      const res = await investmentsAPI.listInvestors({ page: 1, limit: 50 });
      return res.data?.data?.investors || [];
    },
  });
  const { data: calls, refetch: refetchCalls } = useQuery({
    queryKey: ["investment-capital-calls"],
    queryFn: async () => {
      const res = await investmentsAPI.listCapitalCalls({ page: 1, limit: 20 });
      return res.data?.data?.capitalCalls || [];
    },
  });
  const { data: runs, refetch: refetchRuns } = useQuery({
    queryKey: ["investment-dist-runs"],
    queryFn: async () => {
      const res = await investmentsAPI.listDistributionRuns({ page: 1, limit: 20 });
      return res.data?.data?.distributionRuns || [];
    },
  });

  const addCommitment = async () => {
    if (!portfolioId || !investorId) return toast.error("Select portfolio and investor");
    try {
      await investmentsAPI.createCommitment({
        portfolioId: Number(portfolioId),
        investorId: Number(investorId),
        commitmentAmount: Number(commitAmt),
      });
      toast.success("Commitment created");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const setOwn = async () => {
    if (!portfolioId || !investorId) return toast.error("Select portfolio and investor");
    try {
      await investmentsAPI.setOwnership({
        portfolioId: Number(portfolioId),
        investorId: Number(investorId),
        ownershipPercentage: Number(ownPct),
        effectiveFrom: new Date().toISOString().slice(0, 10),
      });
      toast.success("Ownership recorded (prior rows superseded)");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const createCall = async () => {
    if (!portfolioId) return toast.error("Select portfolio");
    try {
      await investmentsAPI.createCapitalCall({
        portfolioId: Number(portfolioId),
        totalAmount: Number(callAmt),
        purpose: "Investment funding",
      });
      toast.success("Capital call drafted with lines");
      refetchCalls();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const issueCall = async (id: number) => {
    try {
      await investmentsAPI.issueCapitalCall(id);
      toast.success("Issued");
      refetchCalls();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const createDist = async () => {
    if (!portfolioId) return toast.error("Select portfolio");
    try {
      const res = await investmentsAPI.createDistributionRun({
        portfolioId: Number(portfolioId),
        grossDistributableAmount: Number(distAmt),
        distributionType: "PRO_RATA",
        periodEnd: new Date().toISOString().slice(0, 10),
      });
      const id = res.data?.data?.id;
      if (id) await investmentsAPI.calculateDistributionRun(id);
      toast.success("Distribution calculated");
      refetchRuns();
      qc.invalidateQueries({ queryKey: ["investment-dist-runs"] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const advanceDist = async (id: number, action: string) => {
    try {
      if (action === "approve") await investmentsAPI.approveDistributionRun(id);
      if (action === "pay") await investmentsAPI.payDistributionRun(id);
      toast.success(action);
      refetchRuns();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="space-y-8 p-1">
      <NobleXPageHeader
        title="Partner capital"
        subtitle="Commitments, capital calls, ownership, waterfall distributions"
      />
      <div className="flex flex-wrap gap-2 items-end">
        <Select value={portfolioId || undefined} onValueChange={setPortfolioId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Portfolio" />
          </SelectTrigger>
          <SelectContent>
            {(portfolios || []).map((p: any) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.portfolioName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={investorId || undefined} onValueChange={setInvestorId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Investor" />
          </SelectTrigger>
          <SelectContent>
            {(investors || []).map((i: any) => (
              <SelectItem key={i.id} value={String(i.id)}>
                {i.legalName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild variant="outline">
          <Link to="/investments/investors">Investors</Link>
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Commitment & ownership</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-36" type="number" value={commitAmt} onChange={(e) => setCommitAmt(e.target.value)} />
          <Button type="button" onClick={addCommitment}>
            Add commitment
          </Button>
          <Input className="w-24" type="number" value={ownPct} onChange={(e) => setOwnPct(e.target.value)} />
          <Button type="button" variant="outline" onClick={setOwn}>
            Set ownership %
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Capital calls</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-36" type="number" value={callAmt} onChange={(e) => setCallAmt(e.target.value)} />
          <Button type="button" onClick={createCall}>
            Create call
          </Button>
        </div>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(calls || []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.callNumber}</TableCell>
                <TableCell>{formatCurrencySafe(Number(c.totalAmount))}</TableCell>
                <TableCell>{c.status}</TableCell>
                <TableCell>
                  {c.status === "DRAFT" && (
                    <Button size="sm" variant="outline" onClick={() => issueCall(c.id)}>
                      Issue
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Distribution runs</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-36" type="number" value={distAmt} onChange={(e) => setDistAmt(e.target.value)} />
          <Button type="button" onClick={createDist}>
            Create & calculate
          </Button>
        </div>
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Net</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(runs || []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.distributionNumber}</TableCell>
                <TableCell>{formatCurrencySafe(Number(r.netDistributableAmount))}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell className="space-x-1">
                  {["CALCULATED", "UNDER_REVIEW"].includes(r.status) && (
                    <Button size="sm" variant="outline" onClick={() => advanceDist(r.id, "approve")}>
                      Approve
                    </Button>
                  )}
                  {r.status === "APPROVED" && (
                    <Button size="sm" onClick={() => advanceDist(r.id, "pay")}>
                      Pay
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      </section>
    </div>
  );
}
