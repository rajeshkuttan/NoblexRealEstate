import { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Download, 
  User,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Receipt,
  CheckCircle,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Sample customer ledger data
const customerLedgers = [
  {
    customerId: "CUST-001",
    customerName: "Ahmed Al Rashid",
    unit: "Unit 101 - Marina Heights",
    property: "Marina Heights",
    accountStatus: "Active",
    openingBalance: 0,
    totalCharges: 65000,
    totalPayments: 62000,
    currentBalance: 3000,
    overdueAmount: 3000,
    lastPaymentDate: "2024-02-01",
    lastPaymentAmount: 5417,
    transactions: [
      { date: "2024-01-01", type: "Invoice", description: "Rent - January 2024", debit: 5417, credit: 0, balance: 5417 },
      { date: "2024-01-05", type: "Payment", description: "Rent Payment - Check #1234", debit: 0, credit: 5417, balance: 0 },
      { date: "2024-02-01", type: "Invoice", description: "Rent - February 2024", debit: 5417, credit: 0, balance: 5417 },
      { date: "2024-02-05", type: "Payment", description: "Rent Payment - Bank Transfer", debit: 0, credit: 5417, balance: 0 },
      { date: "2024-03-01", type: "Invoice", description: "Rent - March 2024", debit: 5417, credit: 0, balance: 5417 },
      { date: "2024-03-15", type: "Invoice", description: "Late Payment Fee", debit: 150, credit: 0, balance: 5567 },
      { date: "2024-03-20", type: "Payment", description: "Partial Payment - Cash", debit: 0, credit: 2567, balance: 3000 }
    ]
  },
  {
    customerId: "CUST-002",
    customerName: "Jennifer Smith",
    unit: "Unit 205 - Business Bay Plaza",
    property: "Business Bay Plaza",
    accountStatus: "Active",
    openingBalance: 0,
    totalCharges: 78000,
    totalPayments: 78000,
    currentBalance: 0,
    overdueAmount: 0,
    lastPaymentDate: "2024-03-01",
    lastPaymentAmount: 6500,
    transactions: [
      { date: "2024-01-01", type: "Invoice", description: "Rent - January 2024", debit: 6500, credit: 0, balance: 6500 },
      { date: "2024-01-03", type: "Payment", description: "Rent Payment - Bank Transfer", debit: 0, credit: 6500, balance: 0 },
      { date: "2024-02-01", type: "Invoice", description: "Rent - February 2024", debit: 6500, credit: 0, balance: 6500 },
      { date: "2024-02-02", type: "Payment", description: "Rent Payment - Bank Transfer", debit: 0, credit: 6500, balance: 0 },
      { date: "2024-03-01", type: "Invoice", description: "Rent - March 2024", debit: 6500, credit: 0, balance: 6500 },
      { date: "2024-03-01", type: "Payment", description: "Rent Payment - Bank Transfer", debit: 0, credit: 6500, balance: 0 }
    ]
  },
  {
    customerId: "CUST-003",
    customerName: "Mohammed Hassan",
    unit: "Unit 302 - Palm Residences",
    property: "Palm Residences",
    accountStatus: "Overdue",
    openingBalance: 2000,
    totalCharges: 45000,
    totalPayments: 37500,
    currentBalance: 9500,
    overdueAmount: 7500,
    lastPaymentDate: "2024-01-15",
    lastPaymentAmount: 3750,
    transactions: [
      { date: "2024-01-01", type: "Opening", description: "Opening Balance", debit: 2000, credit: 0, balance: 2000 },
      { date: "2024-01-01", type: "Invoice", description: "Rent - January 2024", debit: 3750, credit: 0, balance: 5750 },
      { date: "2024-01-15", type: "Payment", description: "Partial Payment - Cash", debit: 0, credit: 3750, balance: 2000 },
      { date: "2024-02-01", type: "Invoice", description: "Rent - February 2024", debit: 3750, credit: 0, balance: 5750 },
      { date: "2024-03-01", type: "Invoice", description: "Rent - March 2024", debit: 3750, credit: 0, balance: 9500 },
      { date: "2024-03-05", type: "Invoice", description: "Late Payment Fee", debit: 200, credit: 0, balance: 9700 }
    ]
  },
  {
    customerId: "CUST-004",
    customerName: "Sarah Johnson",
    unit: "Unit 108 - Marina Heights",
    property: "Marina Heights",
    accountStatus: "Credit",
    openingBalance: 0,
    totalCharges: 70830,
    totalPayments: 72000,
    currentBalance: -1170,
    overdueAmount: 0,
    lastPaymentDate: "2024-03-10",
    lastPaymentAmount: 15000,
    transactions: [
      { date: "2024-01-01", type: "Invoice", description: "Rent - January 2024", debit: 7083, credit: 0, balance: 7083 },
      { date: "2024-01-05", type: "Payment", description: "Rent Payment - Check", debit: 0, credit: 7083, balance: 0 },
      { date: "2024-02-01", type: "Invoice", description: "Rent - February 2024", debit: 7083, credit: 0, balance: 7083 },
      { date: "2024-02-05", type: "Payment", description: "Rent Payment - Check", debit: 0, credit: 7083, balance: 0 },
      { date: "2024-03-01", type: "Invoice", description: "Rent - March 2024", debit: 7083, credit: 0, balance: 7083 },
      { date: "2024-03-10", type: "Payment", description: "Advance Payment - Bank Transfer", debit: 0, credit: 15000, balance: -7917 }
    ]
  }
];

const accountStatusSummary = [
  { status: "Active", count: 2, amount: 3000, color: "#10b981" },
  { status: "Overdue", count: 1, amount: 9500, color: "#ef4444" },
  { status: "Credit", count: 1, amount: -1170, color: "#3b82f6" }
];

const paymentTrends = [
  { month: "Jan", collected: 28417, outstanding: 5417 },
  { month: "Feb", collected: 26250, outstanding: 6500 },
  { month: "Mar", collected: 18084, outstanding: 15416 }
];

const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4"];

export default function CustomerLedgerReport() {
  const [selectedCustomer, setSelectedCustomer] = useState("All Customers");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLedger, setSelectedLedger] = useState<any>(null);
  const [showLedgerDetails, setShowLedgerDetails] = useState(false);

  const filteredCustomers = customerLedgers.filter(customer => {
    const matchesSearch = 
      customer.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.unit.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "All" || customer.accountStatus === selectedStatus;
    const matchesCustomer = selectedCustomer === "All Customers" || customer.customerName === selectedCustomer;
    
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const totalReceivables = filteredCustomers.reduce((sum, c) => sum + Math.max(c.currentBalance, 0), 0);
  const totalOverdue = filteredCustomers.reduce((sum, c) => sum + c.overdueAmount, 0);
  const totalPayments = filteredCustomers.reduce((sum, c) => sum + c.totalPayments, 0);
  const activeCustomers = filteredCustomers.filter(c => c.accountStatus === "Active").length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AE", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800 border-green-200";
      case "Overdue": return "bg-red-100 text-red-800 border-red-200";
      case "Credit": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleViewLedger = (ledger: any) => {
    setSelectedLedger(ledger);
    setShowLedgerDetails(true);
  };

  const handleExport = (format: string) => {
    console.log("Exporting customer ledger as:", format);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Customer Ledger Report</h2>
          <p className="text-muted-foreground">Comprehensive customer account statements and transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText className="h-4 w-4 mr-2" />
            Print Statements
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Receivables</p>
                <p className="text-3xl font-bold text-foreground text-green-600">{formatCurrency(totalReceivables)}</p>
                <p className="text-sm text-muted-foreground mt-1">Outstanding balance</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Amount</p>
                <p className="text-3xl font-bold text-foreground text-red-600">{formatCurrency(totalOverdue)}</p>
                <p className="text-sm text-muted-foreground mt-1">Requires attention</p>
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
                <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalPayments)}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +12% this month
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Accounts</p>
                <p className="text-3xl font-bold text-foreground">{activeCustomers}</p>
                <p className="text-sm text-muted-foreground mt-1">Customer accounts</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers, units, or customer ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Customers">All Customers</SelectItem>
                {customerLedgers.map(customer => (
                  <SelectItem key={customer.customerId} value={customer.customerName}>
                    {customer.customerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Collection Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Payment Collection Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="collected" fill="#10b981" name="Collected" />
                <Bar dataKey="outstanding" fill="#ef4444" name="Outstanding" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Account Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Account Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accountStatusSummary.map((status, index) => (
                <div key={status.status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
                      <span className="font-medium">{status.status}</span>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{status.count} customers</Badge>
                      <p className="text-sm font-bold mt-1">{formatCurrency(status.amount)}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full"
                      style={{ 
                        width: `${(status.count / customerLedgers.length) * 100}%`,
                        backgroundColor: status.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Ledgers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Customer Account Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Unit</th>
                  <th className="p-3 font-medium text-right">Total Charges</th>
                  <th className="p-3 font-medium text-right">Total Payments</th>
                  <th className="p-3 font-medium text-right">Balance</th>
                  <th className="p-3 font-medium text-right">Overdue</th>
                  <th className="p-3 font-medium">Last Payment</th>
                  <th className="p-3 font-medium text-center">Status</th>
                  <th className="p-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{customer.customerName}</p>
                        <p className="text-sm text-muted-foreground">{customer.customerId}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="text-sm">{customer.unit}</p>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatCurrency(customer.totalCharges)}
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-green-600 font-medium">{formatCurrency(customer.totalPayments)}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={cn(
                        "font-bold",
                        customer.currentBalance > 0 ? "text-orange-600" :
                        customer.currentBalance < 0 ? "text-blue-600" :
                        "text-green-600"
                      )}>
                        {formatCurrency(customer.currentBalance)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {customer.overdueAmount > 0 ? (
                        <span className="font-bold text-red-600">{formatCurrency(customer.overdueAmount)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <p className="text-muted-foreground">{formatDate(customer.lastPaymentDate)}</p>
                        <p className="font-medium">{formatCurrency(customer.lastPaymentAmount)}</p>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className={getStatusColor(customer.accountStatus)}>
                        {customer.accountStatus}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewLedger(customer)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 font-bold bg-muted/30">
                <tr>
                  <td className="p-3" colSpan={2}>Total ({filteredCustomers.length} customers)</td>
                  <td className="p-3 text-right">{formatCurrency(filteredCustomers.reduce((sum, c) => sum + c.totalCharges, 0))}</td>
                  <td className="p-3 text-right text-green-600">{formatCurrency(totalPayments)}</td>
                  <td className="p-3 text-right">{formatCurrency(totalReceivables)}</td>
                  <td className="p-3 text-right text-red-600">{formatCurrency(totalOverdue)}</td>
                  <td className="p-3" colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Details Modal */}
      {showLedgerDetails && selectedLedger && (
        <Dialog open={showLedgerDetails} onOpenChange={setShowLedgerDetails}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold">Customer Ledger</DialogTitle>
                  <p className="text-muted-foreground mt-1">{selectedLedger.customerName} - {selectedLedger.customerId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Unit</p>
                      <p className="font-medium">{selectedLedger.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Property</p>
                      <p className="font-medium">{selectedLedger.property}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Status</p>
                      <Badge className={getStatusColor(selectedLedger.accountStatus)}>
                        {selectedLedger.accountStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="font-bold text-lg">{formatCurrency(selectedLedger.currentBalance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="p-3 font-medium">Date</th>
                          <th className="p-3 font-medium">Type</th>
                          <th className="p-3 font-medium">Description</th>
                          <th className="p-3 font-medium text-right">Debit</th>
                          <th className="p-3 font-medium text-right">Credit</th>
                          <th className="p-3 font-medium text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLedger.transactions.map((txn: any, idx: number) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-3 text-sm">{formatDate(txn.date)}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">
                                {txn.type}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">{txn.description}</td>
                            <td className="p-3 text-right text-red-600 font-medium">
                              {txn.debit > 0 ? formatCurrency(txn.debit) : "-"}
                            </td>
                            <td className="p-3 text-right text-green-600 font-medium">
                              {txn.credit > 0 ? formatCurrency(txn.credit) : "-"}
                            </td>
                            <td className="p-3 text-right font-bold">
                              {formatCurrency(txn.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

