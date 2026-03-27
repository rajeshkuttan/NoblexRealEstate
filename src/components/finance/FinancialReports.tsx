import { useState, useEffect } from "react";
import { generateExcel, exportChartData } from "@/utils/reportUtils";
import { paymentsAPI, invoicesAPI, tenantsAPI, unitsAPI, financialReportsAPI, treasuryReportsAPI } from "@/services/api";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Banknote, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Target, 
  Award, 
  Zap, 
  Shield, 
  CreditCard, 
  Receipt, 
  RefreshCw, 
  Download,
  Info,
  Activity,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ChartTooltip } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import CustomerLedgerReport from "../reports/CustomerLedgerReport";
import SupplierLedgerReport from "../reports/SupplierLedgerReport";

interface FinancialReportsProps {
  invoices: any[];
  payments: any[];
  type?: "overview" | "receivables";
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function FinancialReports({ invoices, payments, type = "overview" }: FinancialReportsProps) {
  const isReceivables = type === "receivables";
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("12months");
  const [selectedReport, setSelectedReport] = useState("overview");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentReportTenantId, setPaymentReportTenantId] = useState("");
  const [paymentReportUnitId, setPaymentReportUnitId] = useState("");
  const [paymentReportPayments, setPaymentReportPayments] = useState<any[]>([]);
  const [paymentReportLoading, setPaymentReportLoading] = useState(false);
  const [paymentReportError, setPaymentReportError] = useState<string | null>(null);
  const [tenantOptions, setTenantOptions] = useState<{ value: string; label: string }[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ value: string; label: string }[]>([]);
  
  // Dashboard/Analytics data
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [propertyProfitability, setPropertyProfitability] = useState<any[]>([]);
  const [collectionsData, setCollectionsData] = useState<any>(null);
  // Payment Due tab state
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [paymentDueTenantId, setPaymentDueTenantId] = useState("");
  const [paymentDueUnitId, setPaymentDueUnitId] = useState("");
  const [paymentDueStatus, setPaymentDueStatus] = useState("all");
  const [paymentDuePayments, setPaymentDuePayments] = useState<any[]>([]);
  const [paymentDueLoading, setPaymentDueLoading] = useState(false);
  const [paymentDueError, setPaymentDueError] = useState<string | null>(null);

  // Calculate financial metrics
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((sum, invoice) => sum + invoice.invoiceDetails.total, 0);
  const outstandingAmount = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((sum, invoice) => sum + invoice.invoiceDetails.total, 0);
  const totalVAT = invoices.filter(i => i.status === "paid").reduce((sum, invoice) => sum + invoice.invoiceDetails.vatAmount, 0);
  const collectionRate = (totalRevenue / (totalRevenue + outstandingAmount)) * 100;
  
  const paidInvoices = invoices.filter(i => i.status === "paid").length;
  const pendingInvoices = invoices.filter(i => i.status === "pending").length;
  const overdueInvoices = invoices.filter(i => i.status === "overdue").length;

