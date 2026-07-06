import { useTranslation } from "react-i18next";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { investmentsAPI } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { InvestmentTransactionForm } from "@/components/investments/InvestmentTransactionForm";
import { InvestmentPostingReadiness } from "@/components/investments/InvestmentPostingReadiness";
import { InvestmentTransactionActions } from "@/components/investments/InvestmentTransactionActions";
import { PostingStatusBadge, ApprovalStatusBadge } from "@/components/investments/InvestmentStatusBadges";
import { useInvestmentMutations } from "@/hooks/investments/useInvestment";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

export default function InvestmentTransactionsPage() {
  const { t } = useTranslation();
  const { approveTransaction, postTransaction, cancelTransaction, rejectTransaction } = useInvestmentMutations();

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["investment-transactions"],
    queryFn: async () => {
      const res = await investmentsAPI.getTransactions();
      return res.data?.data?.transactions || [];
    },
  });

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader title={t("investments.transactions.title")} subtitle={t("investments.transactions.subtitle")} />
      <InvestmentPostingReadiness />
      <InvestmentTransactionForm onSuccess={() => refetch()} />
      {isLoading ? <p className="text-noblex-slate">Loading…</p> : (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead>Posting</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((t: {
              id: number;
              transactionNo: string;
              transactionType: string;
              transactionDate: string;
              baseAmount: number;
              approvalStatus: string;
              postingStatus: string;
              asset?: { investmentCode: string; investmentName: string };
            }) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.transactionNo}</TableCell>
                <TableCell className="text-sm">{t.asset?.investmentName || "—"}</TableCell>
                <TableCell>{t.transactionType}</TableCell>
                <TableCell>{t.transactionDate}</TableCell>
                <TableCell className="font-mono">{formatCurrencySafe(t.baseAmount)}</TableCell>
                <TableCell><ApprovalStatusBadge status={t.approvalStatus} /></TableCell>
                <TableCell><PostingStatusBadge status={t.postingStatus} /></TableCell>
                <TableCell>
                  <InvestmentTransactionActions
                    transaction={t}
                    onApprove={(id) => approveTransaction.mutate(id, { onSuccess: () => refetch() })}
                    onPost={(id) => postTransaction.mutate(id, { onSuccess: () => refetch() })}
                    onCancel={(id) => cancelTransaction.mutate(id, { onSuccess: () => refetch() })}
                    onReject={(id) => rejectTransaction.mutate(id, { onSuccess: () => refetch() })}
                    isApproving={approveTransaction.isPending}
                    isPosting={postTransaction.isPending}
                    isCancelling={cancelTransaction.isPending}
                    isRejecting={rejectTransaction.isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      )}
    </div>
  );
}
