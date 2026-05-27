import { useEffect, useState } from "react";
import { payrollAPI } from "@/services/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

type AuditEvent = {
  id: number;
  action: string;
  created_at?: string;
  user?: { name?: string; email?: string };
  metadata?: Record<string, unknown>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType?: string;
  entityId?: number | string;
};

export function AuditTimelineDrawer({ open, onOpenChange, entityType, entityId }: Props) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entityType || entityId == null) return;
    setLoading(true);
    payrollAPI.workspace
      .audit({ entity_type: entityType, entity_id: entityId })
      .then((r) => setEvents(r.data?.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [open, entityType, entityId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audit trail</SheetTitle>
          <SheetDescription>
            {entityType} #{entityId}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {loading && (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          )}
          {!loading && events.length === 0 && (
            <p className="text-sm text-muted-foreground">No audit events found.</p>
          )}
          {events.map((e) => (
            <div key={e.id} className="border-l-2 border-primary pl-3 text-sm">
              <p className="font-medium">{e.action.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground">
                {e.created_at ? new Date(e.created_at).toLocaleString() : ""}
                {e.user?.name && ` · ${e.user.name}`}
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
