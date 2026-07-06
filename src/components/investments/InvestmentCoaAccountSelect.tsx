import { CoaLeaf } from "@/lib/investmentCoaUtils";
import { Label } from "@/components/ui/label";

interface InvestmentCoaAccountSelectProps {
  label: string;
  value?: number | null;
  accounts: CoaLeaf[];
  accountTypes?: string[];
  onChange: (value: number | null) => void;
  required?: boolean;
}

export function InvestmentCoaAccountSelect({
  label,
  value,
  accounts,
  accountTypes,
  onChange,
  required,
}: InvestmentCoaAccountSelectProps) {
  const filtered = accountTypes?.length
    ? accounts.filter((a) => accountTypes.includes(a.accountType))
    : accounts;

  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </Label>
      <select
        className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">— Select ledger account —</option>
        {filtered.map((a) => (
          <option key={a.id} value={a.id}>
            {a.accountCode} — {a.accountName}
          </option>
        ))}
      </select>
    </div>
  );
}
