import { useState } from "react";
import { generateExcel, generateReportSummary } from "@/utils/reportUtils";
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
  FileText, 
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
  Server, 
  Database, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Disc, 
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
  Send,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageSquare as MessageSquareIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  MapPin as MapPinIcon,
  Home as HomeIcon,
  Building2,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  Users,
  AlertCircle as AlertCircleIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { NEUTRAL_REGISTRATION_COMPLIANCE_LABEL } from "@/lib/emirateAuthorityMap";

// Sample lease data
const leaseStatus = [
  { status: "Active", count: 180, percentage: 60 },
  { status: "Expiring Soon", count: 25, percentage: 8 },
  { status: "Renewed", count: 45, percentage: 15 },
  { status: "Terminated", count: 15, percentage: 5 },
  { status: "Pending", count: 35, percentage: 12 },
];

const leasePerformance = [
  { month: "Jan", newLeases: 15, renewals: 8, terminations: 3, revenue: 45000 },
  { month: "Feb", newLeases: 18, renewals: 12, terminations: 2, revenue: 52000 },
  { month: "Mar", newLeases: 22, renewals: 15, terminations: 4, revenue: 58000 },
  { month: "Apr", newLeases: 20, renewals: 10, terminations: 3, revenue: 55000 },
  { month: "May", newLeases: 25, renewals: 18, terminations: 2, revenue: 62000 },
  { month: "Jun", newLeases: 28, renewals: 20, terminations: 5, revenue: 68000 },
];

const leaseTypes = [
  { type: "Residential", count: 200, percentage: 67, avgRent: 3500 },
  { type: "Commercial", count: 80, percentage: 27, avgRent: 8500 },
  { type: "Mixed Use", count: 20, percentage: 6, avgRent: 12000 },
];

const leaseDurations = [
  { duration: "1 Year", count: 120, percentage: 40 },
  { duration: "2 Years", count: 150, percentage: 50 },
  { duration: "3+ Years", count: 30, percentage: 10 },
];

const leaseCompliance = [
  { property: "Marina Heights", ejari: 95, insurance: 100, inspection: 90 },
  { property: "Business Bay Plaza", ejari: 88, insurance: 95, inspection: 85 },
  { property: "Palm Residences", ejari: 92, insurance: 100, inspection: 88 },
  { property: "Downtown Complex", ejari: 85, insurance: 90, inspection: 82 },
];

const leaseRenewals = [
  { month: "Jan", renewals: 8, newLeases: 15, retention: 85 },
  { month: "Feb", renewals: 12, newLeases: 18, retention: 88 },
  { month: "Mar", renewals: 15, newLeases: 22, retention: 90 },
  { month: "Apr", renewals: 10, newLeases: 20, retention: 87 },
  { month: "May", renewals: 18, newLeases: 25, retention: 92 },
  { month: "Jun", renewals: 20, newLeases: 28, retention: 89 },
];

const leaseRevenue = [
  { property: "Marina Heights", revenue: 18000, occupancy: 95, avgRent: 3500 },
  { property: "Business Bay Plaza", revenue: 15000, occupancy: 88, avgRent: 4500 },
  { property: "Palm Residences", revenue: 12000, occupancy: 92, avgRent: 4000 },
  { property: "Downtown Complex", revenue: 13000, occupancy: 85, avgRent: 3800 },
];

