import { useState } from "react";
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
import InvoiceForm from "@/components/finance/InvoiceForm";
import PaymentForm from "@/components/finance/PaymentForm";
import FinancialReports from "@/components/finance/FinancialReports";
import VATReport from "@/components/finance/VATReport";
import InvoiceDetails from "@/components/finance/InvoiceDetails";
import PaymentDetails from "@/components/finance/PaymentDetails";
import PDCManagement from "@/components/finance/PDCManagement";

// Enhanced financial data with UAE compliance
const invoices = [
  {
    id: "INV-2024-001",
    invoiceNumber: "INV-2024-001",
    tenant: {
      id: 1,
      name: "Sarah Ahmed",
      email: "sarah.ahmed@email.com",
      phone: "+971 50 123 4567",
      emiratesId: "784-1985-1234567-8",
      nationality: "UAE",
      address: "Marina Heights Tower, Unit 305, Dubai Marina, Dubai, UAE"
    },
    property: {
      id: 1,
      name: "Marina Heights Tower",
      unit: "Unit 305",
      address: "Marina Walk, Dubai Marina, Dubai, UAE"
    },
    lease: {
      id: "LSE-2024-001",
      startDate: "2024-01-15",
      endDate: "2025-01-14",
      monthlyRent: 85000
    },
    invoiceDetails: {
      issueDate: "2024-03-01",
      dueDate: "2024-04-01",
      period: "March 2024",
      description: "Monthly Rent - March 2024",
      subtotal: 85000,
      vatRate: 5,
      vatAmount: 4250,
      total: 89250,
      currency: "AED",
      paymentTerms: "Net 30 days",
      lateFee: 500,
      gracePeriod: 5
    },
    status: "paid",
    paymentStatus: "completed",
    paidDate: "2024-03-28",
    paymentMethod: "Bank Transfer",
    paymentReference: "TXN-2024-001234",
    vatRegistration: "100123456789123",
    companyInfo: {
      name: "PropManage UAE Properties LLC",
      license: "DED-123456789",
      address: "Business Bay, Dubai, UAE",
      phone: "+971 4 123 4567",
      email: "info@propmanage.ae",
      vatNumber: "100123456789123"
    },
    createdDate: "2024-03-01",
    lastModified: "2024-03-28",
    createdBy: "Finance Manager",
    notes: "Payment received on time",
    attachments: ["invoice_001.pdf", "receipt_001.pdf"],
    reminders: [
      {
        date: "2024-03-15",
        type: "email",
        status: "sent"
      },
      {
        date: "2024-03-25",
        type: "sms",
        status: "sent"
      }
    ]
  },
  {
    id: "INV-2024-002",
    invoiceNumber: "INV-2024-002",
    tenant: {
      id: 2,
      name: "Mohammed Al Mansoori",
      email: "m.almansoori@email.com",
      phone: "+971 55 987 6543",
      emiratesId: "784-1980-2345678-9",
      nationality: "UAE",
      address: "Business Bay Commercial Plaza, Unit 102, Dubai, UAE"
    },
    property: {
      id: 2,
      name: "Business Bay Commercial Plaza",
      unit: "Unit 102",
      address: "Sheikh Zayed Road, Business Bay, Dubai, UAE"
    },
    lease: {
      id: "LSE-2024-002",
      startDate: "2024-03-01",
      endDate: "2025-02-28",
      monthlyRent: 120000
    },
    invoiceDetails: {
      issueDate: "2024-03-01",
      dueDate: "2024-04-01",
      period: "March 2024",
      description: "Monthly Rent - March 2024",
      subtotal: 120000,
      vatRate: 5,
      vatAmount: 6000,
      total: 126000,
      currency: "AED",
      paymentTerms: "Net 30 days",
      lateFee: 1000,
      gracePeriod: 5
    },
    status: "paid",
    paymentStatus: "completed",
    paidDate: "2024-03-30",
    paymentMethod: "Cheque",
    paymentReference: "CHQ-2024-001234",
    vatRegistration: "100123456789123",
    companyInfo: {
      name: "PropManage UAE Properties LLC",
      license: "DED-123456789",
      address: "Business Bay, Dubai, UAE",
      phone: "+971 4 123 4567",
      email: "info@propmanage.ae",
      vatNumber: "100123456789123"
    },
    createdDate: "2024-03-01",
    lastModified: "2024-03-30",
    createdBy: "Finance Manager",
    notes: "Payment received via cheque",
    attachments: ["invoice_002.pdf", "receipt_002.pdf"],
    reminders: []
  },
  {
    id: "INV-2024-003",
    invoiceNumber: "INV-2024-003",
    tenant: {
      id: 3,
      name: "Jennifer Smith",
      email: "j.smith@email.com",
      phone: "+971 52 456 7890",
      emiratesId: "784-1990-3456789-0",
      nationality: "British",
      address: "Palm Jumeirah Residences, Unit 204, Dubai, UAE"
    },
    property: {
      id: 3,
      name: "Palm Jumeirah Residences",
      unit: "Unit 204",
      address: "Palm Jumeirah, Dubai, UAE"
    },
    lease: {
      id: "LSE-2023-003",
      startDate: "2023-06-10",
      endDate: "2024-06-09",
      monthlyRent: 150000
    },
    invoiceDetails: {
      issueDate: "2024-03-01",
      dueDate: "2024-04-05",
      period: "March 2024",
      description: "Monthly Rent - March 2024",
      subtotal: 150000,
      vatRate: 5,
      vatAmount: 7500,
      total: 157500,
      currency: "AED",
      paymentTerms: "Net 30 days",
      lateFee: 750,
      gracePeriod: 5
    },
    status: "pending",
    paymentStatus: "pending",
    paidDate: null,
    paymentMethod: null,
    paymentReference: null,
    vatRegistration: "100123456789123",
    companyInfo: {
      name: "PropManage UAE Properties LLC",
      license: "DED-123456789",
      address: "Business Bay, Dubai, UAE",
      phone: "+971 4 123 4567",
      email: "info@propmanage.ae",
      vatNumber: "100123456789123"
    },
    createdDate: "2024-03-01",
    lastModified: "2024-03-01",
    createdBy: "Finance Manager",
    notes: "Payment pending",
    attachments: ["invoice_003.pdf"],
    reminders: [
      {
        date: "2024-03-15",
        type: "email",
        status: "sent"
      }
    ]
  },
  {
    id: "INV-2024-004",
    invoiceNumber: "INV-2024-004",
    tenant: {
      id: 4,
      name: "Ahmed Hassan",
      email: "a.hassan@email.com",
      phone: "+971 54 321 0987",
      emiratesId: "784-1988-4567890-1",
      nationality: "Egyptian",
      address: "Downtown Office Complex, Unit 801, Dubai, UAE"
    },
    property: {
      id: 4,
      name: "Downtown Office Complex",
      unit: "Unit 801",
      address: "Mohammed Bin Rashid Boulevard, Downtown Dubai, UAE"
    },
    lease: {
      id: "LSE-2024-004",
      startDate: "2024-02-20",
      endDate: "2025-02-19",
      monthlyRent: 95000
    },
    invoiceDetails: {
      issueDate: "2024-02-20",
      dueDate: "2024-03-20",
      period: "February 2024",
      description: "Monthly Rent - February 2024",
      subtotal: 95000,
      vatRate: 5,
      vatAmount: 4750,
      total: 99750,
      currency: "AED",
      paymentTerms: "Net 30 days",
      lateFee: 500,
      gracePeriod: 5
    },
    status: "overdue",
    paymentStatus: "overdue",
    paidDate: null,
    paymentMethod: null,
    paymentReference: null,
    vatRegistration: "100123456789123",
    companyInfo: {
      name: "PropManage UAE Properties LLC",
      license: "DED-123456789",
      address: "Business Bay, Dubai, UAE",
      phone: "+971 4 123 4567",
      email: "info@propmanage.ae",
      vatNumber: "100123456789123"
    },
    createdDate: "2024-02-20",
    lastModified: "2024-03-20",
    createdBy: "Finance Manager",
    notes: "Payment overdue - escalation required",
    attachments: ["invoice_004.pdf"],
    reminders: [
      {
        date: "2024-03-15",
        type: "email",
        status: "sent"
      },
      {
        date: "2024-03-25",
        type: "sms",
        status: "sent"
      },
      {
        date: "2024-04-01",
        type: "phone",
        status: "sent"
      }
    ]
  }
];

