import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { prepaidExpensesAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiMessage } from "./PrepaidExpenseRegisterPage";

type ReconRow = {
  id: number;
  prepaidExpenseId: number;
  prepaidNumber?: string;
  reconciliationDate?: string;
  glBalance?: number;
  scheduleBalance?: number;
  varianceAmount?: number;
  status?: string;
};

export default function PrepaidExpenseReconciliationPage() {
  const { t } = useTranslation("prepaid");
  const { can } = useAuth();
  const [prepaids, setPrepaids] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [results, setResults] = useState<ReconRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  const loadPrepaids = useCallback(async () => {
    try {
      const res = await prepaidExpensesAPI.getAll({ limit: 200 });
      setPrepaids(res.data?.data?.data ?? res.data?.data ?? []);
    } catch {
      toast.error(t("toast.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    loadPrepaids();
  }, [loadPrepaids]);

  const runReconcile = async () => {
    if (!selectedId || !can("module:prepaid_expenses:reconcile")) return;
    setActing(true);
    try {
      const res = await prepaidExpensesAPI.reconcile(parseInt(selectedId, 10));
      const row = res.data?.data;
      if (row) {
        const prepaid = prepaids.find((p) => p.id === parseInt(selectedId, 10));
        setResults((prev) => [
          {
            ...row,
            prepaidExpenseId: parseInt(selectedId, 10),
            prepaidNumber: prepaid?.prepaidNumber,
          },
          ...prev,
        ]);
      }
      toast.success(t("toast.actionSuccess"));
    } catch (e) {
      toast.error(apiMessage(e) || t("toast.actionFailed"));
    } finally {
      setActing(false);
    }
  };

  const resolve = async (reconciliationId: number) => {
    if (!can("module:prepaid_expenses:reconcile")) return;
    setLoading(true);
    try {
      await prepaidExpensesAPI.resolveReconciliation(reconciliationId, {
        resolutionNotes: "Resolved from reconciliation page",
      });
      setResults((prev) =>
        prev.map((r) => (r.id === reconciliationId ? { ...r, status: "RESOLVED" } : r))
      );
      toast.success(t("toast.actionSuccess"));
    } catch (e) {
      toast.error(apiMessage(e) || t("toast.actionFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("reconciliation.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("reconciliation.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("reconciliation.runReconcile")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[280px]">
            <Label>{t("reconciliation.selectPrepaid")}</Label>
            <select
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">—</option>
              {prepaids.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.prepaidNumber} — {p.description}
                </option>
              ))}
            </select>
          </div>
          {can("module:prepaid_expenses:reconcile") && (
            <Button onClick={runReconcile} disabled={acting || !selectedId}>
              {t("reconciliation.runReconcile")}
            </Button>
          )}
          <Button variant="outline" onClick={loadPrepaids}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.refresh")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("reconciliation.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-muted-foreground">{t("reconciliation.noResults")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("schedules.prepaid")}</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>{t("reconciliation.glBalance")}</TableHead>
                  <TableHead>{t("reconciliation.scheduleBalance")}</TableHead>
                  <TableHead>{t("reconciliation.variance")}</TableHead>
                  <TableHead>{t("register.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        className="text-primary hover:underline font-mono"
                        to={`/finance/prepaid-expenses/${r.prepaidExpenseId}`}
                      >
                        {r.prepaidNumber ?? r.prepaidExpenseId}
                      </Link>
                    </TableCell>
                    <TableCell>{String(r.reconciliationDate ?? "").slice(0, 10)}</TableCell>
                    <TableCell className="font-mono">{Number(r.glBalance ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="font-mono">
                      {Number(r.scheduleBalance ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {Number(r.varianceAmount ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>
                      {can("module:prepaid_expenses:reconcile") && r.status !== "RESOLVED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => resolve(r.id)}
                        >
                          {t("reconciliation.resolve")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
