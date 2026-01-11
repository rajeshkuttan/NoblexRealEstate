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
  Users, 
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
  UserMinus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Sample tenant data
const tenantDemographics = [
  { ageGroup: "18-25", count: 45, percentage: 15 },
  { ageGroup: "26-35", count: 120, percentage: 40 },
  { ageGroup: "36-45", count: 90, percentage: 30 },
  { ageGroup: "46-55", count: 30, percentage: 10 },
  { ageGroup: "55+", count: 15, percentage: 5 },
];

const tenantNationalities = [
  { nationality: "UAE Nationals", count: 60, percentage: 20 },
  { nationality: "Indian", count: 90, percentage: 30 },
  { nationality: "Pakistani", count: 45, percentage: 15 },
  { nationality: "Filipino", count: 30, percentage: 10 },
  { nationality: "Egyptian", count: 30, percentage: 10 },
  { nationality: "Other", count: 45, percentage: 15 },
];

const tenantSatisfaction = [
  { month: "Jan", satisfaction: 4.2, complaints: 8, compliments: 25 },
  { month: "Feb", satisfaction: 4.4, complaints: 6, compliments: 30 },
  { month: "Mar", satisfaction: 4.6, complaints: 4, compliments: 35 },
  { month: "Apr", satisfaction: 4.5, complaints: 5, compliments: 32 },
  { month: "May", satisfaction: 4.7, complaints: 3, compliments: 40 },
  { month: "Jun", satisfaction: 4.8, complaints: 2, compliments: 45 },
];

const tenantRetention = [
  { property: "Marina Heights", retention: 85, newTenants: 15, renewals: 25 },
  { property: "Business Bay Plaza", retention: 78, newTenants: 22, renewals: 18 },
  { property: "Palm Residences", retention: 92, newTenants: 8, renewals: 30 },
  { property: "Downtown Complex", retention: 80, newTenants: 20, renewals: 22 },
];

const paymentBehavior = [
  { status: "On Time", count: 240, percentage: 80 },
  { status: "Late (1-7 days)", count: 45, percentage: 15 },
  { status: "Late (8-30 days)", count: 12, percentage: 4 },
  { status: "Overdue (30+ days)", count: 3, percentage: 1 },
];

const tenantCommunication = [
  { channel: "Email", usage: 85, satisfaction: 4.5 },
  { channel: "Phone", usage: 70, satisfaction: 4.2 },
  { channel: "WhatsApp", usage: 90, satisfaction: 4.7 },
  { channel: "In-Person", usage: 60, satisfaction: 4.8 },
  { channel: "Portal", usage: 45, satisfaction: 4.0 },
];

