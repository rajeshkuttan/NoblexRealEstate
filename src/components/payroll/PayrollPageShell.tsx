import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePayrollPeriod } from "@/hooks/payroll/usePayrollPeriod";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  description?: string;
  backHref?: string;
  breadcrumbs?: Crumb[];
  showPeriod?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function PayrollPageShell({
  title,
  description,
  backHref = "/people/payroll",
  breadcrumbs,
  showPeriod = true,
  actions,
  children,
  className,
}: Props) {
  const { month, year, setPeriod } = usePayrollPeriod();
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className={cn("container mx-auto p-6 space-y-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {backHref && (
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link to={backHref}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground mb-1">
                {breadcrumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    {c.href ? (
                      <Link to={c.href} className="hover:text-foreground">
                        {c.label}
                      </Link>
                    ) : (
                      <span>{c.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            <h1 className="text-2xl font-bold truncate">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {showPeriod && (
            <>
              <Select value={String(month)} onValueChange={(v) => setPeriod(Number(v), year)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setPeriod(month, Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}