const payments = [
  {
    id: "PAY-2024-001",
    paymentNumber: "PAY-2024-001",
    invoiceId: "INV-2024-001",
    tenant: "Sarah Ahmed",
    amount: 89250,
    currency: "AED",
    paymentDate: "2024-03-28",
    paymentMethod: "Bank Transfer",
    paymentReference: "TXN-2024-001234",
    bankDetails: {
      bankName: "Emirates NBD",
      accountNumber: "****1234",
      transactionId: "TXN-2024-001234"
    },
    status: "completed",
    processedBy: "Finance Manager",
    notes: "Payment received on time",
    attachments: ["receipt_001.pdf", "bank_statement_001.pdf"]
  },
  {
    id: "PAY-2024-002",
    paymentNumber: "PAY-2024-002",
    invoiceId: "INV-2024-002",
    tenant: "Mohammed Al Mansoori",
    amount: 126000,
    currency: "AED",
    paymentDate: "2024-03-30",
    paymentMethod: "Cheque",
    paymentReference: "CHQ-2024-001234",
    bankDetails: {
      bankName: "ADCB",
      accountNumber: "****5678",
      transactionId: "CHQ-2024-001234"
    },
    status: "completed",
    processedBy: "Finance Manager",
    notes: "Cheque payment received",
    attachments: ["receipt_002.pdf", "cheque_copy_002.pdf"]
  }
];

