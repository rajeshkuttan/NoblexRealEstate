import { cn } from "@/lib/utils";

export function NobleXKpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="noblex-kpi-strip">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="noblex-kpi-card">
          <div className="noblex-skeleton h-3 w-20 mb-3" />
          <div className="noblex-skeleton h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

export function NobleXTableSkeleton({
  rows = 10,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="uiux-table-shell p-4 space-y-3">
      <div className="noblex-skeleton h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="noblex-skeleton h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
