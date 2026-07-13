import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { NobleXPageHeader } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { useInvestmentAccountSettings, useInvestmentMutations } from "@/hooks/investments/useInvestment";
import { chartOfAccountsAPI, investmentsAPI } from "@/services/api";
import { flattenCoaHierarchy, INVESTMENT_COA_FIELDS } from "@/lib/investmentCoaUtils";
import { accountConfigSchema, type AccountConfigFormValues } from "@/lib/investmentSchemas";
import { InvestmentCoaAccountSelect } from "@/components/investments/InvestmentCoaAccountSelect";
import { InvestmentPostingReadiness } from "@/components/investments/InvestmentPostingReadiness";
import { InvestmentNumberingPanel } from "@/components/investments/InvestmentNumberingPanel";
import { toast } from "sonner";

type FormValues = AccountConfigFormValues;

export default function InvestmentSettingsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useInvestmentAccountSettings();
  const { updateAccountSettings } = useInvestmentMutations();
  const [migrating, setMigrating] = useState(false);
  const { handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(accountConfigSchema),
  });

  const { data: coaLeaves = [] } = useQuery({
    queryKey: ["investment-coa-hierarchy"],
    queryFn: async () => {
      const res = await chartOfAccountsAPI.getHierarchy();
      return flattenCoaHierarchy(res.data?.data || []);
    },
  });

  useEffect(() => {
    if (!data) return;
    const values: FormValues = {};
    for (const { key } of INVESTMENT_COA_FIELDS) {
      values[key] = data[key] ?? null;
    }
    reset(values);
  }, [data, reset]);

  const onSubmit = (values: FormValues) => {
    const parsed: Record<string, number | null> = {};
    for (const { key } of INVESTMENT_COA_FIELDS) {
      parsed[key] = values[key] ?? null;
    }
    parsed.active = true;
    updateAccountSettings.mutate(parsed);
  };

  const values = watch();

  return (
    <div className="space-y-6 p-1 max-w-3xl">
      <NobleXPageHeader
        title={t("investments.settings.title")}
        subtitle={t("investments.settings.subtitle")}
      />
      <InvestmentPostingReadiness />
      <InvestmentNumberingPanel />
      {isLoading ? (
        <p className="text-noblex-slate">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border border-noblex-border bg-noblex-surface p-6">
          <p className="text-xs text-noblex-slate">
            Select leaf ledger accounts from your chart of accounts. BUY/SELL require investment asset + bank ledger; dividends and interest require income accounts.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INVESTMENT_COA_FIELDS.map(({ key, label, types }) => (
              <InvestmentCoaAccountSelect
                key={key}
                label={label}
                value={values[key]}
                accounts={coaLeaves}
                accountTypes={[...types]}
                required={["investmentAssetAccount", "dividendIncomeAccount", "interestIncomeAccount"].includes(key)}
                onChange={(v) => setValue(key, v)}
              />
            ))}
          </div>
          <Button type="submit" variant="noblex-primary" disabled={updateAccountSettings.isPending}>
            {updateAccountSettings.isPending ? "Saving…" : "Save mapping"}
          </Button>
        </form>
      )}
      <div className="rounded-lg border border-noblex-border bg-noblex-surface p-6 space-y-3">
        <h3 className="font-semibold">Phase 17 migration</h3>
        <p className="text-xs text-noblex-slate">
          Creates a default portfolio/book and maps legacy assets into instruments and holdings v2. Safe to re-run (idempotent).
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={migrating}
          onClick={async () => {
            try {
              setMigrating(true);
              const res = await investmentsAPI.migratePhase17();
              toast.success(`Migrated: ${JSON.stringify(res.data?.data || res.data)}`);
            } catch (e: any) {
              toast.error(e?.response?.data?.message || "Migration failed");
            } finally {
              setMigrating(false);
            }
          }}
        >
          {migrating ? "Running…" : "Run Phase 17 data migration"}
        </Button>
      </div>
    </div>
  );
}