const invoiceStatuses = ["All", "Paid", "Pending", "Overdue", "Cancelled"];
const paymentMethods = ["All", "Bank Transfer", "Cheque", "Cash", "Credit Card", "Online Payment"];
const sortOptions = ["Invoice Number", "Tenant Name", "Amount", "Due Date", "Status", "Issue Date"];

export default function Finance() {
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

  const filteredInvoices = invoices
    .filter((invoice) => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.property.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === "All" || invoice.status === selectedStatus.toLowerCase();
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "Tenant Name":
          return a.tenant.name.localeCompare(b.tenant.name);
        case "Amount":
          return b.invoiceDetails.total - a.invoiceDetails.total;
        case "Due Date":
          return new Date(a.invoiceDetails.dueDate).getTime() - new Date(b.invoiceDetails.dueDate).getTime();
        case "Status":
          return a.status.localeCompare(b.status);
        case "Issue Date":
          return new Date(b.invoiceDetails.issueDate).getTime() - new Date(a.invoiceDetails.issueDate).getTime();
        default:
          return a.invoiceNumber.localeCompare(b.invoiceNumber);
      }
    });

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((sum, invoice) => sum + invoice.invoiceDetails.total, 0);
  const outstandingAmount = invoices.filter(i => i.status === "pending" || i.status === "overdue").reduce((sum, invoice) => sum + invoice.invoiceDetails.total, 0);
  const totalVAT = invoices.filter(i => i.status === "paid").reduce((sum, invoice) => sum + invoice.invoiceDetails.vatAmount, 0);
  const collectionRate = (totalRevenue / (totalRevenue + outstandingAmount)) * 100;
  const paidInvoices = invoices.filter(i => i.status === "paid").length;
  const pendingInvoices = invoices.filter(i => i.status === "pending").length;
  const overdueInvoices = invoices.filter(i => i.status === "overdue").length;

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const handleInvoiceSubmit = (data: any) => {
    console.log("Invoice data:", data);
    setShowInvoiceForm(false);
  };

  const handlePaymentSubmit = (data: any) => {
    console.log("Payment data:", data);
    setShowPaymentForm(false);
  };

  const handleSendReminder = (invoice: any) => {
    // Simulate sending reminder
    const reminderData = {
      invoiceId: invoice.id,
      tenantEmail: invoice.tenant.email,
      tenantPhone: invoice.tenant.phone,
      amount: invoice.invoiceDetails.total,
      dueDate: invoice.invoiceDetails.dueDate,
      message: `Reminder: Your invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.invoiceDetails.total)} is due on ${new Date(invoice.invoiceDetails.dueDate).toLocaleDateString("en-AE")}. Please make payment to avoid late fees.`
    };
    
    // In a real app, this would send email/SMS
    console.log("Sending reminder:", reminderData);
    
    // Show success message
    alert(`Reminder sent to ${invoice.tenant.name} via email and SMS`);
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

  const handleDuplicateInvoice = (invoice: any) => {
    // Create a duplicate invoice with new number
    const duplicateInvoice = {
      ...invoice,
      id: `INV-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      invoiceNumber: `INV-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      status: "pending",
      paymentStatus: "pending",
      paidDate: null,
      paymentMethod: null,
      paymentReference: null,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      notes: "Duplicated from " + invoice.invoiceNumber
    };
    
    console.log("Duplicated invoice:", duplicateInvoice);
    alert(`Invoice duplicated as ${duplicateInvoice.invoiceNumber}`);
  };

  const handleCancelInvoice = (invoice: any) => {
    if (confirm(`Are you sure you want to cancel invoice ${invoice.invoiceNumber}?`)) {
      console.log("Cancelled invoice:", invoice);
      alert(`Invoice ${invoice.invoiceNumber} has been cancelled`);
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
                <p className="text-3xl font-bold text-foreground">AED {(totalRevenue / 1000).toFixed(0)}K</p>
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
                <p className="text-3xl font-bold text-foreground">100%</p>
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
                          <DropdownMenuItem className="text-red-600" onClick={() => handleCancelInvoice(invoice)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel Invoice
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
                                <DropdownMenuItem className="text-red-600" onClick={() => handleCancelInvoice(invoice)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Cancel Invoice
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
          onDelete={handleCancelInvoice}
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
          onDelete={(payment) => console.log("Delete payment:", payment)}
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