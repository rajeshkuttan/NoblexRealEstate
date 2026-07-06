import { cn } from "@/lib/utils";

export type NobleXStatusVariant =
  | "active"
  | "draft"
  | "expired"
  | "expiring"
  | "overdue"
  | "occupied"
  | "available"
  | "tawtheeq-pending"
  | "not-registered"
  | "disputed"
  | "terminated";

const variantStyles: Record<
  NobleXStatusVariant,
  { dot: string; text: string; bg: string }
> = {
  active: { dot: "bg-noblex-emerald", text: "text-noblex-emerald", bg: "bg-noblex-emerald/10" },
  draft: { dot: "bg-noblex-sky", text: "text-noblex-sky", bg: "bg-noblex-sky/10" },
  expired: { dot: "bg-noblex-rose", text: "text-noblex-rose", bg: "bg-noblex-rose/10" },
  expiring: { dot: "bg-noblex-amber", text: "text-noblex-amber", bg: "bg-noblex-amber/10" },
  overdue: { dot: "bg-noblex-rose", text: "text-noblex-rose font-bold", bg: "bg-noblex-rose/20" },
  occupied: { dot: "bg-noblex-emerald", text: "text-white", bg: "bg-noblex-emerald" },
  available: { dot: "bg-noblex-emerald", text: "text-noblex-emerald", bg: "bg-transparent border border-noblex-emerald" },
  "tawtheeq-pending": { dot: "bg-noblex-amber", text: "text-noblex-amber", bg: "bg-noblex-amber/10" },
  "not-registered": { dot: "bg-noblex-slate", text: "text-noblex-slate", bg: "bg-noblex-slate/10" },
  disputed: { dot: "bg-noblex-rose", text: "text-noblex-rose", bg: "bg-transparent border border-noblex-rose" },
  terminated: { dot: "bg-noblex-rose", text: "text-noblex-rose", bg: "bg-noblex-rose/10" },
};

const defaultLabels: Record<NobleXStatusVariant, string> = {
  active: "Active",
  draft: "Draft",
  expired: "Expired",
  expiring: "Expiring Soon",
  overdue: "Overdue",
  occupied: "Occupied",
  available: "Available",
  "tawtheeq-pending": "Tawtheeq Pending",
  "not-registered": "Not Registered",
  disputed: "Disputed",
  terminated: "Terminated",
};

interface NobleXStatusBadgeProps {
  variant: NobleXStatusVariant;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export function NobleXStatusBadge({
  variant,
  label,
  className,
  onClick,
}: NobleXStatusBadgeProps) {
  const s = variantStyles[variant];
  const text = label || defaultLabels[variant];
  const filled = variant === "occupied";

  return (
    <span
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        s.bg,
        s.text,
        onClick && "cursor-pointer hover:opacity-90",
        className,
      )}
    >
      {!filled && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />}
      {text}
    </span>
  );
}

export function NobleXTawtheeqIndicator({
  status,
  onClick,
}: {
  status: "registered" | "pending" | "not-registered";
  onClick?: () => void;
}) {
  const ring =
    status === "registered"
      ? "bg-noblex-emerald border-noblex-emerald"
      : status === "pending"
        ? "border-noblex-amber bg-transparent"
        : "border-noblex-slate bg-transparent";
  return (
    <button
      type="button"
      title={
        status === "registered"
          ? "Tawtheeq Registered"
          : status === "pending"
            ? "Tawtheeq Pending"
            : "Not Registered"
      }
      onClick={onClick}
      className={cn(
        "h-3 w-3 rounded-full border-2 shrink-0",
        ring,
        onClick && "cursor-pointer hover:scale-110 transition-transform",
      )}
    />
  );
}
