import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  OPEN: "secondary",
  SUBMITTED: "outline",
  GENERATED: "outline",
  UNDER_REVIEW: "outline",
  CALCULATED: "outline",
  APPROVED: "default",
  LOCKED: "default",
  EXPORTED: "default",
  POSTED: "default",
  PUBLISHED: "default",
  EXCEPTION: "destructive",
  REJECTED: "destructive",
  CANCELLED: "destructive",
  REVERSED: "destructive",
};

type Props = {
  status?: string | null;
  className?: string;
};

export function PayrollStatusBadge({ status, className }: Props) {
  const label = status || "—";
  const variant = STATUS_VARIANT[label] ?? "secondary";
  return (
    <Badge variant={variant} className={cn("font-normal", className)}>
      {label.replace(/_/g, " ")}
    </Badge>
  );
}
