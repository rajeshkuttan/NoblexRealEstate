import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { prepaidExpensesAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

type DashboardKpis = {
  activeCount: number;
  remainingTotal: string;
  dueThisMonth: number;
  exceptions: number;
  postingQueue: number;
};

export default function PrepaidExpenseDashboardPage() {
  const { t } = useTranslation("prepaid");
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await prepaidExpensesAPI.getDashboard();
      setKpis(res.data?.data ?? null);
    } catch {
      toast.error(t("toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = [
    { label: t("dashboard.activeCount"), value: kpis?.activeCount ?? 0 },
    { label: t("dashboard.remainingTotal"), value: kpis?.remainingTotal ?? "0.00" },
    { label: t("dashboard.dueThisMonth"), value: kpis?.dueThisMonth ?? 0 },
    { label: t("dashboard.exceptions"), value: kpis?.exceptions ?? 0 },
    { label: t("dashboard.postingQueue"), value: kpis?.postingQueue ?? 0 },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.refresh")}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/finance/prepaid-expenses">{t("dashboard.viewRegister")}</Link>
          </Button>
          <Button asChild>
            <Link to="/finance/prepaid-expenses/posting-queue">{t("dashboard.viewQueue")}</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
