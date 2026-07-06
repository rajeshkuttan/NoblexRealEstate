import { CSSProperties } from "react";
import { LucideIcon } from "lucide-react";
import { NobleXKpiCard } from "@/components/noblex";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  gradient?: "primary" | "secondary" | "accent" | "alert";
  isCurrency?: boolean;
}

export default function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  isCurrency = false,
}: MetricCardProps) {
  return (
    <NobleXKpiCard
      label={title}
      value={value}
      subLabel={change}
      subLabelType={changeType === "positive" ? "positive" : changeType === "negative" ? "negative" : "neutral"}
      isCurrency={isCurrency}
      icon={<Icon className="h-5 w-5" strokeWidth={1.5} />}
    />
  );
}
