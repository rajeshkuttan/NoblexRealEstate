import React from "react";
import { cn } from "@/lib/utils";

interface NobleXLogoProps {
  size?: "sm" | "md" | "lg";
  collapsed?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { monogram: "text-xl", word: "text-lg" },
  md: { monogram: "text-2xl", word: "text-xl" },
  lg: { monogram: "text-3xl", word: "text-2xl" },
};

export default function NobleXLogo({
  size = "md",
  collapsed = false,
  className,
}: NobleXLogoProps) {
  const s = sizeMap[size];

  if (collapsed) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md font-semibold text-noblex-gold",
          s.monogram,
          className,
        )}
        aria-label="NobleX"
      >
        N
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span className={cn("font-semibold text-noblex-gold", s.word)}>NobleX</span>
      <span className="mt-0.5 text-[10px] tracking-wide text-noblex-slate">
        Where Assets Meet Intelligence
      </span>
    </div>
  );
}
