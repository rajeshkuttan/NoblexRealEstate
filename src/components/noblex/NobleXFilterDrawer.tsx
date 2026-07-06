import { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NobleXFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
}

export function NobleXFilterDrawer({
  open,
  onOpenChange,
  title = "Filters",
  children,
}: NobleXFilterDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[360px] bg-noblex-midnight border-noblex-border text-noblex-platinum"
      >
        <SheetHeader>
          <SheetTitle className="text-noblex-gold-light">{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
