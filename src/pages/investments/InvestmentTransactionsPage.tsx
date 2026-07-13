import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { investmentsAPI } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { InvestmentTransactionForm } from "@/components/investments/InvestmentTransactionForm";
import { InvestmentPostingReadiness } from "@/components/investments/InvestmentPostingReadiness";
import { InvestmentTransactionActions } from "@/components/investments/InvestmentTransactionActions";
import { InvestmentV2ReleaseBanner } from "@/components/investments/InvestmentV2ReleaseBanner";
import { PostingStatusBadge, ApprovalStatusBadge } from "@/components/investments/InvestmentStatusBadges";
import { useInvestmentMutations } from "@/hooks/investments/useInvestment";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { toast } from "sonner";

export default function InvestmentTransactionsPage() {
  const { t } = useTranslation();
  const { approveTransaction, postTransaction, cancelTransaction, rejectTransaction } = useInvestmentMutations();
  const [page, setPage] = useState(1);
  const [includeTestData, setIncludeTestData] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: ["investment-transactions", page, includeTestData],
    queryFn: async () => {
      const res = await investmentsAPI.getTransactions({
        page,
        limit: 20,
        includeTestData: includeTestData ? "true" : undefined,
      });
      return res.data?.data || { transactions: [], pagination: {} };
    },
  });

  const transactions = data?.transactions || [];
  const pagination = data?.pagination || {};

  const allIds = useMemo(() => transactions.map((x: { id: number }) => x.id), [transactions]);

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? allIds : []);
  };

  const toggleOne = (id: number, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const runBulk = async (action: "approve" | "reject" | "post") => {
    if (!selected.length) {
      toast.error("Select at least one transaction");
      return;
    }
    try {
      setBulkBusy(true);
      let res;
      if (action === "approve") res = await investmentsAPI.bulkApproveTransactions(selected);
      else if (action === "reject") res = await investmentsAPI.bulkRejectTransactions(selected);
      else res = await investmentsAPI.bulkPostTransactions(selected);
      const payload = res.data?.data;
      toast.success(`OK: ${payload?.ok?.length || 0}, failed: ${payload?.failed?.length || 0}`);
      setSelected([]);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader title={t("investments.transactions.title")} subtitle={t("investments.transactions.subtitle")} />
      <InvestmentV2ReleaseBanner />
      <InvestmentPostingReadiness />
      <InvestmentTransactionForm onSuccess={() => refetch()} />
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={includeTestData} onCheckedChange={(c) => setIncludeTestData(c === true)} />
          Include test data
        </label>
        <Button type="button" size="sm" variant="secondary" disabled={bulkBusy} onClick={() => runBulk("approve")}>
          Bulk approve
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={bulkBusy} onClick={() => runBulk("post")}>
          Bulk post
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={bulkBusy} onClick={() => runBulk("reject")}>
          Bulk reject
        </Button>
      </div>
      {isLoading ? <p className="text-noblex-slate">Loading…</p> : null}
      {isError ? (
        <p className="text-sm text-destructive">
          Failed to load.{" "}
          <button type="button" className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </p>
      ) : null}
      {!isLoading && !isError && (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allIds.length > 0 && selected.length === allIds.length}
                  onCheckedChange={(c) => toggleAll(c === true)}
                />
              </TableHead>
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
            {transactions.map((row: {
              id: number;
              transactionNo: string;
              transactionType: string;
              transactionDate: string;
              baseAmount: number;
              approvalStatus: string;
              postingStatus: string;
              asset?: { investmentCode: string; investmentName: string };
            }) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(row.id)}
                    onCheckedChange={(c) => toggleOne(row.id, c === true)}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm">{row.transactionNo}</TableCell>
                <TableCell className="text-sm">{row.asset?.investmentName || "—"}</TableCell>
                <TableCell>{row.transactionType}</TableCell>
                <TableCell>{row.transactionDate}</TableCell>
                <TableCell className="font-mono">{formatCurrencySafe(row.baseAmount)}</TableCell>
                <TableCell><ApprovalStatusBadge status={row.approvalStatus} /></TableCell>
                <TableCell><PostingStatusBadge status={row.postingStatus} /></TableCell>
                <TableCell>
                  <InvestmentTransactionActions
                    transaction={row}
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
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No transactions
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </NobleXDataTable>
      )}
      {pagination.totalPages > 1 && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm self-center">
            Page {pagination.page} / {pagination.totalPages} ({pagination.total} total)
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
