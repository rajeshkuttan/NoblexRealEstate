import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

type Props = {
  expiringCount?: number;
  expiredCount?: number;
};

export function DocumentRiskChip({ expiringCount = 0, expiredCount = 0 }: Props) {
  if (!expiringCount && !expiredCount) return null;
  const variant = expiredCount > 0 ? "destructive" : "secondary";
  const label =
    expiredCount > 0
      ? `${expiredCount} expired`
      : `${expiringCount} expiring soon`;
  return (
    <Badge variant={variant} className="gap-1 font-normal">
      <AlertTriangle className="h-3 w-3" />
      {label}
    </Badge>
  );
}
