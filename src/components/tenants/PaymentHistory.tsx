import { useState } from "react";
import { 
  Receipt, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Wallet,
  FileText,
  Eye,
  MoreHorizontal,
  Edit,
  Trash2,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface PaymentHistoryProps {
  tenant: {
    id: number;
    name: string;
    monthlyRent: number;
    paymentHistory: Array<{
      id: number;
      date: string;
      amount: number;
      status: string;
      method: string;
      reference?: string;
      dueDate?: string;
      lateFee?: number;
      notes?: string;
    }>;
  };
}

const paymentMethods = [
  { value: "Bank Transfer", label: "Bank Transfer", icon: Banknote },
  { value: "Cheque", label: "Cheque", icon: FileText },
  { value: "Cash", label: "Cash", icon: Wallet },
  { value: "Credit Card", label: "Credit Card", icon: CreditCard },
];

const paymentStatuses = ["All", "Paid", "Pending", "Overdue", "Partial", "Failed"];

export default function PaymentHistory({ tenant }: PaymentHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedMethod, setSelectedMethod] = useState("All");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // Ensure paymentHistory exists, otherwise use empty array
  const paymentHistory = tenant.paymentHistory || [];

  const filteredPayments = paymentHistory.filter((payment) => {
    const matchesSearch = 
      payment.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "All" || payment.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesMethod = selectedMethod === "All" || payment.method === selectedMethod;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const totalPaid = paymentHistory
    .filter(p => p.status === "Paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const totalPending = paymentHistory
    .filter(p => p.status === "Pending")
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const totalOverdue = paymentHistory
    .filter(p => p.status === "Overdue")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "partial":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "partial":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMethodIcon = (method: string) => {
    const methodConfig = paymentMethods.find(m => m.value === method);
    return methodConfig ? <methodConfig.icon className="h-4 w-4" /> : <Banknote className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Payment History</h2>
          <p className="text-muted-foreground">{tenant.name} - Payment Records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setShowPaymentForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-foreground">AED {totalPaid.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">AED {totalPending.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-foreground">AED {totalOverdue.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Rent</p>
                <p className="text-2xl font-bold text-foreground">AED {tenant.monthlyRent.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Methods</SelectItem>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payment List */}
      <div className="space-y-4">
        {filteredPayments.map((payment) => (
          <Card key={payment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center">
                    {getMethodIcon(payment.method)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        Payment #{payment.id}
                      </h3>
                      <Badge className={getStatusColor(payment.status)}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-1">{payment.status}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {payment.date}
                      </span>
                      <span className="flex items-center gap-1">
                        {getMethodIcon(payment.method)}
                        {payment.method}
                      </span>
                      {payment.reference && (
                        <span>Ref: {payment.reference}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">
                      AED {payment.amount.toLocaleString()}
                    </p>
                    {payment.lateFee && payment.lateFee > 0 && (
                      <p className="text-sm text-red-600">
                        +{payment.lateFee} late fee
                      </p>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedPayment(payment)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Payment
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Receipt className="h-4 w-4 mr-2" />
                        Generate Receipt
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Payment
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredPayments.length === 0 && (
        <Card className="p-12 text-center">
          <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Payments Found</h3>
          <p className="text-muted-foreground mb-6">
            No payment records match your current filters.
          </p>
          <Button onClick={() => setShowPaymentForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Payment
          </Button>
        </Card>
      )}

      {/* Payment Details Modal */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment ID</p>
                  <p className="font-semibold">#{selectedPayment.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="font-semibold">{selectedPayment.date}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold text-foreground">AED {selectedPayment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedPayment.status)}>
                    {getStatusIcon(selectedPayment.status)}
                    <span className="ml-1">{selectedPayment.status}</span>
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Method</p>
                  <p className="font-semibold flex items-center gap-2">
                    {getMethodIcon(selectedPayment.method)}
                    {selectedPayment.method}
                  </p>
                </div>
                {selectedPayment.reference && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reference</p>
                    <p className="font-semibold">{selectedPayment.reference}</p>
                  </div>
                )}
              </div>
              
              {selectedPayment.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}