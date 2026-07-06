import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useInvestmentAccountSettings } from "@/hooks/investments/useInvestment";
import { bankAccountsAPI } from "@/services/api";
import { INVESTMENT_COA_FIELDS, REQUIRED_POSTING_FIELDS } from "@/lib/investmentCoaUtils";

export function InvestmentPostingReadiness() {
  const { data: settings, isLoading: settingsLoading } = useInvestmentAccountSettings();
  const { data: banks, isLoading: banksLoading } = useQuery({
    queryKey: ["bank-accounts-posting-readiness"],
    queryFn: async () => {
      const res = await bankAccountsAPI.getAll({ limit: 100 });
      return res.data?.data?.bankAccounts || res.data?.data || [];
    },
  });

  if (settingsLoading || banksLoading) {
    return <p className="text-sm text-noblex-slate">Checking posting readiness…</p>;
  }

  const linkedBanks = (banks || []).filter((b: { chartAccountId?: number | null }) => b.chartAccountId);
  const missingCoa = REQUIRED_POSTING_FIELDS.filter((key) => !settings?.[key]);
  const ready = missingCoa.length === 0 && linkedBanks.length > 0;

  return (
    <div className={`rounded-lg border p-4 ${ready ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
      <div className="flex items-start gap-3">
        {ready ? (
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" weight="fill" />
        ) : (
          <WarningCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" weight="fill" />
        )}
        <div className="space-y-2 text-sm flex-1">
          <p className="font-medium text-noblex-platinum">
            {ready ? "Ready to post to finance" : "Posting setup incomplete"}
          </p>
          {!ready && (
            <ul className="text-noblex-slate space-y-1 list-disc list-inside">
              {missingCoa.map((key) => {
                const field = INVESTMENT_COA_FIELDS.find((f) => f.key === key);
                return <li key={key}>Map {field?.label || key} in settings</li>;
              })}
              {linkedBanks.length === 0 && (
                <li>
                  Link at least one bank account to a chart ledger (
                  <Link to="/treasury" className="text-noblex-gold hover:underline">Treasury</Link>
                  )
                </li>
              )}
            </ul>
          )}
          {ready && (
            <p className="text-noblex-slate">
              {linkedBanks.length} bank account(s) linked to GL. Approve transactions, then use Post to create balanced journal entries.
            </p>
          )}
          <Link to="/investments/settings" className="inline-block text-noblex-gold hover:underline text-xs">
            Investment GL settings →
          </Link>
        </div>
      </div>
    </div>
  );
}
