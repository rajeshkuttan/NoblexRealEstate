import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export type ChartSpec = {
  type: "bar" | "pie" | "line";
  title?: string;
  xKey?: string;
  yKey?: string;
  series: Array<{ label: string; value: number }>;
};

const COLORS = ["#C9A84C", "#1E3A72", "#7A8BA8", "#E8D5A3", "#4A6FA5", "#8B7355"];

type Props = {
  chart: ChartSpec;
  className?: string;
};

export default function CopilotChart({ chart, className }: Props) {
  const data = (chart.series || []).map((s) => ({
    label: s.label,
    value: Number(s.value) || 0,
  }));
  if (!data.length) return null;

  return (
    <div className={className || "mt-3 rounded-lg border border-border/60 bg-background/40 p-3"}>
      {chart.title && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {chart.title}
        </div>
      )}
      <div className="h-52 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "pie" ? (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : chart.type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
