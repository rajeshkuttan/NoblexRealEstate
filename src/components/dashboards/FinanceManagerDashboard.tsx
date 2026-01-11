import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Plus,
  FileText,
  Building
} from "lucide-react";

interface ActionItem {
  id: number;
  type: string;
  priority: string;
  title: string;
  dueDate: string;
  amount?: number;
}

interface QuickStat {
  label: string;
  value: string | number;
  status: 'good' | 'warning' | 'alert';
  icon: any;
}

export function FinanceManagerDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
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
      maximumFractionDigits: 0
    }).format(value);
  };

  // Mock data - replace with actual API calls
  const cashMetrics: QuickStat[] = [
    { label: "Current Balance", value: formatCurrency(8500000), status: 'good', icon: DollarSign },
    { label: "Available Credit", value: formatCurrency(2000000), status: 'good', icon: CreditCard },
    { label: "Pending Receipts", value: formatCurrency(1250000), status: 'warning', icon: Clock },
    { label: "Pending Payments", value: formatCurrency(850000), status: 'alert', icon: AlertCircle }
  ];

  const receivablesMetrics: QuickStat[] = [
    { label: "Total AR", value: formatCurrency(5600000), status: 'good', icon: FileText },
    { label: "Current", value: formatCurrency(4200000), status: 'good', icon: CheckCircle },
    { label: "Overdue", value: formatCurrency(1400000), status: 'alert', icon: AlertCircle },
    { label: "DSO", value: "32 days", status: 'good', icon: Clock }
  ];

  const payablesMetrics: QuickStat[] = [
    { label: "Total AP", value: formatCurrency(2800000), status: 'good', icon: FileText },
    { label: "Due This Week", value: formatCurrency(450000), status: 'warning', icon: Clock },
    { label: "Overdue", value: formatCurrency(85000), status: 'alert', icon: AlertCircle },
    { label: "DPO", value: "28 days", status: 'good', icon: Clock }
  ];

  const budgetMetrics: QuickStat[] = [
    { label: "YTD Revenue", value: "92% of budget", status: 'good', icon: TrendingUp },
    { label: "YTD Expenses", value: "88% of budget", status: 'good', icon: CheckCircle },
    { label: "Over Budget", value: "3 categories", status: 'warning', icon: AlertCircle },
    { label: "Variance", value: formatCurrency(280000), status: 'good', icon: DollarSign }
  ];

  const actionItems: ActionItem[] = [
    {
      id: 1,
      type: 'payment',
      priority: 'high',
      title: 'Process vendor payment - ABC Maintenance',
      dueDate: 'Today',
      amount: 125000
    },
    {
      id: 2,
      type: 'collection',
      priority: 'high',
      title: 'Follow up on overdue invoice #INV-2024-0854',
      dueDate: 'Today',
      amount: 85000
    },
    {
      id: 3,
      type: 'reconciliation',
      priority: 'medium',
      title: 'Bank reconciliation - Emirates NBD',
      dueDate: 'Tomorrow'
    },
    {
      id: 4,
      type: 'approval',
      priority: 'medium',
      title: 'Approve budget revision - Marina Tower',
      dueDate: 'This Week',
      amount: 450000
    },
    {
      id: 5,
      type: 'report',
      priority: 'low',
      title: 'Monthly financial report preparation',
      dueDate: 'Next Week'
    }
  ];

  const weeklyTrend = [
    { day: 'Mon', receipts: 450000, payments: 280000 },
    { day: 'Tue', receipts: 520000, payments: 310000 },
    { day: 'Wed', receipts: 380000, payments: 420000 },
    { day: 'Thu', receipts: 610000, payments: 290000 },
    { day: 'Fri', receipts: 490000, payments: 380000 }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'alert': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const renderQuadrant = (title: string, metrics: QuickStat[], quadrantKey: string) => (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedQuadrant(quadrantKey)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                </div>
                <span className={`text-sm font-semibold ${getStatusColor(metric.status)}`}>
                  {metric.value}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Finance Manager Dashboard</h2>
          <p className="text-muted-foreground">
            4-quadrant operational view with action items
          </p>
        </div>
        <Button onClick={loadDashboardData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Action Items */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>Tasks requiring your attention ({actionItems.length})</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {actionItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-2 h-2 rounded-full ${
                    item.priority === 'high' ? 'bg-red-500' :
                    item.priority === 'medium' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{item.dueDate}</span>
                      {item.amount && (
                        <span className="text-xs font-semibold">{formatCurrency(item.amount)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost">Complete</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4-Quadrant Layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {renderQuadrant("Cash Position", cashMetrics, "cash")}
        {renderQuadrant("Receivables", receivablesMetrics, "receivables")}
        {renderQuadrant("Payables", payablesMetrics, "payables")}
        {renderQuadrant("Budget Status", budgetMetrics, "budget")}
      </div>

      {/* Weekly Cash Flow Trend */}
      <Card>
        <CardHeader>
          <CardTitle>This Week's Cash Flow</CardTitle>
          <CardDescription>Daily receipts and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="receipts" fill="#10b981" name="Receipts" />
              <Bar dataKey="payments" fill="#ef4444" name="Payments" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Entry Forms */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Payment Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input placeholder="Vendor name" />
              <Input placeholder="Amount" type="number" />
              <Button className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Receipt Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input placeholder="Tenant name" />
              <Input placeholder="Amount" type="number" />
              <Button className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Record Receipt
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Quick Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input placeholder="Description" />
              <Input placeholder="Amount" type="number" />
              <Button className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Record Transaction
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Notifications */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">Payment processed for ABC Maintenance - AED 125,000</span>
              <span className="text-xs text-muted-foreground ml-auto">2 min ago</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">Receipt recorded from Marina Tower tenant - AED 85,000</span>
              <span className="text-xs text-muted-foreground ml-auto">15 min ago</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-muted-foreground">Invoice INV-2024-0891 is due in 3 days</span>
              <span className="text-xs text-muted-foreground ml-auto">1 hour ago</span>
            </div>
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
