import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NobleXPageHeader } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DividendRegisterTable } from "@/components/investments/DividendRegisterTable";
import { useInvestmentMutations, useInvestmentPortfolio } from "@/hooks/investments/useInvestment";
import { investmentsAPI, bankAccountsAPI } from "@/services/api";

export default function InvestmentDividendsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { createTransaction } = useInvestmentMutations();
  const { data: portfolio } = useInvestmentPortfolio({ limit: 200 });
  const { data: banks } = useQuery({
    queryKey: ["bank-accounts-list"],
    queryFn: async () => {
      const res = await bankAccountsAPI.getAll({ limit: 100 });
      return res.data?.data?.bankAccounts || res.data?.data || [];
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["investment-dividends"],
    queryFn: async () => {
      const res = await investmentsAPI.getReportDividends();
      return res.data?.data || [];
    },
  });

  const [form, setForm] = useState({
    investmentAssetId: "",
    transactionType: "DIVIDEND",
    transactionDate: new Date().toISOString().slice(0, 10),
    baseAmount: "",
    bankAccountId: "",
  });

  const recordDividend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransaction.mutateAsync({
        investmentAssetId: Number(form.investmentAssetId),
        transactionType: form.transactionType,
        transactionDate: form.transactionDate,
        quantity: 0,
        unitPrice: 0,
        grossAmount: Number(form.baseAmount),
        netAmount: Number(form.baseAmount),
        baseAmount: Number(form.baseAmount),
        bankAccountId: form.bankAccountId ? Number(form.bankAccountId) : undefined,
      });
      setForm((f) => ({ ...f, baseAmount: "" }));
      refetch();
      qc.invalidateQueries({ queryKey: ["investment-dashboard"] });
    } catch {
      /* toast handled in mutation */
    }
  };

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader title={t("investments.dividends.title")} subtitle={t("investments.dividends.subtitle")} />
      <form onSubmit={recordDividend} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 rounded-lg border border-noblex-border bg-noblex-surface p-4">
        <div className="lg:col-span-2">
          <Label>Asset</Label>
          <select
            required
            className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm"
            value={form.investmentAssetId}
            onChange={(e) => setForm({ ...form, investmentAssetId: e.target.value })}
          >
            <option value="">Select asset…</option>
            {(portfolio?.assets || []).map((a: { id: number; investmentCode: string; investmentName: string }) => (
              <option key={a.id} value={a.id}>{a.investmentCode} — {a.investmentName}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Type</Label>
          <select className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm" value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value })}>
            <option value="DIVIDEND">DIVIDEND</option>
            <option value="INTEREST">INTEREST</option>
          </select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label>Amount</Label>
          <Input type="number" step="any" required value={form.baseAmount} onChange={(e) => setForm({ ...form, baseAmount: e.target.value })} className="mt-1" />
        </div>
        <div className="lg:col-span-2">
          <Label>Bank account</Label>
          <select
            required
            className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm"
            value={form.bankAccountId}
            onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
          >
            <option value="">Select bank…</option>
            {(banks || []).map((b: { id: number; bankName: string; accountName: string }) => (
              <option key={b.id} value={b.id}>{b.bankName} — {b.accountName}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="noblex-primary" disabled={createTransaction.isPending}>Record income</Button>
        </div>
      </form>
      {isLoading ? <p className="text-noblex-slate">Loading…</p> : <DividendRegisterTable rows={data || []} />}
    </div>
  );
}
