import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NobleXPageHeader, NobleXDataTable } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PostingStatusBadge, ApprovalStatusBadge } from "@/components/investments/InvestmentStatusBadges";
import { InvestmentPostingReadiness } from "@/components/investments/InvestmentPostingReadiness";
import { distributionPrepareSchema, type DistributionPrepareFormValues } from "@/lib/investmentSchemas";
import { investmentsAPI } from "@/services/api";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Distribution = {
  id: number;
  distributionNo: string;
  distributionDate: string;
  distributionType: string;
  totalAmount: number;
  postingStatus: string;
  approvalStatus: string;
  asset?: { investmentCode: string; investmentName: string };
  sourceTransaction?: { transactionNo: string; transactionType: string };
  lines?: { investorName: string; sharePercentage: number; shareAmount: number }[];
};

type PostedIncomeTxn = {
  id: number;
  transactionNo: string;
  transactionType: string;
  transactionDate: string;
  baseAmount: number;
  postingStatus: string;
  asset?: { investmentCode: string; investmentName: string };
};

export default function InvestmentDistributionsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<number | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DistributionPrepareFormValues>({
    resolver: zodResolver(distributionPrepareSchema),
    defaultValues: { investmentTransactionId: "" },
  });

  const { data: distributions = [], isLoading, refetch } = useQuery({
    queryKey: ["investment-distributions"],
    queryFn: async () => {
      const res = await investmentsAPI.getDistributions();
      return (res.data?.data || []) as Distribution[];
    },
  });

  const { data: incomeTxns = [] } = useQuery({
    queryKey: ["investment-distributable-txns"],
    queryFn: async () => {
      const res = await investmentsAPI.getReportDividends();
      const rows = (res.data?.data || []) as PostedIncomeTxn[];
      const sellRes = await investmentsAPI.getTransactions({ transactionType: "SELL", postingStatus: "POSTED", limit: 100 });
      const sells = (sellRes.data?.data?.transactions || sellRes.data?.data || []) as PostedIncomeTxn[];
      return [...rows, ...sells].filter((t) => t.postingStatus === "POSTED");
    },
  });

  const prepare = async (values: DistributionPrepareFormValues) => {
    setBusy(-1);
    try {
      await investmentsAPI.prepareDistribution(Number(values.investmentTransactionId));
      toast.success(t("investments.toast.distributionPrepared"));
      reset({ investmentTransactionId: "" });
      refetch();
      qc.invalidateQueries({ queryKey: ["investment-distributable-txns"] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || t("investments.toast.distributionFailed"));
    } finally {
      setBusy(null);
    }
  };

  const act = async (id: number, action: "approve" | "post" | "cancel") => {
    setBusy(id);
    try {
      if (action === "approve") await investmentsAPI.approveDistribution(id);
      if (action === "post") await investmentsAPI.postDistribution(id);
      if (action === "cancel") await investmentsAPI.cancelDistribution(id);
      toast.success(t("investments.toast.distributionAction", { action }));
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || `Failed to ${action} distribution`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title={t("investments.distributions.title")}
        subtitle={t("investments.distributions.subtitle")}
      />

      <InvestmentPostingReadiness />

      <form onSubmit={handleSubmit(prepare)} className="rounded-lg border border-noblex-border bg-noblex-surface p-4 flex flex-wrap gap-4 items-end">
        <div className="min-w-[280px] flex-1">
          <Label>Posted source transaction</Label>
          <select
            {...register("investmentTransactionId")}
            className="mt-1 w-full rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm h-10"
          >
            <option value="">Select transaction…</option>
            {incomeTxns.map((t) => (
              <option key={t.id} value={t.id}>
                {t.transactionNo} — {t.asset?.investmentCode} — {t.transactionType} — {formatCurrencySafe(t.baseAmount)}
              </option>
            ))}
          </select>
          {errors.investmentTransactionId && <p className="text-xs text-rose-400 mt-1">{errors.investmentTransactionId.message}</p>}
        </div>
        <Button type="submit" variant="noblex-primary" disabled={busy === -1}>
          {t("investments.actions.prepare")}
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-noblex-slate">Loading distributions…</p>
      ) : (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead>Posting</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {distributions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-noblex-slate">No distribution runs yet.</TableCell>
              </TableRow>
            ) : (
              distributions.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono">{d.distributionNo}</TableCell>
                  <TableCell>{d.distributionDate}</TableCell>
                  <TableCell>{d.asset?.investmentName || "—"}</TableCell>
                  <TableCell>{d.distributionType}</TableCell>
                  <TableCell className="font-mono">{formatCurrencySafe(d.totalAmount)}</TableCell>
                  <TableCell><ApprovalStatusBadge status={d.approvalStatus} /></TableCell>
                  <TableCell><PostingStatusBadge status={d.postingStatus} /></TableCell>
                  <TableCell className="space-x-1">
                    {d.approvalStatus === "PENDING" && d.postingStatus !== "CANCELLED" && (
                      <>
                        <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => act(d.id, "approve")}>{t("investments.actions.approve")}</Button>
                        <Button size="sm" variant="ghost" className="text-rose-400" disabled={busy === d.id} onClick={() => act(d.id, "cancel")}>{t("investments.actions.cancel")}</Button>
                      </>
                    )}
                    {d.approvalStatus === "APPROVED" && d.postingStatus === "APPROVED" && (
                      <Button size="sm" variant="noblex-primary" disabled={busy === d.id} onClick={() => act(d.id, "post")}>{t("investments.actions.postPayout")}</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </NobleXDataTable>
      )}

      {distributions.some((d) => d.lines?.length) && (
        <div className="space-y-4">
          {distributions.filter((d) => d.lines?.length).map((d) => (
            <div key={`lines-${d.id}`} className="rounded-lg border border-noblex-border p-4">
              <h4 className="text-sm font-medium text-noblex-gold-light mb-2">
                {d.distributionNo} — partner lines
              </h4>
              <NobleXDataTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Share %</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d.lines || []).map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>{line.investorName}</TableCell>
                      <TableCell className="font-mono">{line.sharePercentage}%</TableCell>
                      <TableCell className="font-mono">{formatCurrencySafe(line.shareAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </NobleXDataTable>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
