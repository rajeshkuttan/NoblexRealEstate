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
  DollarSign,
  Clock,
  TrendingDown,
  Award,
  AlertTriangle
} from "lucide-react";

interface VendorMetric {
  vendor_id: number;
  vendor_name: string;
  payment_terms: number;
  total_invoices: number;
  total_amount_paid: number;
  avg_payment_days: number;
  on_time_percentage: number;
  early_percentage: number;
  late_percentage: number;
  payment_trend: string;
  discount_opportunities: number;
  discount_amount_taken: number;
  discount_amount_missed: number;
  potential_savings: number;
}

interface Summary {
  total_vendors: number;
  total_invoices: number;
  total_spent: number;
  avg_payment_days: number;
  total_discounts_taken: number;
  total_discounts_missed: number;
  potential_annual_savings: number;
}

interface Recommendation {
  type: string;
  priority: string;
  message: string;
  action: string;
  vendors?: string[];
}

interface PaymentAnalysisData {
  summary: Summary;
  vendor_breakdown: VendorMetric[];
  payment_timeline: Array<{
    month: string;
    invoice_count: number;
    total_amount: number;
  }>;
  recommendations: Recommendation[];
}

export function VendorPaymentAnalysis() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaymentAnalysisData | null>(null);

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vendor-invoices/payment-analysis', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load payment analysis');
      }

      const result = await response.json();
      setData(result.data);

      toast({
        title: "Analysis Complete",
        description: `Analyzed ${result.data.summary.total_vendors} vendors and ${result.data.summary.total_invoices} invoices`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load vendor payment analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;

    const csvContent = [
      ['Vendor', 'Total Invoices', 'Total Paid', 'Avg Days', 'On-Time %', 'Trend', 'Potential Savings'],
      ...data.vendor_breakdown.map(vendor => [
        vendor.vendor_name,
        vendor.total_invoices,
        vendor.total_amount_paid,
        vendor.avg_payment_days,
        vendor.on_time_percentage,
        vendor.payment_trend,
        vendor.potential_savings
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-payment-analysis-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      urgent: 'bg-red-200 text-red-900 font-bold'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vendor Payment Analysis</h2>
          <p className="text-muted-foreground">
            Payment patterns, trends, and optimization recommendations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAnalysis} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={!data}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.summary.total_spent)}</div>
              <p className="text-xs text-muted-foreground">{data.summary.total_vendors} vendors</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Payment Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.avg_payment_days} days</div>
              <p className="text-xs text-muted-foreground">{data.summary.total_invoices} invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Discounts Taken</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data.summary.total_discounts_taken)}
              </div>
              <p className="text-xs text-muted-foreground">Savings realized</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">
                {formatCurrency(data.summary.total_discounts_missed)}
              </div>
              <p className="text-xs text-yellow-600">Available through early payment</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {data && data.recommendations.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle>Optimization Recommendations</CardTitle>
            </div>
            <CardDescription>Action items to improve payment efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recommendations.map((rec, index) => (
                <div key={index} className="flex gap-3 p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(rec.priority)}`}>
                        {rec.priority.toUpperCase()}
                      </span>
                      <span className="font-semibold">{rec.message}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rec.action}</p>
                    {rec.vendors && rec.vendors.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Affected vendors: {rec.vendors.slice(0, 3).join(', ')}
                        {rec.vendors.length > 3 && ` and ${rec.vendors.length - 3} more`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Timeline */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Timeline</CardTitle>
            <CardDescription>Monthly payment volume and amounts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.payment_timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="invoice_count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Invoice Count"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="total_amount" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Amount Paid"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Vendor Breakdown Table */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Breakdown</CardTitle>
            <CardDescription>Detailed payment performance by vendor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Vendor</th>
                    <th className="px-4 py-3 text-center">Invoices</th>
                    <th className="px-4 py-3 text-right">Total Paid</th>
                    <th className="px-4 py-3 text-center">Avg Days</th>
                    <th className="px-4 py-3 text-center">On-Time %</th>
                    <th className="px-4 py-3 text-center">Trend</th>
                    <th className="px-4 py-3 text-right">Potential Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vendor_breakdown.map((vendor, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3 font-medium">{vendor.vendor_name}</td>
                      <td className="px-4 py-3 text-center">{vendor.total_invoices}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(vendor.total_amount_paid)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={vendor.avg_payment_days > vendor.payment_terms ? 'text-red-600' : 'text-green-600'}>
                          {vendor.avg_payment_days}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          vendor.on_time_percentage >= 80 ? 'bg-green-100 text-green-800' :
                          vendor.on_time_percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {vendor.on_time_percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getTrendIcon(vendor.payment_trend)}
                          <span className="text-xs">{vendor.payment_trend}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-yellow-700">
                        {vendor.potential_savings > 0 ? formatCurrency(vendor.potential_savings) : '-'}
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
              <p className="mt-4 text-muted-foreground">Analyzing vendor payment patterns...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
