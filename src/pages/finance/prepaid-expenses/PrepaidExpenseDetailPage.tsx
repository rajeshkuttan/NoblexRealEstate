import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { prepaidExpensesAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Printer, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import {
  defaultCompanyBranding,
  generatePrepaidExpenseHtml,
  printDocument,
} from "@/utils/printUtils";
import { apiMessage } from "./PrepaidExpenseRegisterPage";

export default function PrepaidExpenseDetailPage() {
  const { t } = useTranslation("prepaid");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { activeCompany } = useCompany();
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    if (!opts?.silent) setLoading(true);
    try {
      const res = await prepaidExpensesAPI.getById(parseInt(id, 10));
      setRecord(res.data?.data ?? null);
    } catch {
      toast.error(t("toast.loadFailed"));
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (_label: string, fn: () => Promise<unknown>) => {
    setActing(true);
    try {
      await fn();
      toast.success(t("toast.actionSuccess"));
      // Mutating APIs invalidate cache; silent reload refreshes schedule/JV without full-page flicker.
      await load({ silent: true });
    } catch (e) {
      toast.error(apiMessage(e) || t("toast.actionFailed"));
    } finally {
      setActing(false);
    }
  };

  const handlePrint = async () => {
    if (!id) return;
    setActing(true);
    try {
      const res = await prepaidExpensesAPI.getById(parseInt(id, 10));
      const data = res.data?.data;
      if (!data) throw new Error("Not found");
      const companyInfo = {
        name: activeCompany?.company_name || defaultCompanyBranding.name,
        address: defaultCompanyBranding.address,
        phone: defaultCompanyBranding.phone,
        email: defaultCompanyBranding.email,
        vatNumber: activeCompany?.vat_number || defaultCompanyBranding.vatNumber,
      };
      const html = generatePrepaidExpenseHtml({ ...data, companyInfo });
      printDocument(`Prepaid - ${data.prepaidNumber || id}`, html);
    } catch {
      toast.error(t("toast.printFailed", { defaultValue: "Failed to generate print view" }));
    } finally {
      setActing(false);
    }
  };

  const status = record?.status ?? "";
  const scheduleLines = record?.scheduleLines ?? [];
  const allocations = record?.allocations ?? [];
  const amendments = record?.amendments ?? [];
  const reconciliations = record?.reconciliations ?? [];

  const statusLabel = (s: string) => t(`status.${s}`, { defaultValue: s });
  const postingLabel = (s: string) => t(`postingStatus.${s}`, { defaultValue: s });

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  if (!record) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">{t("toast.loadFailed")}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/finance/prepaid-expenses")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-mono">{record.prepaidNumber}</h1>
            <p className="text-muted-foreground">{record.description}</p>
            <Badge className="mt-2">{statusLabel(status)}</Badge>
            {["SUBMITTED", "UNDER_REVIEW"].includes(status) && (
              <p className="text-xs text-muted-foreground mt-2 max-w-xl">
                {t("detail.makerCheckerHint")}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={acting}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("common.refresh")}
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={acting}>
            <Printer className="h-4 w-4 mr-2" />
            {t("detail.print")}
          </Button>
          {can("module:prepaid_expenses:update") &&
            ["DRAFT", "SCHEDULE_GENERATED"].includes(status) && (
              <Button variant="outline" asChild>
                <Link to={`/finance/prepaid-expenses/${id}/edit`}>{t("detail.edit")}</Link>
              </Button>
            )}
          {can("module:prepaid_expenses:generate_schedule") &&
            ["DRAFT", "SCHEDULE_GENERATED"].includes(status) && (
              <Button
                variant="outline"
                disabled={acting}
                onClick={() =>
                  runAction("generate", () =>
                    prepaidExpensesAPI.generateSchedule(parseInt(id!, 10))
                  )
                }
              >
                {t("detail.generateSchedule")}
              </Button>
            )}
          {can("module:prepaid_expenses:generate_schedule") && status === "SCHEDULE_GENERATED" && (
            <Button
              variant="outline"
              disabled={acting}
              onClick={() =>
                runAction("regenerate", () =>
                  prepaidExpensesAPI.regenerateSchedule(parseInt(id!, 10))
                )
              }
            >
              {t("detail.regenerateSchedule")}
            </Button>
          )}
          {can("module:prepaid_expenses:submit") &&
            ["DRAFT", "SCHEDULE_GENERATED"].includes(status) && (
              <Button
                disabled={acting}
                onClick={() =>
                  runAction("submit", () => prepaidExpensesAPI.submit(parseInt(id!, 10)))
                }
              >
                {t("detail.submit")}
              </Button>
            )}
          {can("module:prepaid_expenses:approve") &&
            ["SUBMITTED", "UNDER_REVIEW"].includes(status) && (
              <>
                <Button
                  disabled={acting}
                  onClick={() =>
                    runAction("approve", () => prepaidExpensesAPI.approve(parseInt(id!, 10)))
                  }
                >
                  {t("detail.approve")}
                </Button>
                <Button
                  variant="outline"
                  disabled={acting}
                  onClick={() =>
                    runAction("reject", () => prepaidExpensesAPI.reject(parseInt(id!, 10)))
                  }
                >
                  {t("detail.reject")}
                </Button>
              </>
            )}
          {can("module:prepaid_expenses:approve") && status === "APPROVED" && (
            <Button
              disabled={acting}
              onClick={() =>
                runAction("activate", () => prepaidExpensesAPI.activate(parseInt(id!, 10)))
              }
            >
              {t("detail.activate")}
            </Button>
          )}
          {can("module:prepaid_expenses:post") &&
            ["ACTIVE", "PARTIALLY_RECOGNIZED", "SUBMITTED", "APPROVED"].includes(status) && (
              <>
                <Button
                  variant="outline"
                  disabled={acting}
                  onClick={() =>
                    runAction("createDrafts", () =>
                      prepaidExpensesAPI.postLines(parseInt(id!, 10), { autoPost: false })
                    )
                  }
                >
                  {t("detail.createAllDraftJvs")}
                </Button>
                <Button
                  disabled={acting}
                  onClick={() =>
                    runAction("postAll", () =>
                      prepaidExpensesAPI.postLines(parseInt(id!, 10), { autoPost: true })
                    )
                  }
                >
                  {t("detail.postAllJvs")}
                </Button>
              </>
            )}
          {can("module:prepaid_expenses:update") &&
            ["ACTIVE", "PARTIALLY_RECOGNIZED"].includes(status) && (
              <Button
                variant="outline"
                disabled={acting}
                onClick={() =>
                  runAction("suspend", () => prepaidExpensesAPI.suspend(parseInt(id!, 10)))
                }
              >
                {t("detail.suspend")}
              </Button>
            )}
          {can("module:prepaid_expenses:update") && status === "SUSPENDED" && (
            <Button
              disabled={acting}
              onClick={() =>
                runAction("resume", () => prepaidExpensesAPI.resume(parseInt(id!, 10)))
              }
            >
              {t("detail.resume")}
            </Button>
          )}
          {can("module:prepaid_expenses:create") && (
            <Button
              variant="outline"
              disabled={acting}
              onClick={() =>
                runAction("clone", () => prepaidExpensesAPI.clone(parseInt(id!, 10)))
              }
            >
              {t("detail.clone")}
            </Button>
          )}
          {can("module:prepaid_expenses:delete") &&
            ["DRAFT", "SCHEDULE_GENERATED", "SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(
              status
            ) && (
              <Button
                variant="destructive"
                disabled={acting}
                onClick={() =>
                  runAction("cancel", () => prepaidExpensesAPI.cancel(parseInt(id!, 10)))
                }
              >
                {t("detail.cancel")}
              </Button>
            )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("register.amount")}</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl">{Number(record.totalAmount).toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("detail.recognized")}</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl">
            {Number(record.recognizedAmount ?? 0).toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("detail.remaining")}</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl">
            {Number(record.remainingAmount ?? record.totalAmount).toFixed(2)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("detail.dailyRate")}</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl">{Number(record.dailyRate ?? 0).toFixed(6)}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("detail.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="schedule">{t("detail.tabs.schedule")}</TabsTrigger>
          <TabsTrigger value="allocations">{t("detail.tabs.allocations")}</TabsTrigger>
          <TabsTrigger value="amendments">{t("detail.tabs.amendments")}</TabsTrigger>
          <TabsTrigger value="reconciliation">{t("detail.tabs.reconciliation")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid gap-3 md:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t("register.servicePeriod")}: </span>
                {String(record.serviceStartDate).slice(0, 10)} —{" "}
                {String(record.serviceEndDate).slice(0, 10)}
              </div>
              <div>
                <span className="text-muted-foreground">{t("detail.serviceDays")}: </span>
                {record.totalServiceDays}
              </div>
              <div>
                <span className="text-muted-foreground">{t("form.recognitionMethod")}: </span>
                {t(`form.methods.${record.recognitionMethod}`, { defaultValue: record.recognitionMethod })}
              </div>
              <div>
                <span className="text-muted-foreground">{t("form.postingMode")}: </span>
                {t(`form.postingModes.${record.postingMode}`, { defaultValue: record.postingMode })}
              </div>
              <div>
                <span className="text-muted-foreground">{t("form.prepaidAssetAccount")}: </span>
                {record.prepaidAssetAccount
                  ? `${record.prepaidAssetAccount.accountCode} — ${record.prepaidAssetAccount.accountName}`
                  : record.prepaidAssetAccountId}
              </div>
              <div>
                <span className="text-muted-foreground">{t("form.expenseAccount")}: </span>
                {record.expenseAccount
                  ? `${record.expenseAccount.accountCode} — ${record.expenseAccount.accountName}`
                  : record.expenseAccountId}
              </div>
              {record.notes && (
                <div className="md:col-span-2">
                  <span className="text-muted-foreground">{t("form.notes")}: </span>
                  {record.notes}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{t("detail.tabs.schedule")}</CardTitle>
              {can("module:prepaid_expenses:post") && scheduleLines.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={acting}
                    onClick={() =>
                      runAction("createDrafts", () =>
                        prepaidExpensesAPI.postLines(parseInt(id!, 10), { autoPost: false })
                      )
                    }
                  >
                    {t("detail.createAllDraftJvs")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={acting}
                    onClick={() =>
                      runAction("postAll", () =>
                        prepaidExpensesAPI.postLines(parseInt(id!, 10), { autoPost: true })
                      )
                    }
                  >
                    {t("detail.postAllJvs")}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {scheduleLines.length === 0 ? (
                <p className="text-muted-foreground">{t("detail.noSchedule")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t("detail.recognitionMonth")}</TableHead>
                      <TableHead>{t("form.period")}</TableHead>
                      <TableHead>{t("form.amount")}</TableHead>
                      <TableHead>{t("detail.postingStatus")}</TableHead>
                      <TableHead>{t("detail.jv")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleLines.map((line: any) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.lineNumber}</TableCell>
                        <TableCell>{line.recognitionMonth}</TableCell>
                        <TableCell>
                          {String(line.periodStartDate).slice(0, 10)} —{" "}
                          {String(line.periodEndDate).slice(0, 10)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {Number(line.scheduledAmount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{postingLabel(line.postingStatus)}</Badge>
                        </TableCell>
                        <TableCell>
                          {line.journalVoucherId ? (
                            <Link
                              to={`/journal-vouchers?view=${line.journalVoucherId}`}
                              className="font-mono text-sm text-primary underline-offset-4 hover:underline"
                            >
                              {line.journalVoucherNumber || `#${line.journalVoucherId}`}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {can("module:prepaid_expenses:post") &&
                            !["POSTED", "REVERSED", "CANCELLED"].includes(line.postingStatus) && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={acting}
                                onClick={() =>
                                  runAction("postLine", () =>
                                    prepaidExpensesAPI.postLine(parseInt(id!, 10), line.id, {
                                      autoPost: line.postingStatus === "DRAFT_JV_CREATED",
                                    })
                                  )
                                }
                              >
                                {line.postingStatus === "DRAFT_JV_CREATED"
                                  ? t("detail.postJvToGl")
                                  : t("detail.postLine")}
                              </Button>
                            )}
                          {can("module:prepaid_expenses:reverse") && line.postingStatus === "POSTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting}
                              onClick={() =>
                                runAction("reverse", () =>
                                  prepaidExpensesAPI.reverseLine(parseInt(id!, 10), line.id, {
                                    reason: "Manual reversal",
                                  })
                                )
                              }
                            >
                              {t("detail.reverseLine")}
                            </Button>
                          )}
                          {can("module:prepaid_expenses:post") && line.postingStatus === "REVERSED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting}
                              onClick={() =>
                                runAction("repost", () =>
                                  prepaidExpensesAPI.repostLine(parseInt(id!, 10), line.id)
                                )
                              }
                            >
                              {t("detail.repostLine")}
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
        </TabsContent>

        <TabsContent value="allocations" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {allocations.length === 0 ? (
                <p className="text-muted-foreground">{t("detail.noAllocations")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("detail.expenseAccount")}</TableHead>
                      <TableHead>{t("detail.allocationPercent")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.expenseAccountId}</TableCell>
                        <TableCell>{a.allocationPercentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amendments" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {amendments.length === 0 ? (
                <p className="text-muted-foreground">{t("detail.noAmendments")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{t("register.status")}</TableHead>
                      <TableHead>{t("form.description")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {amendments.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.id}</TableCell>
                        <TableCell>{a.status ?? a.approvalStatus}</TableCell>
                        <TableCell>{a.reason ?? a.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {can("module:prepaid_expenses:reconcile") && (
                <Button
                  disabled={acting}
                  onClick={() =>
                    runAction("reconcile", () => prepaidExpensesAPI.reconcile(parseInt(id!, 10)))
                  }
                >
                  {t("reconciliation.runReconcile")}
                </Button>
              )}
              {reconciliations.length === 0 ? (
                <p className="text-muted-foreground">{t("detail.noReconciliations")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>{t("reconciliation.glBalance")}</TableHead>
                      <TableHead>{t("reconciliation.scheduleBalance")}</TableHead>
                      <TableHead>{t("reconciliation.variance")}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliations.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{String(r.reconciliationDate ?? r.createdAt).slice(0, 10)}</TableCell>
                        <TableCell className="font-mono">{Number(r.glBalance ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="font-mono">
                          {Number(r.scheduleBalance ?? r.subledgerBalance ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono">{Number(r.varianceAmount ?? 0).toFixed(2)}</TableCell>
                        <TableCell>
                          {can("module:prepaid_expenses:reconcile") && r.status !== "RESOLVED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting}
                              onClick={() =>
                                runAction("resolve", () =>
                                  prepaidExpensesAPI.resolveReconciliation(r.id, {
                                    resolutionNotes: "Resolved from UI",
                                  })
                                )
                              }
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
