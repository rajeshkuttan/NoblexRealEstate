import { useState, useEffect } from "react";
import { financialReportsAPI } from "@/services/api";
import { formatCurrency } from "@/utils/currencyUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, RefreshCw, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { generateExcel } from "@/utils/reportUtils";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export default function AccountsTransReport() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Advanced Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterJvNo, setFilterJvNo] = useState("");
  const [filterTransNo, setFilterTransNo] = useState("");
  
  const { toast } = useToast();

  const fetchTransactions = async (isManual = false) => {
    setLoading(true);
    try {
      // Adding timestamp to avoid browser caching
      const response = await financialReportsAPI.getAccountsTransactions({ _t: Date.now() });
      if (response.data.success) {
        setTransactions(response.data.data);
        if (isManual) {
          toast({
            title: "Success",
            description: "Transactions updated successfully",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setFilterType("all");
    setFilterJvNo("");
    setFilterTransNo("");
    setSearchQuery("");
  };

  const filteredTransactions = transactions.filter((t: any) => {
    // General Search
    const matchesSearch = searchQuery === "" || 
      t.transactionNo.toString().includes(searchQuery) ||
      (t.jvNumber && t.jvNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.payment?.paymentNumber && t.payment.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.ledger?.accountName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.narration?.toLowerCase().includes(searchQuery.toLowerCase());

    // Date Filter
    const transDate = new Date(t.transactionDate);
    const matchesStartDate = startDate === "" || transDate >= new Date(startDate);
    const matchesEndDate = endDate === "" || transDate <= new Date(endDate);

    // Type Filter (Debit/Credit)
    const matchesType = filterType === "all" || 
      (filterType === "dr" && t.debitAmount > 0) ||
      (filterType === "cr" && t.creditAmount > 0);

    // Specific Identifier Filters
    const matchesJvNo = filterJvNo === "" || 
      (t.jvNumber && t.jvNumber.toLowerCase().includes(filterJvNo.toLowerCase())) ||
      (t.payment?.paymentNumber && t.payment.paymentNumber.toLowerCase().includes(filterJvNo.toLowerCase()));
    const matchesTransNo = filterTransNo === "" || t.transactionNo.toString().includes(filterTransNo);

    return matchesSearch && matchesStartDate && matchesEndDate && matchesType && matchesJvNo && matchesTransNo;
  });

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: "No data",
        description: "There are no transactions to export with current filters.",
        variant: "destructive"
      });
      return;
    }

    const exportData = filteredTransactions.map(t => ({
      'Trans No': t.transactionNo,
      'Date': new Date(t.transactionDate).toLocaleDateString(),
      'JV Number': t.jvNumber || t.payment?.paymentNumber || '-',
      'Ledger Name': t.ledger?.accountName || '-',
      'Ledger Code': t.ledger?.accountCode || '-',
      'Debit': t.debitAmount,
      'Credit': t.creditAmount,
      'Narration': t.narration || ''
    }));

    generateExcel(exportData, "Accounts_Transactions_Report");
    
    toast({
      title: "Success",
      description: "Report exported successfully",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Accounts Transactions</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => fetchTransactions(true)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="border-b bg-muted/20 pb-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Input
                type="date"
                size={7}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Input
                type="date"
                size={7}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Trans Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="dr">Debit Only</SelectItem>
                  <SelectItem value="cr">Credit Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">JV No.</label>
              <Input
                placeholder="JV-2024-..."
                value={filterJvNo}
                onChange={(e) => setFilterJvNo(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Trans No.</label>
              <Input
                placeholder="100001"
                value={filterTransNo}
                onChange={(e) => setFilterTransNo(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 px-2 text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 flex-1"
                onClick={() => fetchTransactions(true)}
              >
                Apply
              </Button>
            </div>
          </div>
        </CardContent>

        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trans No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>JV Number</TableHead>
                  <TableHead>Ledger</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Narration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Loading transactions...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.transactionNo}</TableCell>
                      <TableCell>{new Date(t.transactionDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.jvNumber || t.payment?.paymentNumber}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>{t.ledger?.accountName}</div>
                        <div className="text-xs text-muted-foreground">{t.ledger?.accountCode}</div>
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {t.debitAmount > 0 ? formatCurrency(t.debitAmount) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {t.creditAmount > 0 ? formatCurrency(t.creditAmount) : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={t.narration}>
                        {t.narration}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
