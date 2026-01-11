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
  LineChart,
  Line
} from "recharts";
import { 
  TrendingUp, 
  Download, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Target,
  TrendingDown,
  AlertTriangle
} from "lucide-react";

interface VarianceData {
  budgeted: number;
  actual: number;
  variance: number;
  variance_percent: number;
}

interface CategoryBreakdown {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_percent: number;
  status: string;
}

interface PropertyComparison {
  property_id: number;
  property_name: string;
  revenue: VarianceData & { budgeted: number; actual: number; variance: number; variance_percent: number };
  expenses: VarianceData & { budgeted: number; actual: number; variance: number; variance_percent: number };
  profit: VarianceData & { budgeted: number; actual: number; variance: number; variance_percent: number };
}

interface Alert {
  type: string;
  severity: string;
  message: string;
  variance_amount: number;
  recommended_action: string;
  category?: string;
}

interface BudgetVsActualData {
  budget_info: {
    budget_id: number;
    budget_name: string;
    period: {
      from: string;
      to: string;
    };
  };
  overall_comparison: {
    revenue: VarianceData;
    expenses: VarianceData;
    profit: VarianceData;
  };
  category_breakdown: CategoryBreakdown[];
  property_comparison: PropertyComparison[] | null;
  alerts: Alert[];
}

