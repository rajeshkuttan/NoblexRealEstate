import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NobleXPageHeader } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useInvestmentAsset, useInvestmentCategories, useInvestmentMutations } from "@/hooks/investments/useInvestment";
import { investmentAssetSchema, type InvestmentAssetFormValues } from "@/lib/investmentSchemas";

type FormValues = InvestmentAssetFormValues;

export default function InvestmentAssetFormPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const assetId = id ? Number(id) : undefined;
  const isEdit = !!assetId;
  const navigate = useNavigate();
  const { data: categories } = useInvestmentCategories();
  const { data: asset, isLoading } = useInvestmentAsset(assetId);
  const { createAsset, updateAsset } = useInvestmentMutations();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(investmentAssetSchema),
    defaultValues: { currencyCode: "AED", accountingClassification: "COST", riskLevel: "MEDIUM" },
  });

  useEffect(() => {
    if (!isEdit || !asset) return;
    reset({
      investmentName: asset.investmentName,
      assetType: asset.assetType,
      instrumentType: asset.instrumentType || "",
      marketName: asset.marketName || "",
      tickerSymbol: asset.tickerSymbol || "",
      isinCode: asset.isinCode || "",
      brokerName: asset.brokerName || "",
      custodianName: asset.custodianName || "",
      currencyCode: asset.currencyCode || "AED",
      accountingClassification: asset.accountingClassification || "COST",
      riskLevel: asset.riskLevel || "MEDIUM",
      status: asset.status,
      acquisitionDate: asset.acquisitionDate || "",
      maturityDate: asset.maturityDate || "",
      categoryId: asset.categoryId,
      notes: asset.notes || "",
    });
  }, [isEdit, asset, reset]);

  const onSubmit = async (values: FormValues) => {
    if (isEdit && assetId) {
      await updateAsset.mutateAsync({ id: assetId, data: values });
      navigate(`/investments/assets/${assetId}`);
      return;
    }
    const res = await createAsset.mutateAsync(values);
    const newId = res.data?.data?.id;
    navigate(newId ? `/investments/assets/${newId}` : "/investments/portfolio");
  };

  if (isEdit && isLoading) return <p className="p-6 text-noblex-slate">Loading asset…</p>;

  return (
    <div className="space-y-6 p-1 max-w-3xl">
      <NobleXPageHeader
        title={t(isEdit ? "investments.assetForm.editTitle" : "investments.assetForm.newTitle")}
        subtitle={t(isEdit ? "investments.assetForm.editSubtitle" : "investments.assetForm.newSubtitle")}
      />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-noblex-border bg-noblex-surface p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Investment name</Label>
            <Input {...register("investmentName")} className="mt-1" />
            {errors.investmentName && <p className="text-sm text-rose-400 mt-1">{errors.investmentName.message}</p>}
          </div>
          <div>
            <Label>Asset type</Label>
            <Input {...register("assetType")} placeholder="equity, fixed_deposit, gold" className="mt-1" />
          </div>
          <div>
            <Label>Instrument type</Label>
            <Input {...register("instrumentType")} placeholder="ETF, BOND, FD" className="mt-1" />
          </div>
          <div>
            <Label>Market / exchange</Label>
            <Input {...register("marketName")} className="mt-1" />
          </div>
          <div>
            <Label>Ticker</Label>
            <Input {...register("tickerSymbol")} className="mt-1" />
          </div>
          <div>
            <Label>ISIN</Label>
            <Input {...register("isinCode")} className="mt-1" />
          </div>
          <div>
            <Label>Broker</Label>
            <Input {...register("brokerName")} className="mt-1" />
          </div>
          <div>
            <Label>Custodian</Label>
            <Input {...register("custodianName")} className="mt-1" />
          </div>
          <div>
            <Label>Currency</Label>
            <Input {...register("currencyCode")} className="mt-1" />
          </div>
          <div>
            <Label>Category</Label>
            <select {...register("categoryId")} className="mt-1 w-full rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm">
              <option value="">—</option>
              {(categories || []).map((c: { id: number; name: string }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Accounting class</Label>
            <select {...register("accountingClassification")} className="mt-1 w-full rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm">
              {["COST", "AMORTISED_COST", "FVTPL", "FVOCI"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <Label>Risk level</Label>
            <select {...register("riskLevel")} className="mt-1 w-full rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm">
              {["LOW", "MEDIUM", "HIGH"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {isEdit && (
            <div>
              <Label>Status</Label>
              <select {...register("status")} className="mt-1 w-full rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm">
                {["DRAFT", "ACTIVE", "SOLD", "MATURED", "CLOSED"].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}
          <div>
            <Label>Acquisition date</Label>
            <Input type="date" {...register("acquisitionDate")} className="mt-1" />
          </div>
          <div>
            <Label>Maturity date</Label>
            <Input type="date" {...register("maturityDate")} className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea {...register("notes")} rows={3} className="mt-1" />
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="submit" variant="noblex-primary" disabled={createAsset.isPending || updateAsset.isPending}>
            {isEdit ? (updateAsset.isPending ? "Saving…" : "Save changes") : (createAsset.isPending ? "Creating…" : "Create asset")}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(isEdit && assetId ? `/investments/assets/${assetId}` : "/investments/portfolio")}>
            {t("investments.actions.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
