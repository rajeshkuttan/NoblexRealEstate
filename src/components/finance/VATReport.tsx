import { useState } from "react";
import { Shield, FileText, Download, Calendar, CheckCircle, AlertCircle, Clock, Target, Award, Star, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, Save, X, Check, Minus, Plus, Search, Filter, Grid3X3, List, BarChart3, PieChart, Bell, Send, MessageSquare, Phone, Mail, MapPin, CreditCard, Banknote, Wallet, Receipt, History, RefreshCw, Trash2, Copy, Share, ExternalLink, Lock, Unlock, Flag, ThumbsUp, ThumbsDown, Smile, Frown, Meh, TrendingUp, TrendingDown, Users, Building2 } from "lucide-react";
import { financialReportsAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";

interface VATReportProps {
  invoices: any[];
  type?: "overview" | "receivables";
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function VATReport({ invoices, type = "overview" }: VATReportProps) {
  const isReceivables = type === "receivables";
  const [selectedPeriod, setSelectedPeriod] = useState("quarterly");
  const [selectedReport, setSelectedReport] = useState("overview");
  const [vatData, setVatData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchVATData = async () => {
    setLoading(true);
    try {
      const response = await financialReportsAPI.getFTAVATExport({ period: selectedPeriod });
      if (response?.data) setVatData(response.data);
    } catch (error) {
      console.error("Failed to fetch VAT data:", error);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchVATData();
  });

  // Calculate VAT metrics
  const totalVAT = invoices.filter(i => i.status === "paid").reduce((sum, invoice) => sum + invoice.invoiceDetails.vatAmount, 0);
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((sum, invoice) => sum + invoice.invoiceDetails.subtotal, 0);
  const vatRate = 5; // UAE standard VAT rate
  const vatRegisteredInvoices = invoices.filter(i => i.vatRegistration).length;
  const vatComplianceRate = (vatRegisteredInvoices / invoices.length) * 100;

  // VAT by month (live data from API if available)
  const monthlyVAT = vatData?.monthlyTrends || Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    return {
      month: date.toLocaleDateString("en-AE", { month: "short" }),
      vat: totalVAT / 12,
      revenue: totalRevenue / 12,
      invoices: Math.floor(vatRegisteredInvoices / 12),
    };
  });

  // VAT by property type
  const vatByProperty = invoices.reduce((acc, invoice) => {
    const type = invoice.property.name.split(' ')[0];
    if (!acc[type]) {
      acc[type] = { vat: 0, revenue: 0 };
    }
    acc[type].vat += invoice.invoiceDetails.vatAmount;
    acc[type].revenue += invoice.invoiceDetails.subtotal;
    return acc;
  }, {} as Record<string, { vat: number; revenue: number }>);

  const vatByPropertyData = Object.entries(vatByProperty).map(([type, data]: [string, any]) => ({
    type,
    vat: data.vat,
    revenue: data.revenue,
    vatRate: (data.vat / data.revenue) * 100
  }));

  // VAT status distribution
  const vatStatusData = [
    { name: "VAT Registered", value: vatRegisteredInvoices, color: "#10b981" },
    { name: "VAT Pending", value: invoices.length - vatRegisteredInvoices, color: "#f59e0b" },
  ];

  // Top VAT contributors
  const topVATContributors = invoices
    .filter(i => i.status === "paid")
    .sort((a, b) => b.invoiceDetails.vatAmount - a.invoiceDetails.vatAmount)
    .slice(0, 5)
    .map(invoice => ({
      tenant: invoice.tenant.name,
      property: invoice.property.name,
      vat: invoice.invoiceDetails.vatAmount,
      revenue: invoice.invoiceDetails.subtotal,
      percentage: (invoice.invoiceDetails.vatAmount / totalVAT) * 100
    }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">UAE VAT Compliance Report</h2>
          <p className="text-muted-foreground">Comprehensive VAT reporting and compliance management</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export VAT Report
          </Button>
        </div>
      </div>

      {/* VAT Compliance Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Total VAT Collected</p>
                <p className="text-3xl font-bold text-foreground mt-1">{loading ? "..." : formatCurrency(vatData?.totalVAT ?? totalVAT)}</p>
                <p className="text-xs text-muted-foreground mt-1">This period</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500/20" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Compliance Rate</p>
                <p className="text-3xl font-bold text-foreground mt-1">{loading ? "..." : (vatData?.complianceRate ?? vatComplianceRate).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">{vatRegisteredInvoices} {isReceivables ? "receipt invoices" : "invoices"} registered</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/20" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">VAT Rate</p>
                <p className="text-3xl font-bold text-foreground mt-1">{vatRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">UAE Standard</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500/20" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Submission</p>
                <p className="text-3xl font-bold text-foreground mt-1">{vatData?.nextReturnDue ? "Ready" : "100%"}</p>
                <p className="text-xs text-muted-foreground mt-1">FTA Compliant</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500/20" />
          </CardContent>
        </Card>
      </div>

      {/* VAT Reports Tabs */}
      <Tabs value={selectedReport} onValueChange={setSelectedReport} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="submission">Submission</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly VAT Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Monthly VAT Collection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyVAT}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip 
                        formatter={(value: any) => [`AED ${Number(value).toLocaleString()}`, "VAT"]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="vat" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* VAT Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  VAT Registration Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={vatStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {vatStatusData.map((entry, index) => (
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

          {/* Top VAT Contributors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top VAT Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topVATContributors.map((contributor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{contributor.tenant}</p>
                        <p className="text-sm text-muted-foreground">{contributor.property}</p>
                        <p className="text-xs text-muted-foreground">
                          {contributor.percentage.toFixed(1)}% of total VAT
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(contributor.vat)}</p>
                      <p className="text-sm text-muted-foreground">
                        Revenue: {formatCurrency(contributor.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* VAT Compliance Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  VAT Compliance Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">VAT Registration</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Complete
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">VAT Number Display</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Complete
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">VAT Rate Application</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Complete
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Invoice Formatting</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Complete
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Record Keeping</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Complete
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VAT Compliance Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  VAT Compliance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">100</div>
                    <p className="text-sm text-muted-foreground">Compliance Score</p>
                    <div className="mt-4">
                      <Progress value={100} className="h-3" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">VAT Registration</span>
                      <div className="flex items-center gap-2">
                        <Progress value={100} className="w-20 h-2" />
                        <span className="text-sm font-medium">100%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Invoice Compliance</span>
                      <div className="flex items-center gap-2">
                        <Progress value={100} className="w-20 h-2" />
                        <span className="text-sm font-medium">100%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Record Keeping</span>
                      <div className="flex items-center gap-2">
                        <Progress value={100} className="w-20 h-2" />
                        <span className="text-sm font-medium">100%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">FTA Submission</span>
                      <div className="flex items-center gap-2">
                        <Progress value={100} className="w-20 h-2" />
                        <span className="text-sm font-medium">100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VAT Compliance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                VAT Compliance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">VAT Registration Number</p>
                  <p className="text-lg font-bold text-foreground">{vatData?.trn || "100123456789123"}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Registration Date</p>
                  <p className="text-lg font-bold text-foreground">{vatData?.registrationDate || "Jan 1, 2018"}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Next Return Due</p>
                  <p className="text-lg font-bold text-foreground">{vatData?.nextReturnDue || "Apr 28, 2024"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* VAT by Property Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  VAT by Property Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vatByPropertyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <ChartTooltip 
                        formatter={(value: any) => [`AED ${Number(value).toLocaleString()}`, "VAT"]}
                      />
                      <Bar dataKey="vat" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* VAT Rate Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  VAT Rate Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-600" />
                      <span className="font-medium">5% Standard Rate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{formatCurrency(totalVAT)}</span>
                      <span className="text-sm text-muted-foreground">VAT</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                      <span className="font-medium">0% Zero Rated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">AED 0</span>
                      <span className="text-sm text-muted-foreground">VAT</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-purple-600" />
                      <span className="font-medium">Exempt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">AED 0</span>
                      <span className="text-sm text-muted-foreground">VAT</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VAT Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                VAT Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total VAT Collected</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalVAT)}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average VAT per Invoice</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalVAT / vatRegisteredInvoices)}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">VAT Rate</p>
                  <p className="text-2xl font-bold text-foreground">{vatRate}%</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Compliance Rate</p>
                  <p className="text-2xl font-bold text-foreground">{vatComplianceRate.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submission Tab */}
        <TabsContent value="submission" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FTA Submission Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  FTA Submission Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Q1 2024 Submission</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Submitted
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Q2 2024 Submission</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Submitted
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">Q3 2024 Submission</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Due Soon
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Q4 2024 Submission</span>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800">
                      Pending
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Submission Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Next Submission Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">{selectedPeriod.toUpperCase()} VAT Return</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Due Date: {vatData?.nextReturnDue || "April 28, 2024"}
                        </p>
                        <p className="text-sm text-blue-700">
                          Estimated VAT: {formatCurrency(vatData?.totalVAT ?? totalVAT)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Submission Period</span>
                      <span className="font-medium">Q3 2024</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Due Date</span>
                      <span className="font-medium">Apr 28, 2024</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Days Remaining</span>
                      <span className="font-medium text-yellow-600">15 days</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Ready for Submission
                      </Badge>
                    </div>
                  </div>
                  
                  <Button className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Prepare VAT Return
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VAT Return Preparation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                VAT Return Preparation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Output VAT</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalVAT)}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Net VAT Payable</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalVAT)}</p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center gap-2">
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Download VAT Return
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Preview Return
                </Button>
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Submit to FTA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
