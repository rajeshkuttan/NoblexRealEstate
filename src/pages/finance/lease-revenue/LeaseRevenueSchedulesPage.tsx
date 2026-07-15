import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { leaseRevenueAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type FlatLine = {
  id: number;
  scheduleId: number;
  scheduleNumber: string;
  leaseNumber?: string;
  lineNumber: number;
  recognitionMonth: string;
  dueDate: string;
  scheduledAmount: number;
  postingStatus: string;
};

export default function LeaseRevenueSchedulesPage() {
  const { t } = useTranslation("leaseRevenue");
  const [lines, setLines] = useState<FlatLine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaseRevenueAPI.getAll({ limit: 100 });
      const schedules = res.data?.data?.data ?? res.data?.data ?? [];
      const detailResponses = await Promise.allSettled(
        schedules.slice(0, 50).map((e: { id: number }) => leaseRevenueAPI.getById(e.id))
      );
      const flat: FlatLine[] = [];
      for (const r of detailResponses) {
        if (r.status !== "fulfilled") continue;
        const sched = r.value.data?.data;
        if (!sched?.scheduleLines?.length) continue;
        for (const line of sched.scheduleLines) {
          if (["POSTED", "CANCELLED", "REVERSED"].includes(line.postingStatus)) continue;
          flat.push({
            id: line.id,
            scheduleId: sched.id,
            scheduleNumber: sched.scheduleNumber,
            leaseNumber: sched.lease?.leaseNumber,
            lineNumber: line.lineNumber,
            recognitionMonth: line.recognitionMonth,
            dueDate: String(line.dueDate ?? line.periodEndDate).slice(0, 10),
            scheduledAmount: Number(line.scheduledAmount),
            postingStatus: line.postingStatus,
          });
        }
      }
      flat.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      setLines(flat);
    } catch {
      toast.error(t("toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const postingLabel = useMemo(
    () => (s: string) => t(`postingStatus.${s}`, { defaultValue: s }),
    [t]
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("schedules.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("schedules.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("common.refresh")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("schedules.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : lines.length === 0 ? (
            <p className="text-muted-foreground">{t("schedules.noLines")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("schedules.schedule")}</TableHead>
                  <TableHead>{t("register.lease")}</TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>{t("schedules.month")}</TableHead>
                  <TableHead>{t("schedules.dueDate")}</TableHead>
                  <TableHead>{t("schedules.amount")}</TableHead>
                  <TableHead>{t("schedules.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Link
                        className="text-primary hover:underline font-mono"
                        to={`/finance/lease-revenue/${line.scheduleId}`}
                      >
                        {line.scheduleNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{line.leaseNumber ?? "—"}</TableCell>
                    <TableCell>{line.lineNumber}</TableCell>
                    <TableCell>{line.recognitionMonth}</TableCell>
                    <TableCell>{line.dueDate}</TableCell>
                    <TableCell className="font-mono">{line.scheduledAmount.toFixed(2)}</TableCell>
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
