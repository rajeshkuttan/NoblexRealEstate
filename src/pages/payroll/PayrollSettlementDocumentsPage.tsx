import { useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollSettlementDocumentsPage() {
  const [settlementId, setSettlementId] = useState("");

  const generate = async () => {
    if (!settlementId) return toast.error("Settlement ID required");
    const r = await payrollAPI.documentsHub.settlementDocuments.generate(Number(settlementId));
    toast.success("Settlement statement generated");
    const id = r.data?.data?.export?.id;
    if (id) {
      const blob = await payrollAPI.documentsHub.settlementDocuments.download(id);
      const url = window.URL.createObjectURL(new Blob([blob.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `settlement-${id}.pdf`;
      a.click();
    }
  };

  return (
    <PayrollLegacyPage titleKey="payroll.pages.settlementDocuments" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate statement (LOCKED settlement)</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 items-end">
          <div>
            <Label>Settlement ID</Label>
            <Input value={settlementId} onChange={(e) => setSettlementId(e.target.value)} className="w-40" />
          </div>
          <Button onClick={generate}>Generate PDF</Button>
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
}
