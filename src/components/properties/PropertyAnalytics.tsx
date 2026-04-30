import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Banknote, 
  Users, 
  Building2,
  Star,
  Target,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AreaChart,
  Area
} from "recharts";
import { useSettings } from "@/contexts/SettingsContext";
import { getAuthorityLabelsForProperty } from "@/lib/emirateAuthorityMap";
import { useMemo } from "react";

interface PropertyAnalyticsProps {
  property: {
    id: number;
    name: string;
    type: string;
    location: string;
    emirate?: string | null;
    revenue: number;
    revenueChange: number;
    occupancyRate: number;
    rating: number;
    marketValue: number;
    roi: number;
    tenantSatisfaction: number;
    energyRating: string;
    ejariStatus: string;
    insuranceExpiry: string;
    maintenanceStatus: string;
    leaseExpirations: number;
    upcomingRenovations: number;
    compliance?: Array<{
      type: string;
      issueDate: string;
      expiryDate: string;
      status: string;
      reminderAlert: boolean;
      vendorName?: string;
      purpose?: string;
      amount?: string | number;
    }>;
  };
  revenueData?: any[];
  occupancyData?: any[];
  expenseBreakdown?: any[];
}

export default function PropertyAnalytics({ 
  property, 
  revenueData: propRevenueData, 
  occupancyData: propOccupancyData, 
  expenseBreakdown: propExpenseBreakdown 
}: PropertyAnalyticsProps) {
  const { contractTerminology, emirateAuthorityMap } = useSettings();

  const authorityLabels = useMemo(
    () =>
      getAuthorityLabelsForProperty(
        { emirate: property.emirate ?? null, location: property.location },
        emirateAuthorityMap,
        contractTerminology,
      ),
    [property.emirate, property.location, emirateAuthorityMap, contractTerminology],
  );
  
  // Use props or fallbacks (fallbacks can be removed or kept as empty arrays)
  const revenueData = propRevenueData || [
      { month: "Jan", revenue: 0, expenses: 0 },
      { month: "Feb", revenue: 0, expenses: 0 },
      { month: "Mar", revenue: 0, expenses: 0 },
      { month: "Apr", revenue: 0, expenses: 0 },
      { month: "May", revenue: 0, expenses: 0 },
      { month: "Jun", revenue: 0, expenses: 0 },
  ];

  const occupancyData = propOccupancyData || [
      { month: "Jan", occupancy: 0 },
      { month: "Feb", occupancy: 0 },
      { month: "Mar", occupancy: 0 },
      { month: "Apr", occupancy: 0 },
      { month: "May", occupancy: 0 },
      { month: "Jun", occupancy: 0 },
  ];

  const expenseBreakdown = propExpenseBreakdown || [];

  const tenantSatisfactionData = [
    { category: "Overall", score: 4.7 },
    { category: "Maintenance", score: 4.5 },
    { category: "Communication", score: 4.8 },
    { category: "Facilities", score: 4.6 },
    { category: "Location", score: 4.9 },
  ];

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "fair":
        return "text-yellow-600";
      case "poor":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getEjariStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "non-compliant":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEnergyRatingColor = (rating: string) => {
    switch (rating) {
      case "A+":
        return "text-green-600";
      case "A":
        return "text-green-500";
      case "B+":
        return "text-blue-500";
      case "B":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-green-100 text-green-800";
      case "expiring":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Parse compliance if it's a JSON string
  let complianceRecords: any[] = [];
  if (typeof property.compliance === 'string') {
    try {
      complianceRecords = JSON.parse(property.compliance);
    } catch (e) {
      console.error("Failed to parse compliance:", e);
      complianceRecords = [];
    }
  } else if (Array.isArray(property.compliance)) {
    complianceRecords = property.compliance;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Property Analytics</h2>
          <p className="text-muted-foreground">{property.name} - {property.location}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{property.type}</Badge>
          <Badge className={getEjariStatusColor(property.ejariStatus)}>
            {authorityLabels.attestationAuthority} {property.ejariStatus}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  AED {property.revenue.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {property.revenueChange > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    property.revenueChange > 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {property.revenueChange > 0 ? "+" : ""}{property.revenueChange}%
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Occupancy Rate</p>
                <p className="text-2xl font-bold text-foreground">{property.occupancyRate}%</p>
                <Progress value={property.occupancyRate} className="h-2 mt-2" />
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
                <p className="text-sm font-medium text-muted-foreground">ROI</p>
                <p className="text-2xl font-bold text-foreground">{property.roi}%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Market Value: AED {(property.marketValue / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tenant Satisfaction</p>
                <p className="text-2xl font-bold text-foreground">{property.tenantSatisfaction}/5</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm text-muted-foreground">Excellent</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
        </TabsList>

        {/* Revenue Analytics */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`AED ${(value as number).toLocaleString()}`, ""]} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`AED ${(value as number).toLocaleString()}`, ""]} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                    <Bar dataKey="expenses" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Occupancy Analytics */}
        <TabsContent value="occupancy" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Occupancy Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={occupancyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, "Occupancy"]} />
                    <Line 
                      type="monotone" 
                      dataKey="occupancy" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      dot={{ fill: "#8884d8", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Occupancy Rate</span>
                  <span className="text-lg font-bold">{property.occupancyRate}%</span>
                </div>
                <Progress value={property.occupancyRate} className="h-3" />
                
                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Lease Expirations</span>
                    <Badge variant="outline">{property.leaseExpirations}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Upcoming Renovations</span>
                    <Badge variant="outline">{property.upcomingRenovations}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expense Analytics */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Status</span>
                  <Badge className={getStatusColor(property.maintenanceStatus || 'good')}>
                    {property.maintenanceStatus 
                      ? property.maintenanceStatus.charAt(0).toUpperCase() + property.maintenanceStatus.slice(1)
                      : 'Good'}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Energy Rating</span>
                    <span className={`font-bold ${getEnergyRatingColor(property.energyRating || 'A')}`}>
                      {property.energyRating || 'A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Insurance Expiry</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{property.insuranceExpiry || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Analytics */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Compliance Alerts */}
            {(complianceRecords.filter(c => getDaysUntil(c.expiryDate) < 30).length || 0) > 0 && (
              <Card className="border-red-200 bg-red-50/30">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Compliance Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceRecords.filter(c => getDaysUntil(c.expiryDate) < 30).map((alert, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{alert.type}</p>
                            <p className="text-sm text-muted-foreground">Expires on {alert.expiryDate}</p>
                          </div>
                        </div>
                        <Badge variant="destructive">
                          {getDaysUntil(alert.expiryDate) < 0 ? 'Expired' : `Expiring in ${getDaysUntil(alert.expiryDate)} days`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Compliance Records & Certificates</CardTitle>
                <Badge variant="outline">{complianceRecords.length || 0} Records</Badge>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Vendor/Purpose</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Amount</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Issue Date</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Expiry Date</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Reminders</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {complianceRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            No compliance records found.
                          </td>
                        </tr>
                      ) : (
                        complianceRecords.map((record, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4 font-medium">{record.type}</td>
                            <td className="p-4">
                              <Badge className={getComplianceStatusColor(record.status || 'valid')}>
                                {(record.status || 'valid').charAt(0).toUpperCase() + (record.status || 'valid').slice(1)}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {record.type === 'Sub-contractor' ? (
                                <div>
                                  <p className="font-medium">{record.vendorName || 'N/A'}</p>
                                  <p className="text-xs text-muted-foreground">{record.purpose || 'N/A'}</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </td>
                            <td className="p-4 text-sm">
                              {record.amount ? `AED ${parseFloat(String(record.amount)).toLocaleString()}` : '-'}
                            </td>
                            <td className="p-4 text-sm">{record.issueDate}</td>
                            <td className="p-4 text-sm font-medium">{record.expiryDate}</td>
                            <td className="p-4">
                              <Badge variant={record.reminderAlert ? "secondary" : "outline"}>
                                {record.reminderAlert ? "Active" : "Disabled"}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Satisfaction Analytics */}
        <TabsContent value="satisfaction" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Satisfaction Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenantSatisfactionData.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.category}</span>
                        <span className="text-sm font-bold">{item.score}/5</span>
                      </div>
                      <Progress value={(item.score / 5) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{authorityLabels.attestationAuthority} compliance</span>
                  </div>
                  <Badge className={getEjariStatusColor(property.ejariStatus)}>
                    {property.ejariStatus}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Overall Rating</span>
                  </div>
                  <span className="text-sm font-bold">{property.rating}/5</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm">ROI Performance</span>
                  </div>
                  <span className="text-sm font-bold">{property.roi}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}