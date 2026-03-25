import { useState, useEffect } from "react";
import { generateExcel } from "@/utils/reportUtils";
import { invoicesAPI, tenantsAPI, unitsAPI } from "@/services/api";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  RefreshCw, 
  Download,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PaymentDueReport() {
  const { toast } = useToast();
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [paymentDueTenantId, setPaymentDueTenantId] = useState("");
  const [paymentDueUnitId, setPaymentDueUnitId] = useState("");
  const [paymentDueStatus, setPaymentDueStatus] = useState("all");
  const [paymentDuePayments, setPaymentDuePayments] = useState<any[]>([]);
  const [paymentDueLoading, setPaymentDueLoading] = useState(false);
  const [paymentDueError, setPaymentDueError] = useState<string | null>(null);
  const [tenantOptions, setTenantOptions] = useState<{ value: string; label: string }[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ value: string; label: string }[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [tenantsRes, unitsRes] = await Promise.all([
          tenantsAPI.getAll().catch(() => ({ data: { data: { tenants: [] } } })),
          unitsAPI.getAll({ limit: 500 }).catch(() => ({ data: [] })),
        ]);
        const tenantsData = tenantsRes?.data?.data?.tenants ?? tenantsRes?.data?.tenants ?? tenantsRes?.data ?? [];
        setTenantOptions(
          Array.isArray(tenantsData) ? tenantsData.map((t: any) => ({ value: String(t.id), label: t.name || `Tenant ${t.id}` })) : []
        );
        const unitsData = unitsRes?.data?.units ?? unitsRes?.data?.data?.units ?? (Array.isArray(unitsRes?.data) ? unitsRes.data : []);
        setUnitOptions(
          Array.isArray(unitsData) ? unitsData.map((u: any) => {
            const propTitle = u.property?.title ?? "";
            return { value: String(u.id), label: propTitle ? `${u.unitNumber ?? u.id} - ${propTitle}` : (u.unitNumber ?? String(u.id)) };
          }) : []
        );
      } catch (_) {
        setTenantOptions([]);
        setUnitOptions([]);
      }
    };
    loadOptions();
  }, []);

  const runPaymentDueReport = async () => {
    setPaymentDueLoading(true);
    setPaymentDueError(null);
    try {
      const params: Record<string, string | number | boolean> = { page: 1, limit: 1000, dueOnly: true };
      if (dueDateFrom) params.fromDueDate = dueDateFrom;
      if (dueDateTo) params.toDueDate = dueDateTo;
      if (paymentDueTenantId) params.tenantId = paymentDueTenantId;
      if (paymentDueUnitId) params.unitId = paymentDueUnitId;
      if (paymentDueStatus && paymentDueStatus !== "all") params.status = paymentDueStatus;
      
      const response = await invoicesAPI.getAll(params);
      const list = response?.data?.data?.invoices ?? response?.data?.invoices ?? response?.data ?? [];
      setPaymentDuePayments(Array.isArray(list) ? list : []);
      toast({ title: "Report loaded", description: `${Array.isArray(list) ? list.length : 0} invoice(s) due found.` });
    } catch (err: any) {
      setPaymentDuePayments([]);
      setPaymentDueError(err?.response?.data?.message ?? err?.message ?? "Failed to load payment due report");
      toast({ title: "Error", description: "Failed to load payment due report.", variant: "destructive" });
    } finally {
      setPaymentDueLoading(false);
    }
  };

  const exportPaymentDueReport = () => {
    const rows = paymentDuePayments.map((inv: any) => {
      const tenantName = inv.tenant?.name ?? inv.tenantName ?? "—";
      const unitNum = inv.lease?.unit?.unitNumber ?? "—";
      const propTitle = inv.lease?.unit?.property?.title ?? "—";
      const unitLabel = propTitle ? `${unitNum} - ${propTitle}` : unitNum;
      const amount = parseFloat(inv.totalAmount ?? inv.invoiceDetails?.total ?? 0);
      return {
        "Due Date": inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-AE") : "—",
        "Invoice #": inv.invoiceNumber ?? "—",
        "Tenant": tenantName,
        "Unit": unitLabel,
        "Amount Due (AED)": amount,
        "Status": inv.status ?? "—",
        "Description": inv.description ?? "—",
      };
    });
    generateExcel(rows, "Payment_Due_Report");
    toast({ title: "Export successful", description: "Payment due report downloaded." });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                Payment Due Report (Receivable)
              </CardTitle>
              <p className="text-muted-foreground mt-1">Detailed analysis of all outstanding invoices and payments due.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={runPaymentDueReport} disabled={paymentDueLoading} className="shadow-glow bg-gradient-primary">
                {paymentDueLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Run Report
              </Button>
              <Button variant="outline" onClick={exportPaymentDueReport} disabled={paymentDuePayments.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-6">
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Due Date</label>
                  <Input
                    type="date"
                    value={dueDateFrom}
                    onChange={(e) => setDueDateFrom(e.target.value)}
                    className="focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Due Date</label>
                  <Input
                    type="date"
                    value={dueDateTo}
                    onChange={(e) => setDueDateTo(e.target.value)}
                    className="focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tenant</label>
                  <SearchableSelect
                    value={paymentDueTenantId}
                    onValueChange={setPaymentDueTenantId}
                    options={[{ value: "", label: "All Tenants" }, ...tenantOptions]}
                    placeholder="All Tenants"
                    searchPlaceholder="Search tenant..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit</label>
                  <SearchableSelect
                    value={paymentDueUnitId}
                    onValueChange={setPaymentDueUnitId}
                    options={[{ value: "", label: "All Units" }, ...unitOptions]}
                    placeholder="All Units"
                    searchPlaceholder="Search unit..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={paymentDueStatus} onValueChange={setPaymentDueStatus}>
                    <SelectTrigger className="focus-visible:ring-primary">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="sent">Pending (sent)</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {paymentDueError && (
            <div className="p-4 mb-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-3">
              <RefreshCw className="h-5 w-5" />
              <p>{paymentDueError}</p>
            </div>
          )}

          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-4 font-semibold text-muted-foreground">Due Date</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Invoice #</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Tenant</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Unit</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Amount Due</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paymentDuePayments.length === 0 && !paymentDueLoading && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Clock className="h-12 w-12 mb-4 opacity-20" />
                          <p className="text-lg">No records found</p>
                          <p className="text-sm">Apply filters and click Run Report to see data.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {paymentDuePayments.map((inv: any) => {
                    const tenantName = inv.tenant?.name ?? inv.tenantName ?? "—";
                    const unitNum = inv.lease?.unit?.unitNumber ?? "—";
                    const propTitle = inv.lease?.unit?.property?.title ?? "";
                    const unitLabel = propTitle ? `${unitNum} - ${propTitle}` : unitNum;
                    const amount = parseFloat(inv.totalAmount ?? inv.invoiceDetails?.total ?? 0);
                    const status = inv.status?.toLowerCase();
                    
                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-AE") : "—"}</td>
                        <td className="p-4">
                          <span className="bg-primary/5 text-primary px-2 py-1 rounded font-mono text-xs">
                            {inv.invoiceNumber ?? "—"}
                          </span>
                        </td>
                        <td className="p-4">{tenantName}</td>
                        <td className="p-4 text-muted-foreground">{unitLabel || "—"}</td>
                        <td className="p-4 text-right font-bold">{formatCurrency(amount)}</td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                            status === "overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {inv.status ?? "—"}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground italic truncate max-w-[200px]">{inv.description ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
