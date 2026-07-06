import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApprovalStatusBadge, PostingStatusBadge } from "./InvestmentStatusBadges";
import { InvestmentTransactionGlDialog } from "./InvestmentTransactionGlDialog";

interface InvestmentTransactionActionsProps {
  transaction: {
    id: number;
    transactionNo?: string;
    approvalStatus: string;
    postingStatus: string;
  };  onApprove: (id: number) => void;
  onPost: (id: number) => void;
  onCancel: (id: number) => void;
  onReject?: (id: number) => void;
  isApproving?: boolean;
  isPosting?: boolean;
  isCancelling?: boolean;
  isRejecting?: boolean;
  showBadges?: boolean;
}

export function InvestmentTransactionActions({
  transaction: t,
  onApprove,
  onPost,
  onCancel,
  onReject,
  isApproving,
  isPosting,
  isCancelling,
  isRejecting,
  showBadges,
}: InvestmentTransactionActionsProps) {
  const [glOpen, setGlOpen] = useState(false);
  const canCancel = t.postingStatus !== "POSTED" && t.postingStatus !== "CANCELLED";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showBadges && (
        <>
          <ApprovalStatusBadge status={t.approvalStatus} />
          <PostingStatusBadge status={t.postingStatus} />
        </>
      )}
      {t.approvalStatus === "PENDING" && (
        <>
          <Button size="sm" variant="outline" disabled={isApproving} onClick={() => onApprove(t.id)}>Approve</Button>
          {onReject && (
            <Button size="sm" variant="ghost" className="text-amber-400" disabled={isRejecting} onClick={() => onReject(t.id)}>Reject</Button>
          )}
        </>
      )}
      {t.approvalStatus === "APPROVED" && t.postingStatus !== "POSTED" && t.postingStatus !== "CANCELLED" && (
        <Button size="sm" variant="noblex-primary" disabled={isPosting} onClick={() => onPost(t.id)}>Post</Button>
      )}
      {canCancel && (
        <Button size="sm" variant="ghost" className="text-rose-400" disabled={isCancelling} onClick={() => onCancel(t.id)}>Cancel</Button>
      )}
      {t.postingStatus === "POSTED" && (
        <Button size="sm" variant="outline" onClick={() => setGlOpen(true)}>View GL</Button>
      )}
      <InvestmentTransactionGlDialog
        transactionId={glOpen ? t.id : null}
        transactionNo={t.transactionNo}
        open={glOpen}
        onOpenChange={setGlOpen}
      />
    </div>
  );
}
