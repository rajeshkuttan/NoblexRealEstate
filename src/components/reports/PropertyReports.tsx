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
  Building2, 
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
  Users,
  Banknote,
  Star,
  MapPin as MapPinIcon,
  Home as HomeIcon,
  Wrench,
  Database
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Sample property data
const propertyPerformance = [
  { property: "Marina Heights", occupancy: 95, revenue: 18000, rating: 4.8, units: 120 },
  { property: "Business Bay Plaza", occupancy: 88, revenue: 15000, rating: 4.6, units: 80 },
  { property: "Palm Residences", occupancy: 92, revenue: 12000, rating: 4.7, units: 60 },
  { property: "Downtown Complex", occupancy: 85, revenue: 13000, rating: 4.5, units: 100 },
];

const occupancyTrends = [
  { month: "Jan", occupancy: 88, newLeases: 12, renewals: 8 },
  { month: "Feb", occupancy: 90, newLeases: 15, renewals: 10 },
  { month: "Mar", occupancy: 92, newLeases: 18, renewals: 12 },
  { month: "Apr", occupancy: 89, newLeases: 14, renewals: 9 },
  { month: "May", occupancy: 91, newLeases: 16, renewals: 11 },
  { month: "Jun", occupancy: 93, newLeases: 20, renewals: 13 },
];

const revenueByLocation = [
  { location: "Dubai Marina", revenue: 28000 },
  { location: "Business Bay", revenue: 22000 },
  { location: "Downtown", revenue: 18000 },
  { location: "Palm Jumeirah", revenue: 15000 },
];

const propertyTypes = [
  { type: "Residential", count: 8, percentage: 67, revenue: 45000 },
  { type: "Commercial", count: 3, percentage: 25, revenue: 25000 },
  { type: "Mixed Use", count: 1, percentage: 8, revenue: 8000 },
];

const locationPerformance = [
  { location: "Dubai Marina", properties: 4, occupancy: 92, revenue: 28000 },
  { location: "Business Bay", properties: 3, occupancy: 88, revenue: 22000 },
  { location: "Downtown", properties: 2, occupancy: 85, revenue: 18000 },
  { location: "Palm Jumeirah", properties: 3, occupancy: 90, revenue: 15000 },
];

const maintenanceCosts = [
  { property: "Marina Heights", maintenance: 2500, repairs: 1200, total: 3700 },
  { property: "Business Bay Plaza", maintenance: 2000, repairs: 800, total: 2800 },
  { property: "Palm Residences", maintenance: 1500, repairs: 600, total: 2100 },
  { property: "Downtown Complex", maintenance: 1800, repairs: 900, total: 2700 },
];

