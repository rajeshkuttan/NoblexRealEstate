import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NobleXKpiStrip, NobleXKpiCard } from "@/components/noblex";
import { ChartPie, TrendUp, CurrencyCircleDollar, ChartLineUp, Calendar } from "@phosphor-icons/react";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

interface DashboardKpis {
  totalInvestedCost?: number;
  currentMarketValue?: number;
  realizedGainLoss?: number;
  unrealizedGainLoss?: number;
  dividendsReceived?: number;
  roi?: number;
  activeAssets?: number;
  maturingSoon?: number;
}

export function InvestmentSummaryCards({ kpis }: { kpis?: DashboardKpis }) {
  const { t } = useTranslation();
  const k = kpis || {};
  const currencyCard = (label: string, amount: number | undefined, icon: ReactNode) => (
    <NobleXKpiCard
      icon={icon}
      label={label}
      value={formatCurrencySafe(amount)}
      valueTitle={formatCurrencySafe(amount)}
      isCurrency
    />
  );
  return (
    <NobleXKpiStrip>
      {currencyCard(t("investments.kpi.investedCost"), k.totalInvestedCost, <CurrencyCircleDollar size={20} weight="bold" />)}
      {currencyCard(t("investments.kpi.marketValue"), k.currentMarketValue, <ChartLineUp size={20} weight="bold" />)}
      {currencyCard(t("investments.kpi.unrealizedGain"), k.unrealizedGainLoss, <TrendUp size={20} weight="bold" />)}
      {currencyCard(t("investments.kpi.realizedGain"), k.realizedGainLoss, <TrendUp size={20} weight="bold" />)}
      {currencyCard(t("investments.kpi.incomeReceived"), k.dividendsReceived, <CurrencyCircleDollar size={20} weight="bold" />)}
      <NobleXKpiCard icon={<ChartPie size={20} weight="bold" />} label={t("investments.kpi.roi")} value={k.roi != null ? `${k.roi}%` : "—"} animate={false} />
      <NobleXKpiCard icon={<Calendar size={20} weight="bold" />} label={t("investments.kpi.maturingSoon")} value={k.maturingSoon ?? 0} animate={false} />
    </NobleXKpiStrip>
  );
}
