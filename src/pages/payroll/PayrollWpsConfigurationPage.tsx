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

export default function PayrollWpsConfigurationPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [form, setForm] = useState({
    mol_establishment_id: "",
    agent_name: "",
    payer_bank_name: "",
    payer_bank_iban: "",
  });

  const load = () => payrollAPI.wps.configurations.list().then((r) => setConfigs(r.data?.data ?? []));

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    await payrollAPI.wps.configurations.create({ ...form, status: "ACTIVE" });
    toast.success("WPS configuration saved");
    load();
  };

  return (
    <PayrollLegacyPage titleKey="payroll.pages.wpsConfiguration" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4 max-w-lg">
          <div>
            <Label>MOL establishment ID</Label>
            <Input
              value={form.mol_establishment_id}
              onChange={(e) => setForm({ ...form, mol_establishment_id: e.target.value })}
            />
          </div>
          <div>
            <Label>Agent name</Label>
            <Input value={form.agent_name} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} />
          </div>
          <div>
            <Label>Payer bank</Label>
            <Input
              value={form.payer_bank_name}
              onChange={(e) => setForm({ ...form, payer_bank_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Payer IBAN</Label>
            <Input
              value={form.payer_bank_iban}
              onChange={(e) => setForm({ ...form, payer_bank_iban: e.target.value })}
            />
          </div>
          <Button onClick={save}>Save active configuration</Button>
        </CardContent>
      </Card>
      {configs.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Existing configurations</p>
            <ul className="text-sm space-y-1">
              {configs.map((c) => (
                <li key={c.id}>
                  #{c.id} — {c.molEstablishmentId || "—"} ({c.status})
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
          </div>
        </PayrollLegacyPage>
  );
}