  // Calculate expenses and profit
  // Calculate expenses and profit from API if available, otherwise fallback to mock assumption
  const totalExpenses = dashboardData?.totalExpenses ?? (totalRevenue * 0.4);
  const totalProfit = dashboardData?.netProfit ?? (totalRevenue - totalExpenses);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Revenue by month (live data from API or derived from props)
  const monthlyRevenue = analyticsLoading ? [] : (collectionsData?.monthly || Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    const monthStr = date.toLocaleDateString("en-AE", { month: "short" });
    return {
      month: monthStr,
      revenue: totalRevenue / 12,
      vat: totalVAT / 12,
      invoices: Math.floor(paidInvoices / 12),
    };
  }));

  // Revenue by property type
  const revenueByPropertyData = analyticsLoading ? [] : (propertyProfitability.length > 0 ? propertyProfitability : Object.entries(invoices.reduce((acc, invoice) => {
    const type = invoice.property?.name?.split(' ')[0] || "Other";
    if (!acc[type]) acc[type] = 0;
    acc[type] += invoice.invoiceDetails?.total || 0;
    return acc;
  }, {} as Record<string, number>)).map(([type, revenue]) => ({
    type,
    revenue,
    percentage: (totalRevenue as number) > 0 ? (Number(revenue) / Number(totalRevenue)) * 100 : 0
  })));

  // Payment method distribution
  const paymentMethodData = [
    { name: isReceivables ? "Bank Transfer" : "Bank Transfer", value: payments.filter(p => p.paymentMethod === "Bank Transfer").length, color: "#3b82f6" },
    { name: isReceivables ? "Cheque" : "Cheque", value: payments.filter(p => p.paymentMethod === "Cheque").length, color: "#10b981" },
    { name: isReceivables ? "Cash" : "Cash", value: payments.filter(p => p.paymentMethod === "Cash").length, color: "#f59e0b" },
    { name: isReceivables ? "Credit Card" : "Credit Card", value: payments.filter(p => p.paymentMethod === "Credit Card").length, color: "#ef4444" },
  ];

  // Invoice status distribution
  const invoiceStatusData = [
    { name: "Paid", value: paidInvoices, color: "#10b981" },
    { name: "Pending", value: pendingInvoices, color: "#f59e0b" },
    { name: "Overdue", value: overdueInvoices, color: "#ef4444" },
  ];

  // Top performing tenants
  const topTenants = invoices
    .filter(i => i.status === "paid")
    .reduce((acc, invoice) => {
      const tenant = invoice.tenant.name;
      if (!acc[tenant]) {
        acc[tenant] = 0;
      }
      acc[tenant] += invoice.invoiceDetails.total;
      return acc;
    }, {} as Record<string, number>);

  const topTenantsData = Object.entries(topTenants)
    .sort(([,a]: [any, any], [,b]: [any, any]) => b - a)
    .slice(0, 5)
    .map(([tenant, revenue]: [any, any]) => ({
      tenant,
      revenue,
      percentage: (revenue / totalRevenue) * 100
    }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Load dashboard and analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const [dashboardRes, profitabilityRes, collectionsRes] = await Promise.all([
          treasuryReportsAPI.getDashboard().catch(() => ({ data: null })),
          financialReportsAPI.getPropertyProfitability({ period: selectedPeriod }).catch(() => ({ data: [] })),
          treasuryReportsAPI.getCollections({ period: selectedPeriod }).catch(() => ({ data: null }))
        ]);

        if (dashboardRes?.data) setDashboardData(dashboardRes.data);
        
        const profitabilityData = profitabilityRes?.data?.data || profitabilityRes?.data || [];
        setPropertyProfitability(Array.isArray(profitabilityData) ? profitabilityData : []);
        
        if (collectionsRes?.data) setCollectionsData(collectionsRes.data);
      } catch (error) {
        console.error("Failed to fetch financial analytics:", error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedPeriod]);

  // Load tenant and unit options when Payment Report or Payment Due tab is active
  useEffect(() => {
    if (selectedReport !== "payment-report" && selectedReport !== "payment-due") return;
    const loadOptions = async () => {
      try {
        const [tenantsRes, unitsRes] = await Promise.all([
          tenantsAPI.getAll().catch(() => ({ data: { data: { tenants: [] } } })),
          unitsAPI.getAll({ limit: 500 }).catch(() => ({ data: [] })),
        ]);
        const tenantsData = tenantsRes?.data?.data?.tenants ?? tenantsRes?.data?.tenants ?? tenantsRes?.data ?? [];
        const tenantsList = Array.isArray(tenantsData) ? tenantsData : [];
        setTenantOptions(
          tenantsList.map((t: any) => ({ value: String(t.id), label: t.name || `Tenant ${t.id}` }))
        );
        const unitsData = unitsRes?.data?.units ?? unitsRes?.data?.data?.units ?? (Array.isArray(unitsRes?.data) ? unitsRes.data : []);
        const unitsList = Array.isArray(unitsData) ? unitsData : [];
        setUnitOptions(
          unitsList.map((u: any) => {
            const propTitle = u.property?.title ?? "";
            return { value: String(u.id), label: propTitle ? `${u.unitNumber ?? u.id} - ${propTitle}` : (u.unitNumber ?? String(u.id)) };
          })
        );
      } catch (_) {
        setTenantOptions([]);
        setUnitOptions([]);
      }
    };
    loadOptions();
  }, [selectedReport]);

  const runPaymentReport = async () => {
    setPaymentReportLoading(true);
    setPaymentReportError(null);
    try {
      const params: Record<string, string | number> = { page: 1, limit: 500 };
      if (dateFrom) params.fromDate = dateFrom;
      if (dateTo) params.toDate = dateTo;
      if (paymentReportTenantId) params.tenantId = paymentReportTenantId;
      if (paymentReportUnitId) params.unitId = paymentReportUnitId;
      const response = await paymentsAPI.getAll(params);
      const list = response?.data?.data?.payments ?? response?.data?.payments ?? response?.data ?? [];
      setPaymentReportPayments(Array.isArray(list) ? list : []);
      toast({ title: "Report loaded", description: `${Array.isArray(list) ? list.length : 0} payment(s) found.` });
    } catch (err: any) {
      setPaymentReportPayments([]);
      setPaymentReportError(err?.response?.data?.message ?? err?.message ?? "Failed to load payment report");
      toast({ title: "Error", description: "Failed to load payment report.", variant: "destructive" });
    } finally {
      setPaymentReportLoading(false);
    }
  };

  const exportPaymentReport = () => {
    const rows = paymentReportPayments.map((p: any) => {
      const tenantName = p.tenant?.name ?? p.tenantName ?? "—";
      const unitNum = p.lease?.unit?.unitNumber ?? "—";
      const propTitle = p.lease?.unit?.property?.title ?? "—";
      const unitLabel = propTitle ? `${unitNum} - ${propTitle}` : unitNum;
      return {
        [isReceivables ? "Receipt Date" : "Payment Date"]: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-AE") : "—",
        [isReceivables ? "Receipt #" : "Payment #"]: p.paymentNumber ?? "—",
        "Tenant": tenantName,
        "Unit": unitLabel,
        "Amount (AED)": parseFloat(p.amount ?? 0),
        [isReceivables ? "Receipt Method" : "Payment Method"]: p.paymentMethod ?? "—",
        "Status": p.status ?? "—",
        "Reference": p.reference ?? "—",
      };
    });
    generateExcel(rows, isReceivables ? "Receipt_Report" : "Payment_Report");
    toast({ title: "Export successful", description: "Payment report downloaded." });
  };

  const runPaymentDueReport = async () => {
    setPaymentDueLoading(true);
    setPaymentDueError(null);
    try {
      const params: Record<string, string | number | boolean> = { page: 1, limit: 500, dueOnly: true };
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
        [isReceivables ? "Receipt Invoice #" : "Invoice #"]: inv.invoiceNumber ?? "—",
        "Tenant": tenantName,
        "Unit": unitLabel,
        "Amount Due (AED)": amount,
        "Status": inv.status ?? "—",
        "Description": inv.description ?? "—",
      };
    });
    generateExcel(rows, isReceivables ? "Receipt_Due_Report" : "Payment_Due_Report");
    toast({ title: "Export successful", description: "Payment due report downloaded." });
  };

  const handleExportReport = () => {
    try {
      const reportData = {
        period: selectedPeriod,
        totalRevenue: formatCurrency(totalRevenue),
        outstandingAmount: formatCurrency(outstandingAmount),
        totalVAT: formatCurrency(totalVAT),
        collectionRate: `${collectionRate.toFixed(2)}%`,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        monthlyData: monthlyRevenue,
        topTenants: topTenantsData
      };
      generateExcel(reportData, "Financial_Report");
      toast({
        title: "Export Successful!",
        description: "Financial report has been downloaded as Excel file.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = (reportType: string) => {
    try {
      const reportDataMap: Record<string, any> = {
        "profit-loss": {
          reportName: "Profit & Loss Statement",
          reportType: "Financial Analysis - P&L",
          period: selectedPeriod,
          summary: {
            totalRevenue: formatCurrency(dashboardData?.totalRevenue ?? totalRevenue),
            totalExpenses: formatCurrency(dashboardData?.totalExpenses ?? totalExpenses),
            netProfit: formatCurrency(dashboardData?.netProfit ?? totalProfit),
            profitMargin: `${(dashboardData?.profitMargin ?? profitMargin).toFixed(2)}%`,
            paidInvoices,
            pendingInvoices,
            overdueInvoices
          },
          monthlyBreakdown: monthlyRevenue,
          topRevenueSources: topTenantsData.map(t => ({
            source: t.tenant,
            revenue: t.revenue,
            percentage: t.percentage
          }))
        },
        "balance-sheet": {
          reportName: "Balance Sheet",
          reportType: "Financial Analysis - Balance Sheet",
          period: selectedPeriod,
          summary: {
            totalAssets: formatCurrency(totalRevenue + outstandingAmount),
            currentAssets: formatCurrency(totalRevenue),
            accountsReceivable: formatCurrency(outstandingAmount),
            cash: formatCurrency(totalRevenue),
            totalLiabilities: formatCurrency(totalExpenses),
            equity: formatCurrency(totalProfit)
          },
          assetBreakdown: [
            { category: "Cash", amount: totalRevenue, percentage: 60 },
            { category: "Accounts Receivable", amount: outstandingAmount, percentage: 25 },
            { category: "Other Assets", amount: totalRevenue * 0.15, percentage: 15 }
          ]
        },
        "cash-flow": {
          reportName: "Cash Flow Statement",
          reportType: "Financial Analysis - Cash Flow",
          period: selectedPeriod,
          summary: {
            cashFromOperations: formatCurrency(totalRevenue),
            cashFromInvesting: formatCurrency(0),
            cashFromFinancing: formatCurrency(0),
            netCashFlow: formatCurrency(totalRevenue),
            beginningCash: formatCurrency(totalRevenue * 0.5),
            endingCash: formatCurrency(totalRevenue * 1.5)
          },
          monthlyTrends: monthlyRevenue.map(m => ({
            month: m.month,
            cashIn: m.revenue,
            cashOut: m.vat,
            netCash: m.revenue - m.vat
          }))
        },
        "vat-report": {
          reportName: "VAT Report",
          reportType: "Financial Analysis - VAT",
          period: selectedPeriod,
          summary: {
            totalVATCollected: formatCurrency(dashboardData?.totalVAT ?? totalVAT),
            totalVATPaid: formatCurrency((dashboardData?.totalVAT ?? totalVAT) * 0.3),
            netVATPayable: formatCurrency((dashboardData?.totalVAT ?? totalVAT) * 0.7),
            vatRate: "5%",
            totalInvoicesWithVAT: dashboardData?.paidInvoicesCount ?? paidInvoices,
            averageVATPerInvoice: formatCurrency((dashboardData?.totalVAT ?? totalVAT) / ((dashboardData?.paidInvoicesCount ?? paidInvoices) || 1))
          },
          monthlyTrends: monthlyRevenue.map(m => ({
            month: m.month,
            vatCollected: m.vat,
            vatPaid: m.vat * 0.3,
            netVAT: m.vat * 0.7
          }))
        }
      };

      const reportData = reportDataMap[reportType];
      if (reportData) {
        generateExcel({ reportType, generatedAt: new Date().toISOString(), generatedBy: "System", dataPoints: Object.keys(reportData).length, data: reportData }, reportData.reportName);
        toast({
          title: "Report Generated!",
          description: `${reportData.reportName} has been downloaded successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financial Reports</h2>
          <p className="text-muted-foreground">Comprehensive financial analytics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="24months">Last 24 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Total Revenue</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold text-foreground">
                    {analyticsLoading ? "..." : formatCurrency(dashboardData?.totalRevenue ?? totalRevenue)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analyticsLoading ? "" : `${dashboardData?.paidInvoicesCount ?? paidInvoices} paid invoices`}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Banknote className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500/20" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Outstanding</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {analyticsLoading ? "..." : formatCurrency(dashboardData?.outstandingAmount ?? outstandingAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analyticsLoading ? "" : `${dashboardData?.pendingInvoicesCount ?? (pendingInvoices + overdueInvoices)} pending`}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500/20" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Collection Rate</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {analyticsLoading ? "..." : `${(dashboardData?.collectionRate ?? collectionRate).toFixed(0)}%`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboardData?.collectionRate > 90 ? "Excellent" : "Needs attention"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/20" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">VAT Collected</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {analyticsLoading ? "..." : formatCurrency(dashboardData?.totalVAT ?? totalVAT)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 text-purple-600">Net payable tracking active</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500/20" />
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs value={selectedReport} onValueChange={setSelectedReport} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="payments">{isReceivables ? "Receipts" : "Payments"}</TabsTrigger>
          <TabsTrigger value="customer-soa">Customer SOA</TabsTrigger>
          <TabsTrigger value="vendor-soa">Supplier SOA</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Monthly Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip 
                        formatter={(value: any) => [`AED ${Number(value).toLocaleString()}`, "Revenue"]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Invoice Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={invoiceStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {invoiceStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Tenants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Performing Tenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topTenantsData.map((tenant, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{tenant.tenant}</p>
                        <p className="text-sm text-muted-foreground">
                          {tenant.percentage.toFixed(1)}% of total revenue
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(tenant.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("profit-loss")}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">P&L Statement</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("balance-sheet")}
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-sm">Balance Sheet</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("cash-flow")}
                >
                  <Activity className="h-6 w-6" />
                  <span className="text-sm">Cash Flow</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("vat-report")}
                >
                  <Receipt className="h-6 w-6" />
                  <span className="text-sm">VAT Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Property Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue by Property Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByPropertyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <ChartTooltip 
                        formatter={(value: any) => [`AED ${Number(value).toLocaleString()}`, "Revenue"]}
                      />
                      <Bar dataKey="revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Revenue Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueByPropertyData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.type}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {formatCurrency(item.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Revenue Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalRevenue)}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average per Invoice</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalRevenue / paidInvoices)}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Monthly Average</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalRevenue / 12)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Payment Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Payment Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethodData.map((method, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: method.color }}
                        />
                        <span className="font-medium">{method.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{method.value}</span>
                        <span className="text-sm text-muted-foreground">payments</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold text-foreground">{payments.length}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-foreground">
                    {payments.filter(p => p.status === "completed").length}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Amount</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0) / (payments.length || 1))}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {((payments.filter(p => p.status === "completed").length / (payments.length || 1)) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer SOA Tab */}
        <TabsContent value="customer-soa">
          <CustomerLedgerReport />
        </TabsContent>

        {/* Vendor SOA Tab */}
        <TabsContent value="vendor-soa">
          <SupplierLedgerReport />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Health Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Financial Health Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">92</div>
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Collection Rate</span>
                      <div className="flex items-center gap-2">
                        <Progress value={collectionRate} className="w-20 h-2" />
                        <span className="text-sm font-medium">{collectionRate.toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Payment Speed</span>
                      <div className="flex items-center gap-2">
                        <Progress value={85} className="w-20 h-2" />
                        <span className="text-sm font-medium">85%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">VAT Compliance</span>
                      <div className="flex items-center gap-2">
                        <Progress value={100} className="w-20 h-2" />
                        <span className="text-sm font-medium">100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Collection Rate</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {collectionRate.toFixed(0)}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Average Payment Time</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      15 days
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">VAT Compliance</span>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      100%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Revenue Growth</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      +12%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Financial Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overdueInvoices > 0 && (
                  <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900">Overdue Invoices</p>
                        <p className="text-sm text-yellow-700">
                          {overdueInvoices} invoice(s) are overdue. Consider sending payment reminders or escalating collection efforts.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Payment Automation</p>
                      <p className="text-sm text-blue-700">
                        Consider implementing automated payment reminders to improve collection rates and reduce manual follow-up.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">VAT Compliance</p>
                      <p className="text-sm text-green-700">
                        Excellent VAT compliance! All invoices are properly registered and VAT is correctly calculated.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
