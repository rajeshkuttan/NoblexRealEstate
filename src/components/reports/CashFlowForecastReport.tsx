import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  Download, 
  RefreshCw, 
  Calendar,
  Target,
  AlertCircle,
  CheckCircle,
  TrendingDown
} from "lucide-react";

interface MonthlyProjection {
  month: string;
  projected_income: number;
  projected_expenses: number;
  net_cash_flow: number;
  cumulative_cash: number;
  confidence_level: number;
}

interface Scenario {
  month_index: number;
  projected_income: number;
  projected_expenses: number;
  net_cash_flow: number;
  confidence_level: number;
}

interface ForecastData {
  forecast_id: string | null;
  generated_at: string;
  accuracy_percentage: number;
  forecast_period: number;
  scenario: string;
  monthly_projections: MonthlyProjection[];
  scenarios: {
    optimistic: Scenario[];
    base: Scenario[];
    pessimistic: Scenario[];
  };
  model_info: {
    r_squared: number;
    mse: number;
    training_samples: number;
  };
}

export function CashFlowForecastReport() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<'optimistic' | 'base' | 'pessimistic'>('base');
  const [forecastPeriod, setForecastPeriod] = useState(12);

  useEffect(() => {
    loadForecast();
  }, []);

  const loadForecast = async () => {
    setLoading(true);
    try {
      // Mock API call - replace with actual API
      const response = await fetch('/api/finance/forecasts/cash-flow-forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          forecast_period: forecastPeriod,
          scenario: 'base'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate forecast');
      }

      const result = await response.json();
      setForecastData(result.data.forecast_details);

      toast({
        title: "Forecast Generated",
        description: `12-month cash flow forecast generated with ${result.data.forecast_details.accuracy_percentage}% accuracy`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate cash flow forecast",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!forecastData) return;

    const csvContent = [
      ['Month', 'Projected Income', 'Projected Expenses', 'Net Cash Flow', 'Cumulative Cash'],
      ...forecastData.monthly_projections.map(proj => [
        proj.month,
        proj.projected_income,
        proj.projected_expenses,
        proj.net_cash_flow,
        proj.cumulative_cash
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-forecast-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getScenarioData = () => {
    if (!forecastData) return [];
    
    const scenarios = forecastData.scenarios[selectedScenario];
    return scenarios.map((scenario, index) => ({
      month: forecastData.monthly_projections[index]?.month || `Month ${index + 1}`,
      income: scenario.projected_income,
      expenses: scenario.projected_expenses,
      net: scenario.net_cash_flow
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cash Flow Forecast</h2>
          <p className="text-muted-foreground">
            ML-based 12-month cash flow projections with scenario analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadForecast} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button onClick={handleExport} disabled={!forecastData}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Model Info Cards */}
      {forecastData && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Forecast Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forecastData.accuracy_percentage}%</div>
              <p className="text-xs text-muted-foreground">Model R-squared: {forecastData.model_info.r_squared.toFixed(3)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Training Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forecastData.model_info.training_samples}</div>
              <p className="text-xs text-muted-foreground">Historical months analyzed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Forecast Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forecastData.forecast_period} months</div>
              <p className="text-xs text-muted-foreground">Generated {new Date(forecastData.generated_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ending Cash</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(forecastData.monthly_projections[forecastData.monthly_projections.length - 1]?.cumulative_cash || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {forecastData.monthly_projections[forecastData.monthly_projections.length - 1]?.net_cash_flow >= 0 ? (
                  <span className="text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Positive trend
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Declining trend
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scenario Selector */}
      {forecastData && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Scenario Analysis</CardTitle>
                <CardDescription>View optimistic, base, or pessimistic projections</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={selectedScenario === 'optimistic' ? 'default' : 'outline'}
                  onClick={() => setSelectedScenario('optimistic')}
                >
                  Optimistic
                </Button>
                <Button
                  size="sm"
                  variant={selectedScenario === 'base' ? 'default' : 'outline'}
                  onClick={() => setSelectedScenario('base')}
                >
                  Base
                </Button>
                <Button
                  size="sm"
                  variant={selectedScenario === 'pessimistic' ? 'default' : 'outline'}
                  onClick={() => setSelectedScenario('pessimistic')}
                >
                  Pessimistic
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={getScenarioData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stackId="1" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                  name="Projected Income"
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stackId="2" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.6}
                  name="Projected Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Cash Flow Trend */}
      {forecastData && (
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Cash Flow</CardTitle>
            <CardDescription>Track your cash position over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={forecastData.monthly_projections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="net_cash_flow" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Net Cash Flow"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulative_cash" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Cumulative Cash"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly Breakdown Table */}
      {forecastData && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Projections</CardTitle>
            <CardDescription>Detailed month-by-month breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Month</th>
                    <th className="px-4 py-3 text-right">Income</th>
                    <th className="px-4 py-3 text-right">Expenses</th>
                    <th className="px-4 py-3 text-right">Net Cash Flow</th>
                    <th className="px-4 py-3 text-right">Cumulative</th>
                    <th className="px-4 py-3 text-center">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.monthly_projections.map((proj, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3">{proj.month}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {formatCurrency(proj.projected_income)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        {formatCurrency(proj.projected_expenses)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        <span className={proj.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(proj.net_cash_flow)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(proj.cumulative_cash)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {(proj.confidence_level * 100).toFixed(0)}%
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

      {/* Loading State */}
      {loading && !forecastData && (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Generating ML-based forecast...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
