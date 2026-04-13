import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  BarChart3,
  Calendar,
  Building2,
  Wallet,
  Receipt,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Banknote,
  PieChart,
  FileSpreadsheet,
  Settings,
  X,
  RefreshCw,
  Info,
  ChevronRight,
  Calculator,
  ShieldCheck,
  Building,
  ArrowDownRight,
  DollarSign,
  Grid3X3,
  List,
  Copy,
  Send,
  Printer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { invoicesAPI, paymentsAPI, treasuryReportsAPI } from "@/services/api";
import { cn } from "@/lib/utils";
import ReceiptForm from "@/components/finance/ReceiptForm";
import InvoiceForm from "@/components/finance/InvoiceForm";
import VATReport from "@/components/finance/VATReport";
import FinancialReports from "@/components/finance/FinancialReports";
import InvoiceDetails from "@/components/finance/InvoiceDetails";
import PaymentDetails from "@/components/finance/PaymentDetails";
import ReceiptStatement from "@/components/finance/ReceiptStatement";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  printDocument, 
  generatePurchaseInvoiceHtml, 
  generateReceiptHtml, 
  generateVoucherHtml 
} from "../utils/printUtils";

// Helper functions defined locally to match Finance.tsx pattern
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: any) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'paid': return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case 'completed': return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case 'pending': return "bg-amber-100 text-amber-700 border-amber-200";
    case 'overdue': return "bg-red-100 text-red-700 border-red-200";
    case 'cancelled': return "bg-red-100 text-red-700 border-red-200";
    case 'partially_paid': return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export default function Receivables() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("invoices");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptFormMode, setReceiptFormMode] = useState<"create" | "edit">("create");
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceFormMode, setInvoiceFormMode] = useState<"create" | "edit">("create");

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterKey, setFilterKey] = useState(0);

  const [showFinancialReports, setShowFinancialReports] = useState(false);
  const [showVATReport, setShowVATReport] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showPrintStatement, setShowPrintStatement] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePrintInvoice = (inv: any) => {
    try {
      const htmlContent = generatePurchaseInvoiceHtml(inv);
      printDocument(`Invoice - ${inv.invoiceNumber}`, htmlContent);
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to generate print view");
    }
  };


  const handlePrintReceipt = (rec: any) => {
    try {
      const htmlContent = generateReceiptHtml(rec);
      printDocument(`Receipt - ${rec.paymentNumber}`, htmlContent);
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to generate print view");
    }
  };

  const handlePrintVoucher = async (data: any, type: 'receipt' | 'invoice' = 'receipt') => {
    try {
      // Fetch full object to get enriched details (ledger info)
      let fullData = data;
      if (type === 'invoice') {
        const res = await invoicesAPI.getById(data.id);
        fullData = res.data?.data || res.data;
      } else {
        const res = await paymentsAPI.getById(data.id);
        fullData = res.data?.data || res.data;
      }

      if (!fullData) throw new Error("Could not fetch full details");

      const htmlContent = generateVoucherHtml(fullData, type);
      const ref = fullData.paymentNumber || fullData.invoiceNumber || 'Voucher';
      printDocument(`Voucher - ${ref}`, htmlContent);
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to generate voucher view");
    }
  };


  const invoiceStatuses = ["All", "Paid", "Pending", "Overdue", "Cancelled"];
  const paymentMethods = ["All", "Bank Transfer", "Cheque", "Cash", "Credit Card", "Online Payment"];


  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, paymentsRes, statsRes] = await Promise.all([
        invoicesAPI.getAll(undefined, true),
        paymentsAPI.getAll({ limit: 500 }, true),
        treasuryReportsAPI.getDashboard()
      ]);
      const rawInvoices = invoicesRes.data?.data?.invoices || invoicesRes.data || [];
      const mappedInvoices = Array.isArray(rawInvoices) ? rawInvoices.map((inv: any) => {
        const amountPaid = inv.amountPaid || (inv.status === 'paid' ? parseFloat(inv.totalAmount) : 0);
        const outstanding = parseFloat(inv.totalAmount || 0) - amountPaid;
        
        let parsedItems: any = {};
        if (inv.items) {
           if (typeof inv.items === 'string') {
               try { parsedItems = JSON.parse(inv.items); } catch(e) {}
           } else {
               parsedItems = inv.items;
           }
        }
        
        return {
          ...inv,
          tenant: inv.tenant || { name: 'Unknown Tenant', id: 'TEN-000' },
          property: {
            name: inv.lease?.unit?.property?.title || inv.lease?.unit?.property?.name || inv.property?.title || inv.property?.name || 'N/A',
            unit: inv.lease?.unit?.unitNumber || inv.property?.unit || '—',
          },
          invoiceDetails: inv.invoiceDetails || {
            total: parseFloat(inv.totalAmount || 0),
            subtotal: parseFloat(inv.subtotal || 0),
            vatAmount: parseFloat(inv.taxAmount || 0),
            vatRate: parseFloat(inv.taxRate || 5),
            dueDate: inv.dueDate,
            issueDate: inv.invoiceDate,
            description: inv.description,
            period: parsedItems.period || inv.period || 'N/A',
            paid: amountPaid,
            outstanding: outstanding > 0 ? outstanding : 0
          },
          // Fallback company info for InvoiceDetails
          companyInfo: inv.companyInfo || {
            name: "Emirates Lease Flow",
            license: "L-123456",
            address: "Dubai, UAE",
            phone: "+971 4 000 0000",
            email: "info@emirateslease.ae",
            vatNumber: "100123456789123"
          }
        };
      }) : [];

      setInvoices(mappedInvoices);

      const rawReceipts = paymentsRes.data?.data?.payments || paymentsRes.data || [];
      const mappedReceipts = Array.isArray(rawReceipts) ? rawReceipts
        .filter((rec: any) => !rec.payeeType || rec.payeeType.toLowerCase() !== 'supplier')
        .sort((a: any, b: any) => new Date(b.createdAt || b.paymentDate || 0).getTime() - new Date(a.createdAt || a.paymentDate || 0).getTime())
        .map((rec: any) => ({
        ...rec,
        tenantName: rec.tenant?.name || rec.payeeName || 'Unknown Tenant',
        paymentNumber: rec.paymentNumber || rec.receiptNumber || `REC-${rec.id}`,
        amount: parseFloat(rec.amount || 0),
        companyInfo: rec.companyInfo || {
          name: "Emirates Lease Flow",
          address: "Dubai, UAE",
          phone: "+971 4 000 0000",
          email: "info@emirateslease.ae",
          vatNumber: "100123456789123"
        }
      })) : [];

      setReceipts(mappedReceipts);
      setStats(statsRes.data?.data || statsRes.data || null);
    } catch (error) {
      console.error("Failed to fetch receivables data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReceipt = () => {
    setSelectedReceipt(null);
    setSelectedInvoice(null);
    setReceiptFormMode("create");
    setShowReceiptForm(true);
    // Force a fresh fetch of invoices when opening the receipt form to ensure latest data
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRecordReceiptForInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setSelectedReceipt(null);
    setReceiptFormMode("create");
    setShowReceiptForm(true);
  };

  const handlePostPayment = async (id: number) => {
    try {
      setLoading(true);
      await paymentsAPI.post(id);
      toast.success("Receipt posted and locked successfully!");
      fetchData();
      setShowReceiptForm(false);
    } catch (error: any) {
      console.error("Failed to post receipt:", error);
      toast.error(error?.response?.data?.message || "Failed to post receipt");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpostPayment = async (id: number) => {
    try {
      setLoading(true);
      await paymentsAPI.unpost(id);
      toast.success("Receipt unposted and unlocked successfully!");
      fetchData();
      setShowReceiptForm(false);
    } catch (error: any) {
      console.error("Failed to unpost receipt:", error);
      toast.error(error?.response?.data?.message || "Failed to unpost receipt");
    } finally {
      setLoading(false);
    }
  };

  const handlePostInvoice = async (id: number) => {
    try {
      setLoading(true);
      await invoicesAPI.post(id);
      toast.success("Invoice posted and locked successfully!");
      fetchData();
      setShowInvoiceForm(false);
    } catch (error: any) {
      console.error("Failed to post invoice:", error);
      toast.error(error?.response?.data?.message || "Failed to post invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpostInvoice = async (id: number) => {
    try {
      setLoading(true);
      await invoicesAPI.unpost(id);
      toast.success("Invoice unposted and unlocked successfully!");
      fetchData();
      setShowInvoiceForm(false);
    } catch (error: any) {
      console.error("Failed to unpost invoice:", error);
      toast.error(error?.response?.data?.message || "Failed to unpost invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleEditReceipt = (receipt: any) => {
    // Ensure nested fields are initialized properly for the edit form
    const hydratedReceipt = {
      ...receipt,
      // Pass the fully structured JSON data for initialData
      paymentDetails: {
        paymentMode: receipt.paymentMode || receipt.paymentMethod === 'cash' ? "Cash" : receipt.paymentMethod === 'pdc' ? "PDC" : "Bank",
        bankName: receipt.bankName || receipt.bankDetails?.bankName || "",
        instrumentNumber: receipt.instrumentNumber || receipt.paymentDetails?.instrumentNumber || receipt.reference || "",
        paymentReference: receipt.reference || receipt.paymentReference || "",
        amount: receipt.amount
      },
      paymentPurpose: {
        category: receipt.category || "rent",
        description: receipt.description || "",
        referenceNumber: receipt.reference || receipt.invoiceId || "",
        property: receipt.propertyName || receipt.tenant?.property || ""
      },
      payeeInfo: {
        payeeType: receipt.payeeType || (receipt.tenant ? "tenant" : "other"),
        payeeName: receipt.payeeName || receipt.tenant?.name || receipt.tenantName || "",
        payeeId: receipt.payeeIdString || receipt.tenant?.id?.toString() || receipt.tenantId?.toString() || "",
        email: receipt.tenant?.email || "",
        contactNumber: receipt.tenant?.phone || ""
      }
    };
    setSelectedReceipt(hydratedReceipt);
    setSelectedInvoice(null);
    setReceiptFormMode("edit");
    setShowReceiptForm(true);
  };

  const handleDeleteReceipt = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      try {
        await paymentsAPI.delete(Number(id));
        await fetchData();
        toast.success("Receipt deleted successfully");
      } catch (error) {
        console.error("Failed to delete receipt:", error);
        toast.error("Failed to delete receipt");
      }
    }
  };

  const handleAddInvoice = () => {
    setSelectedInvoice(null);
    setInvoiceFormMode("create");
    setShowInvoiceForm(true);
  };

  const handleEditInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setInvoiceFormMode("edit");
    setShowInvoiceForm(true);
  };

  const handleInvoiceSubmit = async (data: any) => {
    try {
      if (invoiceFormMode === "create") {
         await invoicesAPI.create(data);
      } else {
         await invoicesAPI.update(selectedInvoice.id, data);
      }
      setRefreshTrigger(prev => prev + 1);
      setShowInvoiceForm(false);
      toast.success("Invoice saved successfully");
    } catch (error) {
       toast.error("Failed to save invoice");
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedStatus("All");
    setSelectedPaymentMethod("All");
    setStartDate("");
    setEndDate("");
    setFilterKey(prev => prev + 1);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.lease?.unit?.property?.name || inv.property?.name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.lease?.unit?.unitNumber || inv.property?.unit)?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "All" || inv.status?.toLowerCase() === selectedStatus.toLowerCase();
    
    const invoiceDate = new Date(inv.invoiceDetails?.issueDate || inv.dueDate);
    const matchesDate = (!startDate || invoiceDate >= new Date(startDate)) && 
                        (!endDate || invoiceDate <= new Date(endDate));

    return matchesSearch && matchesStatus && matchesDate;
  });

  const filteredReceipts = receipts.filter(rec => {
    const matchesSearch = rec.paymentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.payeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.paymentReference?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "All" || rec.status?.toLowerCase() === selectedStatus.toLowerCase();
    const formattedMethod = rec.paymentMethod?.replace('_', ' ').toLowerCase();
    const targetMethod = selectedPaymentMethod.toLowerCase();
    const matchesMethod = selectedPaymentMethod === "All" || formattedMethod === targetMethod;

    const receiptDate = new Date(rec.paymentDate);
    const matchesDate = (!startDate || receiptDate >= new Date(startDate)) && 
                        (!endDate || receiptDate <= new Date(endDate));

    return matchesSearch && matchesStatus && matchesMethod && matchesDate;
  });

  return (
    <div className="space-y-6 uiux-page-enter">
      {/* Header Section */}
      <div className="uiux-page-header flex-col md:flex-row items-start md:items-center gap-4">
        <div>
          <h1 className="uiux-page-title">Receivables</h1>
          <p className="uiux-page-subtitle flex items-center gap-2 mt-1">
            <Receipt className="h-4 w-4 shrink-0" />
            Track incoming receipts, tenant invoices, and financial performance
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-premium bg-gradient-to-br from-blue-600 to-blue-700 text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Receipt className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-100 font-medium">Total Revenue</CardDescription>
            <CardTitle className="text-3xl font-black">{formatCurrency(stats?.totalRevenue || 0)}</CardTitle>
          </CardHeader>

          <CardContent>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium bg-white group hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardDescription className="font-medium text-slate-500 uppercase tracking-wider text-[10px]">Overdue Receivables</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.overdueReceivables || 0)}</CardTitle>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
              <span>{stats?.pendingInvoicesCount || 0} Unpaid Invoices</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium bg-white group hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardDescription className="font-medium text-slate-500 uppercase tracking-wider text-[10px]">MTD Collections</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.currentMonthRevenue || 0)}</CardTitle>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium bg-white group hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardDescription className="font-medium text-slate-500 uppercase tracking-wider text-[10px]">Upcoming Revenue</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.nextMonthRevenue || 0)}</CardTitle>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="border-none shadow-premium overflow-hidden bg-white/80 backdrop-blur-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-0 border-b border-slate-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <TabsList className="bg-slate-100/50 p-1 rounded-xl">
                <TabsTrigger value="invoices" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
                  Receipt Invoice
                </TabsTrigger>
                <TabsTrigger 
                  value="receipts" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6"
                  onClick={(e) => {
                     if (activeTab === 'invoices') {
                         e.preventDefault();
                         handleAddReceipt();
                     }
                  }}
                >
                  Receipt
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder={`Search ${activeTab === 'invoices' ? 'invoices' : 'receipts'}...`}
                    className="pl-9 bg-white border-slate-200 w-full md:w-[250px] shadow-sm rounded-xl focus:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={cn("shadow-sm rounded-xl border-slate-200", showFilters && "bg-primary text-primary-foreground border-primary hover:bg-primary hover:text-primary-foreground")}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
                {activeTab === "invoices" && (
                  <div className="flex items-center border rounded-xl h-10 bg-white shadow-sm overflow-hidden md:flex">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      className="h-full px-3 rounded-none border-0"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      className="h-full px-3 rounded-none border-0"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {activeTab === "invoices" ? (
                  <Button onClick={handleAddInvoice} className="bg-gradient-primary shadow-glow h-10 hidden md:flex">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                ) : (
                  <Button onClick={handleAddReceipt} className="bg-gradient-primary shadow-glow h-10 hidden md:flex">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Receipt
                  </Button>
                )}
                {activeTab === "receipts" && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowPrintStatement(true)} 
                    className="h-10 border-slate-200 shadow-sm rounded-xl hidden md:flex transition-all hover:scale-105 active:scale-95"
                    disabled={filteredReceipts.length === 0}
                  >
                    <Printer className="h-4 w-4 mr-2 text-primary" />
                    Print
                  </Button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mb-4 p-4 border rounded-xl bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Status</label>
                    <Select 
                      key={`status-${filterKey}`}
                      value={selectedStatus} 
                      onValueChange={setSelectedStatus}
                    >
                      <SelectTrigger className="h-10 bg-white shadow-sm border-slate-200">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        {invoiceStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {activeTab === "receipts" && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Method</label>
                      <Select 
                        key={`method-${filterKey}`}
                        value={selectedPaymentMethod} 
                        onValueChange={setSelectedPaymentMethod}
                      >
                        <SelectTrigger className="h-10 bg-white shadow-sm border-slate-200">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 col-span-1 lg:col-span-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">Start Date</label>
                      <Input 
                        type="date" 
                        className="h-10 bg-white shadow-sm border-slate-200" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wider">End Date</label>
                      <Input 
                        type="date" 
                        className="h-10 bg-white shadow-sm border-slate-200" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex justify-end">
                    <Button 
                      variant="ghost" 
                      onClick={handleClearFilters}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          
          <TabsContent value="invoices" className="mt-4 space-y-4">
            {loading ? (
               <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
               </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInvoices.map((invoice) => (
                  <Card key={invoice.id} className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group border-border/50 hover:border-primary/50">
                    <CardContent className="p-5">
                      {/* Invoice Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-primary flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {invoice.invoiceNumber}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{invoice.tenant?.name || 'Unknown'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {invoice.isPosted ? (
                            <Badge className="px-2 py-0 h-5 text-[10px] font-bold bg-blue-100 text-blue-700 border-blue-200">
                              POSTED
                            </Badge>
                          ) : (
                            <Badge className={cn("px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-wider", getStatusColor(invoice.status))}>
                              {invoice.status}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Invoice Details */}
                      <div className="grid grid-cols-2 gap-4 mb-5 p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Amount</p>
                          <p className="text-sm font-bold text-foreground">
                            {formatCurrency(invoice.totalAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Period</p>
                          <p className="text-sm font-medium truncate">{invoice.invoiceDetails?.period || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Due Date</p>
                          <p className="text-sm font-medium">
                            {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-tight">VAT (5%)</p>
                          <p className="text-xs font-medium text-muted-foreground">
                            {formatCurrency(invoice.invoiceDetails?.vatAmount || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => {
                           setSelectedInvoice(invoice);
                           setShowInvoiceDetails(true);
                        }}>
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Details
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => {
                               setSelectedInvoice(invoice);
                               setShowInvoiceDetails(true);
                            }} className="text-xs cursor-pointer">
                              <Eye className="h-3.5 w-3.5 mr-2 opacity-70" />
                              View Full Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditInvoice(invoice)} className="text-xs cursor-pointer">
                              <Pencil className="h-3.5 w-3.5 mr-2 opacity-70" />
                              {invoice.isPosted ? "View Invoice" : "Edit Invoice"}
                            </DropdownMenuItem>
                            {!invoice.isPosted && (
                              <DropdownMenuItem onClick={() => handlePostInvoice(invoice.id)} className="text-xs cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                                <ShieldCheck className="h-3.5 w-3.5 mr-2 opacity-70" />
                                Post Invoice
                              </DropdownMenuItem>
                            )}
                             {invoice.isPosted && (
                              <DropdownMenuItem onClick={() => handleUnpostInvoice(invoice.id)} className="text-xs cursor-pointer text-amber-600 focus:text-amber-700 focus:bg-amber-50">
                                <RefreshCw className="h-3.5 w-3.5 mr-2 opacity-70" />
                                UnPost Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleRecordReceiptForInvoice(invoice)} className="text-xs cursor-pointer">
                              <CreditCard className="h-3.5 w-3.5 mr-2 opacity-70" />
                              Record Payment
                            </DropdownMenuItem>
                            <Separator className="my-1" />
                            <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handlePrintInvoice(invoice)}>
                               <Printer className="h-3.5 w-3.5 mr-2 opacity-70" />
                               Print
                             </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handlePrintVoucher(invoice, 'invoice')}>
                              <Printer className="h-3.5 w-3.5 mr-2 opacity-70" />
                              Print Voucher
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => {
                               invoicesAPI.sendReminder(invoice.id)
                                .then(() => toast.success("Reminder sent"))
                                .catch(() => toast.error("Failed to send reminder"));
                            }}>
                              <Send className="h-3.5 w-3.5 mr-2 opacity-70" />
                              Send Reminder
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => {
                               invoicesAPI.duplicate(invoice.id)
                                .then(() => { toast.success("Duplicated!"); fetchData(); })
                                .catch(() => toast.error("Failed to duplicate"));
                            }}>
                              <Copy className="h-3.5 w-3.5 mr-2 opacity-70" />
                              Duplicate
                            </DropdownMenuItem>
                            <Separator className="my-1" />
                            <DropdownMenuItem className="text-xs cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => {
                               if(window.confirm("Delete invoice?")) invoicesAPI.delete(invoice.id).then(()=>fetchData());
                            }}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-border/50 shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Invoice</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden md:table-cell">Tenant</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden lg:table-cell">Property</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] hidden xl:table-cell">Due Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-3 px-4">
                            <div className="min-w-[120px]">
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{invoice.invoiceNumber}</p>
                              <p className="text-[10px] text-muted-foreground">{invoice.invoiceDetails?.period || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <div className="min-w-[150px]">
                              <p className="font-medium text-foreground">{invoice.tenant?.name || 'Unknown'}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{invoice.tenant?.id}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <div className="min-w-[150px]">
                              <p className="font-medium text-foreground">{invoice.property?.name}</p>
                              <p className="text-[10px] text-muted-foreground">{invoice.property?.unit}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="min-w-[100px]">
                              <p className="font-bold text-foreground">{formatCurrency(invoice.totalAmount)}</p>
                              <p className="text-[10px] text-muted-foreground">VAT: {formatCurrency(invoice.invoiceDetails?.vatAmount || 0)}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden xl:table-cell">
                            <p className="font-medium text-muted-foreground">
                              {formatDate(invoice.dueDate)}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            {invoice.isPosted ? (
                              <Badge className="px-2 py-0 h-5 text-[10px] font-bold bg-blue-100 text-blue-700 border-blue-200">
                                POSTED
                              </Badge>
                            ) : (
                              <Badge className={cn("px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-wider", getStatusColor(invoice.status))}>
                                {invoice.status}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Details" onClick={() => {
                                 setSelectedInvoice(invoice);
                                 setShowInvoiceDetails(true);
                              }}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => {
                                     setSelectedInvoice(invoice);
                                     setShowInvoiceDetails(true);
                                  }} className="text-xs">
                                    <Eye className="h-3.5 w-3.5 mr-2 opacity-70" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditInvoice(invoice)} className="text-xs">
                                    <Pencil className="h-3.5 w-3.5 mr-2 opacity-70" />
                                    {invoice.isPosted ? "View Invoice" : "Edit Invoice"}
                                  </DropdownMenuItem>
                                  {!invoice.isPosted && (
                                    <DropdownMenuItem onClick={() => handlePostInvoice(invoice.id)} className="text-xs text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                                      <ShieldCheck className="h-3.5 w-3.5 mr-2 opacity-70" />
                                      Post Invoice
                                    </DropdownMenuItem>
                                  )}
                                  {invoice.isPosted && (
                                    <DropdownMenuItem onClick={() => handleUnpostInvoice(invoice.id)} className="text-xs text-amber-600 focus:text-amber-700 focus:bg-amber-50">
                                      <RefreshCw className="h-3.5 w-3.5 mr-2 opacity-70" />
                                      UnPost Invoice
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleRecordReceiptForInvoice(invoice)} className="text-xs">
                                    <CreditCard className="h-3.5 w-3.5 mr-2 opacity-70" />
                                    Record Payment
                                  </DropdownMenuItem>
                                  <Separator className="my-1" />
                                   <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handlePrintInvoice(invoice)}>
                                     <Printer className="h-3.5 w-3.5 mr-2 opacity-70" />
                                     Print
                                   </DropdownMenuItem>
                                   <DropdownMenuItem onClick={() => handlePrintVoucher(invoice, 'invoice')} className="text-xs cursor-pointer">
                                      <Printer className="h-3.5 w-3.5 mr-2 opacity-70" />
                                      Print Voucher
                                    </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => {
                                     invoicesAPI.sendReminder(invoice.id).then(() => toast.success("Reminder sent"));
                                  }}>
                                    <Send className="h-3.5 w-3.5 mr-2 opacity-70" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => {
                                     invoicesAPI.duplicate(invoice.id).then(() => { toast.success("Duplicated!"); fetchData(); });
                                  }}>
                                    <Copy className="h-3.5 w-3.5 mr-2 opacity-70" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <Separator className="my-1" />
                                  <DropdownMenuItem className="text-red-600" onClick={() => {
                                     if(window.confirm("Delete invoice?")) invoicesAPI.delete(invoice.id).then(()=>fetchData());
                                  }}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Invoice
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="receipts" className="mt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Receipt No</TableHead>
                    <TableHead className="font-bold text-slate-700">Tenant / Customer</TableHead>
                    <TableHead className="font-bold text-slate-700">Date</TableHead>
                    <TableHead className="font-bold text-slate-700">Method</TableHead>
                    <TableHead className="font-bold text-slate-700">Reference</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Amount</TableHead>
                    <TableHead className="font-bold text-slate-700">Status</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary/40" />
                        Loading receipts...
                      </TableCell>
                    </TableRow>
                  ) : filteredReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                        No receipts found
                      </TableCell>
                    </TableRow>
                  ) : filteredReceipts.map((rec) => (
                    <TableRow key={rec.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="font-bold text-slate-900">{rec.paymentNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{rec.tenantName || rec.tenant?.name || rec.payeeName}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{rec.payeeType || "Tenant"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">{formatDate(rec.paymentDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {rec.paymentMethod === 'bank_transfer' ? <Building2 className="h-3.5 w-3.5 text-blue-500" /> : 
                           rec.paymentMethod === 'cash' ? <Banknote className="h-3.5 w-3.5 text-emerald-500" /> :
                           <CreditCard className="h-3.5 w-3.5 text-slate-500" />}
                          <span className="text-xs font-semibold text-slate-700 uppercase">{rec.paymentMethod?.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{rec.paymentReference}</TableCell>
                      <TableCell className="text-right font-black text-emerald-600 tabular-nums">{formatCurrency(rec.amount)}</TableCell>
                      <TableCell>
                        {rec.isPosted ? (
                          <Badge className="shadow-sm px-3 bg-blue-100 text-blue-700 border-blue-200">
                            POSTED
                          </Badge>
                        ) : (
                          <Badge 
                            className={cn(
                              "shadow-sm px-3",
                              rec.status === 'completed' || rec.status === 'paid' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                              rec.status === 'pending' ? "bg-amber-100 text-amber-700 border-amber-200" :
                              "bg-red-100 text-red-700 border-red-200"
                            )}
                          >
                            {rec.status?.toUpperCase()}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[180px] rounded-xl shadow-premium border-slate-100">
                            <DropdownMenuLabel>Receipt Actions</DropdownMenuLabel>
                            {rec.isPosted ? (
                              <DropdownMenuItem 
                                className="text-amber-600 focus:bg-amber-50 focus:text-amber-700 font-semibold"
                                onClick={() => handleUnpostPayment(rec.id)}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" /> UnPost Receipt
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700 font-semibold"
                                onClick={() => handlePostPayment(rec.id)}
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" /> Post Receipt
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handlePrintReceipt(rec)}>
                               <Printer className="mr-2 h-4 w-4" /> Print Receipt
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handlePrintVoucher(rec)}>
                               <FileText className="mr-2 h-4 w-4" /> Print Voucher
                             </DropdownMenuItem>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => handleEditReceipt(rec)}>
                               <Pencil className="mr-2 h-4 w-4" /> {rec.isPosted ? "View Receipt" : "Edit Receipt"}
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => {
                               setSelectedReceipt(rec);
                               setShowPaymentDetails(true);
                             }}>
                               <Eye className="mr-2 h-4 w-4" /> Receipt Details
                             </DropdownMenuItem>
                             {!rec.isPosted && (
                               <>
                                 <DropdownMenuSeparator />
                                 <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700" onClick={() => handleDeleteReceipt(rec.id)}>
                                   <Trash2 className="mr-2 h-4 w-4" /> Delete
                                 </DropdownMenuItem>
                               </>
                             )}
                           </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Forms and Modals */}
      <InvoiceForm
        isOpen={showInvoiceForm}
        onClose={() => setShowInvoiceForm(false)}
        onSubmit={handleInvoiceSubmit}
        onPost={handlePostInvoice}
        onUnPost={handleUnpostInvoice}
        initialData={selectedInvoice}
        mode={invoiceFormMode}
      />

      <ReceiptForm 
        isOpen={showReceiptForm}
        onClose={() => setShowReceiptForm(false)}
        onPost={(id) => handlePostPayment(id)}
        onUnPost={(id) => handleUnpostPayment(id)}
        mode={receiptFormMode}
        initialData={selectedReceipt}
        invoice={selectedInvoice}
        availableInvoices={invoices}
        onSubmit={(data) => {
          (async () => {
            try {
              if (receiptFormMode === "create") {
                await paymentsAPI.create(data);
                toast.success("Receipt recorded successfully");
              } else {
                await paymentsAPI.update(selectedReceipt.id, data);
                toast.success("Receipt updated successfully");
              }
              setShowReceiptForm(false);
              setRefreshTrigger(prev => prev + 1);
            } catch (error) {
              console.error("Failed to save receipt:", error);
              toast.error("Failed to save receipt");
            }
          })();
        }}
      />

      {showFinancialReports && (
        <Dialog open={showFinancialReports} onOpenChange={setShowFinancialReports}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <FinancialReports invoices={invoices} payments={receipts} type="receivables" />
          </DialogContent>
        </Dialog>
      )}

      {showVATReport && (
        <Dialog open={showVATReport} onOpenChange={setShowVATReport}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <VATReport invoices={invoices} type="receivables" />
          </DialogContent>
        </Dialog>
      )}

      {selectedInvoice && (
        <InvoiceDetails 
          invoice={selectedInvoice}
          isOpen={showInvoiceDetails}
          onClose={() => setShowInvoiceDetails(false)}
          onEdit={(inv) => {
            setShowInvoiceDetails(false);
            // Handle edit logic - for now just record receipt or navigate
            handleRecordReceiptForInvoice(inv);
          }}
          onDelete={async (inv) => {
            if (window.confirm("Are you sure you want to delete this invoice?")) {
              try {
                await invoicesAPI.delete(inv.id);
                setRefreshTrigger(prev => prev + 1);
                setShowInvoiceDetails(false);
                toast.success("Invoice deleted successfully");
              } catch (error) {
                toast.error("Failed to delete invoice");
              }
            }
          }}
          onPrint={() => {}}
          onDownload={() => {}}
          onSendReminder={async (inv) => {
            try {
              await invoicesAPI.sendReminder(inv.id);
              toast.success("Reminder sent successfully");
            } catch (error) {
              toast.error("Failed to send reminder");
            }
          }}
          onDuplicate={async (inv) => {
            try {
              await invoicesAPI.duplicate(inv.id);
              setRefreshTrigger(prev => prev + 1);
              toast.success("Invoice duplicated successfully");
            } catch (error) {
              toast.error("Failed to duplicate invoice");
            }
          }}
          onRecordPayment={(inv) => {
            setShowInvoiceDetails(false);
            handleRecordReceiptForInvoice(inv);
          }}
        />
      )}

      {selectedReceipt && (
        <PaymentDetails 
          payment={selectedReceipt}
          isOpen={showPaymentDetails}
          onClose={() => setShowPaymentDetails(false)}
          onEdit={(pay) => {
            setShowPaymentDetails(false);
            handleEditReceipt(pay);
          }}
          onDelete={(pay) => {
            setShowPaymentDetails(false);
            handleDeleteReceipt(pay.id);
          }}
          onPrint={() => {}}
          onDownload={() => {}}
          onRefund={() => {
            toast.info("Refund feature coming soon");
          }}
        />
      )}

      {showPrintStatement && (
        <ReceiptStatement 
          isOpen={showPrintStatement}
          onClose={() => setShowPrintStatement(false)}
          receipts={filteredReceipts}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
}
