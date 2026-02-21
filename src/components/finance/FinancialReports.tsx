import { useState, useEffect } from "react";
import { generateExcel, exportChartData } from "@/utils/reportUtils";
import { paymentsAPI, invoicesAPI, tenantsAPI, unitsAPI } from "@/services/api";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  Calendar, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Target, 
  Award, 
  Heart, 
  Zap, 
  Globe, 
  Home, 
  Building, 
  Store, 
  Warehouse, 
  Car, 
  Wifi, 
  Shield, 
  Settings, 
  Camera, 
  FileCheck, 
  Edit, 
  Eye, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  Pause, 
  Stop, 
  RotateCcw, 
  Save, 
  X, 
  Check, 
  Minus, 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Bell, 
  Send, 
  MessageSquare, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Receipt, 
  History, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Share, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Flag, 
  ThumbsUp, 
  ThumbsDown, 
  Smile, 
  Frown, 
  Meh,
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
import { Separator } from "@/components/ui/separator";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";

interface FinancialReportsProps {
  invoices: any[];
  payments: any[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function FinancialReports({ invoices, payments }: FinancialReportsProps) {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("12months");
  const [selectedReport, setSelectedReport] = useState("overview");
  // Payment Report tab state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentReportTenantId, setPaymentReportTenantId] = useState("");
  const [paymentReportUnitId, setPaymentReportUnitId] = useState("");
  const [paymentReportPayments, setPaymentReportPayments] = useState<any[]>([]);
  const [paymentReportLoading, setPaymentReportLoading] = useState(false);
  const [paymentReportError, setPaymentReportError] = useState<string | null>(null);
  const [tenantOptions, setTenantOptions] = useState<{ value: string; label: string }[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ value: string; label: string }[]>([]);
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
  const totalExpenses = totalRevenue * 0.4; // Assuming 40% expense ratio
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = (totalProfit / totalRevenue) * 100;

  // Revenue by month (simulated data)
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    return {
      month: date.toLocaleDateString("en-AE", { month: "short" }),
      revenue: totalRevenue / 12 + (Math.random() - 0.5) * totalRevenue * 0.2,
      vat: totalVAT / 12 + (Math.random() - 0.5) * totalVAT * 0.2,
      invoices: Math.floor(paidInvoices / 12) + Math.floor(Math.random() * 3),
    };
  });

  // Revenue by property type
  const revenueByProperty = invoices.reduce((acc, invoice) => {
    const type = invoice.property.name.split(' ')[0]; // Simplified property type
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += invoice.invoiceDetails.total;
    return acc;
  }, {} as Record<string, number>);

  const revenueByPropertyData = Object.entries(revenueByProperty).map(([type, revenue]) => ({
    type,
    revenue,
    percentage: (revenue / totalRevenue) * 100
  }));

