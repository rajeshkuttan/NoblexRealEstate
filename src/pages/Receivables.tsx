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
  DollarSign
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
import VATReport from "@/components/finance/VATReport";
import FinancialReports from "@/components/finance/FinancialReports";
import InvoiceDetails from "@/components/finance/InvoiceDetails";
import PaymentDetails from "@/components/finance/PaymentDetails";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showFinancialReports, setShowFinancialReports] = useState(false);
  const [showVATReport, setShowVATReport] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  
  // For pre-filling receipt from invoice
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, paymentsRes, statsRes] = await Promise.all([
        invoicesAPI.getAll(undefined, true),
        paymentsAPI.getAll({ limit: 500 }),
        treasuryReportsAPI.getDashboard()
      ]);
      const rawInvoices = invoicesRes.data?.data?.invoices || invoicesRes.data || [];
      const mappedInvoices = Array.isArray(rawInvoices) ? rawInvoices.map((inv: any) => {
        const amountPaid = inv.amountPaid || (inv.status === 'paid' ? parseFloat(inv.totalAmount) : 0);
        const outstanding = parseFloat(inv.totalAmount || 0) - amountPaid;
        
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
            period: inv.period || 'N/A',
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
      const mappedReceipts = Array.isArray(rawReceipts) ? rawReceipts.map((rec: any) => ({
        ...rec,
        tenant: rec.tenant?.name || rec.payeeName || 'Unknown Tenant',
        paymentNumber: rec.paymentNumber || rec.receiptNumber || `REC-${rec.id}`,
        amount: parseFloat(rec.amount || 0)
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
  };

  const handleRecordReceiptForInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setSelectedReceipt(null);
    setReceiptFormMode("create");
    setShowReceiptForm(true);
  };

  const handleEditReceipt = (receipt: any) => {
    setSelectedReceipt(receipt);
    setSelectedInvoice(null);
    setReceiptFormMode("edit");
    setShowReceiptForm(true);
  };

  const handleDeleteReceipt = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      try {
        await paymentsAPI.delete(Number(id));
        fetchData();
      } catch (error) {
        console.error("Failed to delete receipt:", error);
      }
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.lease?.unit?.property?.name || inv.property?.name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.lease?.unit?.unitNumber || inv.property?.unit)?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReceipts = receipts.filter(rec => 
    rec.paymentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.payeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.paymentReference?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Receivables</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Track incoming receipts, tenant invoices, and financial performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFinancialReports(true)} className="flex-1 md:flex-none">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowVATReport(true)} className="flex-1 md:flex-none">
            <PieChart className="h-4 w-4 mr-2" />
            VAT
          </Button>
          <Button onClick={handleAddReceipt} className="bg-gradient-primary shadow-glow flex-1 md:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Record Receipt
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-premium bg-gradient-to-br from-blue-600 to-blue-700 text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Receipt className="h-20 w-20" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-100 font-medium">Total Receivables</CardDescription>
            <CardTitle className="text-3xl font-black">{formatCurrency(stats?.totalRevenue || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-blue-100 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>+12.5% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium bg-white group hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardDescription className="font-medium text-slate-500 uppercase tracking-wider text-[10px]">Outstanding</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.pendingInvoicesAmount || 0)}</CardTitle>
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
              <CardDescription className="font-medium text-slate-500 uppercase tracking-wider text-[10px]">Received (MTD)</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.currentMonthRevenue || 0)}</CardTitle>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
              <span>Collection rate: 94%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium bg-white group hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardDescription className="font-medium text-slate-500 uppercase tracking-wider text-[10px]">Upcoming</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.nextMonthRevenue || 0)}</CardTitle>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
              <span>Due in next 30 days</span>
            </div>
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
                <TabsTrigger value="receipts" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">
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
                <Button variant="outline" size="icon" className="shadow-sm rounded-xl border-slate-200">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="shadow-sm rounded-xl border-slate-200">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <TabsContent value="invoices" className="mt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Invoice No</TableHead>
                    <TableHead className="font-bold text-slate-700">Tenant</TableHead>
                    <TableHead className="font-bold text-slate-700">Property / Unit</TableHead>
                    <TableHead className="font-bold text-slate-700">Due Date</TableHead>
                    <TableHead className="font-bold text-slate-700 text-right">Total Amount</TableHead>
                    <TableHead className="font-bold text-slate-700">Status</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary/40" />
                        Loading invoices...
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="font-bold text-slate-900">{inv.invoiceNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{inv.tenant?.name || 'Unknown'}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{inv.tenant?.id || 'TEN-000'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-slate-700 font-medium">{inv.lease?.unit?.property?.name || inv.property?.name || 'N/A'}</span>
                          <span className="text-xs text-slate-500">{inv.lease?.unit?.unitNumber || inv.property?.unit || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">{formatDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-right font-black text-slate-900">{formatCurrency(inv.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            "shadow-sm px-3",
                            inv.status === 'paid' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                            inv.status === 'overdue' ? "bg-red-100 text-red-700 border-red-200" :
                            "bg-amber-100 text-amber-700 border-amber-200"
                          )}
                        >
                          {inv.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full" title="Record Receipt" onClick={() => handleRecordReceiptForInvoice(inv)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full" title="View Details" onClick={() => {
                            setSelectedInvoice(inv);
                            setShowInvoiceDetails(true);
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
                          <span className="font-medium text-slate-800">{rec.payeeName}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{rec.payeeType}</span>
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
                        <Badge 
                          className={cn(
                            "shadow-sm px-3",
                            rec.status === 'completed' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                            rec.status === 'pending' ? "bg-slate-100 text-slate-700 border-slate-200" :
                            "bg-red-100 text-red-700 border-red-200"
                          )}
                        >
                          {rec.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px] rounded-xl shadow-premium border-slate-100">
                            <DropdownMenuLabel>Receipt Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditReceipt(rec)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit Receipt
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedReceipt(rec);
                              setShowPaymentDetails(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-blue-600">
                              <Download className="mr-2 h-4 w-4" /> Print Receipt
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700" onClick={() => handleDeleteReceipt(rec.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
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
      <ReceiptForm 
        isOpen={showReceiptForm}
        onClose={() => setShowReceiptForm(false)}
        mode={receiptFormMode}
        initialData={selectedReceipt}
        invoice={selectedInvoice}
        availableInvoices={invoices}
        onSubmit={async (data) => {
          try {
            if (receiptFormMode === "create") {
              await paymentsAPI.create(data);
            } else {
              await paymentsAPI.update(selectedReceipt.id, data);
            }
            fetchData();
            setShowReceiptForm(false);
          } catch (error) {
            console.error("Failed to save receipt:", error);
          }
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
                fetchData();
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
              fetchData();
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
    </div>
  );
}
