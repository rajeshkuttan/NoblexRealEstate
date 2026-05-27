import { Fragment, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { systemHealthAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Play, Activity, ChevronDown, ChevronRight } from "lucide-react";

const AUDIT_CATEGORY_LABELS: Record<string, string> = {
  PERMISSION_AUDIT_FAILURE: "Permission Issues",
  CROSS_COMPANY_DATA_INTEGRITY_FAILURE: "Cross Company References",
  MISSING_COMPANY_ID: "Missing Company IDs",
  ORPHAN_RECORD: "Orphan Records",
  NUMBERING_CONFLICT_FOUND: "Numbering Conflicts",
  PERIOD_VIOLATION_FOUND: "Financial Period Violations",
  VAT_PERIOD_VIOLATION: "VAT Period Violations",
  INVALID_FINANCIAL_REFERENCE: "Invalid Financial References",
  DUPLICATE_COMPANY_ASSIGNMENT: "Duplicate Company Assignments",
  TEMPLATE_CONFLICT: "Document Template Conflicts",
};

type AuditDetails = {
  category?: string;
  records?: Array<Record<string, unknown>>;
  summary?: Record<string, number>;
};

function parseAuditDetails(raw: unknown): AuditDetails | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as AuditDetails;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.detailsJson) return parseAuditDetails(obj.detailsJson);
    if (obj.details_json) return parseAuditDetails(obj.details_json);
    return raw as AuditDetails;
  }
  return null;
}

function auditCategory(audit: {
  auditType?: string;
  category?: string;
  detailsJson?: unknown;
  details_json?: unknown;
}): string {
  if (audit.category) return audit.category;
  const details = parseAuditDetails(audit.detailsJson ?? audit.details_json);
  if (details?.category) return details.category;
  if (audit.auditType && AUDIT_CATEGORY_LABELS[audit.auditType]) {
    return AUDIT_CATEGORY_LABELS[audit.auditType];
  }
  return "—";
}

function severityColor(count: number) {
  if (count === 0) return "bg-green-100 text-green-800 border-green-200";
  if (count < 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function formatRecordLine(record: Record<string, unknown>): string {
  const issue = record.issue ? String(record.issue) : "Issue";
  const parts: string[] = [issue];
  if (record.email) parts.push(`user: ${String(record.email)}`);
  if (record.userId != null) parts.push(`id: ${String(record.userId)}`);
  if (record.companyId != null) parts.push(`company: ${String(record.companyId)}`);
  if (record.missingCount != null) {
    parts.push(`missing: ${String(record.missingCount)}/${String(record.expectedCount ?? "?")}`);
  }
  return parts.join(" · ");
}

export default function SystemHealthDashboard() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [showCleanChecks, setShowCleanChecks] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, auditRes] = await Promise.all([
        systemHealthAPI.getSummary(),
        systemHealthAPI.getAudits({ limit: 30 }),
      ]);
      setSummary(sumRes.data?.data);
      setAudits(auditRes.data?.data ?? []);
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to load system health"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runScan = async () => {
    setRunning(true);
    try {
      const res = await systemHealthAPI.runAudit({ summaryOnly: true });
      toast.success(
        `Scan complete — ${res.data?.data?.summary?.total ?? 0} issue(s) found`
      );
      await load();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Scan failed"
      );
    } finally {
      setRunning(false);
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cards = summary?.cards ?? {};
  const readiness = summary?.readiness ?? {};

  const metricCards = [
    { key: "crossCompany", label: "Cross-company violations" },
    { key: "orphans", label: "Orphan records" },
    { key: "numbering", label: "Number conflicts" },
    { key: "missingCompanyIds", label: "Missing company IDs" },
    { key: "periodViolations", label: "Period violations" },
    { key: "vatViolations", label: "VAT violations" },
    { key: "permissionIssues", label: "Permission issues" },
    { key: "total", label: "Total audit errors" },
  ];

  const visibleAudits = showCleanChecks
    ? audits
    : audits.filter((a) => (a.recordCount ?? 0) > 0);

  if (loading && !summary) {
    return <div className="p-6">Loading system health…</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7" />
            System Health
          </h1>
          <p className="text-muted-foreground">
            Data integrity audits and production readiness for the full database.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runScan} disabled={running}>
            <Play className="h-4 w-4 mr-2" />
            {running ? "Running…" : "Run integrity scan"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/settings">Back to settings</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Production readiness</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <span>
            Database:{" "}
            <Badge variant={readiness.database ? "default" : "destructive"}>
              {readiness.database ? "Connected" : "Down"}
            </Badge>
          </span>
          <span>
            Pending migrations:{" "}
            <Badge variant={readiness.pendingMigrations === 0 ? "default" : "secondary"}>
              {readiness.pendingMigrations ?? "—"}
            </Badge>
          </span>
          <span>
            Last scan:{" "}
            {readiness.lastIntegrityScan
              ? new Date(readiness.lastIntegrityScan).toLocaleString()
              : "Never"}
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map(({ key, label }) => {
          const count = cards[key] ?? 0;
          return (
            <Card key={key} className={`border ${severityColor(count)}`}>
              <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-3xl">{count}</CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent audit results</CardTitle>
            <CardDescription>Latest persisted findings from manual or scheduled scans</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCleanChecks((v) => !v)}
          >
            {showCleanChecks ? "Hide clean checks" : "Show clean checks"}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Run</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleAudits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    {audits.length === 0
                      ? "No audit runs yet. Click Run integrity scan."
                      : "No issues in recent runs. Enable “Show clean checks” to see all finding types."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleAudits.map((a) => {
                  const details = parseAuditDetails(a.detailsJson ?? a.details_json);
                  const records = (details?.records ?? []) as Array<Record<string, unknown>>;
                  const canExpand = (a.recordCount ?? 0) > 0 && records.length > 0;
                  const isOpen = expandedIds.has(a.id);

                  return (
                    <Fragment key={a.id}>
                      <TableRow>
                        <TableCell>
                          {canExpand ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => toggleExpanded(a.id)}
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {String(a.runId).slice(0, 8)}…
                        </TableCell>
                        <TableCell className="text-xs">{a.auditType}</TableCell>
                        <TableCell>{auditCategory(a)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              a.severity === "CRITICAL" || a.severity === "HIGH"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {a.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{a.recordCount}</TableCell>
                        <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                      {canExpand && isOpen && (
                        <TableRow key={`${a.id}-detail`}>
                          <TableCell colSpan={7}>
                            <div className="px-2 py-3 bg-muted/40 text-sm space-y-2 rounded-md">
                              {details?.summary && (
                                <p className="text-muted-foreground">
                                  Breakdown:{" "}
                                  {Object.entries(details.summary)
                                    .filter(([, v]) => Number(v) > 0)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(", ") || "none"}
                                </p>
                              )}
                              <ul className="list-disc pl-5 space-y-1">
                                {records.map((record, idx) => (
                                  <li key={idx}>{formatRecordLine(record)}</li>
                                ))}
                              </ul>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
