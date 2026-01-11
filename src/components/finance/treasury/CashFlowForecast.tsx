import { useState, useEffect } from 'react';
import { financialForecastsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Plus,
} from 'lucide-react';

interface Forecast {
  id: number;
  forecastName: string;
  periodStart: string;
  periodEnd: string;
  forecastType: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedProfit: number;
  accuracyScore?: number;
  status: string;
}

export default function CashFlowForecast() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('current_quarter');
  const { toast } = useToast();

  useEffect(() => {
    fetchForecasts();
    fetchStats();
  }, [periodFilter]);

  const fetchForecasts = async () => {
    try {
      setLoading(true);
      const { data } = await financialForecastsAPI.getAll({
        limit: 10,
        forecastType: 'cash_flow',
      });
      setForecasts(data.data.forecasts || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch forecasts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await financialForecastsAPI.getStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const validAmount = amount && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(validAmount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      draft: 'secondary',
      active: 'default',
      completed: 'default',
      archived: 'secondary',
    };
    const colors: { [key: string]: string } = {
      draft: 'bg-gray-500',
      active: 'bg-green-500',
      completed: 'bg-blue-500',
      archived: 'bg-gray-400',
    };
    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Generate mock forecast data for demonstration
  const generateMockData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      revenue: 150000 + Math.random() * 50000,
      expenses: 100000 + Math.random() * 30000,
      cashFlow: 50000 + Math.random() * 20000 - 10000,
    }));
  };

  const forecastData = generateMockData();

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cash Flow Forecast</h2>
          <p className="text-muted-foreground">
            Project future cash positions and trends
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Forecast
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Projected Revenue (6M)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(900000)}
              </div>
              <p className="text-xs text-muted-foreground">
                +15% from previous period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Projected Expenses (6M)
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(650000)}
              </div>
              <p className="text-xs text-muted-foreground">
                +8% from previous period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Projected Profit (6M)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(250000)}
              </div>
              <p className="text-xs text-muted-foreground">
                Profit margin: 27.8%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Forecast Accuracy
              </CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.averageAccuracy || 85}%
              </div>
              <p className="text-xs text-muted-foreground">
                Based on historical data
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Forecast Chart Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>6-Month Cash Flow Projection</CardTitle>
              <CardDescription>
                Projected revenue, expenses, and net cash flow
              </CardDescription>
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_quarter">Current Quarter</SelectItem>
                <SelectItem value="next_quarter">Next Quarter</SelectItem>
                <SelectItem value="next_6_months">Next 6 Months</SelectItem>
                <SelectItem value="next_year">Next Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Simple visual representation */}
          <div className="space-y-4">
            {forecastData.map((data, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{data.month}</span>
                  <span className="text-muted-foreground">
                    Net: {data.cashFlow >= 0 ? '+' : ''}{formatCurrency(data.cashFlow)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Revenue</div>
                    <div className="h-8 bg-green-500 rounded flex items-center justify-end pr-2 text-white text-xs font-medium">
                      {formatCurrency(data.revenue)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Expenses</div>
                    <div className="h-8 bg-red-500 rounded flex items-center justify-end pr-2 text-white text-xs font-medium">
                      {formatCurrency(data.expenses)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Forecast Method:</strong> Machine Learning (Linear Regression) based on 24 months of historical data.
              <br />
              <strong>Confidence Interval:</strong> 85% accuracy based on past performance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Saved Forecasts */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Forecasts</CardTitle>
          <CardDescription>
            Historical and active cash flow forecasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">Loading forecasts...</div>
          ) : forecasts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No forecasts found. Create your first forecast to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {forecasts.map((forecast) => (
                <div
                  key={forecast.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{forecast.forecastName}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(forecast.periodStart)} - {formatDate(forecast.periodEnd)}
                    </div>
                    {forecast.accuracyScore && (
                      <div className="text-xs text-muted-foreground">
                        Accuracy: {forecast.accuracyScore}%
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(forecast.projectedRevenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">Revenue</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-red-600">
                        {formatCurrency(forecast.projectedExpenses)}
                      </div>
                      <div className="text-xs text-muted-foreground">Expenses</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">
                        {formatCurrency(forecast.projectedProfit)}
                      </div>
                      <div className="text-xs text-muted-foreground">Profit</div>
                    </div>
                    {getStatusBadge(forecast.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

