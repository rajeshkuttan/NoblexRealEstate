import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  href?: string;
  className?: string;
  variant?: "default" | "warning" | "success";
};

export function PayrollKpiCard({ title, value, subtitle, icon: Icon, href, className, variant = "default" }: Props) {
  const border =
    variant === "warning"
      ? "border-amber-500/40"
      : variant === "success"
        ? "border-green-500/40"
        : undefined;

  const inner = (
    <Card className={cn("h-full", border, href && "hover:border-primary transition-colors", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}

export function PayrollKpiGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5", className)}>{children}</div>;
}
