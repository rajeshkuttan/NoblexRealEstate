import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollPageShell } from "@/components/payroll";

export default function PayrollPostingRegisterPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    payrollAPI.finance.reports.postingRegister().then((r) => setData(r.data?.data));
  }, []);

  return (
    <PayrollPageShell
      title={t("payroll.pages.postingRegister")}
      description="Payroll and settlement postings with GL references."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Finance", href: "/people/payroll/finance" },
        { label: "Posting register" },
      ]}
      showPeriod={false}
    >
      <Card>
        <CardHeader>
          <CardTitle>Posted payroll runs</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {(data?.runs || []).map((r: any) => (
              <li key={r.id}>
                Run #{r.runNumber} — {r.financePostingStatus} (txn {r.financeTransactionNo ?? "—"})
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Posted settlements</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {(data?.settlements || []).map((s: any) => (
              <li key={s.id}>
                Settlement #{s.settlementNumber} — {s.financePostingStatus}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PayrollPageShell>
  );
}