export function BudgetVsActualReport() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BudgetVsActualData | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/finance/reports/budget-vs-actual', {
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
        description: `Budget analysis for ${result.data.budget_info.budget_name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load budget vs actual report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;

    const csvContent = [
      ['Metric', 'Budgeted', 'Actual', 'Variance', 'Variance %'],
      ['Revenue', data.overall_comparison.revenue.budgeted, data.overall_comparison.revenue.actual, data.overall_comparison.revenue.variance, data.overall_comparison.revenue.variance_percent],
      ['Expenses', data.overall_comparison.expenses.budgeted, data.overall_comparison.expenses.actual, data.overall_comparison.expenses.variance, data.overall_comparison.expenses.variance_percent],
      ['Profit', data.overall_comparison.profit.budgeted, data.overall_comparison.profit.actual, data.overall_comparison.profit.variance, data.overall_comparison.profit.variance_percent],
      [],
      ['Category Breakdown'],
      ['Category', 'Budgeted', 'Actual', 'Variance', 'Variance %', 'Status'],
      ...data.category_breakdown.map(cat => [cat.category, cat.budgeted, cat.actual, cat.variance, cat.variance_percent, cat.status])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-vs-actual-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (variance < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <CheckCircle className="h-4 w-4 text-blue-600" />;
  };

  const getVarianceColor = (variancePct: number, isRevenue: boolean = false) => {
    if (isRevenue) {
      // For revenue, positive variance is good
      return variancePct >= 0 ? 'text-green-600' : 'text-red-600';
    } else {
      // For expenses, negative variance is good (under budget)
      return variancePct <= 0 ? 'text-green-600' : 'text-red-600';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };
    return styles[severity as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getOverallChartData = () => {
    if (!data) return [];
    return [
      {
        name: 'Revenue',
        budgeted: data.overall_comparison.revenue.budgeted,
        actual: data.overall_comparison.revenue.actual
      },
      {
        name: 'Expenses',
        budgeted: data.overall_comparison.expenses.budgeted,
        actual: data.overall_comparison.expenses.actual
      },
      {
        name: 'Profit',
        budgeted: data.overall_comparison.profit.budgeted,
        actual: data.overall_comparison.profit.actual
      }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Budget vs Actual Report</h2>
          <p className="text-muted-foreground">
            Multi-level variance analysis with alerts
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

      {/* Budget Info */}
      {data && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{data.budget_info.budget_name}</h3>
                <p className="text-sm text-muted-foreground">
                  Period: {new Date(data.budget_info.period.from).toLocaleDateString()} - {new Date(data.budget_info.period.to).toLocaleDateString()}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Comparison Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-green-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                {getVarianceIcon(data.overall_comparison.revenue.variance)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budgeted:</span>
                  <span className="font-medium">{formatCurrency(data.overall_comparison.revenue.budgeted)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual:</span>
                  <span className="font-bold">{formatCurrency(data.overall_comparison.revenue.actual)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Variance:</span>
                    <div className="text-right">
                      <div className={`font-bold ${getVarianceColor(data.overall_comparison.revenue.variance_percent, true)}`}>
                        {formatCurrency(data.overall_comparison.revenue.variance)}
                      </div>
                      <div className={`text-xs ${getVarianceColor(data.overall_comparison.revenue.variance_percent, true)}`}>
                        {data.overall_comparison.revenue.variance_percent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                {getVarianceIcon(data.overall_comparison.expenses.variance)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budgeted:</span>
                  <span className="font-medium">{formatCurrency(data.overall_comparison.expenses.budgeted)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual:</span>
                  <span className="font-bold">{formatCurrency(data.overall_comparison.expenses.actual)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Variance:</span>
                    <div className="text-right">
                      <div className={`font-bold ${getVarianceColor(data.overall_comparison.expenses.variance_percent, false)}`}>
                        {formatCurrency(data.overall_comparison.expenses.variance)}
                      </div>
                      <div className={`text-xs ${getVarianceColor(data.overall_comparison.expenses.variance_percent, false)}`}>
                        {data.overall_comparison.expenses.variance_percent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                {getVarianceIcon(data.overall_comparison.profit.variance)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budgeted:</span>
                  <span className="font-medium">{formatCurrency(data.overall_comparison.profit.budgeted)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual:</span>
                  <span className="font-bold">{formatCurrency(data.overall_comparison.profit.actual)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Variance:</span>
                    <div className="text-right">
                      <div className={`font-bold ${getVarianceColor(data.overall_comparison.profit.variance_percent, true)}`}>
                        {formatCurrency(data.overall_comparison.profit.variance)}
                      </div>
                      <div className={`text-xs ${getVarianceColor(data.overall_comparison.profit.variance_percent, true)}`}>
                        {data.overall_comparison.profit.variance_percent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Variance Alerts */}
      {data && data.alerts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle>Variance Alerts</CardTitle>
            </div>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alerts.map((alert, index) => (
                <div key={index} className="flex gap-3 p-4 border rounded-lg">
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                    alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadge(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="font-semibold">{alert.message}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Variance Amount: {formatCurrency(alert.variance_amount)}
                    </p>
                    <p className="text-sm text-blue-600">{alert.recommended_action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Comparison Chart */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual Overview</CardTitle>
            <CardDescription>Comparative analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={getOverallChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="budgeted" fill="#3b82f6" name="Budgeted" />
                <Bar dataKey="actual" fill="#10b981" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {data && data.category_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Expense variance by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-right">Budgeted</th>
                    <th className="px-4 py-3 text-right">Actual</th>
                    <th className="px-4 py-3 text-right">Variance</th>
                    <th className="px-4 py-3 text-center">Variance %</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.category_breakdown.map((cat, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3 font-medium">{cat.category}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(cat.budgeted)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(cat.actual)}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={getVarianceColor(cat.variance_percent, false)}>
                          {formatCurrency(cat.variance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        <span className={getVarianceColor(cat.variance_percent, false)}>
                          {cat.variance_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          cat.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {cat.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property Comparison */}
      {data && data.property_comparison && data.property_comparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Property-Level Comparison</CardTitle>
            <CardDescription>Budget variance by property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.property_comparison.map((prop, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">{prop.property_name}</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{formatCurrency(prop.revenue.actual)}</span>
                        <span className={`text-xs font-semibold ${getVarianceColor(prop.revenue.variance_percent, true)}`}>
                          {prop.revenue.variance_percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Expenses</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{formatCurrency(prop.expenses.actual)}</span>
                        <span className={`text-xs font-semibold ${getVarianceColor(prop.expenses.variance_percent, false)}`}>
                          {prop.expenses.variance_percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Profit</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{formatCurrency(prop.profit.actual)}</span>
                        <span className={`text-xs font-semibold ${getVarianceColor(prop.profit.variance_percent, true)}`}>
                          {prop.profit.variance_percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
              <p className="mt-4 text-muted-foreground">Analyzing budget performance...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
