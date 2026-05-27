import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { systemHealthAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Play, Activity } from "lucide-react";

function severityColor(count: number) {
  if (count === 0) return "bg-green-100 text-green-800 border-green-200";
  if (count < 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export default function SystemHealthDashboard() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);

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
        <CardHeader>
          <CardTitle>Recent audit results</CardTitle>
          <CardDescription>Latest persisted findings from manual or scheduled scans</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No audit runs yet. Click Run integrity scan.
                  </TableCell>
                </TableRow>
              ) : (
                audits.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{String(a.runId).slice(0, 8)}…</TableCell>
                    <TableCell>{a.auditType}</TableCell>
                    <TableCell>{a.detailsJson?.category ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={a.severity === "CRITICAL" ? "destructive" : "secondary"}>
                        {a.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{a.recordCount}</TableCell>
                    <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
