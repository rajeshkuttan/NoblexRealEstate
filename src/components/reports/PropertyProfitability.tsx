import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  Download, 
  RefreshCw, 
  Building,
  Banknote,
  Percent,
  Users,
  Home,
  Award
} from "lucide-react";

interface PropertyData {
  property_id: number;
  property_name: string;
  property_type: string;
  address: string;
  total_units: number;
  active_leases: number;
  occupancy_rate: number;
  total_revenue: number;
  total_expenses: number;
  noi: number;
  noi_margin: number;
  revenue_per_unit: number;
  expenses_per_unit: number;
  noi_per_unit: number;
  estimated_value: number;
  roi: number;
  budget_comparison?: any;
}

interface PortfolioSummary {
  total_properties: number;
  total_units: number;
  total_active_leases: number;
  avg_occupancy_rate: number;
  total_revenue: number;
  total_expenses: number;
  portfolio_noi: number;
  avg_noi_margin: number;
  avg_roi: number;
}

interface ProfitabilityData {
  period: {
    from: string;
    to: string;
  };
  portfolio_summary: PortfolioSummary;
  property_breakdown: PropertyData[];
  insights: {
    top_performers: Array<{
      property_id: number;
      property_name: string;
      noi: number;
      noi_margin: number;
    }>;
    bottom_performers: Array<{
      property_id: number;
      property_name: string;
      noi: number;
      noi_margin: number;
    }>;
  };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function PropertyProfitability() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProfitabilityData | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/finance/reports/property-profitability', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load report');
      }

      const result = await response.json();
      setData(result.data);

      toast({
        title: "Report Generated",
        description: `Analyzed ${result.data.portfolio_summary.total_properties} properties`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load property profitability report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;

    const csvContent = [
      ['Property', 'Units', 'Occupancy %', 'Revenue', 'Expenses', 'NOI', 'NOI Margin %', 'ROI %'],
      ...data.property_breakdown.map(prop => [
        prop.property_name,
        prop.total_units,
        prop.occupancy_rate,
        prop.total_revenue,
        prop.total_expenses,
        prop.noi,
        prop.noi_margin,
        prop.roi
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `property-profitability-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getNoiChartData = () => {
    if (!data) return [];
    return data.property_breakdown.map(prop => ({
      name: prop.property_name.length > 15 ? prop.property_name.substring(0, 15) + '...' : prop.property_name,
      noi: prop.noi,
      revenue: prop.total_revenue,
      expenses: prop.total_expenses
    }));
  };

  const getOccupancyPieData = () => {
    if (!data) return [];
    return data.property_breakdown.map((prop, index) => ({
      name: prop.property_name,
      value: prop.occupancy_rate,
      color: COLORS[index % COLORS.length]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Property Profitability</h2>
          <p className="text-muted-foreground">
            NOI, ROI, and per-unit financial performance analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadReport} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={!data}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      {data && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Portfolio NOI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data.portfolio_summary.portfolio_noi)}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.portfolio_summary.avg_noi_margin.toFixed(1)}% margin
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.portfolio_summary.total_revenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.portfolio_summary.total_properties} properties
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Occupancy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.portfolio_summary.avg_occupancy_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {data.portfolio_summary.total_active_leases} / {data.portfolio_summary.total_units} units
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg ROI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {data.portfolio_summary.avg_roi.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">Annual return</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(data.portfolio_summary.total_expenses)}
              </div>
              <p className="text-xs text-muted-foreground">Operating costs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top & Bottom Performers */}
      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                <CardTitle>Top Performers</CardTitle>
              </div>
              <CardDescription>Highest NOI properties</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.insights.top_performers.map((prop, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <div className="font-medium">{prop.property_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {prop.noi_margin.toFixed(1)}% margin
                      </div>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(prop.noi)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <CardTitle>Needs Improvement</CardTitle>
              </div>
              <CardDescription>Properties with lowest NOI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.insights.bottom_performers.map((prop, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <div className="font-medium">{prop.property_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {prop.noi_margin.toFixed(1)}% margin
                      </div>
                    </div>
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(prop.noi)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* NOI Comparison Chart */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Net Operating Income by Property</CardTitle>
            <CardDescription>Revenue vs Expenses comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={getNoiChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                <Bar dataKey="noi" fill="#3b82f6" name="NOI" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Occupancy Pie Chart */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Rate by Property</CardTitle>
            <CardDescription>Unit occupancy distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getOccupancyPieData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getOccupancyPieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Property Table */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Property Breakdown</CardTitle>
            <CardDescription>Comprehensive financial metrics per property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Property</th>
                    <th className="px-4 py-3 text-center">Units</th>
                    <th className="px-4 py-3 text-center">Occupancy</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Expenses</th>
                    <th className="px-4 py-3 text-right">NOI</th>
                    <th className="px-4 py-3 text-center">NOI Margin</th>
                    <th className="px-4 py-3 text-center">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {data.property_breakdown.map((prop, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{prop.property_name}</div>
                        <div className="text-xs text-muted-foreground">{prop.property_type}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {prop.active_leases} / {prop.total_units}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          prop.occupancy_rate >= 90 ? 'bg-green-100 text-green-800' :
                          prop.occupancy_rate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {prop.occupancy_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {formatCurrency(prop.total_revenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        {formatCurrency(prop.total_expenses)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(prop.noi)}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        <span className={prop.noi_margin >= 50 ? 'text-green-600' : prop.noi_margin >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                          {prop.noi_margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-600">
                        {prop.roi.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && !data && (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Analyzing property performance...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
