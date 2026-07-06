import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvestmentMutations, useInvestmentPortfolio } from "@/hooks/investments/useInvestment";
import { useQuery } from "@tanstack/react-query";
import { bankAccountsAPI } from "@/services/api";
import { investmentTransactionSchema, type InvestmentTransactionFormValues } from "@/lib/investmentSchemas";

const TXN_TYPES = ["BUY", "SELL", "DIVIDEND", "INTEREST", "CHARGE", "BONUS", "SPLIT", "MATURITY", "FX_GAIN_LOSS", "WRITE_OFF"] as const;
const BANK_REQUIRED_TYPES = new Set(["BUY", "SELL", "DIVIDEND", "INTEREST", "CHARGE", "MATURITY", "FX_GAIN_LOSS"]);

interface InvestmentTransactionFormProps {
  defaultAssetId?: number;
  onSuccess?: () => void;
}

export function InvestmentTransactionForm({ defaultAssetId, onSuccess }: InvestmentTransactionFormProps) {
  const { data: portfolio } = useInvestmentPortfolio({ limit: 200 });
  const { createTransaction } = useInvestmentMutations();
  const { data: banks } = useQuery({
    queryKey: ["bank-accounts-list"],
    queryFn: async () => {
      const res = await bankAccountsAPI.getAll({ limit: 100 });
      return res.data?.data?.bankAccounts || res.data?.data || [];
    },
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<InvestmentTransactionFormValues>({
    resolver: zodResolver(investmentTransactionSchema),
    defaultValues: {
      investmentAssetId: defaultAssetId ? String(defaultAssetId) : "",
      transactionType: "BUY",
      transactionDate: new Date().toISOString().slice(0, 10),
      quantity: 0,
      unitPrice: 0,
      currencyCode: "AED",
      exchangeRate: 1,
      bankAccountId: "",
    },
  });

  const transactionType = watch("transactionType");
  const currencyCode = watch("currencyCode");
  const needsBank = BANK_REQUIRED_TYPES.has(transactionType);
  const isSplit = transactionType === "SPLIT";
  const assets = portfolio?.assets || [];

  const onSubmit = async (values: InvestmentTransactionFormValues) => {
    const qty = Number(values.quantity || 0);
    const price = Number(values.unitPrice || 0);
    const charges = Number(values.chargesAmount || 0);
    const tax = Number(values.taxAmount || 0);
    const gross = values.transactionType === "DIVIDEND" || values.transactionType === "INTEREST"
      ? Number(values.baseAmount || 0)
      : qty * price;
    const net = gross - tax + (values.transactionType === "BUY" ? charges : 0);
    const rate = values.currencyCode === "AED" ? 1 : Number(values.exchangeRate || 1);
    await createTransaction.mutateAsync({
      investmentAssetId: Number(values.investmentAssetId),
      transactionType: values.transactionType,
      transactionDate: values.transactionDate,
      quantity: qty,
      unitPrice: price,
      grossAmount: gross,
      netAmount: net,
      baseAmount: net * rate,
      bankAccountId: values.bankAccountId ? Number(values.bankAccountId) : undefined,
      currencyCode: values.currencyCode,
      exchangeRate: rate,
      chargesAmount: charges,
      taxAmount: tax,
      splitRatio: isSplit ? price : undefined,
    });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg border border-noblex-border bg-noblex-surface p-4">
      <div className="md:col-span-2">
        <Label>Investment asset</Label>
        <select {...register("investmentAssetId")} className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm">
          <option value="">Select asset…</option>
          {assets.map((a: { id: number; investmentCode: string; investmentName: string }) => (
            <option key={a.id} value={a.id}>{a.investmentCode} — {a.investmentName}</option>
          ))}
        </select>
        {errors.investmentAssetId && <p className="text-xs text-rose-400 mt-1">{errors.investmentAssetId.message}</p>}
      </div>
      <div>
        <Label>Transaction type</Label>
        <select {...register("transactionType")} className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm">
          {TXN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <Label>Date</Label>
        <Input type="date" {...register("transactionDate")} className="mt-1" />
        {errors.transactionDate && <p className="text-xs text-rose-400 mt-1">{errors.transactionDate.message}</p>}
      </div>
      <div>
        <Label>Quantity</Label>
        <Input type="number" step="any" {...register("quantity")} className="mt-1" />
        {errors.quantity && <p className="text-xs text-rose-400 mt-1">{errors.quantity.message}</p>}
      </div>
      <div>
        <Label>{isSplit ? "Split ratio" : "Unit price"}</Label>
        <Input type="number" step="any" {...register("unitPrice")} className="mt-1" />
      </div>
      <div>
        <Label>Amount (income)</Label>
        <Input type="number" step="any" {...register("baseAmount")} className="mt-1" />
      </div>
      <div>
        <Label>Charges</Label>
        <Input type="number" step="any" {...register("chargesAmount")} className="mt-1" />
      </div>
      <div>
        <Label>Tax</Label>
        <Input type="number" step="any" {...register("taxAmount")} className="mt-1" />
      </div>
      <div>
        <Label>Currency</Label>
        <select {...register("currencyCode")} className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm">
          {["AED", "USD", "EUR", "GBP", "SAR"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {currencyCode !== "AED" && (
        <div>
          <Label>Exchange rate to AED</Label>
          <Input type="number" step="any" {...register("exchangeRate")} className="mt-1" />
          {errors.exchangeRate && <p className="text-xs text-rose-400 mt-1">{errors.exchangeRate.message}</p>}
        </div>
      )}
      <div className="md:col-span-2">
        <Label>Bank account <span className="text-noblex-slate text-xs">{needsBank ? "(required)" : "(optional)"}</span></Label>
        <select {...register("bankAccountId")} className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm">
          <option value="">— Select bank account —</option>
          {(banks || []).map((b: { id: number; bankName: string; accountName: string }) => (
            <option key={b.id} value={b.id}>{b.bankName} — {b.accountName}</option>
          ))}
        </select>
        {errors.bankAccountId && <p className="text-xs text-rose-400 mt-1">{errors.bankAccountId.message}</p>}
      </div>
      <div className="flex items-end">
        <Button type="submit" variant="noblex-primary" disabled={createTransaction.isPending}>
          {createTransaction.isPending ? "Saving…" : "Record transaction"}
        </Button>
      </div>
    </form>
  );
}
