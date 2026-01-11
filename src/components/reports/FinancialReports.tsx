import { useState } from "react";
import { generateExcel } from "@/utils/reportUtils";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  Area, 
  AreaChart,
  RadialBarChart,
  RadialBar
} from "recharts";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Download, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Eye, 
  Share, 
  Printer, 
  Mail, 
  Clock, 
  Target, 
  Award, 
  Trophy, 
  Medal, 
  Crown, 
  Gem, 
  Sparkles, 
  Zap, 
  Flame, 
  Sun, 
  Moon, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Wind, 
  Droplets, 
  Thermometer, 
  Gauge, 
  Battery, 
  Wifi, 
  Signal, 
  Radio, 
  Tv, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Laptop, 
  Desktop, 
  Server, 
  Database, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Disc, 
  Cd, 
  Dvd, 
  Camera, 
  Video, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Music, 
  Headphones, 
  Speaker, 
  Home, 
  Building, 
  Store, 
  Warehouse, 
  Car, 
  FileText, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Receipt, 
  History, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Flag, 
  Bell, 
  MessageSquare, 
  Phone, 
  Mail, 
  MapPin, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Plus, 
  Minus, 
  X, 
  Check, 
  Edit, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  Upload, 
  Send
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Sample financial data
const monthlyRevenue = [
  { month: "Jan", revenue: 45000, expenses: 32000, profit: 13000 },
  { month: "Feb", revenue: 52000, expenses: 35000, profit: 17000 },
  { month: "Mar", revenue: 48000, expenses: 33000, profit: 15000 },
  { month: "Apr", revenue: 55000, expenses: 38000, profit: 17000 },
  { month: "May", revenue: 60000, expenses: 40000, profit: 20000 },
  { month: "Jun", revenue: 58000, expenses: 39000, profit: 19000 },
];

const revenueByProperty = [
  { property: "Marina Heights", revenue: 18000, percentage: 31 },
  { property: "Business Bay Plaza", revenue: 15000, percentage: 26 },
  { property: "Palm Residences", revenue: 12000, percentage: 21 },
  { property: "Downtown Complex", revenue: 13000, percentage: 22 },
];

const expenseCategories = [
  { category: "Maintenance", amount: 15000, percentage: 38 },
  { category: "Utilities", amount: 8000, percentage: 21 },
  { category: "Insurance", amount: 6000, percentage: 15 },
  { category: "Management", amount: 5000, percentage: 13 },
  { category: "Legal", amount: 3000, percentage: 8 },
  { category: "Marketing", amount: 2000, percentage: 5 },
];

const paymentMethods = [
  { method: "Bank Transfer", amount: 25000, percentage: 43 },
  { method: "Cheque", amount: 18000, percentage: 31 },
  { method: "Cash", amount: 8000, percentage: 14 },
  { method: "Credit Card", amount: 7000, percentage: 12 },
];

const vatData = [
  { month: "Jan", vatCollected: 2250, vatPaid: 1600, netVat: 650 },
  { month: "Feb", vatCollected: 2600, vatPaid: 1750, netVat: 850 },
  { month: "Mar", vatCollected: 2400, vatPaid: 1650, netVat: 750 },
  { month: "Apr", vatCollected: 2750, vatPaid: 1900, netVat: 850 },
  { month: "May", vatCollected: 3000, vatPaid: 2000, netVat: 1000 },
  { month: "Jun", vatCollected: 2900, vatPaid: 1950, netVat: 950 },
];

