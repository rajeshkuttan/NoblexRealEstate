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
  Legend
} from "recharts";
import { 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Shield,
  TrendingDown,
  Clock
} from "lucide-react";

interface Invoice {
  id: number;
  invoiceNumber: string;
  tenant_id: number;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  days_overdue: number;
  risk_score: number;
  risk_level: string;
  collection_probability: number;
  recommended_action: string;
}

interface AgingData {
  current: Invoice[];
  days_30: Invoice[];
  days_60: Invoice[];
  days_90: Invoice[];
  days_90_plus: Invoice[];
}

interface Summary {
  total_invoices: number;
  total_outstanding: number;
  current_count: number;
  overdue_count: number;
  high_risk_count: number;
}

interface Recommendation {
  type: string;
  priority: string;
  message: string;
  action: string;
  affected_invoices: string[];
}

interface ARAgingData {
  aging_buckets: AgingData;
  totals: {
    current: number;
    days_30: number;
    days_60: number;
    days_90: number;
    days_90_plus: number;
    total: number;
    risk_weighted_amount: number;
    expected_collection: number;
  };
  summary: Summary;
  recommendations: Recommendation[];
}

export function EnhancedARAgingReport() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ARAgingData | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/finance/reports/ar-aging-enhanced', {
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
        description: `Analyzed ${result.data.summary.total_invoices} outstanding invoices`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load AR aging report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;

    const allInvoices = [
      ...data.aging_buckets.current.map(inv => ({ ...inv, bucket: 'Current' })),
      ...data.aging_buckets.days_30.map(inv => ({ ...inv, bucket: '1-30 Days' })),
      ...data.aging_buckets.days_60.map(inv => ({ ...inv, bucket: '31-60 Days' })),
      ...data.aging_buckets.days_90.map(inv => ({ ...inv, bucket: '61-90 Days' })),
      ...data.aging_buckets.days_90_plus.map(inv => ({ ...inv, bucket: '90+ Days' }))
    ];

    const csvContent = [
      ['Invoice #', 'Bucket', 'Days Overdue', 'Amount', 'Risk Level', 'Collection %', 'Action'],
      ...allInvoices.map(inv => [
        inv.invoiceNumber,
        inv.bucket,
        inv.days_overdue,
        inv.total_amount,
        inv.risk_level,
        inv.collection_probability,
        inv.recommended_action
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ar-aging-report-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0
    }).format(value);
  };

  const getRiskBadge = (level: string) => {
    const styles = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return styles[level as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const getAgingChartData = () => {
    if (!data) return [];
    return [
      { bucket: 'Current', amount: data.totals.current, count: data.aging_buckets.current.length },
      { bucket: '1-30 Days', amount: data.totals.days_30, count: data.aging_buckets.days_30.length },
      { bucket: '31-60 Days', amount: data.totals.days_60, count: data.aging_buckets.days_60.length },
      { bucket: '61-90 Days', amount: data.totals.days_90, count: data.aging_buckets.days_90.length },
      { bucket: '90+ Days', amount: data.totals.days_90_plus, count: data.aging_buckets.days_90_plus.length }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Enhanced AR Aging Report</h2>
          <p className="text-muted-foreground">
            Risk-scored accounts receivable with collection probability
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

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.totals.total)}
              </div>
              <p className="text-xs text-muted-foreground">{data.summary.total_invoices} invoices</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Current</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data.totals.current)}
              </div>
              <p className="text-xs text-muted-foreground">{data.summary.current_count} invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(data.totals.days_30 + data.totals.days_60 + data.totals.days_90 + data.totals.days_90_plus)}
              </div>
              <p className="text-xs text-muted-foreground">{data.summary.overdue_count} invoices</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {data.summary.high_risk_count}
              </div>
              <p className="text-xs text-red-600">Invoices requiring action</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Expected Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(data.totals.expected_collection)}
              </div>
              <p className="text-xs text-green-600">Based on risk analysis</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {data && data.recommendations.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <CardTitle>Collection Recommendations</CardTitle>
            </div>
            <CardDescription>Prioritized actions to improve collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recommendations.map((rec, index) => (
                <div key={index} className="flex gap-3 p-4 border rounded-lg">
                  <div>{getPriorityIcon(rec.priority)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{rec.message}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rec.action}</p>
                    {rec.affected_invoices.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Invoices: {rec.affected_invoices.slice(0, 5).join(', ')}
                        {rec.affected_invoices.length > 5 && ` and ${rec.affected_invoices.length - 5} more`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aging Pyramid Chart */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Aging Pyramid</CardTitle>
            <CardDescription>Distribution of receivables by age</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={getAgingChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="amount" fill="#3b82f6" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Invoice Tables by Bucket */}
      {data && (
        <>
          {(['current', 'days_30', 'days_60', 'days_90', 'days_90_plus'] as const).map((bucket) => {
            const bucketData = data.aging_buckets[bucket];
            if (bucketData.length === 0) return null;

            const bucketNames = {
              current: 'Current (Not Yet Due)',
              days_30: '1-30 Days Overdue',
              days_60: '31-60 Days Overdue',
              days_90: '61-90 Days Overdue',
              days_90_plus: '90+ Days Overdue'
            };

            return (
              <Card key={bucket}>
                <CardHeader>
                  <CardTitle>{bucketNames[bucket]}</CardTitle>
                  <CardDescription>{bucketData.length} invoices totaling {formatCurrency(data.totals[bucket])}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left">Invoice #</th>
                          <th className="px-4 py-3 text-center">Days Overdue</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-center">Risk Level</th>
                          <th className="px-4 py-3 text-center">Risk Score</th>
                          <th className="px-4 py-3 text-center">Collection %</th>
                          <th className="px-4 py-3 text-left">Recommended Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bucketData.map((invoice, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={invoice.days_overdue > 0 ? 'text-red-600 font-semibold' : ''}>
                                {invoice.days_overdue}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(invoice.total_amount)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskBadge(invoice.risk_level)}`}>
                                {invoice.risk_level.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">
                              {invoice.risk_score}/100
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-semibold ${
                                invoice.collection_probability >= 80 ? 'text-green-600' :
                                invoice.collection_probability >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {invoice.collection_probability}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {invoice.recommended_action}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* Loading State */}
      {loading && !data && (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Analyzing receivables with risk scoring...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
