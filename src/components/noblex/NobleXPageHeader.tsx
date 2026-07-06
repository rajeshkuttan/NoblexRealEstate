import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NobleXPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function NobleXPageHeader({
  title,
  subtitle,
  actions,
  className,
}: NobleXPageHeaderProps) {
  return (
    <header className={cn("uiux-page-header", className)}>
      <div>
        <h1 className="uiux-page-title">{title}</h1>
        {subtitle && <p className="uiux-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
