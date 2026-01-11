import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
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

interface PropertyAnalyticsProps {
  property: {
    id: number;
    name: string;
    type: string;
    location: string;
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
  };
}

const revenueData = [
  { month: "Jan", revenue: 850000, expenses: 120000 },
  { month: "Feb", revenue: 920000, expenses: 135000 },
  { month: "Mar", revenue: 880000, expenses: 125000 },
  { month: "Apr", revenue: 950000, expenses: 140000 },
  { month: "May", revenue: 1020000, expenses: 150000 },
  { month: "Jun", revenue: 980000, expenses: 145000 },
];

const occupancyData = [
  { month: "Jan", occupancy: 89 },
  { month: "Feb", occupancy: 92 },
  { month: "Mar", occupancy: 88 },
  { month: "Apr", occupancy: 94 },
  { month: "May", occupancy: 96 },
  { month: "Jun", occupancy: 93 },
];

const expenseBreakdown = [
  { name: "Maintenance", value: 45, color: "#8884d8" },
  { name: "Utilities", value: 25, color: "#82ca9d" },
  { name: "Insurance", value: 15, color: "#ffc658" },
  { name: "Management", value: 10, color: "#ff7c7c" },
  { name: "Other", value: 5, color: "#8dd1e1" },
];

const tenantSatisfactionData = [
  { category: "Overall", score: 4.7 },
  { category: "Maintenance", score: 4.5 },
  { category: "Communication", score: 4.8 },
  { category: "Facilities", score: 4.6 },
  { category: "Location", score: 4.9 },
];

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1"];

export default function PropertyAnalytics({ property }: PropertyAnalyticsProps) {
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
            Ejari {property.ejariStatus}
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
                  AED {(property.revenue / 1000).toFixed(0)}K
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
                <DollarSign className="h-6 w-6 text-green-600" />
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
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
                  <Badge className={getStatusColor(property.maintenanceStatus)}>
                    {property.maintenanceStatus.charAt(0).toUpperCase() + property.maintenanceStatus.slice(1)}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Energy Rating</span>
                    <span className={`font-bold ${getEnergyRatingColor(property.energyRating)}`}>
                      {property.energyRating}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Insurance Expiry</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{property.insuranceExpiry}</span>
                    </div>
                  </div>
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
                    <span className="text-sm">Ejari Compliance</span>
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