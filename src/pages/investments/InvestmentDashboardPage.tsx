import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NobleXPageHeader } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { InvestmentSummaryCards } from "@/components/investments/InvestmentSummaryCards";
import { PortfolioAllocationChart } from "@/components/investments/PortfolioAllocationChart";
import { InvestmentPerformanceChart } from "@/components/investments/InvestmentPerformanceChart";
import { InvestmentMaturityCalendar } from "@/components/investments/InvestmentMaturityCalendar";
import { useInvestmentDashboard } from "@/hooks/investments/useInvestment";
import { NobleXKpiSkeleton } from "@/components/noblex";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

export default function InvestmentDashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useInvestmentDashboard();

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title={t("investments.dashboard.title")}
        subtitle={t("investments.dashboard.subtitle")}
        actions={
          <Button variant="noblex-primary" asChild>
            <Link to="/investments/assets/new">New asset</Link>
          </Button>
        }
      />

      {isLoading ? <NobleXKpiSkeleton count={7} /> : <InvestmentSummaryCards kpis={data?.kpis} />}

      <PortfolioAllocationChart
        assetAllocation={data?.assetAllocation}
        partnerExposure={data?.partnerExposure}
      />

      <InvestmentPerformanceChart data={data?.performanceTrend} />

      <InvestmentMaturityCalendar items={data?.maturityCalendar} />

      <div className="rounded-lg border border-noblex-border bg-noblex-surface p-4">
        <h3 className="text-sm font-medium text-noblex-gold-light mb-4">Currency exposure</h3>
        <ul className="space-y-2">
          {(data?.currencyExposure || []).length === 0 ? (
            <li className="text-sm text-noblex-slate">No currency exposure data</li>
          ) : (
            (data?.currencyExposure || []).map((row: { currency: string; value: number }) => (
              <li key={row.currency} className="flex justify-between text-sm text-noblex-platinum">
                <span>{row.currency}</span>
                <span className="font-mono">{formatCurrencySafe(row.value)}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
