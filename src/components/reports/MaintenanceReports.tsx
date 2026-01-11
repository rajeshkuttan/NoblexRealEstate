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
  Wrench, 
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
  Send,
  DollarSign,
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
  Clock as ClockIcon,
  FileText,
  Settings,
  Shield,
  Activity as ActivityIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Sample maintenance data
const maintenanceTickets = [
  { status: "Open", count: 25, percentage: 20 },
  { status: "In Progress", count: 40, percentage: 32 },
  { status: "Completed", count: 50, percentage: 40 },
  { status: "Scheduled", count: 10, percentage: 8 },
];

const maintenanceCategories = [
  { category: "HVAC", count: 35, percentage: 28, avgCost: 500, avgTime: 2.5 },
  { category: "Plumbing", count: 30, percentage: 24, avgCost: 300, avgTime: 1.8 },
  { category: "Electrical", count: 25, percentage: 20, avgCost: 400, avgTime: 2.2 },
  { category: "General", count: 20, percentage: 16, avgCost: 200, avgTime: 1.5 },
  { category: "Elevator", count: 10, percentage: 8, avgCost: 800, avgTime: 4.0 },
  { category: "Security", count: 5, percentage: 4, avgCost: 150, avgTime: 1.0 },
];

const maintenanceTrends = [
  { month: "Jan", tickets: 45, completed: 40, cost: 15000, avgTime: 2.2 },
  { month: "Feb", tickets: 52, completed: 48, cost: 18000, avgTime: 2.0 },
  { month: "Mar", tickets: 48, completed: 45, cost: 16500, avgTime: 2.1 },
  { month: "Apr", tickets: 55, completed: 50, cost: 19000, avgTime: 1.9 },
  { month: "May", tickets: 60, completed: 55, cost: 21000, avgTime: 1.8 },
  { month: "Jun", tickets: 58, completed: 52, cost: 20000, avgTime: 1.9 },
];

const maintenanceByProperty = [
  { property: "Marina Heights", tickets: 35, cost: 12000, avgTime: 2.1, satisfaction: 4.6 },
  { property: "Business Bay Plaza", tickets: 30, cost: 10000, avgTime: 1.9, satisfaction: 4.4 },
  { property: "Palm Residences", tickets: 25, cost: 8000, avgTime: 2.0, satisfaction: 4.7 },
  { property: "Downtown Complex", tickets: 35, cost: 11000, avgTime: 2.2, satisfaction: 4.5 },
];

const maintenancePriorities = [
  { priority: "Low", count: 40, percentage: 32, avgTime: 3.5 },
  { priority: "Medium", count: 50, percentage: 40, avgTime: 2.2 },
  { priority: "High", count: 25, percentage: 20, avgTime: 1.5 },
  { priority: "Urgent", count: 10, percentage: 8, avgTime: 0.8 },
];

const maintenanceCosts = [
  { category: "Labor", cost: 25000, percentage: 50 },
  { category: "Materials", cost: 15000, percentage: 30 },
  { category: "Equipment", cost: 8000, percentage: 16 },
  { category: "External Services", cost: 2000, percentage: 4 },
];

const maintenancePerformance = [
  { technician: "Ahmed Hassan", completed: 45, avgTime: 1.8, satisfaction: 4.7, cost: 12000 },
  { technician: "Omar Ali", completed: 38, avgTime: 2.1, satisfaction: 4.5, cost: 10000 },
  { technician: "Hassan Mohammed", completed: 42, avgTime: 1.9, satisfaction: 4.6, cost: 11000 },
  { technician: "Maintenance Team", completed: 35, avgTime: 2.3, satisfaction: 4.4, cost: 9000 },
];

