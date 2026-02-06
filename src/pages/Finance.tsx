import { useEffect, useState } from "react";
import { 
  DollarSign, 
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
  Banknote, 
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
  Stop, 
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
import { invoicesAPI, documentsAPI, paymentsAPI } from "@/services/api";
import InvoiceForm from "@/components/finance/InvoiceForm";
import PaymentForm from "@/components/finance/PaymentForm";
import FinancialReports from "@/components/finance/FinancialReports";
import VATReport from "@/components/finance/VATReport";
import InvoiceDetails from "@/components/finance/InvoiceDetails";
import PaymentDetails from "@/components/finance/PaymentDetails";
import PDCManagement from "@/components/finance/PDCManagement";

const invoiceStatuses = ["All", "Paid", "Pending", "Overdue", "Cancelled"];
const paymentMethods = ["All", "Bank Transfer", "Cheque", "Cash", "Credit Card", "Online Payment"];
const sortOptions = ["Invoice Number", "Tenant Name", "Amount", "Due Date", "Status", "Issue Date"];

export default function Finance() {
  const [activeTab, setActiveTab] = useState("overview"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("All");
  const [sortBy, setSortBy] = useState("Invoice Number");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showFinancialReports, setShowFinancialReports] = useState(false);
  const [showVATReport, setShowVATReport] = useState(false);
  const [showPDCManagement, setShowPDCManagement] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  // State for data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getAll(undefined, forceRefresh);
      console.log("Invoice API Response:", response);
      const invoicesData = response.data?.data?.invoices || response.data || [];
      console.log("Raw Invoices Data:", invoicesData);
      
      // Map backend data to frontend structure
      const mappedInvoices = Array.isArray(invoicesData) ? invoicesData.map((inv: any) => {
        // Parse items if string (JSON column)
        let parsedItems = {};
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

  const fetchPayments = async () => {
    try {
      const response = await paymentsAPI.getAll();
      const paymentsData = response.data?.data?.payments || response.data?.payments || response.data || [];
      
      const mappedPayments = Array.isArray(paymentsData) ? paymentsData.map((pay: any) => ({
        ...pay,
        tenant: pay.tenant?.name || pay.tenantName || 'Unknown Tenant', // Fallback for display
        invoiceId: pay.invoice?.invoiceNumber || pay.invoiceId || 'N/A'
      })) : [];

      setPayments(mappedPayments);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchPayments();
  }, []);

  const filteredInvoices = invoices
    .map(inv => {
        // Calculate dynamic paid amount from payments list
        // Match by invoiceId string comparison to be safe
        const linkedPayments = payments.filter((p: any) => {
            const match = String(p.invoiceId) === String(inv.id) || 
            (p.invoice && String(p.invoice.id) === String(inv.id));
            if (match) console.log(`Found payment match for Invoice ${inv.id}:`, p);
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
    setSelectedInvoice(invoice);
    setFormMode("create");
    setSelectedPayment(null);
    setShowPaymentForm(true);
  };

  const handleEditPayment = (payment: any) => {
    setFormMode("edit");
    setSelectedPayment(payment);
    setShowPaymentForm(true);
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
                 console.log("Deleting removed documents:", idsToDelete);
                 // Delete sequentially to avoid overwhelming partial failures
                 for (const id of idsToDelete) {
                     try {
                         await documentsAPI.delete(id);
                         console.log(`Deleted document ${id}`);
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
          console.log(`Uploading ${files.length} files for invoice ${invoiceId}`);
          // Upload files sequentially
          for (const file of files) {
              try {
                const formData = new FormData();
                formData.append('file', file); // Field name must match backend multer config (router.post('/upload', upload.single('file')...)
                formData.append('entityType', 'invoice');
                formData.append('entityId', String(invoiceId));
                formData.append('documentType', 'other');
                
                await documentsAPI.upload(formData);
                console.log(`Uploaded file: ${file.name}`);
              } catch (uploadError) {
                  console.error(`Failed to upload file ${file.name}`, uploadError);
                  // Continue uploading others even if one fails
              }
          }
      }

      setShowInvoiceForm(false);
      fetchInvoices(true); // Refresh list with skipCache
      alert(formMode === "create" ? "Invoice created successfully!" : "Invoice updated successfully!");
    } catch (error: any) {
       console.error("Error saving invoice:", error);
       alert("Failed to save invoice. " + (error.response?.data?.message || error.message || "Unknown error"));
    }
  };

  const handlePaymentSubmit = async (data: any) => {
    try {
      // Map frontend form data to backend model structure
      // Map payment method to match backend ENUM
      let mappedMethod = data.paymentDetails?.paymentMethod;
      if (mappedMethod === 'online_payment') mappedMethod = 'online';
      if (mappedMethod === 'pdc') mappedMethod = 'cheque'; 

      // Map status to match backend ENUM
      let mappedStatus = data.status;
      if (mappedStatus === 'completed') mappedStatus = 'paid';
      if (mappedStatus === 'failed') mappedStatus = 'cancelled';

      const backendPayload = {
        paymentNumber: data.paymentNumber,
        paymentDate: data.paymentDate,
        amount: data.paymentDetails?.amount,
        paymentMethod: mappedMethod,
        reference: data.paymentDetails?.paymentReference,
        status: mappedStatus,
        notes: data.notes,
        description: data.paymentPurpose?.description,
        bankDetails: data.paymentDetails?.bankDetails,
        
        // IDs
        invoiceId: data.invoice?.id, // Explicitly send invoiceId
        leaseId: data.invoice?.leaseId, // Now capturing this from form
        tenantId: data.payeeInfo?.payeeId || data.invoice?.tenantId,
        
        // Dates
        dueDate: data.paymentDate, // Defaulting due date to payment date for now
        
        // JSON fields if needed, or mapped to specific cols
        category: data.paymentPurpose?.category,
      };

      // Validation check for required fields
      if (!backendPayload.paymentNumber || !backendPayload.amount || !backendPayload.leaseId || !backendPayload.tenantId) {
          console.error("Missing required fields for payment creation:", backendPayload);
          // Fallback: If leaseId is missing (e.g. manual payment without invoice selection), we might need to find it or alert
          if (!backendPayload.leaseId) {
             alert("Error: Lease Information is missing. Please ensure an invoice or lease is selected.");
             return;
          }
      }

      if (formMode === "create") {
        await paymentsAPI.create(backendPayload);
        alert("Payment recorded successfully!");
      } else {
        if (selectedPayment) {
           await paymentsAPI.update(selectedPayment.id, backendPayload);
           alert("Payment updated successfully!");
        }
      }
      setShowPaymentForm(false);
      fetchPayments();
      fetchInvoices(true); // Refresh invoices as payment status might change
    } catch (error: any) {
      console.error("Error saving payment:", error);
      alert("Failed to save payment: " + (error.response?.data?.message || error.message));
    }
  };

  const handleDeletePayment = async (payment: any) => {
      if (confirm(`Are you sure you want to delete payment ${payment.paymentNumber}? This will reverse the transaction.`)) {
          try {
              await paymentsAPI.delete(payment.id);
              alert("Payment deleted successfully");
              fetchPayments();
              fetchInvoices(true);
          } catch (error: any) {
              console.error("Failed to delete payment:", error);
              alert("Failed to delete payment");
          }
      }
  };

  const handleSendReminder = async (invoice: any) => {
    try {
      if (!invoice.tenant?.email) {
        alert("Cannot send reminder: Tenant email address is missing.");
        return;
      }
      
      const confirmSend = confirm(`Send payment reminder to ${invoice.tenant.name} (${invoice.tenant.email})?`);
      if (!confirmSend) return;

      await invoicesAPI.sendReminder(invoice.id);
      alert(`Reminder sent successfully to ${invoice.tenant.email}`);
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      const errorMessage = error.response?.data?.message || "Failed to send reminder";
      alert(errorMessage);
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
    
    console.log("Downloaded invoice:", invoice.invoiceNumber);
  };

  const handleDuplicateInvoice = async (invoice: any) => {
    if (!confirm(`Are you sure you want to duplicate invoice ${invoice.invoiceNumber}?`)) {
      return;
    }

    try {
      await invoicesAPI.duplicate(invoice.id);
      alert("Invoice duplicated successfully!");
      fetchInvoices(true); // Refresh list
    } catch (error) {
      console.error("Error duplicating invoice:", error);
      alert("Failed to duplicate invoice");
    }
  };

  const handleDeleteInvoice = async (invoice: any) => {
    if (invoice.status?.toLowerCase() === 'paid' || invoice.paymentStatus?.toLowerCase() === 'paid') {
      alert("Cannot delete a paid invoice. Please refund the payment first if necessary.");
      return;
    }

    if (confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`)) {
      // Optimistic update: Remove from UI immediately
      const previousInvoices = [...invoices];
      setInvoices(currentInvoices => currentInvoices.filter(i => i.id !== invoice.id));

      try {
        await invoicesAPI.delete(invoice.id);
        alert(`Invoice ${invoice.invoiceNumber} has been deleted`);
        // Do not call fetchInvoices() immediately to avoid restoring cached (stale) data
      } catch (error) {
        console.error("Error deleting invoice:", error);
        alert("Failed to delete invoice");
        setInvoices(previousInvoices); // Revert UI on failure
      }
    }
  };

  const handleRefundPayment = (payment: any) => {
    if (confirm(`Are you sure you want to process a refund for payment ${payment.paymentNumber}?`)) {
      console.log("Processing refund for payment:", payment);
      alert(`Refund processed for payment ${payment.paymentNumber}`);
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
    
    console.log("Exported finance data");
    alert("Finance data exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Finance Management</h1>
          <p className="text-muted-foreground mt-2">UAE-compliant invoicing, payments, and financial reporting</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowVATReport(true)}>
            <FileText className="h-4 w-4 mr-2" />
            VAT Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFinancialReports(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPDCManagement(true)}>
            <FileCheck className="h-4 w-4 mr-2" />
            PDC Management
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-gradient-primary shadow-glow" onClick={handleAddInvoice}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold text-foreground">AED {(totalRevenue / 1000).toFixed(1)}K</p>
                <p className="text-sm text-muted-foreground">{paidInvoices} paid invoices</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                <p className="text-3xl font-bold text-foreground">AED {(outstandingAmount / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">{pendingInvoices + overdueInvoices} pending</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                <p className="text-3xl font-bold text-foreground">{collectionRate.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Above target (90%)</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">VAT Collected</p>
                <p className="text-3xl font-bold text-foreground">AED {(totalVAT / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">This quarter</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-foreground">{overdueInvoices}</p>
                <p className="text-sm text-muted-foreground">Need attention</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-red-600" />
            </div>
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">UAE Compliant</p>
                <p className="text-3xl font-bold text-foreground">AED {(outstandingAmount / 1000).toFixed(1)}K</p>
                <p className="text-sm text-muted-foreground">VAT registered</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
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
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
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
              <label className="text-sm font-medium text-foreground mb-2 block">Payment Method</label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
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
              <label className="text-sm font-medium text-foreground mb-2 block">Date Range</label>
              <Input type="date" />
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInvoices.map((invoice) => (
                <Card key={invoice.id} className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group">
                  <CardContent className="p-6">
                    {/* Invoice Header */}
                <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-white" />
                        </div>
                  <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {invoice.invoiceNumber}
                          </h3>
                          <p className="text-sm text-muted-foreground">{invoice.tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{invoice.property.name}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>

                    {/* Invoice Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Amount</span>
                        <span className="text-lg font-bold text-foreground">
                          {formatCurrency(invoice.invoiceDetails.total)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">VAT (5%)</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(invoice.invoiceDetails.vatAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Due Date</span>
                        <span className="text-sm font-medium">
                          {new Date(invoice.invoiceDetails.dueDate).toLocaleDateString("en-AE")}
                        </span>
                  </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Period</span>
                        <span className="text-sm font-medium">{invoice.invoiceDetails.period}</span>
                  </div>
                </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-border">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewInvoice(invoice)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrintInvoice(invoice)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddPayment(invoice)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Record Payment
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintInvoice(invoice)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Print Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendReminder(invoice)}>
                            <Send className="h-4 w-4 mr-2" />
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left p-6 font-medium text-muted-foreground">Invoice</th>
                      <th className="text-left p-6 font-medium text-muted-foreground">Tenant</th>
                      <th className="text-left p-6 font-medium text-muted-foreground">Property</th>
                      <th className="text-left p-6 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-6 font-medium text-muted-foreground">Due Date</th>
                      <th className="text-left p-6 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-6 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="p-6">
                          <div>
                            <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-muted-foreground">{invoice.invoiceDetails.period}</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <div>
                            <p className="font-medium text-foreground">{invoice.tenant.name}</p>
                            <p className="text-sm text-muted-foreground">{invoice.tenant.email}</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <div>
                            <p className="font-medium text-foreground">{invoice.property.name}</p>
                            <p className="text-sm text-muted-foreground">{invoice.property.unit}</p>
                          </div>
                        </td>
                        <td className="p-6">
                  <div>
                            <p className="font-medium">{formatCurrency(invoice.invoiceDetails.total)}</p>
                            <p className="text-sm text-muted-foreground">VAT: {formatCurrency(invoice.invoiceDetails.vatAmount)}</p>
                  </div>
                        </td>
                        <td className="p-6">
                  <div>
                            <p className="text-sm font-medium">{new Date(invoice.invoiceDetails.dueDate).toLocaleDateString("en-AE")}</p>
                            <p className="text-sm text-muted-foreground">{invoice.invoiceDetails.paymentTerms}</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewInvoice(invoice)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditInvoice(invoice)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleAddPayment(invoice)}>
                              <CreditCard className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddPayment(invoice)}>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Record Payment
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrintInvoice(invoice)}>
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendReminder(invoice)}>
                                  <Send className="h-4 w-4 mr-2" />
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
        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <Button onClick={() => setShowPaymentForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payments.map((payment) => (
              <Card key={payment.id} className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                        <h3 className="font-semibold text-foreground">{payment.paymentNumber}</h3>
                        <p className="text-sm text-muted-foreground">{payment.tenant}</p>
                        <p className="text-xs text-muted-foreground">{payment.paymentMethod}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {payment.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="font-bold">{formatCurrency(payment.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Date</span>
                      <span className="text-sm">{new Date(payment.paymentDate).toLocaleDateString("en-AE")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Reference</span>
                      <span className="text-sm font-mono">{payment.paymentReference}</span>
                  </div>
                </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewPayment(payment)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditPayment(payment)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeletePayment(payment)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                </CardContent>
            </Card>
          ))}
          </div>
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

      {/* Empty State */}
      {filteredInvoices.length === 0 && (
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

      {/* Invoice Form Modal */}
      <InvoiceForm
        isOpen={showInvoiceForm}
        onClose={() => setShowInvoiceForm(false)}
        onSubmit={handleInvoiceSubmit}
        initialData={selectedInvoice}
        mode={formMode}
      />

      {/* Payment Form Modal */}
      <PaymentForm
        isOpen={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        onSubmit={handlePaymentSubmit}
        initialData={selectedPayment}
        mode={formMode}
        invoice={selectedInvoice}
        availableInvoices={invoices}
      />

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
    </div>
  );
}