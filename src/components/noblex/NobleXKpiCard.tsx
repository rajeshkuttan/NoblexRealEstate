import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface NobleXKpiCardProps {
  label: string;
  value: string | number;
  valueTitle?: string;
  subLabel?: string;
  subLabelType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  isCurrency?: boolean;
  highlight?: boolean;
  animate?: boolean;
  className?: string;
}

function useCountUp(target: number, enabled: boolean, duration = 600) {
  const [display, setDisplay] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled || typeof target !== "number") {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(target * p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, enabled, duration]);
  return display;
}

export function NobleXKpiCard({
  label,
  value,
  valueTitle,
  subLabel,
  subLabelType = "neutral",
  icon,
  isCurrency = false,
  highlight = false,
  animate = true,
  className,
}: NobleXKpiCardProps) {
  const numericValue = typeof value === "number" ? value : null;
  const counted = useCountUp(numericValue ?? 0, animate && numericValue !== null);
  const displayValue = numericValue !== null ? counted : value;

  return (
    <div
      className={cn(
        "noblex-kpi-card",
        highlight && "ring-1 ring-noblex-gold/30 bg-noblex-gold/5",
        className,
      )}
    >
      <p className="noblex-kpi-label">{label}</p>
      {icon && <div className="noblex-kpi-icon">{icon}</div>}
      <p
        className={cn("noblex-kpi-value", isCurrency && "noblex-kpi-value-currency")}
        title={valueTitle ?? (typeof displayValue === "string" ? displayValue : String(displayValue))}
      >
        {displayValue}
      </p>
      {subLabel && (
        <p
          className={cn(
            "noblex-kpi-sub",
            subLabelType === "positive" && "noblex-kpi-sub-positive",
            subLabelType === "negative" && "noblex-kpi-sub-negative",
          )}
        >
          {subLabel}
        </p>
      )}
    </div>
  );
}

export function NobleXKpiStrip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("noblex-kpi-strip", className)}>{children}</div>;
}
