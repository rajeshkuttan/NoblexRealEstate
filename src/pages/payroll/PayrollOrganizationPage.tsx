import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";
import { PayrollLegacyPage } from "@/components/payroll";

const ENTITIES: { key: string; label: string; codeField: string; nameField: string }[] = [
  { key: "departments", label: "Departments", codeField: "departmentCode", nameField: "departmentName" },
  { key: "designations", label: "Designations", codeField: "designationCode", nameField: "designationName" },
  { key: "visa-sponsors", label: "Visa sponsors", codeField: "sponsorName", nameField: "sponsorName" },
  { key: "branches", label: "Branches", codeField: "branchCode", nameField: "branchName" },
  { key: "cost-centers", label: "Cost centers", codeField: "costCenterCode", nameField: "costCenterName" },
  { key: "grades", label: "Grades", codeField: "gradeCode", nameField: "gradeName" },
  { key: "payroll-groups", label: "Payroll groups", codeField: "groupCode", nameField: "groupName" },
];

export default function PayrollOrganizationPage() {
  const [entity, setEntity] = useState(ENTITIES[0].key);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const meta = ENTITIES.find((e) => e.key === entity) || ENTITIES[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.organization.list(entity);
      setRows(res.data?.data ?? []);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error("Enter code and name");
      return;
    }
    try {
      const payload: Record<string, string> = {};
      if (entity === "visa-sponsors") {
        payload.sponsorName = name;
      } else {
        payload[meta.codeField] = code;
        payload[meta.nameField] = name;
      }
      await payrollAPI.organization.create(entity, payload);
      toast.success("Created");
      setCode("");
      setName("");
      await load();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Create failed");
    }
  };

  return (
    <PayrollLegacyPage title="Organization" description="Departments, designations, sponsors, and payroll masters.">
      <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {ENTITIES.map((e) => (
          <Button key={e.key} variant={entity === e.key ? "default" : "outline"} size="sm" onClick={() => setEntity(e.key)}>
            {e.label}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add {meta.label}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          {entity !== "visa-sponsors" && (
            <div>
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} className="w-40" />
            </div>
          )}
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="w-64" />
          </div>
          <Button onClick={add}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Code / Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No records.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.id}</TableCell>
                      <TableCell>
                        {r[meta.codeField] || r.sponsorName} — {r[meta.nameField] || r.sponsorName}
                      </TableCell>
                      <TableCell>{r.status || (r.isActive === false ? "inactive" : "active")}</TableCell>
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
