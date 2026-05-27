import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollSalaryCertificatesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [certType, setCertType] = useState("SALARY");

  const load = () => payrollAPI.documentsHub.certificates.list().then((r) => setRows(r.data?.data || []));

  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    if (!employeeId) return toast.error("Employee ID required");
    const r = await payrollAPI.documentsHub.certificates.generate({
      employee_id: Number(employeeId),
      certificate_type: certType,
    });
    toast.success("Certificate generated");
    const id = r.data?.data?.export?.id;
    if (id) {
      const blob = await payrollAPI.documentsHub.certificates.download(id);
      const url = window.URL.createObjectURL(new Blob([blob.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${id}.pdf`;
      a.click();
    }
    load();
  };

  return (
    <PayrollLegacyPage title="Salary certificates" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div>
            <Label>Employee ID</Label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-32" />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={certType} onChange={(e) => setCertType(e.target.value)} className="w-40" />
          </div>
          <Button onClick={generate}>Generate PDF</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <ul className="text-sm space-y-1">
            {rows.map((r) => (
              <li key={r.id}>
                {r.exportType} — {r.generatedAt}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
}
