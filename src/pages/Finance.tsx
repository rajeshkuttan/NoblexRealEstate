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
import { printDocument, generateVoucherHtml } from "@/utils/printUtils";
import InvoiceForm from "@/components/finance/InvoiceForm";
import FinancialReports from "@/components/finance/FinancialReports";
import VATReport from "@/components/finance/VATReport";
import InvoiceDetails from "@/components/finance/InvoiceDetails";
import PaymentDetails from "@/components/finance/PaymentDetails";
import PDCManagement from "@/components/finance/PDCManagement";

import MetricCard from "@/components/dashboard/MetricCard";

const invoiceStatuses = ["All", "Paid", "Pending", "Overdue", "Cancelled"];
const paymentMethods = ["All", "Bank Transfer", "Cheque", "Cash", "Credit Card", "Online Payment"];
const sortOptions = ["Invoice Number", "Tenant Name", "Amount", "Due Date", "Status", "Issue Date"];

export default function Finance() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "payments"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
  const [filterKey, setFilterKey] = useState(0);
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
        tenantName: pay.vendor?.vendorName || pay.tenant?.name || pay.tenantName || 'N/A',
        invoiceId: pay.invoice?.invoiceNumber || pay.invoiceId || 'N/A',
        propertyName: pay.invoice?.lease?.unit?.property?.title || (pay.invoice?.property?.name) || 'N/A'
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
        const linkedPayments = payments.filter((p: any) => {
            const match = String(p.invoiceId) === String(inv.id) || 
            (p.invoice && String(p.invoice.id) === String(inv.id));
            return match;
        });
        const dynamicPaid = linkedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
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
      
      const matchesStatus = selectedStatus === "All" || invoice.status?.toLowerCase() === selectedStatus.toLowerCase();
      
      const invoiceDate = new Date(invoice.invoiceDate || invoice.invoiceDetails?.issueDate);
      const matchesDate = (!startDate || invoiceDate >= new Date(startDate)) && 
                          (!endDate || invoiceDate <= new Date(endDate));

      return matchesSearch && matchesStatus && matchesDate;
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

  const filteredPayments = payments
    .filter((payment) => {
      const tenantName = payment.tenantName || payment.tenant?.name || payment.payeeName || "";
      const paymentNumber = payment.paymentNumber || "";
      const invoiceId = String(payment.invoiceId || "");
      const propertyName = payment.propertyName || "";

      const matchesSearch = 
        paymentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        propertyName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === "All" || payment.status?.toLowerCase() === selectedStatus.toLowerCase();
      const matchesMethod = selectedPaymentMethod === "All" || payment.paymentMethod?.toLowerCase() === selectedPaymentMethod.toLowerCase();
      
      const payDate = new Date(payment.paymentDate);
      const matchesDate = (!startDate || payDate >= new Date(startDate)) && 
                          (!endDate || payDate <= new Date(endDate));

      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    })
    .sort((a, b) => {
      // Use the same sortBy state but adapt for payment fields
      switch (sortBy) {
        case "Tenant Name":
          return (a.tenantName || a.tenant?.name || "").localeCompare(b.tenantName || b.tenant?.name || "");
        case "Amount":
          return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
        case "Due Date": // Map to Payment Date
        case "Issue Date":
          return new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime();
        case "Status":
          return (a.status || "").localeCompare(b.status || "");
        default:
          return (a.paymentNumber || "").localeCompare(b.paymentNumber || "");
      }
    });

  // KPI Calculations - use filtered data for dynamic updates or invoices for global view
  const targetInvoices = searchQuery || selectedStatus !== "All" || startDate || endDate ? filteredInvoices : invoices;
  const targetPayments = searchQuery || selectedPaymentMethod !== "All" || startDate || endDate ? filteredPayments : payments;

  const totalRevenue = targetInvoices
    .filter(i => i.status?.toLowerCase() === "paid")
    .reduce((sum, invoice) => sum + (parseFloat(invoice.invoiceDetails?.total) || 0), 0);
    
  const outstandingAmount = targetInvoices
    .filter(i => i.status?.toLowerCase() === "pending" || i.status?.toLowerCase() === "overdue")
    .reduce((sum, invoice) => sum + (parseFloat(invoice.invoiceDetails?.total) || 0) - (parseFloat(invoice.invoiceDetails?.paid) || 0), 0);
    
  const totalVAT = targetInvoices
    .filter(i => i.status?.toLowerCase() === "paid")
    .reduce((sum, invoice) => sum + (parseFloat(invoice.invoiceDetails?.vatAmount) || 0), 0);
  
  const collectionRate = totalRevenue + outstandingAmount > 0 
    ? (totalRevenue / (totalRevenue + outstandingAmount)) * 100 
    : 0;

  const paidInvoicesCount = targetInvoices.filter(i => i.status?.toLowerCase() === "paid").length;
  const pendingInvoicesCount = targetInvoices.filter(i => i.status?.toLowerCase() === "pending").length;
  const overdueInvoicesCount = targetInvoices.filter(i => i.status?.toLowerCase() === "overdue").length;

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

  const handlePrintPayment = async (payment: any) => {
    try {
      // Fetch full payment to get enriched details (ledger info)
      const res = await paymentsAPI.getById(payment.id);
      const fullPayment = res.data?.data || res.data;
      
      if (!fullPayment) throw new Error("Could not fetch full payment details");

      const htmlContent = generateVoucherHtml(fullPayment, 'payment');
      printDocument(`Payment Voucher - ${fullPayment.paymentNumber}`, htmlContent);
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to generate print view");
    }
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
              fetchPayments(true);
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

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedStatus("All");
    setSelectedPaymentMethod("All");
    setStartDate("");
    setEndDate("");
    setSortBy("Invoice Number");
    setFilterKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6 uiux-page-enter">
      {/* Header */}
      <div className="uiux-page-header flex-col md:flex-row items-start md:items-center gap-4">
        <div>
          <h1 className="uiux-page-title">Payables</h1>
          <p className="uiux-page-subtitle">Payments, Reports and VAT compliance tracking</p>
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
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Received"
          value={formatCurrency(totalRevenue)}
          change={`${paidInvoicesCount} payments collected`}
          changeType="positive"
          icon={Banknote}
          gradient="primary"
        />

        <MetricCard
          title="VAT Collected"
          value={formatCurrency(totalVAT)}
          change="Tax liability this period"
          changeType="neutral"
          icon={Shield}
          gradient="primary"
        />

        <MetricCard
          title="Reports Generated"
          value="24"
          change="Last 30 days"
          changeType="neutral"
          icon={BarChart3}
          gradient="secondary"
        />

        <MetricCard
          title="VAT Compliance"
          value="100%"
          change="FTA Registered"
          changeType="positive"
          icon={CheckCircle}
          gradient="secondary"
        />
      </div>

      {/* Controls - Only show for Payments tab */}
      {activeTab === "payments" && (
        <>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments, tenants, or invoice IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 shadow-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn("h-10", showFilters && "bg-primary text-primary-foreground hover:bg-primary/90")}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44 h-10 shadow-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      Sort by {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="p-4 md:p-6 shadow-md border-primary/10 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Status</label>
                  <Select 
                    key={`status-${filterKey}`}
                    value={selectedStatus} 
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger className="h-10">
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

                {/* Show Payment Method filter */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Payment Method</label>
                  <Select 
                    key={`method-${filterKey}`}
                    value={selectedPaymentMethod} 
                    onValueChange={setSelectedPaymentMethod}
                  >
                    <SelectTrigger className="h-10">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Start Date</label>
                    <Input 
                      type="date" 
                      className="h-10" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">End Date</label>
                    <Input 
                      type="date" 
                      className="h-10" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    className="w-full h-10 border-dashed hover:border-primary hover:text-primary transition-colors"
                    onClick={handleClearFilters}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
        </TabsList>

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
              {filteredPayments.map((payment) => (
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
                          <p className="text-xs text-muted-foreground truncate">{payment.tenantName || payment.tenant?.name}</p>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handlePrintPayment(payment)}>
                          <Printer className="h-4 w-4" />
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

      {/* Empty States - Payments */}
      {!loadingPayments && activeTab === "payments" && filteredPayments.length === 0 && payments.length === 0 && (
        <Card className="p-12 text-center border-dashed border-2">
          <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-foreground mb-2">No Payments Recorded</h3>
          <p className="text-muted-foreground mb-6">No payment records found in the system.</p>
          <Button className="bg-gradient-primary shadow-glow h-11 px-8" onClick={() => navigate("/finance/payments/new")}>
            <Plus className="h-5 w-5 mr-2" />
            Record Your First Payment
          </Button>
        </Card>
      )}

      {!loadingPayments && activeTab === "payments" && filteredPayments.length === 0 && payments.length > 0 && (
        <Card className="p-12 text-center">
          <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Matching Payments</h3>
          <p className="text-muted-foreground mb-4">We couldn't find any payments matching your current filters.</p>
          <Button variant="outline" onClick={handleClearFilters}>Clear All Filters</Button>
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
          onPrint={handlePrintPayment}
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