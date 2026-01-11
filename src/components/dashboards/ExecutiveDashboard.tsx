import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
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
  Cell,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Building,
  AlertCircle,
  Award,
  Target,
  Zap,
  Activity,
  RefreshCw
} from "lucide-react";

interface KPI {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
}

interface FinancialHealth {
  score: number;
  status: string;
  factors: Array<{
    name: string;
    score: number;
    status: string;
  }>;
}

interface AIInsight {
  type: string;
  priority: string;
  message: string;
  impact: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ExecutiveDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState(85);
  
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate loading multiple data sources
      await Promise.all([
        // loadKPIs(),
        // loadFinancialHealth(),
        // loadInsights()
      ]);
      
      // Simulated delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      notation: value > 1000000 ? 'compact' : 'standard',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Mock data - replace with actual API calls
  const kpis: KPI[] = [
    {
      label: "Portfolio NOI",
      value: formatCurrency(12500000),
      change: 8.5,
      trend: 'up',
      icon: DollarSign
    },
    {
      label: "Avg Occupancy",
      value: "92.3%",
      change: 2.1,
      trend: 'up',
      icon: Building
    },
    {
      label: "DSO (Days)",
      value: 32,
      change: -5.2,
      trend: 'up',
      icon: Activity
    },
    {
      label: "Portfolio ROI",
      value: "11.8%",
      change: 1.3,
      trend: 'up',
      icon: TrendingUp
    }
  ];

  const financialTrend = [
    { month: 'Jan', revenue: 2800000, expenses: 1650000, noi: 1150000 },
    { month: 'Feb', revenue: 2950000, expenses: 1700000, noi: 1250000 },
    { month: 'Mar', revenue: 3100000, expenses: 1750000, noi: 1350000 },
    { month: 'Apr', revenue: 3050000, expenses: 1720000, noi: 1330000 },
    { month: 'May', revenue: 3200000, expenses: 1800000, noi: 1400000 },
    { month: 'Jun', revenue: 3300000, expenses: 1850000, noi: 1450000 }
  ];

  const portfolioMix = [
    { name: 'Residential', value: 45, amount: 15000000 },
    { name: 'Commercial', value: 30, amount: 10000000 },
    { name: 'Mixed Use', value: 15, amount: 5000000 },
    { name: 'Retail', value: 10, amount: 3000000 }
  ];

  const aiInsights: AIInsight[] = [
    {
      type: 'opportunity',
      priority: 'high',
      message: 'Property Marina Tower showing 15% revenue growth - consider similar investments',
      impact: 'AED 450K potential annual increase'
    },
    {
      type: 'risk',
      priority: 'medium',
      message: '3 properties with declining occupancy trends detected',
      impact: 'AED 280K potential revenue risk'
    },
    {
      type: 'optimization',
      priority: 'high',
      message: 'Early payment discounts could save AED 125K annually',
      impact: 'AED 125K cost reduction opportunity'
    }
  ];

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Executive Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time portfolio performance and strategic insights
          </p>
        </div>
        <Button onClick={loadDashboardData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Financial Health Score */}
      <Card className={getHealthBgColor(healthScore)}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Financial Health Score</div>
              <div className={`text-5xl font-bold ${getHealthColor(healthScore)}`}>
                {healthScore}
                <span className="text-2xl">/100</span>
              </div>
              <div className="text-sm mt-2">
                <span className={healthScore >= 80 ? 'text-green-600' : 'text-yellow-600'}>
                  {healthScore >= 80 ? 'Excellent' : 'Good'} - Portfolio performing above industry average
                </span>
              </div>
            </div>
            <div className="text-right">
              <Award className={`h-16 w-16 ${healthScore >= 80 ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {kpi.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-xs font-medium ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(kpi.change).toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI-Powered Insights */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <CardTitle>AI-Powered Strategic Insights</CardTitle>
          </div>
          <CardDescription>Machine learning analysis and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {aiInsights.map((insight, index) => (
              <div key={index} className="flex gap-3 p-4 bg-white border rounded-lg">
                <div className="flex-shrink-0">
                  {insight.type === 'opportunity' ? (
                    <Target className="h-5 w-5 text-green-600" />
                  ) : insight.type === 'risk' ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      insight.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {insight.priority.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium">{insight.message}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Impact: {insight.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue & NOI Trend */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Financial Performance Trend</CardTitle>
            <CardDescription>Last 6 months revenue and NOI</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={financialTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Revenue" />
                <Area type="monotone" dataKey="noi" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="NOI" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Mix</CardTitle>
            <CardDescription>Asset allocation by property type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={portfolioMix}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {portfolioMix.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [
                  `${value}% (${formatCurrency((props.payload as any).amount)})`,
                  name
                ]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently accessed reports and tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="justify-start">
              <DollarSign className="h-4 w-4 mr-2" />
              Cash Flow Forecast
            </Button>
            <Button variant="outline" className="justify-start">
              <Building className="h-4 w-4 mr-2" />
              Property Performance
            </Button>
            <Button variant="outline" className="justify-start">
              <Activity className="h-4 w-4 mr-2" />
              AR Aging Report
            </Button>
            <Button variant="outline" className="justify-start">
              <Target className="h-4 w-4 mr-2" />
              Budget vs Actual
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
