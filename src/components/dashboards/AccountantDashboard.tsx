import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  Target,
  ClipboardCheck
} from "lucide-react";

interface ChecklistItem {
  id: number;
  task: string;
  completed: boolean;
  priority: string;
  dueDate: string;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  status: string;
}

interface BatchProcess {
  id: number;
  name: string;
  count: number;
  totalAmount: number;
  status: string;
}

export function AccountantDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dailyChecklist, setDailyChecklist] = useState<ChecklistItem[]>([
    { id: 1, task: "Review overnight bank transactions", completed: true, priority: "high", dueDate: "Daily" },
    { id: 2, task: "Process pending payment approvals", completed: true, priority: "high", dueDate: "Daily" },
    { id: 3, task: "Reconcile petty cash", completed: false, priority: "medium", dueDate: "Daily" },
    { id: 4, task: "Review expense submissions", completed: false, priority: "medium", dueDate: "Daily" },
    { id: 5, task: "Update accounts payable aging", completed: false, priority: "low", dueDate: "Daily" }
  ]);

  const [monthEndChecklist, setMonthEndChecklist] = useState<ChecklistItem[]>([
    { id: 1, task: "Bank reconciliation - All accounts", completed: false, priority: "high", dueDate: "Jan 31" },
    { id: 2, task: "Accrue outstanding expenses", completed: false, priority: "high", dueDate: "Jan 31" },
    { id: 3, task: "Fixed asset depreciation entries", completed: false, priority: "medium", dueDate: "Jan 31" },
    { id: 4, task: "Prepayment adjustments", completed: false, priority: "medium", dueDate: "Jan 31" },
    { id: 5, task: "Generate trial balance", completed: false, priority: "high", dueDate: "Feb 1" },
    { id: 6, task: "Prepare financial statements", completed: false, priority: "high", dueDate: "Feb 2" },
    { id: 7, task: "Management reports distribution", completed: false, priority: "medium", dueDate: "Feb 3" }
  ]);

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

  const toggleChecklistItem = (listType: 'daily' | 'monthEnd', id: number) => {
    if (listType === 'daily') {
      setDailyChecklist(prev =>
        prev.map(item =>
          item.id === id ? { ...item, completed: !item.completed } : item
        )
      );
    } else {
      setMonthEndChecklist(prev =>
        prev.map(item =>
          item.id === id ? { ...item, completed: !item.completed } : item
        )
      );
    }
  };

  // Mock data
  const pendingApprovals: Transaction[] = [
    { id: 1, date: '2026-01-11', description: 'Vendor Invoice - XYZ Services', amount: 125000, type: 'invoice', status: 'pending' },
    { id: 2, date: '2026-01-11', description: 'Expense Claim - John Doe', amount: 3500, type: 'expense', status: 'pending' },
    { id: 3, date: '2026-01-10', description: 'Budget Revision - Marina Tower', amount: 450000, type: 'budget', status: 'pending' },
    { id: 4, date: '2026-01-10', description: 'Payment Request - ABC Maintenance', amount: 85000, type: 'payment', status: 'pending' }
  ];

  const reconciliationTasks = [
    { account: 'Emirates NBD - Current Account', status: 'pending', lastReconciled: '2026-01-05', balance: 8500000 },
    { account: 'ADCB - Savings Account', status: 'completed', lastReconciled: '2026-01-10', balance: 2000000 },
    { account: 'Mashreq Bank - Operations', status: 'pending', lastReconciled: '2026-01-03', balance: 1250000 },
    { account: 'Petty Cash - Main Office', status: 'pending', lastReconciled: '2026-01-08', balance: 15000 }
  ];

  const batchProcesses: BatchProcess[] = [
    { id: 1, name: 'Monthly Rent Invoices', count: 45, totalAmount: 2800000, status: 'ready' },
    { id: 2, name: 'Vendor Payments', count: 18, totalAmount: 650000, status: 'ready' },
    { id: 3, name: 'Depreciation Entries', count: 12, totalAmount: 85000, status: 'scheduled' }
  ];

  const todayStats = [
    { label: 'Transactions Processed', value: '127', icon: FileText, color: 'text-blue-600' },
    { label: 'Approvals Pending', value: '4', icon: Clock, color: 'text-yellow-600' },
    { label: 'Reconciliations Due', value: '3', icon: Target, color: 'text-red-600' },
    { label: 'Daily Tasks Complete', value: '40%', icon: CheckCircle, color: 'text-green-600' }
  ];

  const calculateProgress = (checklist: ChecklistItem[]) => {
    const completed = checklist.filter(item => item.completed).length;
    return Math.round((completed / checklist.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accountant Dashboard</h2>
          <p className="text-muted-foreground">
            Daily tasks, reconciliations, and month-end checklist
          </p>
        </div>
        <Button onClick={loadDashboardData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Today's Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {todayStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Daily Reconciliation Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daily Reconciliation Tasks</CardTitle>
              <CardDescription>Bank accounts requiring reconciliation</CardDescription>
            </div>
            <Button size="sm">Start Reconciliation</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reconciliationTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {task.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{task.account}</div>
                    <div className="text-xs text-muted-foreground">
                      Last reconciled: {new Date(task.lastReconciled).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{formatCurrency(task.balance)}</div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Checklists */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Checklist */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Checklist</CardTitle>
                <CardDescription>Routine accounting tasks</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{calculateProgress(dailyChecklist)}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyChecklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                     onClick={() => toggleChecklistItem('daily', item.id)}>
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem('daily', item.id)}
                  />
                  <div className="flex-1">
                    <div className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                      {item.task}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.priority === 'high' ? 'bg-red-100 text-red-800' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.priority}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.dueDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Month-End Checklist */}
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Month-End Checklist</CardTitle>
                <CardDescription>January 2026 closing tasks</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">{calculateProgress(monthEndChecklist)}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthEndChecklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer"
                     onClick={() => toggleChecklistItem('monthEnd', item.id)}>
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem('monthEnd', item.id)}
                  />
                  <div className="flex-1">
                    <div className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                      {item.task}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.priority === 'high' ? 'bg-red-100 text-red-800' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.priority}
                      </span>
                      <span className="text-xs text-muted-foreground">Due: {item.dueDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Approval Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction Approval Queue</CardTitle>
              <CardDescription>Items pending your review ({pendingApprovals.length})</CardDescription>
            </div>
            <Button size="sm" variant="outline">Approve All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map((txn) => (
                  <tr key={txn.id} className="border-t">
                    <td className="px-4 py-3">{new Date(txn.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium">{txn.description}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(txn.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="ghost" className="text-green-600">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600">
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Batch Processing Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Processing Tools</CardTitle>
          <CardDescription>Bulk operations and recurring entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {batchProcesses.map((batch) => (
              <div key={batch.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <ClipboardCheck className="h-5 w-5 text-blue-600" />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    batch.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {batch.status}
                  </span>
                </div>
                <h4 className="font-semibold text-sm mb-2">{batch.name}</h4>
                <div className="space-y-1 text-sm text-muted-foreground mb-3">
                  <div>{batch.count} transactions</div>
                  <div className="font-semibold text-foreground">{formatCurrency(batch.totalAmount)}</div>
                </div>
                <Button size="sm" className="w-full" disabled={batch.status !== 'ready'}>
                  Process Batch
                </Button>
              </div>
            ))}
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
