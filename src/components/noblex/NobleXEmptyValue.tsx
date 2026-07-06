import { cn } from "@/lib/utils";

interface NobleXEmptyValueProps {
  value: string | number | null | undefined;
  emptyWhen?: (v: string | number) => boolean;
  formatter?: (v: string | number) => string;
  className?: string;
  warnClassName?: string;
  warn?: boolean;
}

const defaultEmpty = (v: string | number) => {
  const s = String(v).trim();
  return s === "" || s === "0" || s === "0.00" || s === "AED 0.00" || s === "AED 0" || s === "0.00 sq ft";
};

export function NobleXEmptyValue({
  value,
  emptyWhen = defaultEmpty,
  formatter,
  className,
  warnClassName,
  warn,
}: NobleXEmptyValueProps) {
  if (value === null || value === undefined) {
    return <span className={cn("text-noblex-slate", className)}>—</span>;
  }
  const formatted = formatter ? formatter(value) : String(value);
  if (emptyWhen(value)) {
    return (
      <span className={cn("text-noblex-slate", warn && warnClassName, className)}>—</span>
    );
  }
  return (
    <span className={cn(warn && warnClassName, className)}>{formatted}</span>
  );
}

export function maskId(id: string, visibleTail = 4): string {
  if (!id || id.length <= visibleTail + 2) return id;
  const tail = id.slice(-visibleTail);
  const prefix = id.slice(0, 2);
  return `${prefix}****-${tail}`;
}
