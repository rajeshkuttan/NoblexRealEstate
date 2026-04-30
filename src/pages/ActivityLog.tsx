import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { auditLogsAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export default function ActivityLog() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await auditLogsAPI.getAll({
        limit: 100,
        ...(userId.trim() ? { userId: userId.trim() } : {}),
        ...(!userId.trim() && username.trim()
          ? { username: username.trim() }
          : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      });
      const list = data?.data?.logs ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load activity log");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId, username, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="uiux-page-title">Activity log</h1>
          <p className="uiux-page-subtitle">
            Audit entries (e.g. payment creates); filter by user and date range.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => load()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">User ID</label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Username (name/email)</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="When User ID is empty"
              disabled={!!userId.trim()}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="button" onClick={() => load()}>
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No entries.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString("en-AE")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {r.user?.name || r.user?.email || r.userId || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.entityType} #{r.entityId}
                      </TableCell>
                      <TableCell>{r.action}</TableCell>
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