const tenantFeedback = [
  { category: "Property Condition", rating: 4.6, feedback: 25 },
  { category: "Maintenance Response", rating: 4.4, feedback: 18 },
  { category: "Communication", rating: 4.7, feedback: 22 },
  { category: "Amenities", rating: 4.5, feedback: 20 },
  { category: "Location", rating: 4.8, feedback: 30 },
  { category: "Value for Money", rating: 4.3, feedback: 15 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function TenantReports() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("Last 6 Months");
  const [selectedProperty, setSelectedProperty] = useState("All Properties");

  const totalTenants = 300;
  const avgSatisfaction = tenantSatisfaction.reduce((sum, t) => sum + t.satisfaction, 0) / tenantSatisfaction.length;
  const totalComplaints = tenantSatisfaction.reduce((sum, t) => sum + t.complaints, 0);
  const totalCompliments = tenantSatisfaction.reduce((sum, t) => sum + t.compliments, 0);
  const avgRetention = tenantRetention.reduce((sum, t) => sum + t.retention, 0) / tenantRetention.length;

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
        satisfaction: tenantSatisfaction,
        retention: tenantRetention,
        demographics: tenantDemographics,
        paymentBehavior: paymentBehavior
      });
      generateExcel(reportData, `Tenant_${reportType.replace(/-/g, '_')}_Report`);
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
          dataToExport = { tenants: tenantSatisfaction, period: selectedPeriod };
          generateExcel(dataToExport, "Tenant_Data");
          break;
        default:
          dataToExport = { tenants: tenantSatisfaction };
          generateExcel(dataToExport, "Tenant_Export");
      }
      toast({
        title: "Export Successful!",
        description: "Tenant data has been exported successfully.",
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
          <h2 className="text-2xl font-bold text-foreground">Tenant Reports</h2>
          <p className="text-muted-foreground">Tenant analytics, satisfaction, and retention insights</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                <p className="text-3xl font-bold text-foreground">{totalTenants}</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +12 this month
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Satisfaction</p>
                <p className="text-3xl font-bold text-foreground">{avgSatisfaction.toFixed(1)}/5</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +0.3 from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Retention Rate</p>
                <p className="text-3xl font-bold text-foreground">{avgRetention.toFixed(1)}%</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +2.1% from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Heart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Feedback Ratio</p>
                <p className="text-3xl font-bold text-foreground">
                  {totalCompliments > totalComplaints ? '+' : ''}{((totalCompliments - totalComplaints) / totalComplaints * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-green-600 flex items-center">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {totalCompliments} compliments
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tenant Satisfaction Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Satisfaction Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tenantSatisfaction}>
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

            {/* Payment Behavior */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Payment Behavior
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentBehavior}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percentage }) => `${status}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {paymentBehavior.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tenant Retention by Property */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Tenant Retention by Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenantRetention.map((property, index) => (
                  <div key={property.property} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <div>
                        <p className="font-medium">{property.property}</p>
                        <p className="text-sm text-muted-foreground">
                          {property.newTenants} new, {property.renewals} renewals
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{property.retention}%</p>
                      <p className="text-sm text-muted-foreground">Retention</p>
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
                  onClick={() => handleGenerateReport("tenant-satisfaction")}
                >
                  <Star className="h-6 w-6" />
                  <span className="text-sm">Satisfaction</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("tenant-demographics")}
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Demographics</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("tenant-retention")}
                >
                  <Heart className="h-6 w-6" />
                  <span className="text-sm">Retention</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("tenant-feedback")}
                >
                  <MessageSquare className="h-6 w-6" />
                  <span className="text-sm">Feedback</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age Demographics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Age Demographics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tenantDemographics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ageGroup" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Nationality Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Nationality Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tenantNationalities}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ nationality, percentage }) => `${nationality}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {tenantNationalities.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenantDemographics.map((ageGroup, index) => (
                    <div key={ageGroup.ageGroup} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{ageGroup.ageGroup} years</span>
                        <span className="font-bold">{ageGroup.count} tenants</span>
                      </div>
                      <Progress value={ageGroup.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nationality Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenantNationalities.map((nationality, index) => (
                    <div key={nationality.nationality} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-medium">{nationality.nationality}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{nationality.count}</p>
                        <p className="text-sm text-muted-foreground">{nationality.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
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
                <LineChart data={tenantSatisfaction}>
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
                <CardTitle>Feedback Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenantFeedback.map((category, index) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category.category}</span>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold">{category.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{category.feedback} feedback</span>
                        <span>{((category.rating / 5) * 100).toFixed(0)}% satisfaction</span>
                      </div>
                      <Progress value={(category.rating / 5) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Communication Channels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenantCommunication.map((channel, index) => (
                    <div key={channel.channel} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{channel.channel}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{channel.usage}%</span>
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">{channel.satisfaction}</span>
                        </div>
                      </div>
                      <Progress value={channel.usage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Retention Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tenantRetention.map((property, index) => (
                  <Card key={property.property} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{property.property}</h3>
                        <Badge variant="outline">{property.retention}%</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">New Tenants</span>
                          <span className="font-bold">{property.newTenants}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Renewals</span>
                          <span className="font-bold">{property.renewals}</span>
                        </div>
                        <Progress value={property.retention} className="h-2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retention Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tenantRetention}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="property" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="retention" fill="#10b981" name="Retention %" />
                  <Bar dataKey="newTenants" fill="#3b82f6" name="New Tenants" />
                  <Bar dataKey="renewals" fill="#f59e0b" name="Renewals" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communication Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenantCommunication.map((channel, index) => (
                  <div key={channel.channel} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{channel.channel}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Usage: {channel.usage}%</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold">{channel.satisfaction}</span>
                        </div>
                      </div>
                    </div>
                    <Progress value={channel.usage} className="h-2" />
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
                  onClick={() => handleGenerateReport("tenant-summary")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Tenant Summary
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport("satisfaction-report")}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Satisfaction Report
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport("retention-analysis")}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Retention Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
