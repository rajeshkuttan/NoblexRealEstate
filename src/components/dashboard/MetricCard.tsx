import { CSSProperties } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  gradient?: "primary" | "secondary" | "accent" | "alert";
  /** When true, value uses mono font (AED amounts) */
  isCurrency?: boolean;
}

const accentByGradient: Record<
  NonNullable<MetricCardProps["gradient"]>,
  { color: string; bg: string }
> = {
  primary: { color: "#1E3A72", bg: "#DBEAFE" },
  secondary: { color: "#16A34A", bg: "#DCFCE7" },
  accent: { color: "#C9922B", bg: "#FEF3C7" },
  alert: { color: "#DC2626", bg: "#FEE2E2" },
};

export default function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  gradient = "primary",
  isCurrency = false,
}: MetricCardProps) {
  const { color, bg } = accentByGradient[gradient];
  const cardStyle = {
    "--card-accent-color": color,
    "--card-accent-bg": bg,
  } as CSSProperties;

  return (
    <div className="uiux-stat-card" style={cardStyle}>
      <p className="uiux-stat-card-label">{title}</p>
      <p
        className={cn(
          "uiux-stat-card-value",
          isCurrency && "uiux-stat-card-value-currency",
        )}
      >
        {value}
      </p>
      {change && (
        <p
          className={cn(
            "uiux-stat-card-sub",
            changeType === "positive" && "uiux-stat-card-sub-positive",
            changeType === "negative" && "uiux-stat-card-sub-negative",
          )}
        >
          {change}
        </p>
      )}
      <div className="uiux-stat-card-icon" aria-hidden>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </div>
    </div>
  );
}
