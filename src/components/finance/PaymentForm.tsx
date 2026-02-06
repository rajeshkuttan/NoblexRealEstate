import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  CreditCard, 
  Banknote, 
  Wallet, 
  Receipt, 
  User, 
  Building2, 
  DollarSign, 
  Calendar, 
  FileText, 
  Plus, 
  X, 
  Save, 
  Upload, 
  Download, 
  Check, 
  CheckCircle,
  AlertCircle,
  FileCheck,
  AlertTriangle, 
  Info, 
  Clock, 
  Target, 
  Globe, 
  Home, 
  Building, 
  Store, 
  Warehouse, 
  Shield, 
  Settings, 
  ShoppingCart,
  Truck,
  Wrench,
  Users,
  Briefcase,
  Package,
  Tag,
  Search,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Enhanced payment types
const paymentTypes = [
  { value: "invoice_payment", label: "Invoice Payment", icon: Receipt, description: "Payment against property/tenant invoices" },
  { value: "supplier_payment", label: "Supplier Payment", icon: Truck, description: "Payment for consumables, materials, supplies" },
  { value: "subcontractor_payment", label: "Subcontractor Payment", icon: Wrench, description: "Payment for services from contractors" },
  { value: "employee_payment", label: "Employee Payment", icon: Users, description: "Salary, bonus, reimbursement payments" },
  { value: "petty_cash", label: "Petty Cash", icon: Wallet, description: "Small daily operational expenses" },
  { value: "utility_payment", label: "Utility Payment", icon: Home, description: "DEWA, internet, phone bills" },
  { value: "expense_knockoff", label: "Expense Knock-off", icon: FileCheck, description: "Expense adjustment or write-off" },
  { value: "vendor_payment", label: "Vendor Payment", icon: Store, description: "Payment to other vendors" },
  { value: "other_payment", label: "Other Payment", icon: DollarSign, description: "Miscellaneous payments" }
];

// Payment categories for different types
const expenseCategories = [
  { value: "maintenance", label: "Maintenance & Repairs" },
  { value: "utilities", label: "Utilities (DEWA, Internet, Phone)" },
  { value: "consumables", label: "Consumables & Supplies" },
  { value: "professional_fees", label: "Professional Fees" },
  { value: "insurance", label: "Insurance" },
  { value: "management_fees", label: "Management Fees" },
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "legal", label: "Legal Fees" },
  { value: "rent", label: "Rent" },
  { value: "salaries", label: "Salaries & Wages" },
  { value: "travel", label: "Travel & Transportation" },
  { value: "office_expenses", label: "Office Expenses" },
  { value: "cleaning", label: "Cleaning Services" },
  { value: "security", label: "Security Services" },
  { value: "landscaping", label: "Landscaping & Gardening" },
  { value: "fuel", label: "Fuel & Vehicle" },
  { value: "misc", label: "Miscellaneous" }
];

// Enhanced Payment form validation schema
const paymentFormSchema = z.object({
  // Payment Type
  paymentType: z.string().min(1, "Payment type is required"),
  
  // Basic Information
  paymentNumber: z.string().min(1, "Payment number is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  
  // Conditional: Invoice Information (for invoice payments)
  invoice: z.object({
    id: z.coerce.string().optional(),
    number: z.string().optional(),
    amount: z.number().optional(),
    leaseId: z.coerce.number().optional(),
    tenantId: z.coerce.number().optional(),
  }).optional(),
  
  // Payee/Vendor Information
  payeeInfo: z.object({
    payeeType: z.string().min(1, "Payee type is required"),
    payeeName: z.string().min(1, "Payee name is required"),
    payeeId: z.coerce.string().optional(),
    contactNumber: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
    taxId: z.string().optional(),
    licenseNumber: z.string().optional(),
  }),
  
  // Payment Purpose & Details
  paymentPurpose: z.object({
    category: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    referenceNumber: z.string().optional(),
    purchaseOrderNo: z.string().optional(),
    property: z.string().optional(),
    unit: z.string().optional(),
  }),
  
  // Payment Details
  paymentDetails: z.object({
    amount: z.number().min(0.01, "Payment amount must be greater than 0"),
    currency: z.string().min(1, "Currency is required"),
    paymentMethod: z.enum(["bank_transfer", "cheque", "cash", "credit_card", "online_payment", "pdc"], {
      required_error: "Please select a payment method",
    }),
    paymentReference: z.string().min(1, "Payment reference is required"),
    bankDetails: z.object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      transactionId: z.string().optional(),
    }).optional(),
  }),
  
  // Tax & Accounting
  taxInfo: z.object({
    vatApplicable: z.boolean(),
    vatPercentage: z.number().optional(),
    vatAmount: z.number().optional(),
    totalWithVat: z.number().optional(),
    accountCode: z.string().optional(),
  }),
  
  // Status and Processing
  status: z.enum(["pending", "completed", "failed", "cancelled"]),
  processedBy: z.string().min(1, "Processed by is required"),
  approvedBy: z.string().optional(),
  
  // Additional Information
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => void;
  initialData?: any;
  mode: "create" | "edit";
  invoice?: any;
  availableInvoices?: any[]; // Passed from parent
}

