import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollEosConfigurationPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [form, setForm] = useState({
    rule_name: "Default EOS",
    contract_type: "ALL",
    minimum_service_months: "12",
    gratuity_formula_type: "RULE_BASED",
  });

  const load = () => payrollAPI.settlement.eos.list().then((r) => setConfigs(r.data?.data ?? []));

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    await payrollAPI.settlement.eos.create({
      rule_name: form.rule_name,
      contract_type: form.contract_type,
      minimum_service_months: Number(form.minimum_service_months),
      gratuity_formula_type: form.gratuity_formula_type,
      active: true,
    });
    toast.success("EOS configuration saved");
    load();
  };

  return (
    <PayrollLegacyPage titleKey="payroll.pages.eosConfiguration" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4 max-w-lg">
          <p className="text-sm text-muted-foreground">Configurable tiers — no hardcoded UAE law values.</p>
          <div>
            <Label>Rule name</Label>
            <Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} />
          </div>
          <div>
            <Label>Minimum service (months)</Label>
            <Input
              value={form.minimum_service_months}
              onChange={(e) => setForm({ ...form, minimum_service_months: e.target.value })}
            />
          </div>
          <Button onClick={save}>Save configuration</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <ul className="text-sm space-y-1">
            {configs.map((c) => (
              <li key={c.id}>
                #{c.id} {c.ruleName} — {c.contractType} ({c.gratuityFormulaType})
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
}
