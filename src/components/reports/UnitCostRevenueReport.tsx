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
  ComposedChart,
  Legend,
  Area
} from "recharts";
import { 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Download, 
  Building2,
  Home,
  Calculator,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Sample unit cost and revenue data
const unitData = [
  {
    unit: "Unit 101 - Marina Heights",
    property: "Marina Heights",
    type: "1BR",
    revenue: 65000,
    costs: {
      maintenance: 3200,
      utilities: 1800,
      management: 1500,
      insurance: 1000,
      repairs: 800,
      other: 500
    },
    totalCosts: 8800,
    netIncome: 56200,
    occupancyRate: 100,
    monthlyRent: 5417
  },
  {
    unit: "Unit 102 - Marina Heights",
    property: "Marina Heights",
    type: "2BR",
    revenue: 85000,
    costs: {
      maintenance: 4200,
      utilities: 2400,
      management: 2000,
      insurance: 1300,
      repairs: 1100,
      other: 600
    },
    totalCosts: 11600,
    netIncome: 73400,
    occupancyRate: 100,
    monthlyRent: 7083
  },
  {
    unit: "Unit 201 - Business Bay Plaza",
    property: "Business Bay Plaza",
    type: "2BR",
    revenue: 78000,
    costs: {
      maintenance: 3800,
      utilities: 2200,
      management: 1900,
      insurance: 1200,
      repairs: 900,
      other: 550
    },
    totalCosts: 10550,
    netIncome: 67450,
    occupancyRate: 92,
    monthlyRent: 6500
  },
  {
    unit: "Unit 202 - Business Bay Plaza",
    property: "Business Bay Plaza",
    type: "3BR",
    revenue: 95000,
    costs: {
      maintenance: 4800,
      utilities: 2800,
      management: 2300,
      insurance: 1500,
      repairs: 1300,
      other: 700
    },
    totalCosts: 13400,
    netIncome: 81600,
    occupancyRate: 100,
    monthlyRent: 7917
  },
  {
    unit: "Unit 301 - Palm Residences",
    property: "Palm Residences",
    type: "Studio",
    revenue: 45000,
    costs: {
      maintenance: 2200,
      utilities: 1200,
      management: 1100,
      insurance: 700,
      repairs: 500,
      other: 300
    },
    totalCosts: 6000,
    netIncome: 39000,
    occupancyRate: 83,
    monthlyRent: 3750
  },
  {
    unit: "Unit 302 - Palm Residences",
    property: "Palm Residences",
    type: "1BR",
    revenue: 60000,
    costs: {
      maintenance: 2900,
      utilities: 1600,
      management: 1400,
      insurance: 900,
      repairs: 700,
      other: 400
    },
    totalCosts: 7900,
    netIncome: 52100,
    occupancyRate: 100,
    monthlyRent: 5000
  }
];

const propertySummary = [
  {
    property: "Marina Heights",
    units: 2,
    totalRevenue: 150000,
    totalCosts: 20400,
    netIncome: 129600,
    avgOccupancy: 100,
    roi: 86.5
  },
  {
    property: "Business Bay Plaza",
    units: 2,
    totalRevenue: 173000,
    totalCosts: 23950,
    netIncome: 149050,
    avgOccupancy: 96,
    roi: 86.2
  },
  {
    property: "Palm Residences",
    units: 2,
    totalRevenue: 105000,
    totalCosts: 13900,
    netIncome: 91100,
    avgOccupancy: 91.5,
    roi: 86.8
  }
];

const costBreakdown = [
  { category: "Maintenance", amount: 21100, percentage: 36 },
  { category: "Utilities", amount: 12000, percentage: 21 },
  { category: "Management", amount: 10200, percentage: 18 },
  { category: "Insurance", amount: 6600, percentage: 11 },
  { category: "Repairs", amount: 5300, percentage: 9 },
  { category: "Other", amount: 3050, percentage: 5 }
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function UnitCostRevenueReport() {
  const [selectedProperty, setSelectedProperty] = useState("All Properties");
  const [selectedPeriod, setSelectedPeriod] = useState("Current Year");

  const filteredUnits = selectedProperty === "All Properties" 
    ? unitData 
    : unitData.filter(unit => unit.property === selectedProperty);

  const totalRevenue = filteredUnits.reduce((sum, unit) => sum + unit.revenue, 0);
  const totalCosts = filteredUnits.reduce((sum, unit) => sum + unit.totalCosts, 0);
  const totalNetIncome = totalRevenue - totalCosts;
  const avgROI = ((totalNetIncome / totalRevenue) * 100);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = (format: string) => {
    console.log("Exporting unit cost and revenue report as:", format);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Unit-wise Cost & Revenue Report</h2>
          <p className="text-muted-foreground">Detailed cost and revenue analysis per unit</p>
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
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Current Year">Current Year</SelectItem>
              <SelectItem value="Last Year">Last Year</SelectItem>
              <SelectItem value="Last 6 Months">Last 6 Months</SelectItem>
              <SelectItem value="Custom Range">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +8.5% from last period
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Costs</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalCosts)}</p>
                <p className="text-sm text-red-600 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +5.2% from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <Calculator className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Income</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalNetIncome)}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +10.8% from last period
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
                <p className="text-sm font-medium text-muted-foreground">Avg ROI</p>
                <p className="text-3xl font-bold text-foreground">{avgROI.toFixed(1)}%</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +2.3% from last period
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Costs by Unit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue vs Costs by Unit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={filteredUnits}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="unit" 
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  interval={0}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="totalCosts" fill="#ef4444" name="Total Costs" />
                <Line type="monotone" dataKey="netIncome" stroke="#3b82f6" strokeWidth={2} name="Net Income" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Property Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Property Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {propertySummary.map((property, index) => (
                <div key={property.property} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-semibold">{property.property}</span>
                    </div>
                    <Badge variant="outline">{property.units} units</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-bold text-green-600">{formatCurrency(property.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costs</p>
                      <p className="font-bold text-red-600">{formatCurrency(property.totalCosts)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Income</p>
                      <p className="font-bold text-blue-600">{formatCurrency(property.netIncome)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ROI</p>
                      <p className="font-bold">{property.roi}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Unit Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Detailed Unit Analysis
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
                  <th className="p-3 font-medium text-right">Annual Revenue</th>
                  <th className="p-3 font-medium text-right">Total Costs</th>
                  <th className="p-3 font-medium text-right">Net Income</th>
                  <th className="p-3 font-medium text-center">Occupancy</th>
                  <th className="p-3 font-medium text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit, index) => {
                  const roi = ((unit.netIncome / unit.revenue) * 100).toFixed(1);
                  return (
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
                        <div className="flex items-center justify-end gap-1">
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-600">{formatCurrency(unit.revenue)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-600">{formatCurrency(unit.totalCosts)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold text-blue-600">{formatCurrency(unit.netIncome)}</span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            unit.occupancyRate === 100 ? "bg-green-100 text-green-800" :
                            unit.occupancyRate >= 90 ? "bg-blue-100 text-blue-800" :
                            "bg-yellow-100 text-yellow-800"
                          )}
                        >
                          {unit.occupancyRate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold">{roi}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 font-bold">
                <tr>
                  <td className="p-3" colSpan={3}>Total ({filteredUnits.length} units)</td>
                  <td className="p-3 text-right text-green-600">{formatCurrency(totalRevenue)}</td>
                  <td className="p-3 text-right text-red-600">{formatCurrency(totalCosts)}</td>
                  <td className="p-3 text-right text-blue-600">{formatCurrency(totalNetIncome)}</td>
                  <td className="p-3"></td>
                  <td className="p-3 text-right">{avgROI.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {costBreakdown.map((cost, index) => (
              <div key={cost.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="font-medium">{cost.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{formatCurrency(cost.amount)}</span>
                    <span className="text-sm text-muted-foreground ml-2">({cost.percentage}%)</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full"
                    style={{ 
                      width: `${cost.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

