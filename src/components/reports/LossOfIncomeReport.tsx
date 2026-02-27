import { useState } from "react";
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
  Cell,
  PieChart,
  Pie
} from "recharts";
import { 
  Banknote, 
  TrendingDown, 
  BarChart3, 
  Download, 
  AlertTriangle,
  Calendar,
  Clock,
  Home,
  Target,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Sample loss of income data
// Formula: Vacant days × day rent pro rata
const lossData = [
  {
    unit: "Unit 101 - Marina Heights",
    property: "Marina Heights",
    type: "1BR",
    monthlyRent: 5417,
    dailyRate: 180,
    vacantDays: 30,
    lossOfIncome: 5400,
    status: "Vacant",
    lastTenantCheckout: "2024-01-15",
    marketingDays: 30
  },
  {
    unit: "Unit 205 - Business Bay Plaza",
    property: "Business Bay Plaza",
    type: "2BR",
    monthlyRent: 6500,
    dailyRate: 217,
    vacantDays: 45,
    lossOfIncome: 9765,
    status: "Vacant",
    lastTenantCheckout: "2024-12-31",
    marketingDays: 45
  },
  {
    unit: "Unit 302 - Palm Residences",
    property: "Palm Residences",
    type: "Studio",
    monthlyRent: 3750,
    dailyRate: 125,
    vacantDays: 15,
    lossOfIncome: 1875,
    status: "Vacant",
    lastTenantCheckout: "2024-02-01",
    marketingDays: 15
  },
  {
    unit: "Unit 405 - Downtown Complex",
    property: "Downtown Complex",
    type: "3BR",
    monthlyRent: 8000,
    dailyRate: 267,
    vacantDays: 60,
    lossOfIncome: 16020,
    status: "Vacant",
    lastTenantCheckout: "2023-12-15",
    marketingDays: 60
  },
  {
    unit: "Unit 108 - Marina Heights",
    property: "Marina Heights",
    type: "2BR",
    monthlyRent: 7083,
    dailyRate: 236,
    vacantDays: 22,
    lossOfIncome: 5192,
    status: "Vacant",
    lastTenantCheckout: "2024-01-25",
    marketingDays: 22
  }
];

const monthlyLossData = [
  { month: "Jan", loss: 15400, vacantUnits: 3 },
  { month: "Feb", loss: 12200, vacantUnits: 2 },
  { month: "Mar", loss: 18500, vacantUnits: 4 },
  { month: "Apr", loss: 9800, vacantUnits: 2 },
  { month: "May", loss: 22100, vacantUnits: 5 },
  { month: "Jun", loss: 16300, vacantUnits: 3 }
];

const propertyLossSummary = [
  { property: "Marina Heights", totalLoss: 10592, vacantUnits: 2, avgVacantDays: 26 },
  { property: "Business Bay Plaza", totalLoss: 9765, vacantUnits: 1, avgVacantDays: 45 },
  { property: "Palm Residences", totalLoss: 1875, vacantUnits: 1, avgVacantDays: 15 },
  { property: "Downtown Complex", totalLoss: 16020, vacantUnits: 1, avgVacantDays: 60 }
];

const COLORS = ["#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981"];

export default function LossOfIncomeReport() {
  const [selectedProperty, setSelectedProperty] = useState("All Properties");
  const [selectedPeriod, setSelectedPeriod] = useState("Current Month");

  const filteredLoss = selectedProperty === "All Properties" 
    ? lossData 
    : lossData.filter(unit => unit.property === selectedProperty);

  const totalLoss = filteredLoss.reduce((sum, unit) => sum + unit.lossOfIncome, 0);
  const totalVacantDays = filteredLoss.reduce((sum, unit) => sum + unit.vacantDays, 0);
  const avgVacantDays = filteredLoss.length > 0 ? Math.round(totalVacantDays / filteredLoss.length) : 0;
  const totalVacantUnits = filteredLoss.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AE", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const handleExport = (format: string) => {
    console.log("Exporting loss of income report as:", format);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Loss of Income Report</h2>
          <p className="text-muted-foreground">Track income loss due to vacant units (Vacant Days × Daily Rent Pro Rata)</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Properties">All Properties</SelectItem>
              <SelectItem value="Marina Heights">Marina Heights</SelectItem>
              <SelectItem value="Business Bay Plaza">Business Bay Plaza</SelectItem>
              <SelectItem value="Palm Residences">Palm Residences</SelectItem>
              <SelectItem value="Downtown Complex">Downtown Complex</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Current Month">Current Month</SelectItem>
              <SelectItem value="Last 3 Months">Last 3 Months</SelectItem>
              <SelectItem value="Last 6 Months">Last 6 Months</SelectItem>
              <SelectItem value="Current Year">Current Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alert Card */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900 mb-1">Income Loss Alert</h3>
              <p className="text-sm text-orange-700">
                Total estimated loss of {formatCurrency(totalLoss)} from {totalVacantUnits} vacant units over {totalVacantDays} total vacant days.
                Average vacancy period: {avgVacantDays} days per unit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Loss of Income</p>
                <p className="text-3xl font-bold text-foreground text-red-600">{formatCurrency(totalLoss)}</p>
                <p className="text-sm text-muted-foreground mt-1">Potential revenue lost</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vacant Units</p>
                <p className="text-3xl font-bold text-foreground">{totalVacantUnits}</p>
                <p className="text-sm text-muted-foreground mt-1">Currently unoccupied</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Home className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Vacant Days</p>
                <p className="text-3xl font-bold text-foreground">{totalVacantDays}</p>
                <p className="text-sm text-muted-foreground mt-1">Cumulative vacancy</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Vacant Days</p>
                <p className="text-3xl font-bold text-foreground">{avgVacantDays}</p>
                <p className="text-sm text-muted-foreground mt-1">Per unit average</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Loss Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Monthly Loss Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyLossData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "loss") return formatCurrency(value as number);
                    return value;
                  }}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="loss" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  name="Loss of Income"
                  dot={{ fill: "#ef4444", r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Property-wise Loss Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Loss by Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={propertyLossSummary}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ property, totalLoss }) => `${property.split(' ')[0]}: ${formatCurrency(totalLoss)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalLoss"
                >
                  {propertyLossSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Property Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Property-wise Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {propertyLossSummary.map((property, index) => (
              <div key={property.property} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="font-semibold">{property.property}</span>
                  </div>
                  <Badge variant="destructive">{property.vacantUnits} vacant</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Loss</p>
                    <p className="font-bold text-red-600">{formatCurrency(property.totalLoss)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Vacant Days</p>
                    <p className="font-bold">{property.avgVacantDays} days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Daily Loss Rate</p>
                    <p className="font-bold">{formatCurrency(Math.round(property.totalLoss / property.avgVacantDays))}/day</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Vacant Units Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Detailed Vacant Units Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-3 font-medium">Unit</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium text-right">Monthly Rent</th>
                  <th className="p-3 font-medium text-right">Daily Rate</th>
                  <th className="p-3 font-medium text-center">Vacant Days</th>
                  <th className="p-3 font-medium text-right">Loss of Income</th>
                  <th className="p-3 font-medium">Last Checkout</th>
                  <th className="p-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoss.map((unit, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{unit.unit.split(' - ')[0]}</p>
                        <p className="text-sm text-muted-foreground">{unit.property}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{unit.type}</Badge>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatCurrency(unit.monthlyRent)}
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-muted-foreground">{formatCurrency(unit.dailyRate)}</span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          unit.vacantDays >= 45 ? "bg-red-100 text-red-800" :
                          unit.vacantDays >= 30 ? "bg-orange-100 text-orange-800" :
                          "bg-yellow-100 text-yellow-800"
                        )}
                      >
                        {unit.vacantDays} days
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-bold text-red-600">{formatCurrency(unit.lossOfIncome)}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(unit.lastTenantCheckout)}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="destructive">{unit.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 font-bold bg-muted/30">
                <tr>
                  <td className="p-3" colSpan={4}>Total ({filteredLoss.length} vacant units)</td>
                  <td className="p-3 text-center">{totalVacantDays} days</td>
                  <td className="p-3 text-right text-red-600">{formatCurrency(totalLoss)}</td>
                  <td className="p-3" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Formula Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Target className="h-5 w-5" />
            Calculation Formula
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-blue-900">
            <div className="flex items-center gap-4">
              <div className="font-mono bg-white px-4 py-2 rounded border border-blue-200">
                <strong>Loss of Income</strong> = Vacant Days × Daily Rent Pro Rata
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="font-mono bg-white px-4 py-2 rounded border border-blue-200">
                <strong>Daily Rent Pro Rata</strong> = Monthly Rent ÷ 30
              </div>
            </div>
            <Separator className="bg-blue-200" />
            <p className="text-sm">
              <strong>Example:</strong> Unit with AED 6,000 monthly rent vacant for 45 days:
            </p>
            <p className="text-sm font-mono bg-white px-4 py-2 rounded border border-blue-200">
              Loss = 45 days × (6,000 ÷ 30) = 45 × 200 = <strong className="text-red-600">AED 9,000</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