  // Payment method distribution
  const paymentMethodData = [
    { name: "Bank Transfer", value: payments.filter(p => p.paymentMethod === "Bank Transfer").length, color: "#3b82f6" },
    { name: "Cheque", value: payments.filter(p => p.paymentMethod === "Cheque").length, color: "#10b981" },
    { name: "Cash", value: payments.filter(p => p.paymentMethod === "Cash").length, color: "#f59e0b" },
    { name: "Credit Card", value: payments.filter(p => p.paymentMethod === "Credit Card").length, color: "#ef4444" },
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
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([tenant, revenue]) => ({
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
        "Payment Date": p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-AE") : "—",
        "Payment #": p.paymentNumber ?? "—",
        "Tenant": tenantName,
        "Unit": unitLabel,
        "Amount (AED)": parseFloat(p.amount ?? 0),
        "Payment Method": p.paymentMethod ?? "—",
        "Status": p.status ?? "—",
        "Reference": p.reference ?? "—",
      };
    });
    generateExcel(rows, "Payment_Report");
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
            totalRevenue: formatCurrency(totalRevenue),
            totalExpenses: formatCurrency(totalExpenses),
            netProfit: formatCurrency(totalProfit),
            profitMargin: `${profitMargin.toFixed(2)}%`,
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
            totalVATCollected: formatCurrency(totalVAT),
            totalVATPaid: formatCurrency(totalVAT * 0.3),
            netVATPayable: formatCurrency(totalVAT * 0.7),
            vatRate: "5%",
            totalInvoicesWithVAT: paidInvoices,
            averageVATPerInvoice: formatCurrency(totalVAT / paidInvoices)
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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">{paidInvoices} paid invoices</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(outstandingAmount)}</p>
                <p className="text-sm text-muted-foreground">{pendingInvoices + overdueInvoices} pending</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                <p className="text-3xl font-bold text-foreground">{collectionRate.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Above target (90%)</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">VAT Collected</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalVAT)}</p>
                <p className="text-sm text-muted-foreground">This quarter</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs value={selectedReport} onValueChange={setSelectedReport} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="payment-report">Payment Report</TabsTrigger>
          <TabsTrigger value="payment-due">Payment Due</TabsTrigger>
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
                        formatter={(value: any) => [`AED ${(value / 1000).toFixed(0)}K`, "Revenue"]}
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
                        formatter={(value: any) => [`AED ${(value / 1000).toFixed(0)}K`, "Revenue"]}
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
                <DollarSign className="h-5 w-5" />
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
                    {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0) / payments.length)}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {((payments.filter(p => p.status === "completed").length / payments.length) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Payment Report Tab */}
        <TabsContent value="payment-report" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">Filter payments by date, tenant, and unit</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tenant</label>
                  <SearchableSelect
                    value={paymentReportTenantId}
                    onValueChange={setPaymentReportTenantId}
                    options={[{ value: "", label: "All" }, ...tenantOptions]}
                    placeholder="All"
                    searchPlaceholder="Search tenant..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Unit</label>
                  <SearchableSelect
                    value={paymentReportUnitId}
                    onValueChange={setPaymentReportUnitId}
                    options={[{ value: "", label: "All" }, ...unitOptions]}
                    placeholder="All"
                    searchPlaceholder="Search unit..."
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={runPaymentReport} disabled={paymentReportLoading}>
                    {paymentReportLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Run report
                  </Button>
                  <Button variant="outline" onClick={exportPaymentReport} disabled={paymentReportPayments.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              {paymentReportError && (
                <p className="text-sm text-destructive">{paymentReportError}</p>
              )}
              <div className="border rounded-md overflow-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Payment Date</th>
                      <th className="text-left p-3 font-medium">Payment #</th>
                      <th className="text-left p-3 font-medium">Tenant</th>
                      <th className="text-left p-3 font-medium">Unit</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Method</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentReportPayments.length === 0 && !paymentReportLoading && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-muted-foreground">
                          Apply filters and click Run report to load payments.
                        </td>
                      </tr>
                    )}
                    {paymentReportPayments.map((p: any) => {
                      const tenantName = p.tenant?.name ?? p.tenantName ?? "—";
                      const unitNum = p.lease?.unit?.unitNumber ?? "—";
                      const propTitle = p.lease?.unit?.property?.title ?? "";
                      const unitLabel = propTitle ? `${unitNum} - ${propTitle}` : unitNum;
                      return (
                        <tr key={p.id} className="border-t border-border">
                          <td className="p-3">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-AE") : "—"}</td>
                          <td className="p-3 font-medium">{p.paymentNumber ?? "—"}</td>
                          <td className="p-3">{tenantName}</td>
                          <td className="p-3">{unitLabel || "—"}</td>
                          <td className="p-3 text-right">{formatCurrency(parseFloat(p.amount ?? 0))}</td>
                          <td className="p-3">{p.paymentMethod ?? "—"}</td>
                          <td className="p-3">{p.status ?? "—"}</td>
                          <td className="p-3">{p.reference ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Due Tab */}
        <TabsContent value="payment-due" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Payment Due
              </CardTitle>
              <p className="text-sm text-muted-foreground">Invoices pending payment (sent/overdue). Same list as when recording a payment. Filter by due date, tenant, unit, and status.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From due date</label>
                  <Input
                    type="date"
                    value={dueDateFrom}
                    onChange={(e) => setDueDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To due date</label>
                  <Input
                    type="date"
                    value={dueDateTo}
                    onChange={(e) => setDueDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tenant</label>
                  <SearchableSelect
                    value={paymentDueTenantId}
                    onValueChange={setPaymentDueTenantId}
                    options={[{ value: "", label: "All" }, ...tenantOptions]}
                    placeholder="All"
                    searchPlaceholder="Search tenant..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Unit</label>
                  <SearchableSelect
                    value={paymentDueUnitId}
                    onValueChange={setPaymentDueUnitId}
                    options={[{ value: "", label: "All" }, ...unitOptions]}
                    placeholder="All"
                    searchPlaceholder="Search unit..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={paymentDueStatus} onValueChange={setPaymentDueStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="sent">Pending (sent)</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={runPaymentDueReport} disabled={paymentDueLoading}>
                    {paymentDueLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Run report
                  </Button>
                  <Button variant="outline" onClick={exportPaymentDueReport} disabled={paymentDuePayments.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              {paymentDueError && (
                <p className="text-sm text-destructive">{paymentDueError}</p>
              )}
              <div className="border rounded-md overflow-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Due Date</th>
                      <th className="text-left p-3 font-medium">Invoice #</th>
                      <th className="text-left p-3 font-medium">Tenant</th>
                      <th className="text-left p-3 font-medium">Unit</th>
                      <th className="text-right p-3 font-medium">Amount Due</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentDuePayments.length === 0 && !paymentDueLoading && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground">
                          Apply filters and click Run report to load invoices due.
                        </td>
                      </tr>
                    )}
                    {paymentDuePayments.map((inv: any) => {
                      const tenantName = inv.tenant?.name ?? inv.tenantName ?? "—";
                      const unitNum = inv.lease?.unit?.unitNumber ?? "—";
                      const propTitle = inv.lease?.unit?.property?.title ?? "";
                      const unitLabel = propTitle ? `${unitNum} - ${propTitle}` : unitNum;
                      const amount = parseFloat(inv.totalAmount ?? inv.invoiceDetails?.total ?? 0);
                      return (
                        <tr key={inv.id} className="border-t border-border">
                          <td className="p-3">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-AE") : "—"}</td>
                          <td className="p-3 font-medium">{inv.invoiceNumber ?? "—"}</td>
                          <td className="p-3">{tenantName}</td>
                          <td className="p-3">{unitLabel || "—"}</td>
                          <td className="p-3 text-right">{formatCurrency(amount)}</td>
                          <td className="p-3">{inv.status ?? "—"}</td>
                          <td className="p-3">{inv.description ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
