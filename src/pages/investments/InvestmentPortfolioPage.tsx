import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { NobleXPageHeader, NobleXSearchFilterBar } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { InvestmentListTable } from "@/components/investments/InvestmentListTable";
import { useInvestmentPortfolio } from "@/hooks/investments/useInvestment";
import { NobleXTableSkeleton } from "@/components/noblex";

export default function InvestmentPortfolioPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const params = {
    search: search || undefined,
    status: status || undefined,
    limit: 50,
  };
  const { data, isLoading } = useInvestmentPortfolio(params);

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title={t("investments.portfolio.title")}
        subtitle={t("investments.portfolio.subtitle")}
        actions={
          <Button variant="noblex-primary" asChild>
            <Link to="/investments/assets/new">New asset</Link>
          </Button>
        }
      />
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <NobleXSearchFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Search by name, code, ticker…"
          />
        </div>
        <div>
          <select
            className="rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm h-10"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {["DRAFT", "ACTIVE", "SOLD", "MATURED", "CLOSED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      {isLoading ? <NobleXTableSkeleton rows={8} /> : <InvestmentListTable assets={data?.assets || []} />}
    </div>
  );
}
