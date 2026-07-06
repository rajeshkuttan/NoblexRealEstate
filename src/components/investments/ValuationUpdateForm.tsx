import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NobleXDataTable } from "@/components/noblex";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { investmentsAPI } from "@/services/api";
import { useInvestmentPortfolio } from "@/hooks/investments/useInvestment";
import { valuationSchema, type ValuationFormValues } from "@/lib/investmentSchemas";
import { ApprovalStatusBadge } from "./InvestmentStatusBadges";
import { formatCurrency as formatCurrencySafe } from "@/utils/currencyUtils";
import { toast } from "sonner";

interface ValuationUpdateFormProps {
  defaultAssetId?: number;
  showHistory?: boolean;
  onSuccess?: () => void;
}

export function ValuationUpdateForm({ defaultAssetId, showHistory = true, onSuccess }: ValuationUpdateFormProps) {
  const qc = useQueryClient();
  const { data: portfolio } = useInvestmentPortfolio({ limit: 200 });
  const assets = portfolio?.assets || [];

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<ValuationFormValues>({
    resolver: zodResolver(valuationSchema),
    defaultValues: {
      investmentAssetId: defaultAssetId ? String(defaultAssetId) : "",
      valuationDate: new Date().toISOString().slice(0, 10),
      price: 0,
      exchangeRate: 1,
    },
  });

  const investmentAssetId = watch("investmentAssetId");
  const assetId = Number(investmentAssetId) || undefined;

  const { data: valuations = [], refetch } = useQuery({
    queryKey: ["investment-asset-valuations", assetId],
    queryFn: async () => {
      const res = await investmentsAPI.getAssetValuations(assetId!);
      return res.data?.data || [];
    },
    enabled: !!assetId && showHistory,
  });

  const createMutation = useMutation({
    mutationFn: (values: ValuationFormValues) =>
      investmentsAPI.createValuation({
        investmentAssetId: Number(values.investmentAssetId),
        valuationDate: values.valuationDate,
        price: Number(values.price),
        quantity: values.quantity ? Number(values.quantity) : undefined,
      }),
    onSuccess: () => {
      toast.success("Valuation recorded");
      reset({ investmentAssetId, valuationDate: new Date().toISOString().slice(0, 10), price: 0, exchangeRate: 1 });
      qc.invalidateQueries({ queryKey: ["investment-dashboard"] });
      qc.invalidateQueries({ queryKey: ["investment-asset-valuations", assetId] });
      qc.invalidateQueries({ queryKey: ["investment-asset", assetId] });
      refetch();
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save valuation"),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => investmentsAPI.approveValuation(id),
    onSuccess: (res) => {
      const result = res?.data?.data;
      const rev = result?.revaluationTransaction;
      if (result?.postingError) {
        toast.warning(`Valuation approved but GL posting failed: ${result.postingError}`);
      } else if (rev?.postingStatus === "POSTED") {
        toast.success(`Valuation approved — revaluation ${rev.transactionNo} posted to GL`);
      } else if (rev) {
        toast.success(`Valuation approved — revaluation ${rev.transactionNo} created`);
      } else {
        toast.success("Valuation approved");
      }
      refetch();
      qc.invalidateQueries({ queryKey: ["investment-dashboard"] });
      qc.invalidateQueries({ queryKey: ["investment-transactions"] });
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Approval failed"),
  });

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-noblex-border bg-noblex-surface p-4">
        <div className="md:col-span-2">
          <Label>Investment asset</Label>
          <select
            {...register("investmentAssetId")}
            disabled={!!defaultAssetId}
            className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm"
          >
            <option value="">Select asset…</option>
            {assets.map((a: { id: number; investmentCode: string; investmentName: string }) => (
              <option key={a.id} value={a.id}>{a.investmentCode} — {a.investmentName}</option>
            ))}
          </select>
          {errors.investmentAssetId && <p className="text-xs text-rose-400 mt-1">{errors.investmentAssetId.message}</p>}
        </div>
        <div>
          <Label>Valuation date</Label>
          <Input type="date" {...register("valuationDate")} className="mt-1" />
          {errors.valuationDate && <p className="text-xs text-rose-400 mt-1">{errors.valuationDate.message}</p>}
        </div>
        <div>
          <Label>Price per unit</Label>
          <Input type="number" step="any" {...register("price")} className="mt-1" />
          {errors.price && <p className="text-xs text-rose-400 mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <Label>Quantity (optional)</Label>
          <Input type="number" step="any" {...register("quantity")} className="mt-1" />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="noblex-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving…" : "Save valuation"}
          </Button>
        </div>
      </form>

      {showHistory && assetId && (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Market value</TableHead>
              <TableHead>Unrealized G/L</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {valuations.map((v: {
              id: number;
              valuationNo: string;
              valuationDate: string;
              price: number;
              baseMarketValue: number;
              unrealizedGainLoss: number;
              approvalStatus: string;
            }) => (
              <TableRow key={v.id}>
                <TableCell>{v.valuationDate}</TableCell>
                <TableCell className="font-mono text-xs">{v.valuationNo}</TableCell>
                <TableCell className="font-mono">{formatCurrencySafe(v.price)}</TableCell>
                <TableCell className="font-mono">{formatCurrencySafe(v.baseMarketValue)}</TableCell>
                <TableCell className="font-mono">{formatCurrencySafe(v.unrealizedGainLoss)}</TableCell>
                <TableCell><ApprovalStatusBadge status={v.approvalStatus} /></TableCell>
                <TableCell>
                  {v.approvalStatus === "PENDING" && (
                    <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(v.id)}>Approve</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </NobleXDataTable>
      )}
    </div>
  );
}