const maintenanceSatisfaction = [
  { month: "Jan", satisfaction: 4.2, complaints: 8, compliments: 25 },
  { month: "Feb", satisfaction: 4.4, complaints: 6, compliments: 30 },
  { month: "Mar", satisfaction: 4.6, complaints: 4, compliments: 35 },
  { month: "Apr", satisfaction: 4.5, complaints: 5, compliments: 32 },
  { month: "May", satisfaction: 4.7, complaints: 3, compliments: 40 },
  { month: "Jun", satisfaction: 4.8, complaints: 2, compliments: 45 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function MaintenanceReports() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("Last 6 Months");
  const [selectedProperty, setSelectedProperty] = useState("All Properties");

  const totalTickets = maintenanceTickets.reduce((sum, ticket) => sum + ticket.count, 0);
  const completedTickets = maintenanceTickets.find(t => t.status === "Completed")?.count || 0;
  const completionRate = (completedTickets / totalTickets) * 100;
  const totalCost = maintenanceTrends.reduce((sum, trend) => sum + trend.cost, 0);
  const avgResolutionTime = maintenanceTrends.reduce((sum, trend) => sum + trend.avgTime, 0) / maintenanceTrends.length;

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
        tickets: maintenanceTickets,
        categories: maintenanceCategories,
        trends: maintenanceTrends,
        technicians: technicianPerformance
      });
      generateExcel(reportData, `Maintenance_${reportType.replace(/-/g, '_')}_Report`);
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
          dataToExport = { maintenance: maintenanceTickets, period: selectedPeriod };
          generateExcel(dataToExport, "Maintenance_Data");
          break;
        default:
          dataToExport = { maintenance: maintenanceTickets };
          generateExcel(dataToExport, "Maintenance_Export");
      }
      toast({
        title: "Export Successful!",
        description: "Maintenance data has been exported successfully.",
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
          <h2 className="text-2xl font-bold text-foreground">Maintenance Reports</h2>
          <p className="text-muted-foreground">Maintenance costs, performance, and trends analysis</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                <p className="text-3xl font-bold text-foreground">{totalTickets}</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +8 this month
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold text-foreground">{completionRate.toFixed(1)}%</p>
                <p className="text-sm text-green-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  +3.2% from last period
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
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalCost)}</p>
                <p className="text-sm text-red-600 flex items-center">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  +5.2% from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                <p className="text-3xl font-bold text-foreground">{avgResolutionTime.toFixed(1)}d</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  -0.3d from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="technicians">Technicians</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Maintenance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Maintenance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={maintenanceTickets}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percentage }) => `${status}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {maintenanceTickets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Maintenance Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Maintenance Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={maintenanceCategories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Maintenance Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Maintenance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={maintenanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="tickets" stroke="#3b82f6" strokeWidth={3} name="Tickets" />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
                  <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} name="Cost" />
                </LineChart>
              </ResponsiveContainer>
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
                  onClick={() => handleGenerateReport("maintenance-performance")}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">Performance</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("maintenance-costs")}
                >
                  <DollarSign className="h-6 w-6" />
                  <span className="text-sm">Costs</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("maintenance-satisfaction")}
                >
                  <Star className="h-6 w-6" />
                  <span className="text-sm">Satisfaction</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("maintenance-technicians")}
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Technicians</span>
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
                <Activity className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {maintenanceByProperty.map((property, index) => (
                  <Card key={property.property} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{property.property}</h3>
                        <Badge variant="outline">{property.tickets} tickets</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Cost</span>
                          <span className="font-bold">{formatCurrency(property.cost)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Avg Time</span>
                          <span className="font-bold">{property.avgTime}d</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Satisfaction</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold">{property.satisfaction}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {maintenancePriorities.map((priority, index) => (
                    <div key={priority.priority} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{priority.priority}</span>
                        <span className="font-bold">{priority.count} tickets</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{priority.percentage}%</span>
                        <span>Avg: {priority.avgTime}d</span>
                      </div>
                      <Progress value={priority.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={maintenanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="tickets" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Tickets" />
                    <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Completed" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maintenanceCosts.map((cost, index) => (
                  <div key={cost.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{cost.category}</span>
                      <span className="font-bold">{formatCurrency(cost.cost)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{cost.percentage}% of total</span>
                      <span>{formatCurrency(cost.cost)}</span>
                    </div>
                    <Progress value={cost.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={maintenanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={3} name="Cost" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Satisfaction Tab */}
        <TabsContent value="satisfaction" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Satisfaction Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={maintenanceSatisfaction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="satisfaction" stroke="#10b981" strokeWidth={3} name="Satisfaction" />
                  <Line type="monotone" dataKey="complaints" stroke="#ef4444" strokeWidth={2} name="Complaints" />
                  <Line type="monotone" dataKey="compliments" stroke="#3b82f6" strokeWidth={2} name="Compliments" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Satisfaction Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Average Satisfaction</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-bold">
                        {(maintenanceSatisfaction.reduce((sum, item) => sum + item.satisfaction, 0) / maintenanceSatisfaction.length).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Complaints</span>
                    <span className="font-bold text-red-600">
                      {maintenanceSatisfaction.reduce((sum, item) => sum + item.complaints, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Compliments</span>
                    <span className="font-bold text-green-600">
                      {maintenanceSatisfaction.reduce((sum, item) => sum + item.compliments, 0)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Net Feedback</span>
                    <span className="font-bold text-green-600">
                      +{maintenanceSatisfaction.reduce((sum, item) => sum + item.compliments - item.complaints, 0)}
                    </span>
                  </div>
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

        {/* Technicians Tab */}
        <TabsContent value="technicians" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Technician Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maintenancePerformance.map((technician, index) => (
                  <div key={technician.technician} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <div>
                        <p className="font-medium">{technician.technician}</p>
                        <p className="text-sm text-muted-foreground">
                          {technician.completed} completed, {technician.avgTime}d avg time
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-bold">{technician.satisfaction}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatCurrency(technician.cost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={maintenancePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="technician" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
                    <Bar dataKey="satisfaction" fill="#10b981" name="Satisfaction" />
                  </BarChart>
                </ResponsiveContainer>
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
                  onClick={() => handleGenerateReport("maintenance-summary")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Maintenance Summary
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport("cost-analysis")}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cost Analysis
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport("technician-performance")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Technician Performance
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
