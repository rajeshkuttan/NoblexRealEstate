import { useState } from "react";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  Calendar, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Target, 
  Award, 
  Star, 
  Heart, 
  Zap, 
  Globe, 
  Home, 
  Car, 
  Wifi, 
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
  Download, 
  Upload, 
  Print, 
  FileText, 
  User, 
  Building, 
  ThumbsUp, 
  ThumbsDown, 
  Smile, 
  Frown, 
  Meh
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

interface LeaseAnalyticsProps {
  leases: any[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function LeaseAnalytics({ leases }: LeaseAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("12months");
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  // Calculate analytics data
  const totalLeases = leases.length;
  const activeLeases = leases.filter(l => l.status === "active").length;
  const expiringLeases = leases.filter(l => l.status === "expiring").length;
  const pendingLeases = leases.filter(l => l.status === "pending").length;
  const expiredLeases = leases.filter(l => l.status === "expired").length;

  const totalMonthlyRevenue = leases.reduce((sum, lease) => sum + lease.leaseDetails.monthlyRent, 0);
  const totalAnnualRevenue = totalMonthlyRevenue * 12;
  const totalDeposits = leases.reduce((sum, lease) => sum + lease.leaseDetails.totalDeposits, 0);

  const ejariCompliant = leases.filter(l => l.ejariStatus === "registered").length;
  const ejariComplianceRate = (ejariCompliant / totalLeases) * 100;

  const overdueLeases = leases.filter(l => l.paymentStatus === "overdue").length;
  const currentLeases = leases.filter(l => l.paymentStatus === "current").length;
  const pendingPayments = leases.filter(l => l.paymentStatus === "pending").length;

  // Revenue by property type
  const revenueByType = leases.reduce((acc, lease) => {
    const type = lease.property.type;
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += lease.leaseDetails.monthlyRent;
    return acc;
  }, {} as Record<string, number>);

  const revenueByTypeData = Object.entries(revenueByType).map(([type, revenue]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    revenue,
    percentage: (revenue / totalMonthlyRevenue) * 100
  }));

  // Lease status distribution
  const statusData = [
    { name: "Active", value: activeLeases, color: "#10b981" },
    { name: "Expiring", value: expiringLeases, color: "#f59e0b" },
    { name: "Pending", value: pendingLeases, color: "#3b82f6" },
    { name: "Expired", value: expiredLeases, color: "#ef4444" },
  ];

  // Payment status distribution
  const paymentStatusData = [
    { name: "Current", value: currentLeases, color: "#10b981" },
    { name: "Overdue", value: overdueLeases, color: "#ef4444" },
    { name: "Pending", value: pendingPayments, color: "#f59e0b" },
  ];

  // Monthly revenue trend (simulated data for the last 12 months)
  const monthlyTrendData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    return {
      month: date.toLocaleDateString("en-AE", { month: "short" }),
      revenue: totalMonthlyRevenue + (Math.random() - 0.5) * totalMonthlyRevenue * 0.2,
      leases: Math.floor(activeLeases + (Math.random() - 0.5) * 2),
    };
  });

  // Occupancy rate by property
  const occupancyData = leases.map(lease => ({
    property: lease.property.name,
    occupancy: Math.floor(Math.random() * 30) + 70, // Simulated occupancy rate
    revenue: lease.leaseDetails.monthlyRent,
  }));

  // Compliance metrics
  const complianceData = [
    { name: "Ejari Registered", value: ejariCompliant, total: totalLeases, color: "#10b981" },
    { name: "DEWA Connected", value: leases.filter(l => l.compliance.dewaConnected).length, total: totalLeases, color: "#3b82f6" },
    { name: "Municipality Registered", value: leases.filter(l => l.compliance.municipalityRegistered).length, total: totalLeases, color: "#8b5cf6" },
    { name: "Insurance Valid", value: leases.filter(l => l.compliance.insuranceValid).length, total: totalLeases, color: "#f59e0b" },
    { name: "Fire Safety", value: leases.filter(l => l.compliance.fireSafety).length, total: totalLeases, color: "#ef4444" },
    { name: "Maintenance", value: leases.filter(l => l.compliance.maintenanceUpToDate).length, total: totalLeases, color: "#06b6d4" },
  ];

  // Top performing properties
  const topProperties = leases
    .sort((a, b) => b.leaseDetails.monthlyRent - a.leaseDetails.monthlyRent)
    .slice(0, 5)
    .map(lease => ({
      name: lease.property.name,
      revenue: lease.leaseDetails.monthlyRent,
      occupancy: Math.floor(Math.random() * 30) + 70,
      satisfaction: lease.satisfaction,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Lease Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive insights into your lease portfolio</p>
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
          <Button variant="outline" size="sm">
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
                <p className="text-3xl font-bold text-foreground">AED {(totalMonthlyRevenue / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">monthly</p>
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
                <p className="text-sm font-medium text-muted-foreground">Active Leases</p>
                <p className="text-3xl font-bold text-foreground">{activeLeases}</p>
                <p className="text-sm text-muted-foreground">of {totalLeases} total</p>
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
                <p className="text-sm font-medium text-muted-foreground">Ejari Compliance</p>
                <p className="text-3xl font-bold text-foreground">{ejariComplianceRate.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">{ejariCompliant} registered</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple-600" />
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
                <p className="text-sm text-muted-foreground">need renewal</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lease Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Lease Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentStatusData.map((status, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="font-medium">{status.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{status.value}</span>
                        <span className="text-sm text-muted-foreground">leases</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

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
                  <AreaChart data={monthlyTrendData}>
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
                    <BarChart data={revenueByTypeData}>
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
                  {revenueByTypeData.map((item, index) => (
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
                          AED {(item.revenue / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    AED {(totalMonthlyRevenue / 1000).toFixed(0)}K
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Annual Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    AED {(totalAnnualRevenue / 1000000).toFixed(1)}M
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Deposits</p>
                  <p className="text-2xl font-bold text-foreground">
                    AED {(totalDeposits / 1000000).toFixed(1)}M
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.value}/{item.total}
                        </span>
                      </div>
                      <Progress 
                        value={(item.value / item.total) * 100} 
                        className="h-2"
                      />
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {((item.value / item.total) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <Badge 
                        variant={item.value === item.total ? "default" : "secondary"}
                        className={item.value === item.total ? "bg-green-100 text-green-800" : ""}
                      >
                        {item.value === item.total ? "Complete" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Compliance Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceData
                  .filter(item => item.value < item.total)
                  .map((item, index) => (
                    <div key={index} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-900">{item.name}</p>
                          <p className="text-sm text-yellow-700">
                            {item.total - item.value} lease(s) require {item.name.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Properties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Performing Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProperties.map((property, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{property.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {property.occupancy}% occupancy
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">AED {(property.revenue / 1000).toFixed(0)}K</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-sm text-muted-foreground">{property.satisfaction}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Occupancy Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Occupancy Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={occupancyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="property" />
                      <YAxis />
                      <ChartTooltip 
                        formatter={(value: any, name: string) => [
                          name === "occupancy" ? `${value}%` : `AED ${(value / 1000).toFixed(0)}K`,
                          name === "occupancy" ? "Occupancy" : "Revenue"
                        ]}
                      />
                      <Bar dataKey="occupancy" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Occupancy</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.floor(Math.random() * 20) + 80}%
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Satisfaction</p>
                  <p className="text-2xl font-bold text-foreground">4.7/5</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Renewal Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.floor(Math.random() * 30) + 70}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}