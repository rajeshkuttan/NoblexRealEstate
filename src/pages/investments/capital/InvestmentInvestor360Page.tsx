import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { investmentsAPI } from "@/services/api";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

export default function InvestmentInvestor360Page() {
  const { id } = useParams();
  const investorId = Number(id);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["investment-investor-360", investorId],
    queryFn: async () => {
      const res = await investmentsAPI.getInvestor360(investorId);
      return res.data?.data;
    },
    enabled: !!investorId,
  });

  const { data: statement } = useQuery({
    queryKey: ["investment-partner-statement", investorId],
    queryFn: async () => {
      const res = await investmentsAPI.getPartnerStatementV2(investorId);
      return res.data?.data;
    },
    enabled: !!investorId,
  });

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  if (isError || !data?.investor) {
    return (
      <p className="p-4 text-sm text-destructive">
        Failed to load.{" "}
        <button type="button" className="underline" onClick={() => refetch()}>
          Retry
        </button>
      </p>
    );
  }

  const inv = data.investor;
  const commitments = inv.commitments || [];
  const accounts = inv.capitalAccounts || [];
  const ownership = data.currentOwnership || [];

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title={inv.displayName || inv.legalName}
        subtitle={`${inv.investorCode} · ${inv.investorType} · KYC ${inv.kycStatus}`}
      />
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/investments/investors">Back</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/investments/capital">Capital ops</Link>
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground">
          {inv.email || "No email"} · {inv.jurisdiction || "—"} · Onboarding {inv.onboardingStatus}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Current ownership</h2>
        {ownership.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active ownership.</p>
        ) : (
          <ul className="text-sm list-disc pl-5">
            {ownership.map((o: any) => (
              <li key={o.id}>
                Portfolio {o.portfolioId}: {o.ownershipPercentage}% from {o.effectiveFrom}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Commitments</h2>
        {commitments.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          <NobleXDataTable>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Portfolio</TableHead>
                <TableHead>Committed</TableHead>
                <TableHead>Funded</TableHead>
                <TableHead>Unfunded</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commitments.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.commitmentNumber}</TableCell>
                  <TableCell>{c.portfolio?.portfolioName || c.portfolioId}</TableCell>
                  <TableCell>{formatCurrencySafe(Number(c.commitmentAmount))}</TableCell>
                  <TableCell>{formatCurrencySafe(Number(c.fundedAmount))}</TableCell>
                  <TableCell>{formatCurrencySafe(Number(c.unfundedAmount))}</TableCell>
                  <TableCell>{c.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </NobleXDataTable>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Capital accounts</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          <NobleXDataTable>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead>Contributions</TableHead>
                <TableHead>Distributions</TableHead>
                <TableHead>Closing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.period}</TableCell>
                  <TableCell>{formatCurrencySafe(Number(a.openingBalance))}</TableCell>
                  <TableCell>{formatCurrencySafe(Number(a.contributions))}</TableCell>
                  <TableCell>{formatCurrencySafe(Number(a.distributions))}</TableCell>
                  <TableCell>{formatCurrencySafe(Number(a.closingBalance))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </NobleXDataTable>
        )}
      </section>

      {statement?.capitalAccount && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Partner statement ({statement.period || "current"})</h2>
          <pre className="text-xs bg-muted/40 p-3 rounded overflow-auto">
            {JSON.stringify(statement.capitalAccount, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