const leaseExpiring = [
  { property: "Marina Heights", expiring: 8, renewals: 6, newLeases: 2 },
  { property: "Business Bay Plaza", expiring: 5, renewals: 4, newLeases: 1 },
  { property: "Palm Residences", expiring: 3, renewals: 3, newLeases: 0 },
  { property: "Downtown Complex", expiring: 7, renewals: 5, newLeases: 2 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function LeaseReports() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("Last 6 Months");
  const [selectedProperty, setSelectedProperty] = useState("All Properties");

  const totalLeases = leaseStatus.reduce((sum, status) => sum + status.count, 0);
  const activeLeases = leaseStatus.find(s => s.status === "Active")?.count || 0;
  const expiringLeases = leaseStatus.find(s => s.status === "Expiring Soon")?.count || 0;
  const renewalRate = leaseRenewals.reduce((sum, r) => sum + r.retention, 0) / leaseRenewals.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleGenerateReport = (reportType: string) => {
    try {
      const reportData = generateReportSummary(reportType, {
        status: leaseStatus,
        renewals: leaseRenewals,
        types: leaseTypes,
        durations: leaseDurations
      });
      generateExcel(reportData, `Lease_${reportType.replace(/-/g, '_')}_Report`);
      toast({
        title: "Report Generated!",
        description: `${reportType} report has been downloaded successfully.`,
      });
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
          dataToExport = { leases: leaseStatus, period: selectedPeriod };
          generateExcel(dataToExport, "Lease_Data");
          break;
        default:
          dataToExport = { leases: leaseStatus };
          generateExcel(dataToExport, "Lease_Export");
      }
      toast({
        title: "Export Successful!",
        description: "Lease data has been exported successfully.",
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
          <h2 className="text-2xl font-bold text-foreground">Lease Reports</h2>
          <p className="text-muted-foreground">Lease performance, renewals, and compliance analysis</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Leases</p>
                <p className="text-3xl font-bold text-foreground">{totalLeases}</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +15 this month
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Leases</p>
                <p className="text-3xl font-bold text-foreground">{activeLeases}</p>
                <p className="text-sm text-green-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {((activeLeases / totalLeases) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-3xl font-bold text-foreground">{expiringLeases}</p>
                <p className="text-sm text-orange-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Need attention
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Renewal Rate</p>
                <p className="text-3xl font-bold text-foreground">{renewalRate.toFixed(1)}%</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +2.3% from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Heart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lease Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Lease Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leaseStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percentage }) => `${status}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {leaseStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lease Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Lease Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={leaseTypes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Lease Durations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Lease Durations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaseDurations.map((duration, index) => (
                  <div key={duration.duration} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{duration.duration}</span>
                      <span className="font-bold">{duration.count} leases</span>
                    </div>
                    <Progress value={duration.percentage} className="h-2" />
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
                  onClick={() => handleGenerateReport("lease-performance")}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">Performance</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("lease-renewals")}
                >
                  <Heart className="h-6 w-6" />
                  <span className="text-sm">Renewals</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("lease-compliance")}
                >
                  <CheckCircle className="h-6 w-6" />
                  <span className="text-sm">Compliance</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("lease-expiring")}
                >
                  <AlertCircle className="h-6 w-6" />
                  <span className="text-sm">Expiring</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Lease Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={leasePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="newLeases" stroke="#10b981" strokeWidth={3} name="New Leases" />
                  <Line type="monotone" dataKey="renewals" stroke="#3b82f6" strokeWidth={2} name="Renewals" />
                  <Line type="monotone" dataKey="terminations" stroke="#ef4444" strokeWidth={2} name="Terminations" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lease Activity Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total New Leases</span>
                    <span className="font-bold text-green-600">
                      {leasePerformance.reduce((sum, item) => sum + item.newLeases, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Renewals</span>
                    <span className="font-bold text-blue-600">
                      {leasePerformance.reduce((sum, item) => sum + item.renewals, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Terminations</span>
                    <span className="font-bold text-red-600">
                      {leasePerformance.reduce((sum, item) => sum + item.terminations, 0)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Net Growth</span>
                    <span className="font-bold text-green-600">
                      {leasePerformance.reduce((sum, item) => sum + item.newLeases + item.renewals - item.terminations, 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={leasePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Renewals Tab */}
        <TabsContent value="renewals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Renewal Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={leaseRenewals}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="renewals" stroke="#10b981" strokeWidth={3} name="Renewals" />
                  <Line type="monotone" dataKey="newLeases" stroke="#3b82f6" strokeWidth={2} name="New Leases" />
                  <Line type="monotone" dataKey="retention" stroke="#f59e0b" strokeWidth={2} name="Retention %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Renewal Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaseRenewals.map((month, index) => (
                    <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{month.month}</p>
                        <p className="text-sm text-muted-foreground">
                          {month.renewals} renewals, {month.newLeases} new
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{month.retention}%</p>
                        <p className="text-sm text-muted-foreground">Retention</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expiring Leases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaseExpiring.map((property, index) => (
                    <div key={property.property} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{property.property}</span>
                        <span className="font-bold">{property.expiring} expiring</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Renewals</span>
                          <span className="text-green-600">{property.renewals}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">New Leases</span>
                          <span className="text-blue-600">{property.newLeases}</span>
                        </div>
                      </div>
                      <Progress value={(property.renewals / property.expiring) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {leaseCompliance.map((property, index) => (
                  <Card key={property.property} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{property.property}</h3>
                        <Badge variant="outline">Compliance</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{NEUTRAL_REGISTRATION_COMPLIANCE_LABEL}</span>
                          <span className="font-bold">{property.ejari}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Insurance</span>
                          <span className="font-bold">{property.insurance}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Inspection</span>
                          <span className="font-bold">{property.inspection}%</span>
                        </div>
                        <Progress value={(property.ejari + property.insurance + property.inspection) / 3} className="h-2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leaseCompliance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="property" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ejari" fill="#3b82f6" name={`${NEUTRAL_REGISTRATION_COMPLIANCE_LABEL} %`} />
                  <Bar dataKey="insurance" fill="#10b981" name="Insurance %" />
                  <Bar dataKey="inspection" fill="#f59e0b" name="Inspection %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Revenue by Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaseRevenue.map((property, index) => (
                  <div key={property.property} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{property.property}</span>
                      <span className="font-bold">{formatCurrency(property.revenue)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span>{property.occupancy}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Avg Rent</span>
                        <span>{formatCurrency(property.avgRent)}</span>
                      </div>
                    </div>
                    <Progress value={property.occupancy} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Quick Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport("lease-summary")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Lease Summary
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport("renewal-report")}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Renewal Report
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport("compliance-report")}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Compliance Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
