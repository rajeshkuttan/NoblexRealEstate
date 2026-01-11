import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  XCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Calendar,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface StandingOrder {
  id: number;
  orderNumber: string;
  lease: any;
  tenant: any;
  amount: number;
  currency: string;
  frequency: string;
  status: string;
  nextScheduledDate: string;
  totalProcessed: number;
  totalFailed: number;
}

export default function StandingOrderList() {
  const [orders, setOrders] = useState<StandingOrder[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE_URL}/standing-orders`, {
        params: { page, limit: 10, status: statusFilter || undefined },
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(data.data.orders || []);
      setTotalPages(data.data.pagination?.totalPages || 1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch standing orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE_URL}/standing-orders/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleAction = async (action: string, orderId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/standing-orders/${orderId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: 'Success',
        description: `Standing order ${action}d successfully`,
      });
      
      fetchOrders();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to ${action} standing order`,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      active: 'default',
      paused: 'secondary',
      cancelled: 'destructive',
      completed: 'secondary',
      pending_approval: 'secondary',
    };
    
    const colors: { [key: string]: string } = {
      active: 'bg-green-500',
      paused: 'bg-yellow-500',
      cancelled: 'bg-red-500',
      completed: 'bg-blue-500',
      pending_approval: 'bg-orange-500',
    };

    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | undefined | null, currency: string = 'AED') => {
    const validAmount = amount && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency || 'AED',
    }).format(validAmount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: { [key: string]: string } = {
      weekly: 'Weekly',
      bi_weekly: 'Bi-Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      semi_annual: 'Semi-Annual',
      annual: 'Annual',
    };
    return labels[frequency] || frequency;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Standing Orders</h2>
          <p className="text-muted-foreground">
            Manage recurring rent payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchOrders} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Standing Order
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActive}</div>
              <p className="text-xs text-muted-foreground">
                {stats.monthlyRecurringRevenue 
                  ? formatCurrency(stats.monthlyRecurringRevenue, 'AED')
                  : 'AED 0.00'} MRR
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalProcessed} processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paused</CardTitle>
              <Pause className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPaused}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPendingApproval}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting mandate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Standing Orders</CardTitle>
              <CardDescription>
                Automated recurring payment schedules
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No standing orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.tenant?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.lease?.leaseNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(order.amount, order.currency)}</TableCell>
                    <TableCell>{getFrequencyLabel(order.frequency)}</TableCell>
                    <TableCell>
                      {order.nextScheduledDate ? formatDate(order.nextScheduledDate) : 'N/A'}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-green-600">{order.totalProcessed} ✓</span>
                        {order.totalFailed > 0 && (
                          <span className="text-red-600 ml-2">{order.totalFailed} ✗</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {order.status === 'pending_approval' && (
                            <DropdownMenuItem onClick={() => handleAction('approve', order.id)}>
                              Approve Mandate
                            </DropdownMenuItem>
                          )}
                          {order.status === 'active' && (
                            <>
                              <DropdownMenuItem onClick={() => handleAction('process', order.id)}>
                                <Play className="mr-2 h-4 w-4" />
                                Process Now
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction('pause', order.id)}>
                                <Pause className="mr-2 h-4 w-4" />
                                Pause
                              </DropdownMenuItem>
                            </>
                          )}
                          {order.status === 'paused' && (
                            <DropdownMenuItem onClick={() => handleAction('resume', order.id)}>
                              <Play className="mr-2 h-4 w-4" />
                              Resume
                            </DropdownMenuItem>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'completed' && (
                            <DropdownMenuItem 
                              onClick={() => handleAction('cancel', order.id)}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
