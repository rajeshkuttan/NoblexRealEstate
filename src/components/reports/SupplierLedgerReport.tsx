import { useState, useEffect } from "react";
import { 
  Banknote, 
  TrendingUp, 
  TrendingDown,
  Download, 
  User,
  Calendar,
  FileText,
  CreditCard,
  Receipt,
  Search,
  AlertCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { vendorsAPI, financialReportsAPI } from "@/services/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SupplierLedgerReport() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [loading, setLoading] = useState(false);
  const [soaData, setSoaData] = useState<{openingBalance: number, transactions: any[]}>({
    openingBalance: 0,
    transactions: []
  });

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await vendorsAPI.getAll({ limit: 1000 });
        setVendors(res.data?.data?.vendors || []);
      } catch (error) {
        console.error("Failed to fetch vendors:", error);
      }
    };
    fetchVendors();
  }, []);

  const fetchSOA = async () => {
    if (selectedVendorId === "all") {
      setSoaData({ openingBalance: 0, transactions: [] });
      return;
    }

    setLoading(true);
    try {
      const res = await financialReportsAPI.getVendorSOA(selectedVendorId, { startDate, endDate });
      if (res.data?.success) {
        setSoaData(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch SOA:", error);
      toast.error("Failed to load Statement of Account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSOA();
  }, [selectedVendorId, startDate, endDate]);

  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (vendor.vendorId && vendor.vendorId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate Running Balance for the table
  const transactionsWithBalance: any[] = [];
  let currentBalance = soaData.openingBalance;
  
  soaData.transactions.forEach(t => {
    // For vendors, Credit (Invoices) increases balance (we owe them), Debit (Payments) decreases it.
    // However, usually SOA follows Accounting standards: Debit (Payments), Credit (Invoices).
    // Let's stick to (Debit - Credit) as amount, but maybe flip for 'Payable' perspective if needed.
    // Standard SOA for Vendor: Credit is Invoice, Debit is Payment. Balance = Sum(Credits) - Sum(Debits).
    const amount = parseFloat(t.creditAmount || 0) - parseFloat(t.debitAmount || 0);
    currentBalance += amount;
    transactionsWithBalance.push({
      ...t,
      runningBalance: currentBalance
    });
  });

  const totalDebits = soaData.transactions.reduce((sum, t) => sum + parseFloat(t.debitAmount || 0), 0);
  const totalCredits = soaData.transactions.reduce((sum, t) => sum + parseFloat(t.creditAmount || 0), 0);
  const closingBalance = currentBalance;

  const totalPayable = Math.max(closingBalance, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 2,
    }).format(Math.abs(amount)) + (amount < 0 ? " (Cr)" : "");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AE", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const handleExport = (format: string) => {
    console.log("Exporting vendor ledger as:", format);
    toast.info(`Exporting as ${format.toUpperCase()}...`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Supplier Statement of Account</h2>
          <p className="text-muted-foreground">Detailed transaction history and balance for selected vendor</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Opening Balance</p>
                <p className={cn("text-2xl font-bold", soaData.openingBalance > 0 ? "text-red-600" : "text-green-600")}>
                  {formatCurrency(soaData.openingBalance)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoiced (Cr)</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCredits)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Paid (Dr)</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDebits)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Closing Balance</p>
                <p className={cn("text-2xl font-bold", closingBalance > 0 ? "text-red-600" : "text-green-600")}>
                  {formatCurrency(closingBalance)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-purple-600" />
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
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <div className="flex gap-2 pl-10">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-44"
                  />
                  <span className="flex items-center text-muted-foreground px-2">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-44"
                  />
                </div>
              </div>
            </div>
            <div className="w-80">
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 sticky top-0 bg-popover">
                    <Input 
                      placeholder="Search vendors..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <SelectItem value="all">Select Vendor</SelectItem>
                  {filteredVendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name} {vendor.vendorId ? `(${vendor.vendorId})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <div className="space-y-6">
        {selectedVendorId === "all" ? (
          <Card className="p-12 text-center border-dashed">
            <div className="max-w-md mx-auto space-y-4">
              <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Select a Vendor</h3>
              <p className="text-muted-foreground">Choose a vendor and date range to generate the Statement of Account.</p>
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
              <CardTitle className="text-lg">Statement of Account</CardTitle>
              <Badge variant="outline" className="px-3 py-1">
                {formatDate(startDate)} — {formatDate(endDate)}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr className="text-left font-semibold">
                      <th className="p-4 border-b">Date</th>
                      <th className="p-4 border-b">Transaction</th>
                      <th className="p-4 border-b">Ref #</th>
                      <th className="p-4 border-b text-right">Debit (Payment)</th>
                      <th className="p-4 border-b text-right">Credit (Invoice)</th>
                      <th className="p-4 border-b text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-muted/10 italic">
                      <td className="p-4 border-b text-sm font-medium">{formatDate(startDate)}</td>
                      <td className="p-4 border-b text-sm" colSpan={4}>Opening Balance</td>
                      <td className={cn("p-4 border-b text-right font-bold", soaData.openingBalance > 0 ? "text-red-600" : "text-green-600")}>
                        {formatCurrency(soaData.openingBalance)}
                      </td>
                    </tr>
                    {loading ? (
                      <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">Loading transactions...</td></tr>
                    ) : transactionsWithBalance.length === 0 ? (
                      <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No transactions found for the selected period.</td></tr>
                    ) : (
                      transactionsWithBalance.map((txn, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-4 text-sm">{format(new Date(txn.transactionDate), 'dd MMM yyyy')}</td>
                          <td className="p-4">
                            <div className="text-sm">
                              <p className="font-semibold text-foreground">{txn.particular || (txn.vendorInvoice ? 'Purchase Invoice' : txn.payment ? 'Payment' : 'Journal Entry')}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{txn.narration}</p>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-mono text-muted-foreground">
                            {txn.jvNumber || txn.vendorInvoice?.invoiceNumber || txn.payment?.paymentNumber || '—'}
                          </td>
                          <td className="p-4 text-right text-green-600 font-medium">
                            {parseFloat(txn.debitAmount) > 0 ? formatCurrency(txn.debitAmount) : '—'}
                          </td>
                          <td className="p-4 text-right text-red-600 font-medium">
                            {parseFloat(txn.creditAmount) > 0 ? formatCurrency(txn.creditAmount) : '—'}
                          </td>
                          <td className={cn("p-4 text-right font-bold", txn.runningBalance > 0 ? "text-red-600" : "text-green-600")}>
                            {formatCurrency(txn.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-muted/50 font-bold border-t-2">
                    <tr>
                      <td className="p-4" colSpan={3}>Closing Balance as of {formatDate(endDate)}</td>
                      <td className="p-4 text-right text-green-600">{formatCurrency(totalDebits)}</td>
                      <td className="p-4 text-right text-red-600">{formatCurrency(totalCredits)}</td>
                      <td className={cn("p-4 text-right text-lg", closingBalance > 0 ? "text-red-600" : "text-green-600")}>
                        {formatCurrency(closingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