const cashFlowData = [
  { month: "Jan", inflow: 45000, outflow: 32000, net: 13000 },
  { month: "Feb", inflow: 52000, outflow: 35000, net: 17000 },
  { month: "Mar", inflow: 48000, outflow: 33000, net: 15000 },
  { month: "Apr", inflow: 55000, outflow: 38000, net: 17000 },
  { month: "May", inflow: 60000, outflow: 40000, net: 20000 },
  { month: "Jun", inflow: 58000, outflow: 39000, net: 19000 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function FinancialReports() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("Last 6 Months");
  const [selectedProperty, setSelectedProperty] = useState("All Properties");

  const totalRevenue = monthlyRevenue.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = monthlyRevenue.reduce((sum, item) => sum + item.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = (totalProfit / totalRevenue) * 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
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
          },
          monthlyBreakdown: [
            { month: "January", revenue: totalRevenue / 12, expenses: totalExpenses / 12, profit: totalProfit / 12 },
            { month: "February", revenue: totalRevenue / 12, expenses: totalExpenses / 12, profit: totalProfit / 12 },
            { month: "March", revenue: totalRevenue / 12, expenses: totalExpenses / 12, profit: totalProfit / 12 },
            { month: "April", revenue: totalRevenue / 12, expenses: totalExpenses / 12, profit: totalProfit / 12 },
            { month: "May", revenue: totalRevenue / 12, expenses: totalExpenses / 12, profit: totalProfit / 12 },
            { month: "June", revenue: totalRevenue / 12, expenses: totalExpenses / 12, profit: totalProfit / 12 }
          ]
        },
        "balance-sheet": {
          reportName: "Balance Sheet",
          reportType: "Financial Analysis - Balance Sheet",
          period: selectedPeriod,
          summary: {
            totalAssets: formatCurrency(totalRevenue + outstandingAmount),
            currentAssets: formatCurrency(totalRevenue),
            accountsReceivable: formatCurrency(outstandingAmount),
            totalLiabilities: formatCurrency(totalExpenses),
            equity: formatCurrency(totalProfit)
          }
        },
        "cash-flow": {
          reportName: "Cash Flow Statement",
          reportType: "Financial Analysis - Cash Flow",
          period: selectedPeriod,
          summary: {
            cashFromOperations: formatCurrency(totalRevenue),
            netCashFlow: formatCurrency(totalRevenue - totalExpenses),
            beginningCash: formatCurrency(totalRevenue * 0.5),
            endingCash: formatCurrency(totalRevenue * 1.5)
          }
        },
        "vat-report": {
          reportName: "VAT Report",
          reportType: "Financial Analysis - VAT",
          period: selectedPeriod,
          summary: {
            totalVATCollected: formatCurrency(totalVAT),
            totalVATPaid: formatCurrency(totalVAT * 0.3),
            netVATPayable: formatCurrency(totalVAT * 0.7),
            vatRate: "5%"
          }
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

  const handleExportData = (dataType: string) => {
    try {
      let dataToExport;
      switch(dataType) {
        case "excel":
          dataToExport = { 
            summary: {
              totalRevenue: formatCurrency(totalRevenue),
              totalExpenses: formatCurrency(totalExpenses),
              totalProfit: formatCurrency(totalProfit),
              profitMargin: `${profitMargin.toFixed(2)}%`,
            },
            period: selectedPeriod 
          };
          generateExcel(dataToExport, "Financial_Data");
          break;
        default:
          dataToExport = { totalRevenue, totalExpenses, totalProfit };
          generateExcel(dataToExport, "Financial_Export");
      }
      toast({
        title: "Export Successful!",
        description: "Financial data has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data. Please try again.",
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
          <p className="text-muted-foreground">Revenue, expenses, profit & loss analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Last 6 Months">Last 6 Months</SelectItem>
              <SelectItem value="Last Year">Last Year</SelectItem>
              <SelectItem value="Custom Range">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => handleExportData("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Export
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
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +12.5% from last period
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
                <p className="text-sm text-red-600 flex items-center">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  +8.2% from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalProfit)}</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +18.3% from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                <p className="text-3xl font-bold text-foreground">{profitMargin.toFixed(1)}%</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +2.1% from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Expenses Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Property */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Revenue by Property
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueByProperty}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ property, percentage }) => `${property}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {revenueByProperty.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Property</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueByProperty.map((property, index) => (
                    <div key={property.property} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-medium">{property.property}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(property.revenue)}</p>
                        <p className="text-sm text-muted-foreground">{property.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.map((method, index) => (
                    <div key={method.method} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-medium">{method.method}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(method.amount)}</p>
                        <p className="text-sm text-muted-foreground">{method.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Expense Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenseCategories.map((category, index) => (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category.category}</span>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(category.amount)}</p>
                        <p className="text-sm text-muted-foreground">{category.percentage}%</p>
                      </div>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VAT Tab */}
        <TabsContent value="vat" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">VAT Collected</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(vatData.reduce((sum, item) => sum + item.vatCollected, 0))}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">VAT Paid</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(vatData.reduce((sum, item) => sum + item.vatPaid, 0))}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Net VAT</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(vatData.reduce((sum, item) => sum + item.netVat, 0))}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>VAT Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={vatData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Line type="monotone" dataKey="vatCollected" stroke="#10b981" strokeWidth={2} name="VAT Collected" />
                  <Line type="monotone" dataKey="vatPaid" stroke="#ef4444" strokeWidth={2} name="VAT Paid" />
                  <Line type="monotone" dataKey="netVat" stroke="#3b82f6" strokeWidth={2} name="Net VAT" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Cash Flow Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="inflow" fill="#10b981" name="Cash Inflow" />
                  <Bar dataKey="outflow" fill="#ef4444" name="Cash Outflow" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Inflow</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.inflow, 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Outflow</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.outflow, 0))}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Net Cash Flow</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.net, 0))}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleExportData("excel")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleExportData("pdf")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export to PDF
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleExportData("csv")}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Export to CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
