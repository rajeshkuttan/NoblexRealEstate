import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Banknote, 
  TrendingUp, 
  AlertCircle, 
  Download, 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Calendar, 
  CreditCard, 
  Wallet, 
  Receipt, 
  History, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Share, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Flag, 
  Award, 
  Star, 
  Heart, 
  Zap, 
  Globe, 
  Home, 
  Building2, 
  Store, 
  Warehouse, 
  Building, 
  Car, 
  Wifi, 
  Shield, 
  Settings, 
  Camera, 
  FileCheck, 
  Edit, 
  Eye, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  X, 
  Check, 
  Minus, 
  Plus as PlusIcon,
  BarChart3,
  PieChart,
  Target,
  Clock,
  CheckCircle,
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText, 
  Send, 
  MessageSquare, 
  Bell, 
  Upload, 
  Printer, 
  Mail as MailIcon, 
  ThumbsUp, 
  ThumbsDown, 
  Smile, 
  Frown, 
  Meh
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { useConfirm } from "@/hooks/use-confirm";
import { invoicesAPI, documentsAPI, paymentsAPI, treasuryReportsAPI, financialReportsAPI } from "@/services/api";
import InvoiceForm from "@/components/finance/InvoiceForm";
import FinancialReports from "@/components/finance/FinancialReports";
import VATReport from "@/components/finance/VATReport";
import InvoiceDetails from "@/components/finance/InvoiceDetails";
import PaymentDetails from "@/components/finance/PaymentDetails";
import PDCManagement from "@/components/finance/PDCManagement";

const invoiceStatuses = ["All", "Paid", "Pending", "Overdue", "Cancelled"];
const paymentMethods = ["All", "Bank Transfer", "Cheque", "Cash", "Credit Card", "Online Payment"];
const sortOptions = ["Invoice Number", "Tenant Name", "Amount", "Due Date", "Status", "Issue Date"];

