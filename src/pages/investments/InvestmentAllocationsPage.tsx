import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NobleXPageHeader } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PartnerAllocationTable } from "@/components/investments/PartnerAllocationTable";
import { useInvestmentPortfolio } from "@/hooks/investments/useInvestment";
import { allocationSchema, type AllocationFormValues } from "@/lib/investmentSchemas";
import { investmentsAPI, vendorsAPI } from "@/services/api";
import { toast } from "sonner";

export default function InvestmentAllocationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: portfolio } = useInvestmentPortfolio({ limit: 200 });
  const [assetId, setAssetId] = useState("");

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-list-investment"],
    queryFn: async () => {
      const res = await vendorsAPI.getAll({ limit: 200, status: "active" });
      return res.data?.data?.vendors || res.data?.data || [];
    },
  });

  const { data: allocations = [], refetch } = useQuery({
    queryKey: ["investment-asset-allocations", assetId],
    queryFn: async () => {
      const res = await investmentsAPI.getAssetAllocations(Number(assetId));
      return res.data?.data || [];
    },
    enabled: !!assetId,
  });

  const [form, setForm] = useState({ investorRefId: "" });
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<AllocationFormValues>({
    resolver: zodResolver(allocationSchema),
    defaultValues: {
      investorName: "",
      investorType: "PARTNER",
      ownershipPercentage: 0,
      contributionAmount: 0,
    },
  });

  const ownershipPct = watch("ownershipPercentage");
  const existingTotal = allocations.reduce((s: number, a: { ownershipPercentage: number }) => s + Number(a.ownershipPercentage || 0), 0);
  const projectedTotal = existingTotal + Number(ownershipPct || 0);

  const createMutation = useMutation({
    mutationFn: (values: AllocationFormValues) =>
      investmentsAPI.createAllocation(Number(assetId), {
        investorRefId: form.investorRefId ? Number(form.investorRefId) : undefined,
        investorName: values.investorName,
        investorType: values.investorType,
        ownershipPercentage: Number(values.ownershipPercentage),
        contributionAmount: values.contributionAmount ? Number(values.contributionAmount) : 0,
      }),
    onSuccess: () => {
      toast.success(t("investments.toast.allocationSaved"));
      setForm({ investorRefId: "" });
      reset({ investorName: "", investorType: "PARTNER", ownershipPercentage: 0, contributionAmount: 0 });
      refetch();
      qc.invalidateQueries({ queryKey: ["investment-dashboard"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t("investments.toast.allocationFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => investmentsAPI.deleteAllocation(id),
    onSuccess: () => {
      toast.success(t("investments.toast.allocationRemoved"));
      refetch();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Delete failed"),
  });

  const onSubmit = (values: AllocationFormValues) => {
    if (!assetId) {
      toast.error(t("investments.toast.selectAsset"));
      return;
    }
    if (projectedTotal > 100.01) {
      toast.error(t("investments.toast.ownershipExceeded"));
      return;
    }
    createMutation.mutate(values);
  };

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader title={t("investments.allocations.title")} subtitle={t("investments.allocations.subtitle")} />
      <div className="max-w-md">
        <Label>Investment asset</Label>
        <select
          className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
        >
          <option value="">Select asset…</option>
          {(portfolio?.assets || []).map((a: { id: number; investmentCode: string; investmentName: string }) => (
            <option key={a.id} value={a.id}>{a.investmentCode} — {a.investmentName}</option>
          ))}
        </select>
      </div>

      {assetId && (
        <>
          <PartnerAllocationTable
            allocations={allocations}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-noblex-border bg-noblex-surface p-6 max-w-3xl">
            <div>
              <Label>Link vendor (optional)</Label>
              <select
                className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm"
                value={form.investorRefId}
                onChange={(e) => {
                  const id = e.target.value;
                  const vendor = (vendors as { id: number; vendorName?: string; name?: string }[]).find((v) => String(v.id) === id);
                  setForm({ investorRefId: id });
                  if (vendor) setValue("investorName", vendor.vendorName || vendor.name || "");
                }}
              >
                <option value="">— Free text —</option>
                {(vendors as { id: number; vendorName?: string; name?: string }[]).map((v) => (
                  <option key={v.id} value={v.id}>{v.vendorName || v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Investor name</Label>
              <Input {...register("investorName")} className="mt-1" />
              {errors.investorName && <p className="text-xs text-rose-400 mt-1">{errors.investorName.message}</p>}
            </div>
            <div>
              <Label>Investor type</Label>
              <select {...register("investorType")} className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm">
                {["OWNER", "PARTNER", "COMPANY"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Ownership %</Label>
              <Input type="number" step="any" {...register("ownershipPercentage")} className="mt-1" />
              {errors.ownershipPercentage && <p className="text-xs text-rose-400 mt-1">{errors.ownershipPercentage.message}</p>}
              <p className="text-xs text-noblex-slate mt-1">Allocated: {existingTotal.toFixed(2)}% → {projectedTotal.toFixed(2)}% after save</p>
            </div>
            <div>
              <Label>Contribution amount</Label>
              <Input type="number" step="any" {...register("contributionAmount")} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" variant="noblex-primary" disabled={createMutation.isPending}>Add allocation</Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