const paymentMethods = [
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "cheque", label: "Cheque", icon: FileText },
  { value: "pdc", label: "Post Dated Cheque (PDC)", icon: FileCheck },
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "online_payment", label: "Online Payment", icon: Globe },
];

const currencies = [
  { value: "AED", label: "UAE Dirham (AED)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
];

const uaeBanks = [
  "Emirates NBD", "ADCB (Abu Dhabi Commercial Bank)", "FAB (First Abu Dhabi Bank)",
  "Mashreq Bank", "RAKBANK", "Dubai Islamic Bank", "ADIB (Abu Dhabi Islamic Bank)",
  "Emirates Islamic Bank", "HSBC UAE", "Standard Chartered UAE", "Citibank UAE", "Other"
];

const payeeTypes = [
  { value: "supplier", label: "Supplier" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "employee", label: "Employee" },
  { value: "tenant", label: "Tenant" },
  { value: "vendor", label: "Vendor" },
  { value: "utility_company", label: "Utility Company" },
  { value: "service_provider", label: "Service Provider" },
  { value: "other", label: "Other" },
];

// Mock invoices removed - now passed as props

export default function PaymentForm({ isOpen, onClose, onSubmit, initialData, mode, invoice, availableInvoices = [] }: PaymentFormProps) {
  const [activeTab, setActiveTab] = useState("type");
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>(invoice ? "invoice_payment" : "");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [vatEnabled, setVatEnabled] = useState(false);
  
  // Invoice selection states
  const [showInvoiceSelector, setShowInvoiceSelector] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(invoice || null);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");


  // Filter invoices - only show unpaid or partially paid invoices
  // Filter invoices - only show unpaid or partially paid invoices from passed props
  const [filteredAvailableInvoices, setFilteredAvailableInvoices] = useState<any[]>([]);

  useEffect(() => {
    // Only use invoices that are not paid and have outstanding amount
    const unpaid = availableInvoices.filter(inv => 
      inv.status?.toLowerCase() !== "paid" && 
      (inv.invoiceDetails?.outstanding > 0 || inv.paymentStatus !== 'paid')
    );
    setFilteredAvailableInvoices(unpaid);
  }, [availableInvoices]);

  // Auto-fill form when invoice prop is provided (payment from invoice page)
  useEffect(() => {
    if (invoice && isOpen) {
      // Set payment type
      setSelectedPaymentType("invoice_payment");
      setValue("paymentType", "invoice_payment");
      
      // Set invoice details
      setSelectedInvoice(invoice);
      setValue("invoice", {
        id: invoice.id,
        number: invoice.invoiceNumber,
        amount: invoice.invoiceDetails?.outstanding || invoice.invoiceDetails?.total || 0,
        leaseId: invoice.lease?.id,
        tenantId: invoice.tenant?.id,
      });
      
      // Auto-fill payee information
      setValue("payeeInfo.payeeType", "tenant");
      setValue("payeeInfo.payeeName", invoice.tenant?.name || "");
      setValue("payeeInfo.payeeId", invoice.tenant?.id || "");
      setValue("payeeInfo.email", invoice.tenant?.email || "");
      setValue("payeeInfo.contactNumber", invoice.tenant?.contactNumber || "");
      
      // Auto-fill payment details
      const outstandingAmount = invoice.invoiceDetails?.outstanding || invoice.invoiceDetails?.total || 0;
      setValue("paymentDetails.amount", outstandingAmount);
      
      // Auto-fill purpose
      setValue("paymentPurpose.category", "rent");
      setValue("paymentPurpose.description", `Payment for ${invoice.invoiceNumber} - ${invoice.description || 'Invoice Payment'}`);
      setValue("paymentPurpose.referenceNumber", invoice.invoiceNumber);
      
      if (invoice.property) {
        setValue("paymentPurpose.property", invoice.property.name || "");
        setValue("paymentPurpose.unit", invoice.property.unit || "");
      }
    }
  }, [invoice, isOpen]);

  // Filter invoices based on search query
  const filteredInvoices = filteredAvailableInvoices.filter(inv => {
    const searchLower = invoiceSearchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(searchLower) ||
      inv.tenant.name.toLowerCase().includes(searchLower) ||
      inv.property.name.toLowerCase().includes(searchLower) ||
      inv.property.unit.toLowerCase().includes(searchLower)
    );
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: initialData || {
      paymentType: invoice ? "invoice_payment" : "",
      paymentNumber: `PAY-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      paymentDate: new Date().toISOString().split('T')[0],
      invoice: invoice ? {
        id: invoice.id,
        number: invoice.invoiceNumber,
        amount: invoice.invoiceDetails.total,
        leaseId: invoice.lease?.id,
        tenantId: invoice.tenant?.id,
      } : undefined,
      payeeInfo: {
        payeeType: invoice ? "tenant" : "",
        payeeName: invoice?.tenant?.name || "",
        payeeId: "",
        contactNumber: "",
        email: "",
        address: "",
        taxId: "",
        licenseNumber: "",
      },
      paymentPurpose: {
        category: "",
        description: "",
        referenceNumber: "",
        purchaseOrderNo: "",
        property: "",
        unit: "",
      },
      paymentDetails: {
        amount: invoice?.invoiceDetails?.total || 0,
        currency: "AED",
        paymentMethod: "bank_transfer",
        paymentReference: "",
        bankDetails: {
          bankName: "",
          accountNumber: "",
          transactionId: "",
        },
      },
      taxInfo: {
        vatApplicable: false,
        vatPercentage: 5,
        vatAmount: 0,
        totalWithVat: 0,
        accountCode: "",
      },
      status: "completed",
      processedBy: "Finance Manager",
      approvedBy: "",
      notes: "",
      attachments: [],
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = form;

  const watchedValues = watch();

  const generatePaymentReference = () => {
    const method = watchedValues.paymentDetails?.paymentMethod || "bank_transfer";
    const prefix = method === "bank_transfer" ? "TXN" : 
                  method === "cheque" ? "CHQ" : 
                  method === "cash" ? "CASH" : 
                  method === "credit_card" ? "CC" : 
                  method === "pdc" ? "PDC" : "ONLINE";
    const timestamp = new Date().getTime().toString().slice(-6);
    return `${prefix}-2024-${timestamp}`;
  };

  console.log("filteredInvoices",filteredInvoices)

  const handlePaymentTypeChange = (type: string) => {
    setSelectedPaymentType(type);
    setValue("paymentType", type);
    
    // Show invoice selector if payment type is invoice payment
    if (type === "invoice_payment" && !invoice) {
      setShowInvoiceSelector(true);
    }
    
    // Set default category based on payment type
    if (type === "supplier_payment") {
      setValue("paymentPurpose.category", "consumables");
    } else if (type === "subcontractor_payment") {
      setValue("paymentPurpose.category", "maintenance");
    } else if (type === "employee_payment") {
      setValue("paymentPurpose.category", "salaries");
    } else if (type === "utility_payment") {
      setValue("paymentPurpose.category", "utilities");
    } else if (type === "petty_cash") {
      setValue("paymentPurpose.category", "office_expenses");
    }
  };

  const handleInvoiceSelect = (invoiceData: any) => {
    setSelectedInvoice(invoiceData);
    setShowInvoiceSelector(false);
    
    // Auto-fill form with invoice data
    setValue("invoice", {
      id: invoiceData.id,
      number: invoiceData.invoiceNumber,
      amount: invoiceData.invoiceDetails.outstanding,
      leaseId: invoiceData.lease?.id,
      tenantId: invoiceData.tenant?.id,
    });
    
    setValue("payeeInfo.payeeType", "tenant");
    setValue("payeeInfo.payeeName", invoiceData.tenant.name);
    setValue("payeeInfo.payeeId", invoiceData.tenant.id);
    setValue("payeeInfo.email", invoiceData.tenant.email);
    setValue("payeeInfo.contactNumber", invoiceData.tenant.phone || invoiceData.tenant.contactNumber);
    
    setValue("paymentDetails.amount", invoiceData.invoiceDetails.outstanding);
    
    setValue("paymentPurpose.description", `Payment for ${invoiceData.invoiceNumber} - ${invoiceData.description}`);
    setValue("paymentPurpose.referenceNumber", invoiceData.invoiceNumber);
    setValue("paymentPurpose.property", invoiceData.property.name);
    setValue("paymentPurpose.unit", invoiceData.property.unit);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "overdue":
        return "bg-red-100 text-red-800 border-red-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "paid":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "unpaid":
        return <Badge variant="destructive">Unpaid</Badge>;
      case "partial":
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Partially Paid</Badge>;
      case "paid":
        return <Badge variant="default" className="bg-green-600">Paid</Badge>;
      default:
        return <Badge variant="secondary">{paymentStatus}</Badge>;
    }
  };

  const handlePaymentMethodChange = (method: string) => {
    setSelectedPaymentMethod(method);
    setValue("paymentDetails.paymentMethod", method as any);
    
    const reference = generatePaymentReference();
    setValue("paymentDetails.paymentReference", reference);
  };

  const calculateVAT = () => {
    const amount = watchedValues.paymentDetails?.amount || 0;
    const vatPercentage = watchedValues.taxInfo?.vatPercentage || 5;
    const vatAmount = (amount * vatPercentage) / 100;
    const totalWithVat = amount + vatAmount;
    
    setValue("taxInfo.vatAmount", parseFloat(vatAmount.toFixed(2)));
    setValue("taxInfo.totalWithVat", parseFloat(totalWithVat.toFixed(2)));
  };

  const handleVATToggle = (checked: boolean) => {
    setVatEnabled(checked);
    setValue("taxInfo.vatApplicable", checked);
    if (checked) {
      calculateVAT();
    }
  };

  const onFormSubmit = (data: PaymentFormData) => {
    onSubmit(data);
  };

  const formatCurrency = (amount: any) => {
    const value = Number(amount);
    if (isNaN(value)) {
      return new Intl.NumberFormat("en-AE", {
        style: "currency",
        currency: "AED",
        minimumFractionDigits: 0,
      }).format(0);
    }
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Record New Payment" : "Edit Payment"}
          </DialogTitle>
          <p className="text-muted-foreground">
            {mode === "create" 
              ? "Record a payment for invoices, suppliers, contractors, employees, or other expenses"
              : "Update the payment details"
            }
          </p>
          
          {/* Invoice Pre-filled Banner */}
          {invoice && (
            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900">Recording Payment for Invoice</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Form has been pre-filled with details from <strong>{invoice.invoiceNumber}</strong> for <strong>{invoice.tenant?.name}</strong>
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-blue-600">
                      <strong>Outstanding:</strong> {formatCurrency(invoice.invoiceDetails?.outstanding || invoice.invoiceDetails?.total || 0)}
                    </span>
                    {invoice.property && (
                      <span className="text-blue-600">
                        <strong>Property:</strong> {invoice.property.name} - {invoice.property.unit}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit, (errors) => console.error("Form Validation Errors:", errors))} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="type">Payment Type</TabsTrigger>
              <TabsTrigger value="payee">Payee Info</TabsTrigger>
              <TabsTrigger value="purpose">Purpose</TabsTrigger>
              <TabsTrigger value="details">Payment Details</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>

            {/* Payment Type Tab */}
            <TabsContent value="type" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Select Payment Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <div
                          key={type.value}
                          className={cn(
                            "p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
                            selectedPaymentType === type.value
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-primary/50"
                          )}
                          onClick={() => handlePaymentTypeChange(type.value)}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center",
                                selectedPaymentType === type.value ? "bg-primary" : "bg-primary/10"
                              )}>
                                <IconComponent className={cn(
                                  "h-5 w-5",
                                  selectedPaymentType === type.value ? "text-white" : "text-primary"
                                )} />
                              </div>
                              <span className="font-semibold">{type.label}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{type.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Basic Info */}
                  <div className="mt-6 space-y-4">
                    <Separator />
                    <h4 className="font-semibold">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentNumber">Payment Number *</Label>
                      <Input
                        id="paymentNumber"
                        {...register("paymentNumber")}
                        placeholder="PAY-2024-001"
                        className={errors.paymentNumber ? "border-red-500" : ""}
                      />
                      {errors.paymentNumber && (
                        <p className="text-sm text-red-500 mt-1">{errors.paymentNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="paymentDate">Payment Date *</Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        {...register("paymentDate")}
                        className={errors.paymentDate ? "border-red-500" : ""}
                      />
                      {errors.paymentDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.paymentDate.message}</p>
                      )}
                      </div>
                    </div>
                  </div>

                  {/* Invoice Selector (if invoice payment and no pre-selected invoice) */}
                  {selectedPaymentType === "invoice_payment" && !selectedInvoice && showInvoiceSelector && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">Select Invoice to Pay</h4>
                        <Badge variant="outline" className="text-sm">
                          {filteredInvoices.length} Unpaid Invoice{filteredInvoices.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by invoice number, tenant name, property..."
                          value={invoiceSearchQuery}
                          onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Invoice List */}
                      <ScrollArea className="h-[400px] w-full border rounded-lg">
                        <div className="p-4 space-y-3">
                          {filteredInvoices.length > 0 ? (
                            filteredInvoices.map((inv) => (
                              <div
                                key={inv.id}
                                className="p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer bg-white"
                                onClick={() => handleInvoiceSelect(inv)}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h5 className="font-semibold text-lg">{inv.invoiceNumber}</h5>
                                    <p className="text-sm text-muted-foreground">{inv.description}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <Badge className={getStatusBadgeColor(inv.status)}>
                                      {inv.status.toUpperCase()}
                                    </Badge>
                                    {getPaymentStatusBadge(inv.paymentStatus)}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Tenant</p>
                                    <p className="font-medium">{inv.tenant.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Property</p>
                                    <p className="font-medium">{inv.property.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Unit</p>
                                    <p className="font-medium">{inv.property.unit}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Due Date</p>
                                    <p className="font-medium">{new Date(inv.dueDate).toLocaleDateString('en-GB')}</p>
                                  </div>
                                </div>

                                <Separator className="my-3" />

                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Total Amount</p>
                                    <p className="font-bold text-blue-600">{formatCurrency(inv.invoiceDetails.total)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Paid</p>
                                    <p className="font-bold text-green-600">{formatCurrency(inv.invoiceDetails.paid)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Outstanding</p>
                                    <p className="font-bold text-red-600">{formatCurrency(inv.invoiceDetails.outstanding)}</p>
                                  </div>
                                </div>

                                {inv.paymentStatus === "partial" && (
                                  <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
                                    <div className="flex items-center gap-2 text-sm text-orange-700">
                                      <AlertCircle className="h-4 w-4" />
                                      <span>Partially Paid - {Math.round((inv.invoiceDetails.paid / inv.invoiceDetails.total) * 100)}% completed</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12">
                              <Receipt className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                              <p className="text-lg font-semibold text-muted-foreground">No unpaid invoices found</p>
                              <p className="text-sm text-muted-foreground mt-2">
                                {invoiceSearchQuery ? "Try adjusting your search" : "All invoices have been paid"}
                              </p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>

                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <p className="text-sm text-blue-700">
                          Only unpaid and partially paid invoices are shown. Fully paid invoices are automatically excluded.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Selected Invoice Details */}
                  {selectedPaymentType === "invoice_payment" && selectedInvoice && (
                    <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-lg text-blue-900">Selected Invoice</h4>
                        {!invoice && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(null);
                              setShowInvoiceSelector(true);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Change Invoice
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-blue-700">Invoice Number</p>
                          <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700">Tenant</p>
                          <p className="font-medium">{selectedInvoice.tenant.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700">Property & Unit</p>
                          <p className="font-medium">{selectedInvoice.property.name} - {selectedInvoice.property.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700">Outstanding Amount</p>
                          <p className="font-bold text-red-600">{formatCurrency(selectedInvoice.invoiceDetails.outstanding)}</p>
                        </div>
                      </div>
                      {selectedInvoice.paymentStatus === "partial" && (
                        <div className="mt-3 p-3 bg-orange-100 rounded border border-orange-300">
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-orange-700" />
                            <span className="text-orange-800">
                              <strong>Partial Payment: </strong>
                              {formatCurrency(selectedInvoice.invoiceDetails.paid)} already paid. 
                              {formatCurrency(selectedInvoice.invoiceDetails.outstanding)} remaining.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payee Information Tab */}
            <TabsContent value="payee" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Payee / Vendor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="payeeType">Payee Type *</Label>
                      <Select
                        value={watchedValues.payeeInfo?.payeeType}
                        onValueChange={(value) => setValue("payeeInfo.payeeType", value)}
                      >
                        <SelectTrigger className={errors.payeeInfo?.payeeType ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select payee type" />
                        </SelectTrigger>
                        <SelectContent>
                          {payeeTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.payeeInfo?.payeeType && (
                        <p className="text-sm text-red-500 mt-1">{errors.payeeInfo.payeeType.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="payeeName">Payee Name *</Label>
                    <Input
                        id="payeeName"
                        {...register("payeeInfo.payeeName")}
                        placeholder="Enter payee/vendor name"
                        className={errors.payeeInfo?.payeeName ? "border-red-500" : ""}
                      />
                      {errors.payeeInfo?.payeeName && (
                        <p className="text-sm text-red-500 mt-1">{errors.payeeInfo.payeeName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="payeeId">Payee ID / Vendor Code</Label>
                      <Input
                        id="payeeId"
                        {...register("payeeInfo.payeeId")}
                        placeholder="SUPP-001 / EMP-123"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        {...register("payeeInfo.contactNumber")}
                        placeholder="+971 50 123 4567"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register("payeeInfo.email")}
                        placeholder="vendor@example.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="taxId">Tax ID / TRN</Label>
                      <Input
                        id="taxId"
                        {...register("payeeInfo.taxId")}
                        placeholder="100123456789012"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        {...register("payeeInfo.address")}
                        placeholder="Vendor/payee address"
                        rows={2}
                      />
                    </div>

                    {(watchedValues.payeeInfo?.payeeType === "subcontractor" || 
                      watchedValues.payeeInfo?.payeeType === "supplier") && (
                      <div>
                        <Label htmlFor="licenseNumber">License Number</Label>
                        <Input
                          id="licenseNumber"
                          {...register("payeeInfo.licenseNumber")}
                          placeholder="Trade License Number"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Purpose Tab */}
            <TabsContent value="purpose" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Payment Purpose & Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Expense Category *</Label>
                      <Select
                        value={watchedValues.paymentPurpose?.category}
                        onValueChange={(value) => setValue("paymentPurpose.category", value)}
                      >
                        <SelectTrigger className={errors.paymentPurpose?.category ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.paymentPurpose?.category && (
                        <p className="text-sm text-red-500 mt-1">{errors.paymentPurpose.category.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="referenceNumber">Reference Number</Label>
                      <Input
                        id="referenceNumber"
                        {...register("paymentPurpose.referenceNumber")}
                        placeholder="INV-2024-001 / Bill Reference"
                      />
                    </div>

                    <div>
                      <Label htmlFor="purchaseOrderNo">Purchase Order No.</Label>
                      <Input
                        id="purchaseOrderNo"
                        {...register("paymentPurpose.purchaseOrderNo")}
                        placeholder="PO-2024-001"
                      />
                    </div>

                    <div>
                      <Label htmlFor="accountCode">Account Code (Chart of Accounts)</Label>
                      <Input
                        id="accountCode"
                        {...register("taxInfo.accountCode")}
                        placeholder="5100 / 6200"
                      />
                    </div>

                    {(selectedPaymentType !== "employee_payment" && 
                      selectedPaymentType !== "petty_cash") && (
                      <>
                        <div>
                          <Label htmlFor="property">Property (if applicable)</Label>
                          <Select
                            value={watchedValues.paymentPurpose?.property}
                            onValueChange={(value) => setValue("paymentPurpose.property", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="marina_heights">Marina Heights</SelectItem>
                              <SelectItem value="business_bay_plaza">Business Bay Plaza</SelectItem>
                              <SelectItem value="palm_residences">Palm Residences</SelectItem>
                              <SelectItem value="downtown_complex">Downtown Complex</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="unit">Unit (if applicable)</Label>
                          <Input
                            id="unit"
                            {...register("paymentPurpose.unit")}
                            placeholder="Unit 101"
                          />
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2">
                      <Label htmlFor="description">Payment Description *</Label>
                      <Textarea
                        id="description"
                        {...register("paymentPurpose.description")}
                        placeholder="Detailed description of the payment purpose..."
                        rows={3}
                        className={errors.paymentPurpose?.description ? "border-red-500" : ""}
                      />
                      {errors.paymentPurpose?.description && (
                        <p className="text-sm text-red-500 mt-1">{errors.paymentPurpose.description.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Payment Amount (AED) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        {...register("paymentDetails.amount", { 
                          valueAsNumber: true,
                          onChange: () => { if (vatEnabled) calculateVAT(); }
                        })}
                        placeholder="1000.00"
                        className={errors.paymentDetails?.amount ? "border-red-500" : ""}
                      />
                      {errors.paymentDetails?.amount && (
                        <p className="text-sm text-red-500 mt-1">{errors.paymentDetails.amount.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="currency">Currency *</Label>
                      <Select
                        value={watchedValues.paymentDetails?.currency}
                        onValueChange={(value) => setValue("paymentDetails.currency", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* VAT Section */}
                  <div className="p-4 bg-green-50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="vatApplicable"
                        checked={vatEnabled}
                        onCheckedChange={handleVATToggle}
                      />
                      <Label htmlFor="vatApplicable" className="cursor-pointer">
                        VAT Applicable (5%)
                      </Label>
                    </div>
                    
                    {vatEnabled && (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Base Amount</p>
                          <p className="font-bold">{formatCurrency(watchedValues.paymentDetails?.amount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">VAT Amount (5%)</p>
                          <p className="font-bold text-green-600">{formatCurrency(watchedValues.taxInfo?.vatAmount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total with VAT</p>
                          <p className="font-bold text-blue-600">{formatCurrency(watchedValues.taxInfo?.totalWithVat || 0)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <Label>Payment Method *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                      {paymentMethods.map((method) => (
                        <div
                          key={method.value}
                          className={cn(
                            "p-4 border rounded-lg cursor-pointer transition-all duration-200",
                            selectedPaymentMethod === method.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                          onClick={() => handlePaymentMethodChange(method.value)}
                        >
                          <div className="flex items-center gap-3">
                            <method.icon className="h-5 w-5 text-primary" />
                            <span className="font-medium">{method.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="paymentReference">Payment Reference *</Label>
                    <Input
                      id="paymentReference"
                      {...register("paymentDetails.paymentReference")}
                      placeholder="TXN-2024-001234"
                      className={errors.paymentDetails?.paymentReference ? "border-red-500" : ""}
                    />
                    {errors.paymentDetails?.paymentReference && (
                      <p className="text-sm text-red-500 mt-1">{errors.paymentDetails.paymentReference.message}</p>
                    )}
                  </div>

                  {/* Bank Details */}
                  {selectedPaymentMethod === "bank_transfer" && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900">Bank Transfer Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="bankName">Bank Name</Label>
                          <Select
                            value={watchedValues.paymentDetails?.bankDetails?.bankName}
                            onValueChange={(value) => setValue("paymentDetails.bankDetails.bankName", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select bank" />
                            </SelectTrigger>
                            <SelectContent>
                              {uaeBanks.map((bank) => (
                                <SelectItem key={bank} value={bank}>
                                  {bank}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="accountNumber">Account Number</Label>
                          <Input
                            id="accountNumber"
                            {...register("paymentDetails.bankDetails.accountNumber")}
                            placeholder="****1234"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor="transactionId">Transaction ID</Label>
                          <Input
                            id="transactionId"
                            {...register("paymentDetails.bankDetails.transactionId")}
                            placeholder="TXN-2024-001234"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cheque Details */}
                  {(selectedPaymentMethod === "cheque" || selectedPaymentMethod === "pdc") && (
                    <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900">
                        {selectedPaymentMethod === "pdc" ? "Post Dated Cheque (PDC) Details" : "Cheque Details"}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Cheque Number</Label>
                          <Input placeholder="CHQ-2024-001234" />
                        </div>
                        <div>
                          <Label>Cheque Date</Label>
                          <Input type="date" />
                        </div>
                        <div>
                          <Label>Bank Name</Label>
                          <Input placeholder="Emirates NBD" />
                        </div>
                        <div>
                          <Label>Account Number</Label>
                          <Input placeholder="****1234" />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Review Tab */}
            <TabsContent value="review" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Review & Submit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="status">Payment Status *</Label>
                    <Select
                      value={watchedValues.status}
                      onValueChange={(value) => setValue("status", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="processedBy">Processed By *</Label>
                      <Input
                        id="processedBy"
                        {...register("processedBy")}
                        placeholder="Finance Manager"
                        className={errors.processedBy ? "border-red-500" : ""}
                      />
                      {errors.processedBy && (
                        <p className="text-sm text-red-500 mt-1">{errors.processedBy.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="approvedBy">Approved By</Label>
                      <Input
                        id="approvedBy"
                        {...register("approvedBy")}
                        placeholder="CFO / Manager Name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Any additional notes or remarks about this payment..."
                      rows={3}
                    />
                  </div>

                  {/* Payment Summary */}
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-4">Payment Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                            <p className="text-muted-foreground">Payment Type</p>
                            <p className="font-semibold">
                              {paymentTypes.find(t => t.value === selectedPaymentType)?.label || "-"}
                            </p>
                        </div>
                          <div>
                            <p className="text-muted-foreground">Payee</p>
                            <p className="font-semibold">{watchedValues.payeeInfo?.payeeName || "-"}</p>
                      </div>
                          <div>
                            <p className="text-muted-foreground">Category</p>
                            <p className="font-semibold">
                              {expenseCategories.find(c => c.value === watchedValues.paymentPurpose?.category)?.label || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payment Method</p>
                            <p className="font-semibold">
                              {paymentMethods.find(m => m.value === selectedPaymentMethod)?.label || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Base Amount</p>
                            <p className="font-bold text-lg text-blue-600">
                              {formatCurrency(watchedValues.paymentDetails?.amount || 0)}
                            </p>
                          </div>
                          {vatEnabled && (
                            <div>
                              <p className="text-muted-foreground">Total with VAT</p>
                              <p className="font-bold text-lg text-green-600">
                                {formatCurrency(watchedValues.taxInfo?.totalWithVat || 0)}
                              </p>
                            </div>
                          )}
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground">Reference</p>
                            <p className="font-semibold">{watchedValues.paymentDetails?.paymentReference || "-"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="button" variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Attach Documents
              </Button>
              <Button type="submit" className="bg-gradient-primary shadow-glow">
                <Check className="h-4 w-4 mr-2" />
                {mode === "create" ? "Record Payment" : "Update Payment"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