export default function Finance() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "invoices"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("All");
  const [sortBy, setSortBy] = useState("Invoice Number");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showFinancialReports, setShowFinancialReports] = useState(false);
  const [showVATReport, setShowVATReport] = useState(false);
  const [showPDCManagement, setShowPDCManagement] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const { confirm, isOpen: isConfirmOpen, options: confirmOptions, onConfirm, onCancel } = useConfirm();

  // State for data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const response = await treasuryReportsAPI.getDashboard();
      if (response?.data) setDashboardData(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  };

  const fetchInvoices = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getAll(undefined, forceRefresh);
      const invoicesData = response.data?.data?.invoices || response.data || [];
      const mappedInvoices = Array.isArray(invoicesData) ? invoicesData.map((inv: any) => {
        let parsedItems: any = {};
        if (inv.items) {
             if (typeof inv.items === 'string') {
                 try { parsedItems = JSON.parse(inv.items); } catch(e) {}
             } else {
                 parsedItems = inv.items;
             }
        }
        
        const amountPaid = inv.amountPaid || (inv.status === 'paid' ? parseFloat(inv.totalAmount) : 0);
        const outstanding = parseFloat(inv.totalAmount || 0) - amountPaid;

        return {
        ...inv,
        // Ensure nested objects are accessible as expected by UI components
        tenant: inv.tenant || { name: 'Unknown Tenant' },
        property: {
            name: inv.lease?.unit?.property?.title || inv.property?.name || 'Unknown Property',
            unit: inv.lease?.unit?.unitNumber || inv.property?.unit || 'N/A',
            address: inv.lease?.unit?.property?.address || inv.property?.address || 'N/A'
        },
        lease: inv.lease || {},
        // Ensure arrays are initialized
        cheques: inv.cheques || [],
        selectedPDC: inv.cheques || [], // Alias for InvoiceDetails compatibility
        attachments: inv.documents ? inv.documents.map((d: any) => ({
             name: d.fileName,
             url: `/api/documents/${d.id}/download`, // Construct download URL
             id: d.id
        })) : [], // Map backend documents to attachments
        // Create invoiceDetails from flat backend fields if not present
        invoiceDetails: inv.invoiceDetails || {
             total: parseFloat(inv.totalAmount || 0),
             subtotal: parseFloat(inv.subtotal || 0),
             vatAmount: parseFloat(inv.taxAmount || 0),
             vatRate: parseFloat(inv.taxRate || 5),
             dueDate: inv.dueDate,
             issueDate: inv.invoiceDate,
             description: inv.description,
             period: parsedItems.period || inv.period || 'N/A',
             paymentTerms: 'Due on receipt', // Default
             lateFee: 0,
             gracePeriod: 0,
             // Calculated fields
             paid: amountPaid,
             outstanding: outstanding > 0 ? outstanding : 0
        },
        // Ensure company info exists (mock fallback if not in DB)
        companyInfo: inv.companyInfo || {
            name: "PropManage UAE Properties LLC",
            license: "DED-123456789",
            address: "Business Bay, Dubai, UAE",
            phone: "+971 4 123 4567",
            email: "info@propmanage.ae",
            vatNumber: "100123456789123"
        }
      };
    }) : [];

      setInvoices(mappedInvoices);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (forceRefresh = false) => {
    try {
      setLoadingPayments(true);
      const response = await paymentsAPI.getAll(undefined, forceRefresh);
      const paymentsData = response.data?.data?.payments || response.data?.payments || response.data || [];
      
      const mappedPayments = Array.isArray(paymentsData) ? paymentsData.map((pay: any) => ({
        ...pay,
        tenant: pay.vendor?.vendorName || pay.tenant?.name || pay.tenantName || 'N/A', // Display vendor for supplier payments
        invoiceId: pay.invoice?.invoiceNumber || pay.invoiceId || 'N/A'
      })) : [];

      setPayments(mappedPayments);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchInvoices(true);
    fetchPayments(true);
    fetchDashboardData();
  }, [location]);

  const filteredInvoices = invoices
    .map(inv => {
        // Calculate dynamic paid amount from payments list
        // Match by invoiceId string comparison to be safe
        const linkedPayments = payments.filter((p: any) => {
            const match = String(p.invoiceId) === String(inv.id) || 
            (p.invoice && String(p.invoice.id) === String(inv.id));
            return match;
        });
        const dynamicPaid = linkedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        // Use dynamic if available, otherwise fallback to existing logic
        const finalPaid = dynamicPaid > 0 ? dynamicPaid : (inv.invoiceDetails?.paid || 0);
        const finalTotal = parseFloat(inv.invoiceDetails?.total || 0);
        const finalOutstanding = finalTotal - finalPaid;

        return {
            ...inv,
            invoiceDetails: {
                ...inv.invoiceDetails,
                paid: finalPaid,
                outstanding: finalOutstanding > 0 ? finalOutstanding : 0
            }
        };
    })
    .filter((invoice) => {
      const tenantName = invoice.tenant?.name || "";
      const propertyName = invoice.property?.name || "";
      const invoiceNumber = invoice.invoiceNumber || "";

      const matchesSearch = 
        invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        propertyName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === "All" || invoice.status === selectedStatus.toLowerCase();
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "Tenant Name":
          return (a.tenant?.name || "").localeCompare(b.tenant?.name || "");
        case "Amount":
          return (b.invoiceDetails?.total || 0) - (a.invoiceDetails?.total || 0);
        case "Due Date":
          return new Date(a.invoiceDetails?.dueDate || 0).getTime() - new Date(b.invoiceDetails?.dueDate || 0).getTime();
        case "Status":
          return (a.status || "").localeCompare(b.status || "");
        case "Issue Date":
          return new Date(b.invoiceDetails?.issueDate || 0).getTime() - new Date(a.invoiceDetails?.issueDate || 0).getTime();
        default:
          return (a.invoiceNumber || "").localeCompare(b.invoiceNumber || "");
      }
    });

  const totalRevenue = invoices
    .filter(i => i.status?.toLowerCase() === "paid")
    .reduce((sum, invoice) => sum + (invoice.invoiceDetails?.total || 0), 0);
    
  const outstandingAmount = invoices
    .filter(i => i.status?.toLowerCase() === "pending" || i.status?.toLowerCase() === "overdue")
    .reduce((sum, invoice) => sum + (invoice.invoiceDetails?.total || 0), 0);
    
  // Simple VAT calculation based on revenue
  const totalVAT = totalRevenue * 0.05; 
  
  const collectionRate = totalRevenue + outstandingAmount > 0 
    ? (totalRevenue / (totalRevenue + outstandingAmount)) * 100 
    : 0;

  const paidInvoices = invoices.filter(i => i.status?.toLowerCase() === "paid").length;
  // Used in KPI cards
  const pendingInvoices = invoices.filter(i => i.status?.toLowerCase() === "pending").length;
  const overdueInvoices = invoices.filter(i => i.status?.toLowerCase() === "overdue").length;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

    const handleAddInvoice = () => {
      setFormMode("create");
      setSelectedInvoice(null);
      setShowInvoiceForm(true);
    };

  const handleEditInvoice = (invoice: any) => {
    setFormMode("edit");
    setSelectedInvoice(invoice);
    setShowInvoiceForm(true);
  };

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  const handleAddPayment = (invoice: any) => {
    navigate("/finance/payments/new", { state: { invoice } });
  };

  const handleEditPayment = (payment: any) => {
    navigate(`/finance/payments/${payment.id}`);
  };

  const handleViewPayment = (payment: any) => {
    setSelectedPayment(payment);
    setShowPaymentDetails(true);
  };

  const handleInvoiceSubmit = async (data: any, files?: File[]) => {
    try {
      let invoiceId: string | number | undefined;

      if (formMode === "create") {
         const response = await invoicesAPI.create(data);
         const createdInvoice = response.data?.data || response.data;
         invoiceId = createdInvoice?.id;
      } else {
         // Handle Document Deletion (for Edit mode)
         if (selectedInvoice && selectedInvoice.attachments) {
             const originalIds = selectedInvoice.attachments.map((a: any) => a.id).filter(Boolean);
             let currentAttachments = data.attachments || [];
             if (typeof currentAttachments === 'string') {
                 try {
                     currentAttachments = JSON.parse(currentAttachments);
                 } catch (e) {
                     console.error("Failed to parse attachments for deletion check", e);
                     currentAttachments = [];
                 }
             }
             const currentIds = currentAttachments
                 .map((a: any) => (typeof a === 'object' ? a.id : null))
                 .filter(Boolean);
             
             const idsToDelete = originalIds.filter((id: number) => !currentIds.includes(id));
             
             if (idsToDelete.length > 0) {
                 for (const id of idsToDelete) {
                     try {
                         await documentsAPI.delete(id);
                     } catch (err) {
                         console.error(`Failed to delete document ${id}`, err);
                     }
                 }
             }
         }

         await invoicesAPI.update(selectedInvoice.id, data);
         invoiceId = selectedInvoice.id;
      }

      // Handle File Uploads
      if (files && files.length > 0 && invoiceId) {
          for (const file of files) {
              try {
                const formData = new FormData();
                formData.append('file', file); 
                formData.append('entityType', 'invoice');
                formData.append('entityId', String(invoiceId));
                formData.append('documentType', 'other');      
                await documentsAPI.upload(formData);
              } catch (uploadError) {
                  console.error(`Failed to upload file ${file.name}`, uploadError);
              }
          }
      }

      setShowInvoiceForm(false);
      fetchInvoices(true);
      toast.success(formMode === "create" ? "Invoice created successfully!" : "Invoice updated successfully!");
    } catch (error: any) {
       console.error("Error saving invoice:", error);
       toast.error("Failed to save invoice. " + (error.response?.data?.message || error.message || "Unknown error"));
    }
  };

  const handleDeletePayment = async (payment: any) => {
      const confirmed = await confirm({
        title: "Delete Payment",
        description: `Are you sure you want to delete payment ${payment.paymentNumber}? This will reverse the transaction.`,
        variant: "destructive",
        confirmText: "Delete",
        cancelText: "Cancel"
      });

      if (confirmed) {
          try {
              await paymentsAPI.delete(payment.id);
              toast.success("Payment deleted successfully");
              fetchPayments();
              fetchInvoices(true);
              fetchDashboardData();
          } catch (error: any) {
              console.error("Failed to delete payment:", error);
              toast.error("Failed to delete payment");
          }
      }
  };

  const handleSendReminder = async (invoice: any) => {
    try {
      if (!invoice.tenant?.email) {
        toast.error("Cannot send reminder: Tenant email address is missing.");
        return;
      }
      
      const confirmSend = await confirm({
        title: "Send Reminder",
        description: `Send payment reminder to ${invoice.tenant.name} (${invoice.tenant.email})?`,
        variant: "default",
        confirmText: "Send",
        cancelText: "Cancel"
      });

      if (!confirmSend) return;

      await invoicesAPI.sendReminder(invoice.id);
      toast.success(`Reminder sent successfully to ${invoice.tenant.email}`);
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      const errorMessage = error.response?.data?.message || "Failed to send reminder";
      toast.error(errorMessage);
    }
  };

  const handlePrintInvoice = (invoice: any) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <html>
          <head>
            <title>Invoice ${invoice.invoiceNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .company-info { margin-bottom: 20px; }
              .invoice-details { margin-bottom: 20px; }
              .line-items { margin-bottom: 20px; }
              .totals { margin-top: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>INVOICE</h1>
              <h2>${invoice.invoiceNumber}</h2>
            </div>
            
            <div class="company-info">
              <h3>${invoice.companyInfo.name}</h3>
              <p>${invoice.companyInfo.address}</p>
              <p>Phone: ${invoice.companyInfo.phone} | Email: ${invoice.companyInfo.email}</p>
              <p>License: ${invoice.companyInfo.license} | VAT: ${invoice.companyInfo.vatNumber}</p>
            </div>
            
            <div class="invoice-details">
              <p><strong>Bill To:</strong> ${invoice.tenant.name}</p>
              <p><strong>Property:</strong> ${invoice.property.name} - ${invoice.property.unit}</p>
              <p><strong>Issue Date:</strong> ${new Date(invoice.invoiceDetails.issueDate).toLocaleDateString("en-AE")}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.invoiceDetails.dueDate).toLocaleDateString("en-AE")}</p>
              <p><strong>Period:</strong> ${invoice.invoiceDetails.period}</p>
            </div>
            
            <div class="line-items">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${invoice.invoiceDetails.description}</td>
                    <td class="text-right">${formatCurrency(invoice.invoiceDetails.subtotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="totals">
              <table>
                <tr>
                  <td><strong>Subtotal:</strong></td>
                  <td class="text-right"><strong>${formatCurrency(invoice.invoiceDetails.subtotal)}</strong></td>
                </tr>
                <tr>
                  <td>VAT (${invoice.invoiceDetails.vatRate}%):</td>
                  <td class="text-right">${formatCurrency(invoice.invoiceDetails.vatAmount)}</td>
                </tr>
                <tr>
                  <td><strong>Total:</strong></td>
                  <td class="text-right"><strong>${formatCurrency(invoice.invoiceDetails.total)}</strong></td>
                </tr>
              </table>
            </div>
            
            <div style="margin-top: 40px;">
              <p><strong>Payment Terms:</strong> ${invoice.invoiceDetails.paymentTerms}</p>
              <p><strong>Late Fee:</strong> ${formatCurrency(invoice.invoiceDetails.lateFee)} after grace period</p>
            </div>
          </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleDownloadInvoice = (invoice: any) => {
    // Create a downloadable PDF content (simplified version)
    const pdfContent = `
      Invoice: ${invoice.invoiceNumber}
      Date: ${new Date(invoice.invoiceDetails.issueDate).toLocaleDateString("en-AE")}
      Due: ${new Date(invoice.invoiceDetails.dueDate).toLocaleDateString("en-AE")}
      
      Bill To: ${invoice.tenant.name}
      Property: ${invoice.property.name} - ${invoice.property.unit}
      
      Description: ${invoice.invoiceDetails.description}
      Period: ${invoice.invoiceDetails.period}
      
      Subtotal: ${formatCurrency(invoice.invoiceDetails.subtotal)}
      VAT (5%): ${formatCurrency(invoice.invoiceDetails.vatAmount)}
      Total: ${formatCurrency(invoice.invoiceDetails.total)}
      
      Payment Terms: ${invoice.invoiceDetails.paymentTerms}
    `;
    
    // Create and download file
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${invoice.invoiceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
  };

  const handleDuplicateInvoice = async (invoice: any) => {
    const confirmed = await confirm({
      title: "Duplicate Invoice",
      description: `Are you sure you want to duplicate invoice ${invoice.invoiceNumber}?`,
      variant: "default",
      confirmText: "Duplicate",
      cancelText: "Cancel"
    });

    if (!confirmed) {
      return;
    }

    try {
      await invoicesAPI.duplicate(invoice.id);
      toast.success("Invoice duplicated successfully!");
      fetchInvoices(true);
    } catch (error) {
      console.error("Error duplicating invoice:", error);
      toast.error("Failed to duplicate invoice");
    }
  };

  const handleDeleteInvoice = async (invoice: any) => {
    if (invoice.status?.toLowerCase() === 'paid' || invoice.paymentStatus?.toLowerCase() === 'paid') {
      toast.error("Cannot delete a paid invoice. Please refund the payment first if necessary.");
      return;
    }

    const confirmed = await confirm({
      title: "Delete Invoice",
      description: `Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`,
      variant: "destructive",
      confirmText: "Delete",
      cancelText: "Cancel"
    });

    if (confirmed) {
      const previousInvoices = [...invoices];
      setInvoices(currentInvoices => currentInvoices.filter(i => i.id !== invoice.id));

      try {
        await invoicesAPI.delete(invoice.id);
        toast.success(`Invoice ${invoice.invoiceNumber} has been deleted`);
        fetchDashboardData();
        fetchPayments();
      } catch (error) {
        console.error("Error deleting invoice:", error);
        toast.error("Failed to delete invoice");
        setInvoices(previousInvoices); 
      }
    }
  };

  const handleRefundPayment = async (payment: any) => {
    const confirmed = await confirm({
      title: "Process Refund",
      description: `Are you sure you want to process a refund for payment ${payment.paymentNumber}?`,
      variant: "destructive",
      confirmText: "Refund",
      cancelText: "Cancel"
    });

    if (confirmed) {
      console.log("Processing refund for payment:", payment);
      toast.success(`Refund processed for payment ${payment.paymentNumber}`);
    }
  };

  const handleExportData = () => {
    // Export invoices and payments data
    const exportData = {
      invoices: invoices,
      payments: payments,
      exportDate: new Date().toISOString(),
      totalInvoices: invoices.length,
      totalPayments: payments.length,
      totalRevenue: totalRevenue,
      outstandingAmount: outstandingAmount
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Finance_Export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Finance data exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Finance Management</h1>
          <p className="text-muted-foreground mt-1">UAE-compliant invoicing, payments, and financial reporting</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={() => setShowVATReport(true)} className="flex-1 md:flex-none">
            <FileText className="h-4 w-4 mr-2" />
            VAT
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFinancialReports(true)} className="flex-1 md:flex-none">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPDCManagement(true)} className="flex-1 md:flex-none">
            <FileCheck className="h-4 w-4 mr-2" />
            PDC
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData} className="flex-1 md:flex-none">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-gradient-primary shadow-glow flex-1 md:flex-none" onClick={handleAddInvoice}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Total Revenue</p>
                <p className="text-xl md:text-3xl font-bold text-foreground">AED {(totalRevenue / 1000).toFixed(1)}K</p>
                <p className="text-[10px] md:text-sm text-muted-foreground">{paidInvoices} paid</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-green-100 flex-shrink-0 flex items-center justify-center">
                <Banknote className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Outstanding</p>
                <p className="text-xl md:text-3xl font-bold text-foreground">
                  {dashboardData?.totalOutstanding ? formatCurrency(dashboardData.totalOutstanding) : `AED ${(outstandingAmount / 1000).toFixed(0)}K`}
                </p>
                <p className="text-[10px] md:text-sm text-muted-foreground">{dashboardData?.pendingInvoicesCount ?? (pendingInvoices + overdueInvoices)} pending</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-yellow-100 flex-shrink-0 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Collection Rate</p>
                <p className="text-xl md:text-3xl font-bold text-foreground">
                  {dashboardData?.collectionRate ? `${dashboardData.collectionRate.toFixed(1)}%` : `${collectionRate.toFixed(0)}%`}
                </p>
                <p className="text-[10px] md:text-sm text-muted-foreground truncate">
                  {dashboardData?.collectionRate >= 90 ? "Above target" : "Needs attention"}
                </p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-blue-100 flex-shrink-0 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">VAT Collected</p>
                <p className="text-xl md:text-3xl font-bold text-foreground">
                  {dashboardData?.totalVAT ? formatCurrency(dashboardData.totalVAT) : `AED ${(totalVAT / 1000).toFixed(0)}K`}
                </p>
                <p className="text-[10px] md:text-sm text-muted-foreground truncate">This period</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-purple-100 flex-shrink-0 flex items-center justify-center">
                <Shield className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Overdue</p>
                <p className="text-xl md:text-3xl font-bold text-foreground">{dashboardData?.overdueInvoicesCount ?? overdueInvoices}</p>
                <p className="text-[10px] md:text-sm text-muted-foreground truncate">Need attention</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-red-100 flex-shrink-0 flex items-center justify-center">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">VAT Compliance</p>
                <p className="text-xl md:text-3xl font-bold text-foreground">{dashboardData?.vatComplianceRate ? `${dashboardData.vatComplianceRate.toFixed(1)}%` : "100%"}</p>
                <p className="text-[10px] md:text-sm text-muted-foreground truncate">FTA Registered</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-green-100 flex-shrink-0 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices, tenants, or properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-primary text-primary-foreground")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  Sort by {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="p-4 md:p-6 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
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

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Method</label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger className="h-9">
                  <SelectValue />
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

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date Range</label>
              <Input type="date" className="h-9" />
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full h-9 hover:bg-muted"
                onClick={() => {
                  setSelectedStatus("All Status");
                  setSelectedPaymentMethod("All Methods");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4 pt-4">
          {loading ? (
             <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
             </div>
          ) : viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
                          <p className="text-xs text-muted-foreground truncate">{invoice.tenant.name}</p>
                        </div>
                      </div>
                      <Badge className={cn("px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-wider", getStatusColor(invoice.status))}>
                        {invoice.status}
                      </Badge>
                    </div>

                    {/* Invoice Details */}
                    <div className="grid grid-cols-2 gap-4 mb-5 p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Amount</p>
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(invoice.invoiceDetails.total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Period</p>
                        <p className="text-sm font-medium truncate">{invoice.invoiceDetails.period}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Due Date</p>
                        <p className="text-sm font-medium">
                          {new Date(invoice.invoiceDetails.dueDate).toLocaleDateString("en-AE")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">VAT (5%)</p>
                        <p className="text-xs font-medium text-muted-foreground">
                          {formatCurrency(invoice.invoiceDetails.vatAmount)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => handleViewInvoice(invoice)}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Details
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handlePrintInvoice(invoice)}>
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewInvoice(invoice)} className="text-xs cursor-pointer">
                            <Eye className="h-3.5 w-3.5 mr-2 opacity-70" />
                            View Full Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditInvoice(invoice)} className="text-xs cursor-pointer">
                            <Edit className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Edit Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddPayment(invoice)} className="text-xs cursor-pointer">
                            <CreditCard className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Record Payment
                          </DropdownMenuItem>
                          <Separator className="my-1" />
                          <DropdownMenuItem onClick={() => handlePrintInvoice(invoice)} className="text-xs cursor-pointer">
                            <Printer className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Print
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)} className="text-xs cursor-pointer">
                            <Download className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendReminder(invoice)} className="text-xs cursor-pointer">
                            <Send className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Send Reminder
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateInvoice(invoice)} className="text-xs cursor-pointer">
                            <Copy className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Duplicate
                          </DropdownMenuItem>
                          <Separator className="my-1" />
                          <DropdownMenuItem className="text-xs cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDeleteInvoice(invoice)}>
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
          )}

          {/* List View */}
          {viewMode === "list" && (
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
                            <p className="text-[10px] text-muted-foreground">{invoice.invoiceDetails.period}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <div className="min-w-[150px]">
                            <p className="font-medium text-foreground">{invoice.tenant.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{invoice.tenant.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <div className="min-w-[150px]">
                            <p className="font-medium text-foreground">{invoice.property.name}</p>
                            <p className="text-[10px] text-muted-foreground">{invoice.property.unit}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="min-w-[100px]">
                            <p className="font-bold text-foreground">{formatCurrency(invoice.invoiceDetails.total)}</p>
                            <p className="text-[10px] text-muted-foreground">VAT: {formatCurrency(invoice.invoiceDetails.vatAmount)}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden xl:table-cell">
                          <p className="font-medium text-muted-foreground">
                            {new Date(invoice.invoiceDetails.dueDate).toLocaleDateString("en-AE")}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={cn("px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-wider", getStatusColor(invoice.status))}>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewInvoice(invoice)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleViewInvoice(invoice)} className="text-xs">
                                  <Eye className="h-3.5 w-3.5 mr-2 opacity-70" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditInvoice(invoice)} className="text-xs">
                                  <Edit className="h-3.5 w-3.5 mr-2 opacity-70" />
                                  Edit Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddPayment(invoice)} className="text-xs">
                                  <CreditCard className="h-3.5 w-3.5 mr-2 opacity-70" />
                                  Record Payment
                                </DropdownMenuItem>
                                <Separator className="my-1" />
                                <DropdownMenuItem onClick={() => handlePrintInvoice(invoice)} className="text-xs cursor-pointer">
                                  <Printer className="h-3.5 w-3.5 mr-2 opacity-70" />
                                  Print
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)} className="text-xs cursor-pointer">
                                  <Download className="h-3.5 w-3.5 mr-2 opacity-70" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendReminder(invoice)} className="text-xs cursor-pointer">
                                  <Send className="h-3.5 w-3.5 mr-2 opacity-70" />
                                  Send Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateInvoice(invoice)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteInvoice(invoice)}>
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

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <Button className="bg-gradient-primary shadow-glow" onClick={() => navigate("/finance/payments/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>
          
          {loadingPayments ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {payments.map((payment) => (
                <Card key={payment.id} className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group border-border/50 hover:border-primary/50">
                  <CardContent className="p-5">
                    {/* Payment Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Banknote className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {payment.paymentNumber}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">{payment.tenant}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={cn("px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-wider", getStatusColor(payment.status))}>
                          {payment.status}
                        </Badge>
                        {payment.isPosted && (
                          <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-wider border-green-200 bg-green-50 text-green-700">
                            POSTED
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="grid grid-cols-2 gap-4 mb-5 p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Amount</p>
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Date</p>
                        <p className="text-sm font-medium">
                          {new Date(payment.paymentDate).toLocaleDateString("en-AE")}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleViewPayment(payment)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEditPayment(payment)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => !payment.isPosted && handleDeletePayment(payment)} disabled={payment.isPosted}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="p-8 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Financial Reports</h3>
            <p className="text-muted-foreground mb-4">Comprehensive financial analytics and reporting</p>
            <Button onClick={() => setShowFinancialReports(true)}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </Card>
        </TabsContent>

        {/* VAT Tab */}
        <TabsContent value="vat" className="space-y-4">
          <Card className="p-8 text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">VAT Compliance</h3>
            <p className="text-muted-foreground mb-4">UAE VAT reporting and compliance management</p>
            <Button onClick={() => setShowVATReport(true)}>
              <FileText className="h-4 w-4 mr-2" />
              VAT Report
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Empty States */}
      {!loading && activeTab === "invoices" && filteredInvoices.length === 0 && (
        <Card className="p-12 text-center">
          <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Invoices Found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search criteria or create a new invoice.
          </p>
          <Button className="bg-gradient-primary shadow-glow" onClick={handleAddInvoice}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Invoice
          </Button>
        </Card>
      )}

      {!loadingPayments && activeTab === "payments" && payments.length === 0 && (
        <Card className="p-12 text-center">
          <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Payments Found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search criteria or record a new payment.
          </p>
          <Button className="bg-gradient-primary shadow-glow" onClick={() => navigate("/finance/payments/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Record Your First Payment
          </Button>
        </Card>
      )}

      {/* Invoice Form Modal */}
      <InvoiceForm
        isOpen={showInvoiceForm}
        onClose={() => setShowInvoiceForm(false)}
        onSubmit={handleInvoiceSubmit}
        initialData={selectedInvoice}
        mode={formMode}
      />

      {/* Payment Form Modal */}
      {/* Financial Reports Modal */}
      {showFinancialReports && (
        <Dialog open={showFinancialReports} onOpenChange={setShowFinancialReports}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <FinancialReports invoices={invoices} payments={payments} />
          </DialogContent>
        </Dialog>
      )}

      {/* VAT Report Modal */}
      {showVATReport && (
        <Dialog open={showVATReport} onOpenChange={setShowVATReport}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <VATReport invoices={invoices} />
          </DialogContent>
        </Dialog>
      )}

      {/* Invoice Details Modal */}
      {showInvoiceDetails && selectedInvoice && (
        <InvoiceDetails
          invoice={selectedInvoice}
          isOpen={showInvoiceDetails}
          onClose={() => setShowInvoiceDetails(false)}
          onEdit={handleEditInvoice}
          onDelete={handleDeleteInvoice}
          onPrint={handlePrintInvoice}
          onDownload={handleDownloadInvoice}
          onSendReminder={handleSendReminder}
          onDuplicate={handleDuplicateInvoice}
          onRecordPayment={handleAddPayment}
        />
      )}

      {/* Payment Details Modal */}
      {showPaymentDetails && selectedPayment && (
        <PaymentDetails
          payment={selectedPayment}
          isOpen={showPaymentDetails}
          onClose={() => setShowPaymentDetails(false)}
          onEdit={handleEditPayment}
          onDelete={handleDeletePayment}
          onPrint={(payment) => console.log("Print payment:", payment)}
          onDownload={(payment) => console.log("Download payment:", payment)}
          onRefund={handleRefundPayment}
        />
      )}

      {/* PDC Management Modal */}
      {showPDCManagement && (
        <PDCManagement
          isOpen={showPDCManagement}
          onClose={() => setShowPDCManagement(false)}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={onCancel}
        onConfirm={onConfirm}
        title={confirmOptions?.title || "Confirm Action"}
        description={confirmOptions?.description || "Are you sure you want to proceed?"}
        confirmText={confirmOptions?.confirmText}
        cancelText={confirmOptions?.cancelText}
        variant={confirmOptions?.variant}
      />
    </div>
  );
}