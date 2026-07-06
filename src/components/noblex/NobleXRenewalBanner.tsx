import { Bell, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NobleXRenewalBannerProps {
  title?: string;
  body: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  onDismiss?: () => void;
  bands?: { label: string; count: number; color: "rose" | "amber" | "gold" }[];
  className?: string;
}

const bandColor = {
  rose: "text-noblex-rose",
  amber: "text-noblex-amber",
  gold: "text-noblex-gold-light",
};

export function NobleXRenewalBanner({
  title = "Renewal Intelligence Alert",
  body,
  ctaLabel,
  onCtaClick,
  onDismiss,
  bands,
  className,
}: NobleXRenewalBannerProps) {
  return (
    <div className={cn("noblex-renewal-banner", className)}>
      <Bell size={18} weight="bold" className="text-noblex-amber shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-noblex-amber mb-1">{title}</p>
        <p className="text-[13px] text-noblex-platinum">{body}</p>
        {bands && bands.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-2 text-xs">
            {bands.map((b) => (
              <span key={b.label} className={bandColor[b.color]}>
                {b.count} {b.label}
              </span>
            ))}
          </div>
        )}
        {ctaLabel && onCtaClick && (
          <button
            type="button"
            onClick={onCtaClick}
            className="mt-2 text-[13px] text-noblex-amber underline underline-offset-2 hover:text-noblex-gold-light"
          >
            {ctaLabel}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-noblex-slate hover:text-noblex-platinum shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
