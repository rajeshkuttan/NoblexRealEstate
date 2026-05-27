import { useCallback, useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";

export default function PayrollComponentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    const res = await payrollAPI.components.list();
    setRows(res.data?.data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    try {
      await payrollAPI.components.create({
        componentCode: code,
        componentName: name,
        componentType: "EARNING",
        taxable: false,
        recurring: true,
      });
      toast.success("Created");
      setCode("");
      setName("");
      await load();
    } catch {
      toast.error("Create failed");
    }
  };

  return (
    <PayrollLegacyPage title="Payroll components" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add component</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 items-end flex-wrap">
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={add}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.componentCode}</TableCell>
                  <TableCell>{r.componentName}</TableCell>
                  <TableCell>{r.componentType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
}
