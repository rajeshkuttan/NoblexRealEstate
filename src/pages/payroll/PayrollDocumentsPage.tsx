import { useCallback, useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function PayrollDocumentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.documents.listExpiring({ days: 60 });
      setRows(res.data?.data ?? []);
    } catch {
      toast.error("Failed to load expiring documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PayrollLegacyPage titleKey="payroll.pages.documents" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No documents in alert window.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {d.employee?.employeeNo} — {d.employee?.employeeName}
                      </TableCell>
                      <TableCell>{d.documentType}</TableCell>
                      <TableCell>{d.documentNumber}</TableCell>
                      <TableCell>{String(d.expiryDate).slice(0, 10)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
}
