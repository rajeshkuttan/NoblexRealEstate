import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

const CHART_COLORS = ["#C9A84C", "#34D399", "#38BDF8", "#F472B6", "#A78BFA", "#FB923C"];

interface AllocationRow {
  name: string;
  value: number;
}

interface PartnerRow {
  name: string;
  ownershipPercentage: number;
}

interface PortfolioAllocationChartProps {
  assetAllocation?: AllocationRow[];
  partnerExposure?: PartnerRow[];
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload?: { name: string; value: number } }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload || payload[0];
  return (
    <div className="rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-xs text-noblex-platinum shadow-lg">
      <p className="text-noblex-gold-light font-medium">{row.name}</p>
      <p className="font-mono mt-1">{formatCurrencySafe(row.value)}</p>
    </div>
  );
}

export function PortfolioAllocationChart({ assetAllocation = [], partnerExposure = [] }: PortfolioAllocationChartProps) {
  const hasAllocation = assetAllocation.length > 0;
  const hasPartners = partnerExposure.length > 0;

  if (!hasAllocation && !hasPartners) {
    return (
      <div className="rounded-lg border border-noblex-border bg-noblex-surface p-6 text-sm text-noblex-slate text-center">
        No allocation data yet. Add active holdings to see portfolio breakdown.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg border border-noblex-border bg-noblex-surface p-4">
        <h3 className="text-sm font-medium text-noblex-gold-light mb-4">By asset type</h3>
        {hasAllocation ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={assetAllocation}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={80}
                innerRadius={44}
                paddingAngle={2}
              >
                {assetAllocation.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "#E2E8F0", paddingTop: 8 }}
                formatter={(value: string, entry: { payload?: { value?: number } }) => {
                  const total = assetAllocation.reduce((s, r) => s + r.value, 0);
                  const val = entry.payload?.value ?? 0;
                  const pct = total > 0 ? ((val / total) * 100).toFixed(0) : "0";
                  return `${value} (${pct}%)`;
                }}
              />
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-noblex-slate py-16 text-center">No holdings by type</p>
        )}
      </div>

      <div className="rounded-lg border border-noblex-border bg-noblex-surface p-4">
        <h3 className="text-sm font-medium text-noblex-gold-light mb-4">Partner ownership</h3>
        {hasPartners ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={partnerExposure} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 11 }} unit="%" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#E2E8F0", fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [`${value}%`, "Ownership"]}
                contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 8 }}
              />
              <Bar dataKey="ownershipPercentage" fill="#C9A84C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-noblex-slate py-16 text-center">No partner allocations recorded</p>
        )}
      </div>
    </div>
  );
}
