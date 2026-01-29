import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Home, 
  Target, 
  DollarSign, 
  Calendar, 
  Download, 
  Filter,
  ArrowUp,
  ArrowDown,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Building2,
  Key,
  Settings,
  Wifi,
  Shield
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UnitAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
  analyticsData: any; // Using any to match the dynamic backend response structure
}

export default function UnitAnalytics({ isOpen, onClose, analyticsData }: UnitAnalyticsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("30d");

  // Use backend data or defaults
  const summary = analyticsData?.summary || {};
  const typeData = analyticsData?.typeDistribution || {};
  const propertyRevenue = analyticsData?.propertyPerformance || {};
  const topUnits = analyticsData?.topUnits || [];

  const totalUnits = summary.total || 0;
  const occupiedUnits = summary.occupied || 0;
  const availableUnits = summary.available || 0;
  const maintenanceUnits = summary.maintenance || 0;
  
  const totalRevenue = summary.totalRevenue || 0;
  const averageRent = summary.averageRent || 0;
  const occupancyRate = summary.occupancyRate || 0;
  
  // Status distribution (backend gives counts in summary)
  const statusData = {
    occupied: occupiedUnits,
    available: availableUnits,
    maintenance: maintenanceUnits
  };

  // Average metrics
  const avgArea = summary.avgArea || 0;
  const avgROI = summary.avgROI || 0;
  const avgTenantSatisfaction = summary.avgTenantSatisfaction || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Occupied": return "text-green-600";
      case "Available": return "text-blue-600";
      case "Under Maintenance": return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Apartment": return "text-blue-600";
      case "Villa": return "text-green-600";
      case "Office": return "text-purple-600";
      case "Retail": return "text-orange-600";
      case "Warehouse": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  // Export analytics data to Excel
  const handleExport = () => {
    try {
      // Summary sheet
      const summaryData = [{
        'Metric': 'Total Units',
        'Value': totalUnits
      }, {
        'Metric': 'Occupied Units',
        'Value': occupiedUnits
      }, {
        'Metric': 'Available Units',
        'Value': availableUnits
      }, {
        'Metric': 'Under Maintenance',
        'Value': maintenanceUnits
      }, {
        'Metric': 'Occupancy Rate',
        'Value': `${Number(occupancyRate).toFixed(1)}%`
      }, {
        'Metric': 'Total Revenue',
        'Value': `AED ${Number(totalRevenue).toLocaleString()}`
      }, {
        'Metric': 'Average Rent',
        'Value': `AED ${Number(averageRent).toLocaleString()}`
      }, {
        'Metric': 'Average Area',
        'Value': `${avgArea} sq ft`
      }, {
        'Metric': 'Average ROI',
        'Value': `${avgROI}%`
      }];

      // Type distribution sheet
      const typeSheet = Object.entries(typeData).map(([type, count]: [string, any]) => ({
        'Unit Type': type,
        'Count': count,
        'Percentage': `${((count / (totalUnits || 1)) * 100).toFixed(1)}%`
      }));

      // Status distribution sheet
      const statusSheet = Object.entries(statusData).map(([status, count]) => ({
        'Status': status,
        'Count': count,
        'Percentage': `${((count / (totalUnits || 1)) * 100).toFixed(1)}%`
      }));

      // Property revenue sheet
      const propertySheet = Object.entries(propertyRevenue).map(([property, data]: [string, any]) => ({
        'Property': property,
        'Units': data.units,
        'Revenue': `AED ${data.revenue.toLocaleString()}`,
        'Average per Unit': `AED ${(data.revenue / (data.units || 1)).toLocaleString()}`
      }));

      // Top Units sheet (replacing Detailed Units which required full list)
      const topUnitsSheet = topUnits.map((unit: any) => ({
        'Unit Number': unit.unitNumber,
        'Property': unit.propertyName,
        'Type': unit.type,
        'Area': unit.area,
        'Monthly Rent': unit.monthlyRent,
        'ROI': unit.roi
      }));

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      const wsType = XLSX.utils.json_to_sheet(typeSheet);
      XLSX.utils.book_append_sheet(wb, wsType, "Type Distribution");

      const wsStatus = XLSX.utils.json_to_sheet(statusSheet);
      XLSX.utils.book_append_sheet(wb, wsStatus, "Status Distribution");

      const wsProperty = XLSX.utils.json_to_sheet(propertySheet);
      XLSX.utils.book_append_sheet(wb, wsProperty, "Property Revenue");

      const wsTopUnits = XLSX.utils.json_to_sheet(topUnitsSheet);
      XLSX.utils.book_append_sheet(wb, wsTopUnits, "Top Performing Units");

      XLSX.writeFile(wb, `units_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Analytics data exported successfully");
    } catch (error) {
      console.error("Error exporting analytics:", error);
      toast.error("Failed to export analytics data");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Unit Analytics
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                Comprehensive insights into your unit portfolio performance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Units</p>
                    <p className="text-2xl font-bold">{totalUnits}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-gradient-withu flex items-center justify-center">
                    <Home className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-green-600">+5% this month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                    <p className="text-2xl font-bold text-green-600">{occupancyRate.toFixed(1)}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-muted-foreground">
                    {occupiedUnits} of {totalUnits} units occupied
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    <p className="text-2xl font-bold">AED {(totalRevenue / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-muted-foreground">Avg: AED {averageRent.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. ROI</p>
                    <p className="text-2xl font-bold">{avgROI}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-muted-foreground">Portfolio performance</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Unit Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Unit Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(statusData).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("h-3 w-3 rounded-full", {
                              "bg-green-500": status === "occupied",
                              "bg-blue-500": status === "available",
                              "bg-yellow-500": status === "maintenance"
                            })}></div>
                            <span className="capitalize">{status.replace(/([A-Z])/g, ' $1').trim()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{count}</span>
                            <span className="text-sm text-muted-foreground">
                              ({Math.round((count / totalUnits) * 100)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Unit Type Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Unit Type Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(typeData).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("h-3 w-3 rounded-full", {
                              "bg-blue-500": type === "Apartment",
                              "bg-green-500": type === "Villa",
                              "bg-purple-500": type === "Office",
                              "bg-orange-500": type === "Retail",
                              "bg-gray-500": type === "Warehouse"
                            })}></div>
                            <span>{type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{count}</span>
                            <span className="text-sm text-muted-foreground">
                              ({Math.round((count / totalUnits) * 100)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performing Units */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Top Performing Units
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topUnits.map((unit, index) => (
                      <div key={unit.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-withu flex items-center justify-center">
                            <span className="text-white text-sm font-bold">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{unit.propertyName} - {unit.unitNumber}</p>
                            <p className="text-sm text-muted-foreground">{unit.type} • {unit.area} sq ft</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">AED {unit.monthlyRent.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">ROI: {unit.roi}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Revenue by Property
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(propertyRevenue)
                      .sort(([,a], [,b]) => b.revenue - a.revenue)
                      .map(([property, data]) => (
                        <div key={property} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-withu flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{property}</p>
                              <p className="text-sm text-muted-foreground">{data.units} units</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">AED {data.revenue.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Monthly revenue</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-3xl font-bold text-primary">{avgArea}</p>
                      <p className="text-sm text-muted-foreground">Avg. Area (sq ft)</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-3xl font-bold text-green-600">{avgROI}%</p>
                      <p className="text-sm text-muted-foreground">Avg. ROI</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-600">{avgTenantSatisfaction.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground">Avg. Tenant Rating</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Property Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(propertyRevenue)
                      .sort(([,a], [,b]) => b.revenue - a.revenue)
                      .map(([property, data]) => (
                        <div key={property} className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{property}</h4>
                            <Badge variant="outline">{data.units} units</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                              <p className="text-xl font-bold">AED {data.revenue.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Avg. Rent per Unit</p>
                              <p className="text-xl font-bold">AED {Math.round(data.revenue / data.units).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <Progress value={(data.revenue / Math.max(...Object.values(propertyRevenue).map(p => p.revenue))) * 100} className="h-2" />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Revenue Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">AED {(totalRevenue / 1000).toFixed(0)}K</span>
                          <ArrowUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">+8%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Occupancy Rate</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{occupancyRate.toFixed(1)}%</span>
                          <ArrowUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">+3%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Average Rent</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">AED {averageRent.toLocaleString()}</span>
                          <ArrowUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">+5%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">New unit added</p>
                          <p className="text-xs text-muted-foreground">2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Unit rented out</p>
                          <p className="text-xs text-muted-foreground">4 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                        <Settings className="h-4 w-4 text-yellow-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Maintenance completed</p>
                          <p className="text-xs text-muted-foreground">6 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
