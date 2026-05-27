import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollAccountConfigPage() {
  const [form, setForm] = useState<Record<string, string>>({ payroll_payable_account: "" });

  useEffect(() => {
    payrollAPI.finance.accountConfig.get().then((r) => {
      const d = r.data?.data;
      if (!d) return;
      setForm({
        payroll_payable_account: String(d.payrollPayableAccount ?? ""),
        basic_salary_expense_account: String(d.basicSalaryExpenseAccount ?? ""),
        loan_recovery_account: String(d.loanRecoveryAccount ?? ""),
        wps_clearing_enabled: d.wpsClearingEnabled ? "1" : "0",
      });
    });
  }, []);

  const save = async () => {
    await payrollAPI.finance.accountConfig.update({
      payroll_payable_account: Number(form.payroll_payable_account),
      basic_salary_expense_account: form.basic_salary_expense_account
        ? Number(form.basic_salary_expense_account)
        : undefined,
      loan_recovery_account: form.loan_recovery_account ? Number(form.loan_recovery_account) : undefined,
      wps_clearing_enabled: form.wps_clearing_enabled === "1",
    });
    toast.success("Payroll GL configuration saved");
  };

  return (
    <PayrollLegacyPage title="Payroll GL accounts" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div>
            <Label>Payroll payable account (required)</Label>
            <Input
              value={form.payroll_payable_account}
              onChange={(e) => setForm({ ...form, payroll_payable_account: e.target.value })}
            />
          </div>
          <div>
            <Label>Basic salary expense</Label>
            <Input
              value={form.basic_salary_expense_account ?? ""}
              onChange={(e) => setForm({ ...form, basic_salary_expense_account: e.target.value })}
            />
          </div>
          <div>
            <Label>Loan recovery account</Label>
            <Input
              value={form.loan_recovery_account ?? ""}
              onChange={(e) => setForm({ ...form, loan_recovery_account: e.target.value })}
            />
          </div>
          <Button onClick={save}>Save</Button>
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
}
