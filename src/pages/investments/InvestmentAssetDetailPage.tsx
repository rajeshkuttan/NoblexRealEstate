import { useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { NobleXDataTable } from "@/components/noblex";

import { InvestmentDetailHeader } from "@/components/investments/InvestmentDetailHeader";

import { PostingStatusBadge, ApprovalStatusBadge } from "@/components/investments/InvestmentStatusBadges";
import { InvestmentTransactionActions } from "@/components/investments/InvestmentTransactionActions";

import { InvestmentTransactionForm } from "@/components/investments/InvestmentTransactionForm";

import { InvestmentDocumentUploader } from "@/components/investments/InvestmentDocumentUploader";

import { PartnerAllocationTable } from "@/components/investments/PartnerAllocationTable";

import { ValuationUpdateForm } from "@/components/investments/ValuationUpdateForm";

import { useInvestmentAsset, useInvestmentMutations } from "@/hooks/investments/useInvestment";

import { investmentsAPI } from "@/services/api";

import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";



export default function InvestmentAssetDetailPage() {

  const { id } = useParams();

  const assetId = Number(id);

  const { data: asset, isLoading } = useInvestmentAsset(assetId);

  const { approveTransaction, postTransaction, cancelTransaction, rejectTransaction } = useInvestmentMutations();



  const { data: txData, refetch: refetchTx } = useQuery({

    queryKey: ["investment-asset-transactions", assetId],

    queryFn: async () => {

      const res = await investmentsAPI.getAssetTransactions(assetId);

      return res.data?.data?.transactions || [];

    },

    enabled: !!assetId,

  });



  const { data: allocations, refetch: refetchAlloc } = useQuery({

    queryKey: ["investment-asset-allocations", assetId],

    queryFn: async () => {

      const res = await investmentsAPI.getAssetAllocations(assetId);

      return res.data?.data || [];

    },

    enabled: !!assetId,

  });



  if (isLoading) return <div className="p-6 text-noblex-slate">Loading…</div>;

  if (!asset) return <div className="p-6 text-rose-400">Asset not found</div>;



  const h = asset.holding;

  const transactions = txData || [];



  return (

    <div className="space-y-6 p-1">

      <InvestmentDetailHeader asset={asset} />



      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {[

          ["Quantity", h?.quantity],

          ["Avg cost", formatCurrencySafe(h?.averageCost)],

          ["Total cost", formatCurrencySafe(h?.totalCost)],

          ["Market value", formatCurrencySafe(h?.currentMarketValue)],

          ["Unrealized G/L", formatCurrencySafe(h?.unrealizedGainLoss)],

          ["Realized G/L", formatCurrencySafe(h?.realizedGainLoss)],

        ].map(([label, val]) => (

          <div key={String(label)} className="rounded-lg border border-noblex-border bg-noblex-surface p-4">

            <p className="text-xs text-noblex-slate uppercase">{label}</p>

            <p className="font-mono text-noblex-gold-light mt-1">{val ?? "—"}</p>

          </div>

        ))}

      </div>



      <Tabs defaultValue="transactions">

        <TabsList className="flex flex-wrap h-auto">

          <TabsTrigger value="transactions">Transactions</TabsTrigger>

          <TabsTrigger value="valuations">Valuations</TabsTrigger>

          <TabsTrigger value="allocations">Allocations</TabsTrigger>

          <TabsTrigger value="documents">Documents</TabsTrigger>

          <TabsTrigger value="record">Record transaction</TabsTrigger>

        </TabsList>

        <TabsContent value="transactions" className="mt-4">

          <NobleXDataTable>

            <TableHeader>

              <TableRow>

                <TableHead>No</TableHead>

                <TableHead>Type</TableHead>

                <TableHead>Date</TableHead>

                <TableHead>Amount</TableHead>

                <TableHead>Status</TableHead>

                <TableHead />

              </TableRow>

            </TableHeader>

            <TableBody>

              {transactions.map((t: {

                id: number;

                transactionNo: string;

                transactionType: string;

                transactionDate: string;

                baseAmount: number;

                approvalStatus: string;

                postingStatus: string;

              }) => (

                <TableRow key={t.id}>

                  <TableCell className="font-mono text-sm">{t.transactionNo}</TableCell>

                  <TableCell>{t.transactionType}</TableCell>

                  <TableCell>{t.transactionDate}</TableCell>

                  <TableCell className="font-mono">{formatCurrencySafe(t.baseAmount)}</TableCell>

                  <TableCell className="space-x-1">

                    <ApprovalStatusBadge status={t.approvalStatus} />

                    <PostingStatusBadge status={t.postingStatus} />

                  </TableCell>

                  <TableCell>
                    <InvestmentTransactionActions
                      transaction={t}
                      onApprove={(id) => approveTransaction.mutate(id, { onSuccess: () => refetchTx() })}
                      onPost={(id) => postTransaction.mutate(id, { onSuccess: () => refetchTx() })}
                      onCancel={(id) => cancelTransaction.mutate(id, { onSuccess: () => refetchTx() })}
                      onReject={(id) => rejectTransaction.mutate(id, { onSuccess: () => refetchTx() })}
                      isRejecting={rejectTransaction.isPending}
                    />
                  </TableCell>

                </TableRow>

              ))}

            </TableBody>

          </NobleXDataTable>

        </TabsContent>

        <TabsContent value="valuations" className="mt-4">

          <ValuationUpdateForm defaultAssetId={assetId} onSuccess={() => refetchAlloc()} />

        </TabsContent>

        <TabsContent value="allocations" className="mt-4">

          <PartnerAllocationTable allocations={allocations || []} />

        </TabsContent>

        <TabsContent value="documents" className="mt-4">

          <InvestmentDocumentUploader assetId={assetId} />

        </TabsContent>

        <TabsContent value="record" className="mt-4">

          <InvestmentTransactionForm defaultAssetId={assetId} onSuccess={() => refetchTx()} />

        </TabsContent>

      </Tabs>



      {asset.notes && (

        <div className="rounded-lg border border-noblex-border bg-noblex-surface p-4 text-sm text-noblex-platinum">

          {asset.notes}

        </div>

      )}

    </div>

  );

}