const tenantSatisfaction = [
  { property: "Marina Heights", satisfaction: 4.8, complaints: 2, compliments: 15 },
  { property: "Business Bay Plaza", satisfaction: 4.6, complaints: 4, compliments: 12 },
  { property: "Palm Residences", satisfaction: 4.7, complaints: 3, compliments: 18 },
  { property: "Downtown Complex", satisfaction: 4.5, complaints: 5, compliments: 10 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function PropertyReports() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("Last 6 Months");
  const [selectedProperty, setSelectedProperty] = useState("All Properties");

  const totalProperties = propertyPerformance.length;
  const avgOccupancy = propertyPerformance.reduce((sum, p) => sum + p.occupancy, 0) / totalProperties;
  const totalRevenue = propertyPerformance.reduce((sum, p) => sum + p.revenue, 0);
  const avgRating = propertyPerformance.reduce((sum, p) => sum + p.rating, 0) / totalProperties;

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
        properties: propertyPerformance,
        occupancy: occupancyTrends,
        revenue: revenueByLocation,
        locations: locationPerformance
      });
      generateExcel(reportData, `Property_${reportType.replace(/-/g, '_')}_Report`);
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
          dataToExport = { properties: propertyPerformance, period: selectedPeriod };
          generateExcel(dataToExport, "Property_Data");
          break;
        default:
          dataToExport = { properties: propertyPerformance };
          generateExcel(dataToExport, "Property_Export");
      }
      toast({
        title: "Export Successful!",
        description: "Property data has been exported successfully.",
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
          <h2 className="text-2xl font-bold text-foreground">Property Reports</h2>
          <p className="text-muted-foreground">Property performance, occupancy, and market analysis</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                <p className="text-3xl font-bold text-foreground">{totalProperties}</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +2 this year
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Occupancy</p>
                <p className="text-3xl font-bold text-foreground">{avgOccupancy.toFixed(1)}%</p>
                <p className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +3.2% from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

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
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                <p className="text-3xl font-bold text-foreground">{avgRating.toFixed(1)}/5</p>
                <p className="text-sm text-green-600 flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  +0.2 from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Property Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Property Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={propertyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="property" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="occupancy" fill="#3b82f6" name="Occupancy %" />
                    <Bar dataKey="rating" fill="#10b981" name="Rating" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Property Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Property Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={propertyTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {propertyTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Location Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                Location Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locationPerformance.map((location, index) => (
                  <div key={location.location} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <div>
                        <p className="font-medium">{location.location}</p>
                        <p className="text-sm text-muted-foreground">{location.properties} properties</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{location.occupancy}% occupancy</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(location.revenue)} revenue</p>
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
                  onClick={() => handleGenerateReport("property-performance")}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">Performance</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("occupancy-analysis")}
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Occupancy</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("market-analysis")}
                >
                  <TrendingUp className="h-6 w-6" />
                  <span className="text-sm">Market</span>
                </Button>
                <Button 
                  className="h-20 flex-col gap-2" 
                  variant="outline"
                  onClick={() => handleGenerateReport("maintenance-costs")}
                >
                  <Wrench className="h-6 w-6" />
                  <span className="text-sm">Maintenance</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Occupancy Tab */}
        <TabsContent value="occupancy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Occupancy Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={occupancyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="occupancy" stroke="#3b82f6" strokeWidth={3} name="Occupancy %" />
                  <Line type="monotone" dataKey="newLeases" stroke="#10b981" strokeWidth={2} name="New Leases" />
                  <Line type="monotone" dataKey="renewals" stroke="#f59e0b" strokeWidth={2} name="Renewals" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Occupancy by Property</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {propertyPerformance.map((property, index) => (
                    <div key={property.property} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{property.property}</span>
                        <span className="font-bold">{property.occupancy}%</span>
                      </div>
                      <Progress value={property.occupancy} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lease Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">New Leases</span>
                    <span className="font-bold text-green-600">
                      {occupancyTrends.reduce((sum, item) => sum + item.newLeases, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Renewals</span>
                    <span className="font-bold text-blue-600">
                      {occupancyTrends.reduce((sum, item) => sum + item.renewals, 0)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Activity</span>
                    <span className="font-bold">
                      {occupancyTrends.reduce((sum, item) => sum + item.newLeases + item.renewals, 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Property Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {propertyPerformance.map((property, index) => (
                  <Card key={property.property} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{property.property}</h3>
                        <Badge variant="outline">{property.units} units</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Occupancy</span>
                          <span className="font-bold">{property.occupancy}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Revenue</span>
                          <span className="font-bold">{formatCurrency(property.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Rating</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold">{property.rating}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={propertyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="property" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="revenue" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maintenanceCosts.map((property, index) => (
                  <div key={property.property} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{property.property}</span>
                      <span className="font-bold">{formatCurrency(property.total)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Maintenance</span>
                        <span>{formatCurrency(property.maintenance)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Repairs</span>
                        <span>{formatCurrency(property.repairs)}</span>
                      </div>
                    </div>
                    <Progress value={(property.total / 4000) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={maintenanceCosts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="property" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="maintenance" fill="#3b82f6" name="Maintenance" />
                  <Bar dataKey="repairs" fill="#ef4444" name="Repairs" />
                </BarChart>
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
                Tenant Satisfaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenantSatisfaction.map((property, index) => (
                  <div key={property.property} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <div>
                        <p className="font-medium">{property.property}</p>
                        <p className="text-sm text-muted-foreground">
                          {property.complaints} complaints, {property.compliments} compliments
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-bold">{property.satisfaction}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Rating</p>
                    </div>
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
                  onClick={() => handleGenerateReport("property-summary")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Property Summary
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport("occupancy-report")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Occupancy Report
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleGenerateReport("maintenance-summary")}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Maintenance Summary
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
