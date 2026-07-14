import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

interface PerformancePoint {
  period: string;
  marketValue: number;
  cost: number;
}

interface InvestmentPerformanceChartProps {
  data?: PerformancePoint[];
}

function formatPeriod(period: string, locale: string) {
  const [year, month] = period.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString(locale, { month: "short", year: "numeric" });
}

export function InvestmentPerformanceChart({ data = [] }: InvestmentPerformanceChartProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-AE" : "en-US";
  const chartData = data.map((row) => ({
    ...row,
    label: formatPeriod(row.period, locale),
  }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-lg border border-noblex-border bg-noblex-surface p-6 text-sm text-noblex-slate text-center">
        {t("investments.charts.noPerformance")}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-noblex-border bg-noblex-surface p-4">
      <h3 className="text-sm font-medium text-noblex-gold-light mb-4">{t("investments.charts.portfolioPerformance")}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="invMarketFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="invCostFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrencySafe(value),
              name === "marketValue" ? t("investments.charts.marketValue") : t("investments.charts.costBasis"),
            ]}
            contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#E2E8F0" }}
          />
          <Legend
            formatter={(value) => (value === "marketValue" ? t("investments.charts.marketValue") : t("investments.charts.costBasis"))}
            wrapperStyle={{ fontSize: 12, color: "#94A3B8" }}
          />
          <Area type="monotone" dataKey="cost" stroke="#38BDF8" fill="url(#invCostFill)" strokeWidth={2} />
          <Area type="monotone" dataKey="marketValue" stroke="#C9A84C" fill="url(#invMarketFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
