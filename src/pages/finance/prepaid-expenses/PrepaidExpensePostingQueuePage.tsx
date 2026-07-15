import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { prepaidExpensesAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiMessage } from "./PrepaidExpenseRegisterPage";

export default function PrepaidExpensePostingQueuePage() {
  const { t } = useTranslation("prepaid");
  const { can } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchId, setBatchId] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await prepaidExpensesAPI.getPostingQueue();
      setRows(res.data?.data ?? []);
    } catch {
      toast.error(t("toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const createBatch = async () => {
    if (!can("module:prepaid_expenses:post")) return;
    setActing(true);
    try {
      const res = await prepaidExpensesAPI.createPostingBatch({
        lineIds: rows.map((r) => r.id),
      });
      const id = res.data?.data?.id;
      if (id) setBatchId(String(id));
      toast.success(t("toast.actionSuccess"));
    } catch (e) {
      toast.error(apiMessage(e) || t("toast.actionFailed"));
    } finally {
      setActing(false);
    }
  };

  const processBatch = async () => {
    if (!can("module:prepaid_expenses:post") || !batchId) return;
    setActing(true);
    try {
      await prepaidExpensesAPI.processPostingBatch(parseInt(batchId, 10));
      toast.success(t("toast.actionSuccess"));
      setBatchId("");
      await load();
    } catch (e) {
      toast.error(apiMessage(e) || t("toast.actionFailed"));
    } finally {
      setActing(false);
    }
  };

  const postingLabel = (s: string) => t(`postingStatus.${s}`, { defaultValue: s });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("postingQueue.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("postingQueue.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.refresh")}
          </Button>
          {can("module:prepaid_expenses:post") && (
            <>
              <Button onClick={createBatch} disabled={acting || rows.length === 0}>
                {t("postingQueue.createBatch")}
              </Button>
              <Button variant="secondary" onClick={processBatch} disabled={acting || !batchId}>
                {t("postingQueue.processBatch")}
              </Button>
            </>
          )}
        </div>
      </div>

      {batchId && (
        <div className="max-w-xs">
          <Label>{t("postingQueue.batchId")}</Label>
          <Input className="mt-1 font-mono" value={batchId} readOnly />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("postingQueue.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">{t("postingQueue.noLines")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("schedules.prepaid")}</TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>{t("schedules.month")}</TableHead>
                  <TableHead>{t("schedules.dueDate")}</TableHead>
                  <TableHead>{t("schedules.amount")}</TableHead>
                  <TableHead>{t("schedules.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      {line.prepaidExpense ? (
                        <Link
                          className="text-primary hover:underline font-mono"
                          to={`/finance/prepaid-expenses/${line.prepaidExpense.id ?? line.prepaidExpenseId}`}
                        >
                          {line.prepaidExpense.prepaidNumber}
                        </Link>
                      ) : (
                        line.prepaidExpenseId
                      )}
                    </TableCell>
                    <TableCell>{line.lineNumber}</TableCell>
                    <TableCell>{line.recognitionMonth}</TableCell>
                    <TableCell>{String(line.dueDate ?? line.periodEndDate).slice(0, 10)}</TableCell>
                    <TableCell className="font-mono">
                      {Number(line.scheduledAmount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{postingLabel(line.postingStatus)}</Badge>
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
