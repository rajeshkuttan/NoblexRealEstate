import { NobleXStatusBadge, NobleXStatusVariant } from "@/components/noblex";

const assetStatusMap: Record<string, NobleXStatusVariant> = {
  ACTIVE: "active",
  DRAFT: "draft",
  SOLD: "expired",
  MATURED: "expiring",
  CLOSED: "terminated",
};

export function InvestmentStatusBadge({ status }: { status: string }) {
  return <NobleXStatusBadge variant={assetStatusMap[status] || "draft"} label={status} />;
}

const postingMap: Record<string, NobleXStatusVariant> = {
  POSTED: "active",
  APPROVED: "tawtheeq-pending",
  DRAFT: "draft",
  CANCELLED: "terminated",
};

export function PostingStatusBadge({ status }: { status: string }) {
  return <NobleXStatusBadge variant={postingMap[status] || "draft"} label={status} />;
}

const approvalMap: Record<string, NobleXStatusVariant> = {
  APPROVED: "active",
  PENDING: "expiring",
  REJECTED: "terminated",
};

export function ApprovalStatusBadge({ status }: { status: string }) {
  return <NobleXStatusBadge variant={approvalMap[status] || "draft"} label={status} />;
}
