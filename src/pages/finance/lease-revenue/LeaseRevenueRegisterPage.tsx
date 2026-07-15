import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { leaseRevenueAPI } from "@/services/api";
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
  "FULLY_RECOGNIZED",
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

export default function LeaseRevenueRegisterPage() {
  const { t } = useTranslation("leaseRevenue");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leaseIdParam = searchParams.get("leaseId") ?? "";
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaseRevenueAPI.getAll({
        limit: 100,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        leaseId: leaseIdParam ? parseInt(leaseIdParam, 10) : undefined,
      });
      const payload = res.data?.data;
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      setRows(list);
    } catch {
      toast.error(t("toast.loadFailed"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, leaseIdParam, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep-link from a lease: jump straight to the single linked schedule.
  useEffect(() => {
    if (!leaseIdParam || loading || statusFilter || search.trim()) return;
    const open = rows.filter((r) => r?.status && r.status !== "CANCELLED");
    if (open.length === 1 && open[0]?.id) {
      navigate(`/finance/lease-revenue/${open[0].id}`, { replace: true });
    }
  }, [leaseIdParam, loading, rows, statusFilter, search, navigate]);

  const statusLabel = (status: string) =>
    t(`status.${status}`, { defaultValue: status });

  const newScheduleHref = leaseIdParam
    ? `/finance/lease-revenue/new?leaseId=${leaseIdParam}`
    : "/finance/lease-revenue/new";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("register.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("register.subtitle")}</p>
          {leaseIdParam && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("register.filteredByLease", { leaseId: leaseIdParam })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.refresh")}
          </Button>
          <Button onClick={() => navigate(newScheduleHref)}>
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
                  <TableHead>{t("register.lease")}</TableHead>
                  <TableHead>{t("register.amount")}</TableHead>
                  <TableHead>{t("register.remaining")}</TableHead>
                  <TableHead>{t("register.servicePeriod")}</TableHead>
                  <TableHead>{t("register.revenueModel")}</TableHead>
                  <TableHead>{t("register.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      {t("register.noRecords")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.scheduleNumber}</TableCell>
                      <TableCell>
                        {r.lease?.leaseNumber ?? r.leaseId}
                      </TableCell>
                      <TableCell>{Number(r.totalContractAmount).toFixed(2)}</TableCell>
                      <TableCell>
                        {Number(r.remainingAmount ?? r.deferredBalance ?? r.totalContractAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {String(r.serviceStartDate).slice(0, 10)} —{" "}
                        {String(r.serviceEndDate).slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        {t(`form.revenueModels.${r.revenueModel}`, { defaultValue: r.revenueModel })}
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
                          onClick={() => navigate(`/finance/lease-revenue/${r.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {["DRAFT", "SCHEDULE_GENERATED"].includes(r.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/finance/lease-revenue/${r.id}/edit`)}
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
