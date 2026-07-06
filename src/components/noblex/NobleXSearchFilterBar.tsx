import { ReactNode } from "react";
import { MagnifyingGlass, Funnel } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NobleXSearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  sortLabel?: string;
  onSortClick?: () => void;
  viewToggle?: ReactNode;
  className?: string;
}

export function NobleXSearchFilterBar({
  searchValue,
  onSearchChange,
  placeholder = "Search…",
  onFilterClick,
  sortLabel,
  onSortClick,
  viewToggle,
  className,
}: NobleXSearchFilterBarProps) {
  return (
    <div className={cn("uiux-filter-row mb-4", className)}>
      <div className="uiux-search-bar-wrap flex-1 min-w-[200px]">
        <MagnifyingGlass className="uiux-search-icon" size={16} weight="bold" />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="uiux-search-input !h-9 !bg-noblex-surface !border-noblex-border !text-noblex-platinum"
        />
      </div>
      {onFilterClick && (
        <Button variant="noblex-secondary" size="sm" onClick={onFilterClick}>
          <Funnel size={16} weight="bold" className="me-2" />
          Filter
        </Button>
      )}
      {sortLabel && onSortClick && (
        <Button variant="noblex-secondary" size="sm" onClick={onSortClick}>
          {sortLabel}
        </Button>
      )}
      {viewToggle}
    </div>
  );
}

export function NobleXFilterPills({
  filters,
  onRemove,
}: {
  filters: { key: string; label: string }[];
  onRemove: (key: string) => void;
}) {
  if (!filters.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map((f) => (
        <span key={f.key} className="noblex-filter-pill">
          {f.label}
          <button
            type="button"
            onClick={() => onRemove(f.key)}
            className="text-noblex-gold hover:text-noblex-gold-light ms-1"
            aria-label={`Remove ${f.label}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
