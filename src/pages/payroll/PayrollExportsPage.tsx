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

export default function PayrollExportsPage() {
  const [types, setTypes] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [reportType, setReportType] = useState("payroll_register");
  const [format, setFormat] = useState("xlsx");

  useEffect(() => {
    payrollAPI.documentsHub.exports.listTypes().then((r) => setTypes(r.data?.data || []));
    payrollAPI.documentsHub.exports.list().then((r) => setRows(r.data?.data || []));
  }, []);

  const create = async () => {
    const r = await payrollAPI.documentsHub.exports.create({ report_type: reportType, format });
    toast.success("Export created");
    const id = r.data?.data?.id;
    if (id) {
      const blob = await payrollAPI.documentsHub.exports.download(id);
      const url = window.URL.createObjectURL(new Blob([blob.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${id}.${format === "pdf" ? "pdf" : format === "csv" ? "csv" : "xlsx"}`;
      a.click();
    }
    const list = await payrollAPI.documentsHub.exports.list();
    setRows(list.data?.data || []);
  };

  return (
    <PayrollLegacyPage title="Payroll exports" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div>
            <Label>Report</Label>
            <Input value={reportType} onChange={(e) => setReportType(e.target.value)} list="report-types" />
            <datalist id="report-types">
              {types.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Format</Label>
            <Input value={format} onChange={(e) => setFormat(e.target.value)} className="w-24" />
          </div>
          <Button onClick={create}>Export</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <ul className="text-sm space-y-1">
            {rows.map((r) => (
              <li key={r.id}>
                {r.exportType} ({r.format}) — {r.generatedAt}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
}
