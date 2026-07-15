import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { prepaidExpensesAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Plus, RefreshCw, Eye, Pencil } from "lucide-react";

const STATUSES = [
  "DRAFT",
  "SCHEDULE_GENERATED",
  "SUBMITTED",
  "APPROVED",
  "ACTIVE",
  "PARTIALLY_RECOGNIZED",
  "SUSPENDED",
  "TERMINATED",
  "CANCELLED",
];

function apiMessage(e: unknown): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    "Request failed"
  );
}

export default function PrepaidExpenseRegisterPage() {
  const { t } = useTranslation("prepaid");
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await prepaidExpensesAPI.getAll({
        limit: 100,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setRows(res.data?.data?.data ?? res.data?.data ?? []);
    } catch {
      toast.error(t("toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, t]);

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = (status: string) =>
    t(`status.${status}`, { defaultValue: status });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("register.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("register.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.refresh")}
          </Button>
          <Button onClick={() => navigate("/finance/prepaid-expenses/new")}>
            <Plus className="h-4 w-4 mr-2" />
            {t("register.new")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder={t("register.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{t("register.allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={load}>
          {t("common.refresh")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("register.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("register.number")}</TableHead>
                  <TableHead>{t("register.description")}</TableHead>
                  <TableHead>{t("register.amount")}</TableHead>
                  <TableHead>{t("register.remaining")}</TableHead>
                  <TableHead>{t("register.servicePeriod")}</TableHead>
                  <TableHead>{t("register.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      {t("register.noRecords")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.prepaidNumber}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>{Number(r.totalAmount).toFixed(2)}</TableCell>
                      <TableCell>{Number(r.remainingAmount ?? r.totalAmount).toFixed(2)}</TableCell>
                      <TableCell>
                        {String(r.serviceStartDate).slice(0, 10)} —{" "}
                        {String(r.serviceEndDate).slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === "DRAFT" ? "secondary" : "default"}>
                          {statusLabel(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/finance/prepaid-expenses/${r.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {["DRAFT", "SCHEDULE_GENERATED"].includes(r.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/finance/prepaid-expenses/${r.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { apiMessage };
