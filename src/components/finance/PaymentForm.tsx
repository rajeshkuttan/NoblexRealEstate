import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  CreditCard, 
  Banknote, 
  Wallet, 
  Receipt, 
  User, 
  Building2, 
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
  Filter,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Trash2
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { vendorsAPI, vendorInvoicesAPI, purchaseInvoicesAPI, chartOfAccountsAPI, usersAPI, tenantsAPI, bankAccountsAPI, paymentsAPI } from "@/services/api";

// Enhanced payment types
const paymentTypes = [
  {
    value: "invoice_payment",
    label: "Tenant invoice receipt",
    icon: Receipt,
    description: "Receipt allocated to one or more tenant invoices",
  },
  {
    value: "supplier_payment",
    label: "Supplier Payment",
    icon: Truck,
    description: "Payment for consumables, materials, supplies",
  },
];

// Payment categories for different types
const expenseCategories = [
  { value: "maintenance", label: "Maintenance & Repairs" },
  { value: "utilities", label: "Utilities (electricity & water, Internet, Phone)" },
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
    amount: z.coerce.number().optional(),
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
    amount: z.coerce.number().min(0.01, "Payment amount must be greater than 0"),
    currency: z.string().min(1, "Currency is required"),
    paymentMethod: z.enum(["bank_transfer", "cheque", "cash", "credit_card", "online_payment", "pdc"], {
      required_error: "Please select a payment method",
    }),
    paymentMode: z.enum(["Cash", "Bank", "PDC"]).optional(),
    pettyCashAccount: z.string().optional(),
    bankName: z.string().optional(),
    bankAccount: z.string().optional(),
    instrumentNumber: z.string().optional(),
    instrumentDate: z.string().optional(),
    paymentReference: z.string().min(1, "Payment reference is required"),
    bankDetails: z.object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      transactionId: z.string().optional(),
    }).optional(),
  }),
  
  // Multi-line Details Section
  details: z.array(z.object({
    drCr: z.enum(["Dr", "Cr"]),
    particular: z.string().min(1, "Particular is required"),
    ledger: z.string().min(1, "Ledger is required"),
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    bill: z.string().optional(),
    narration: z.string().optional(),
  })).min(1, "At least one detail line is required"),
  
  // Tax & Accounting
  taxInfo: z.object({
    vatApplicable: z.boolean(),
    vatPercentage: z.coerce.number().optional(),
    vatAmount: z.coerce.number().optional(),
    totalWithVat: z.coerce.number().optional(),
    accountCode: z.string().optional(),
  }),
  
  // Status and Processing
  status: z.enum(["pending", "completed", "failed", "cancelled"]),
  processedBy: z.string().min(1, "Processed by is required"),
  approvedBy: z.string().optional(),
  
  isPosted: z.boolean().optional(),
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
  /** When true, render as full page (no dialog) with Back button */
  embedPage?: boolean;
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

export default function PaymentForm({ isOpen, onClose, onSubmit, initialData, mode, invoice, availableInvoices = [], embedPage = false }: PaymentFormProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("type");
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>(invoice ? "invoice_payment" : "supplier_payment");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>("");
  const [vatEnabled, setVatEnabled] = useState(false);
  
  // New state for enhanced functionality
  const [vendors, setVendors] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [pettyCashAccounts, setPettyCashAccounts] = useState<any[]>([]);
  
  // Invoice selection states
  const [showInvoiceSelector, setShowInvoiceSelector] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(invoice || null);
  /** Tenant AR lines: amounts must sum to paymentDetails.amount when paying multiple invoices. */
  const [allocationRows, setAllocationRows] = useState<{ invoiceId: number; amount: number }[]>([]);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isUnposting, setIsUnposting] = useState(false);
  const isLocked = !!initialData?.isPosted;


  // Filter invoices - only show unpaid or partially paid invoices
  // Filter invoices - only show unpaid or partially paid invoices from passed props
  const [filteredAvailableInvoices, setFilteredAvailableInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedInvoice?.id) {
      setAllocationRows([]);
      return;
    }
    const outstanding = Number(
      selectedInvoice.invoiceDetails?.outstanding ??
        selectedInvoice.invoiceDetails?.total ??
        selectedInvoice.totalAmount ??
        0
    );
    setAllocationRows([{ invoiceId: Number(selectedInvoice.id), amount: outstanding }]);
  }, [selectedInvoice?.id]);

  useEffect(() => {
    // Only use invoices that are not paid and have outstanding amount (or any non-paid status)
    const unpaid = availableInvoices.filter(inv => {
      const isPaid = inv.status?.toLowerCase() === "paid";
      const outstanding = Number(inv.invoiceDetails?.outstanding ?? inv.invoiceDetails?.total ?? inv.totalAmount ?? 0);
      const paymentPaid = inv.paymentStatus?.toLowerCase() === "paid";
      return !isPaid && (outstanding > 0 || !paymentPaid);
    });
    setFilteredAvailableInvoices(unpaid);
  }, [availableInvoices]);
  
  // Fetch vendors and accounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vendorsRes, accountsRes, usersRes, tenantsRes, banksRes] = await Promise.all([
          vendorsAPI.getAll({ limit: 100 }),
          chartOfAccountsAPI.getAll(),
          usersAPI.getAll({ limit: 100 }),
          tenantsAPI.getAll({ limit: 100 }),
          bankAccountsAPI.getAll({ limit: 100 })
        ]);
        
        setVendors(vendorsRes.data?.data?.vendors || vendorsRes.data?.vendors || []);
        setEmployees(usersRes.data?.data?.users || usersRes.data?.users || []);
        setCustomers(tenantsRes.data?.data?.tenants || tenantsRes.data?.tenants || []);
        setBanks(banksRes.data?.data?.bankAccounts || banksRes.data?.bankAccounts || []);
        
        const allAccounts = accountsRes.data?.data?.accounts || accountsRes.data || [];
        setAccounts(allAccounts);
        
        // Filter petty cash accounts (assuming they have 'cash' or 'petty' or 'bank' in name or a specific type)
        const pettyCash = allAccounts.filter((acc: any) => 
          acc.accountName.toLowerCase().includes('cash') || 
          acc.accountName.toLowerCase().includes('petty') ||
          acc.accountName.toLowerCase().includes('bank') ||
          acc.accountType?.toLowerCase() === 'cash'
        );
        setPettyCashAccounts(pettyCash);
      } catch (error) {
        console.error("Failed to fetch vendors or accounts:", error);
      }
    };
    
    fetchData();
  }, []);

  const accountOptions = (accounts || []).map(acc => ({
    value: acc.accountCode,
    label: `${acc.accountCode} - ${acc.accountName}`,
    description: acc.accountType
  }));

  const fetchSupplierInvoices = async (vendorId: string) => {
    try {
      // Fetch from both sources: Vendor Invoices (General) and Purchase Invoices (Procurement)
      const [vendorInvoicesRes, purchaseInvoicesRes] = await Promise.all([
        vendorInvoicesAPI.getAll({ vendorId, limit: 100 }),
        purchaseInvoicesAPI.getAll({ vendorId, limit: 100 })
      ]);
      
      const vInvoices = vendorInvoicesRes?.data?.data?.invoices || [];
      const pInvoices = purchaseInvoicesRes?.data?.data?.purchaseInvoices || [];
      
      // Combine results
      const allInvoices = [...vInvoices, ...pInvoices];
      
      // Include Approved or Pending for Payment, and filter out fully paid ones
      // Also handle potential differences in field names between models (totalAmount vs total etc.)
      const filtered = allInvoices.filter((inv: any) => 
        (inv.status === "approved" || inv.status === "pending_approval") &&
        inv.paymentStatus !== "paid"
      ).map((inv: any) => ({
        ...inv,
        // Ensure totalAmount is consistently available for calculations
        totalAmount: inv.totalAmount || inv.total || 0,
      }));

      setSupplierInvoices(filtered);
    } catch (error) {
      console.error("Failed to fetch supplier invoices:", error);
    }
  };

  const handleSupplierChange = (vendorId: string) => {
    setSelectedSupplier(vendorId);
    setValue("payeeInfo.payeeId", vendorId);
    
    const vendor = vendors.find(v => v.id.toString() === vendorId);
    if (vendor) {
      setValue("payeeInfo.payeeName", vendor.vendorName);
      setValue("payeeInfo.payeeType", "supplier");
      setValue("payeeInfo.email", vendor.email || "");
      setValue("payeeInfo.contactNumber", vendor.phone || "");
      setValue("payeeInfo.address", vendor.address || "");
    }
    
    fetchSupplierInvoices(vendorId);
  };

  // Auto-fill form when invoice prop is provided (payment from invoice page)
  useEffect(() => {
    if (invoice && (isOpen || embedPage)) {
      // Existing invoice auto-fill logic...
      setSelectedPaymentType("invoice_payment");
      setValue("paymentType", "invoice_payment");
      
      setSelectedInvoice(invoice);
      setValue("invoice", {
        id: invoice.id,
        number: invoice.invoiceNumber,
        amount: invoice.invoiceDetails?.outstanding || invoice.invoiceDetails?.total || 0,
        leaseId: invoice.lease?.id,
        tenantId: invoice.tenant?.id,
      });
      
      setValue("payeeInfo.payeeType", "tenant");
      setValue("payeeInfo.payeeName", invoice.tenant?.name || "");
      setValue("payeeInfo.payeeId", invoice.tenant?.id || "");
      setValue("payeeInfo.email", invoice.tenant?.email || "");
      setValue("payeeInfo.contactNumber", invoice.tenant?.contactNumber || "");
      
      const outstandingAmount = invoice.invoiceDetails?.outstanding || invoice.invoiceDetails?.total || 0;
      setValue("paymentDetails.amount", outstandingAmount);
      
      setValue("paymentPurpose.category", "rent");
      setValue("paymentPurpose.description", `Payment for ${invoice.invoiceNumber} - ${invoice.description || 'Invoice Payment'}`);
      setValue("paymentPurpose.referenceNumber", invoice.invoiceNumber);
      
      if (invoice.property) {
        setValue("paymentPurpose.property", invoice.property.name || "");
        setValue("paymentPurpose.unit", invoice.property.unit || "");
      }
    }
  }, [invoice, isOpen, embedPage]);

  // Map initialData (Edit mode)
  useEffect(() => {
    if (initialData && mode === "edit") {
      // Determine payment type
      const pType = initialData.vendorId ? "supplier_payment" : (initialData.leaseId ? "invoice_payment" : "other_payment");
      setSelectedPaymentType(pType);

      // Map backend to frontend schema
      const mappedData: any = {
        paymentType: pType,
        paymentNumber: initialData.paymentNumber,
        paymentDate: initialData.paymentDate?.split('T')[0],
        invoice: initialData.invoice ? {
          id: initialData.invoice.id,
          number: initialData.invoice.invoiceNumber,
          amount: parseFloat(initialData.invoice.totalAmount),
          leaseId: initialData.leaseId,
          tenantId: initialData.tenantId,
        } : undefined,
        payeeInfo: {
          payeeType: initialData.payeeType || (initialData.vendorId ? "supplier" : (initialData.tenantId ? "tenant" : "other")),
          payeeName: initialData.payeeName || initialData.vendor?.vendorName || initialData.tenant?.name || "",
          payeeId: initialData.payeeIdString || initialData.vendorId || initialData.tenantId || "",
          contactNumber: initialData.vendor?.phone || initialData.tenant?.contactNumber || initialData.payeeInfo?.contactNumber || "",
          email: initialData.vendor?.email || initialData.tenant?.email || initialData.payeeInfo?.email || "",
          address: initialData.vendor?.address || initialData.payeeInfo?.address || "",
        },
        paymentPurpose: {
          category: initialData.category || "",
          description: initialData.description || "",
          referenceNumber: initialData.reference || "",
          property: initialData.propertyName || "",
          unit: initialData.unitNumber || "",
        },
        paymentDetails: {
          amount: parseFloat(initialData.amount),
          currency: "AED",
          paymentMethod: initialData.paymentMethod === "online" ? "online_payment" : initialData.paymentMethod,
          paymentReference: initialData.reference,
          bankDetails: typeof initialData.bankDetails === 'string' ? JSON.parse(initialData.bankDetails) : (initialData.bankDetails || { bankName: "", accountNumber: "", transactionId: "" }),
          instrumentNumber: initialData.instrumentNumber || "",
          instrumentDate: initialData.instrumentDate || "",
          pettyCashAccount: initialData.pettyCashAccount || "",
          bankName: initialData.bankName || "",
        },
        details: typeof initialData.details === 'string' ? JSON.parse(initialData.details) : (initialData.details || []),
        taxInfo: typeof initialData.taxInfo === 'string' ? JSON.parse(initialData.taxInfo) : (initialData.taxInfo || {
          vatApplicable: false,
          vatPercentage: 5,
          vatAmount: 0,
          totalWithVat: 0,
        }),
        status: initialData.status === "paid" ? "completed" : (initialData.status === "cancelled" ? "failed" : "completed"),
        processedBy: initialData.processedByName || "Finance Manager",
        approvedBy: initialData.approvedByName || "",
        notes: initialData.notes || "",
        isPosted: !!initialData.isPosted,
      };

      reset(mappedData);

      // Fetch supplier invoices if vendor is present
      if (initialData.vendorId) {
        fetchSupplierInvoices(initialData.vendorId.toString());
        setSelectedSupplier(initialData.vendorId.toString());
      }
    }
  }, [initialData, mode]);

  // Filter invoices based on search query (optional chaining so missing tenant/property don't break the list)
  const filteredInvoices = filteredAvailableInvoices.filter(inv => {
    const searchLower = (invoiceSearchQuery ?? "").trim().toLowerCase();
    if (!searchLower) return true;
    return (
      (inv.invoiceNumber ?? "").toLowerCase().includes(searchLower) ||
      (inv.tenant?.name ?? "").toLowerCase().includes(searchLower) ||
      (inv.property?.name ?? "").toLowerCase().includes(searchLower) ||
      (inv.property?.unit ?? "").toLowerCase().includes(searchLower)
    );
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: initialData || {
      paymentType: invoice ? "invoice_payment" : "supplier_payment",
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
        payeeType: invoice ? "tenant" : "supplier",
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
      details: [{
        drCr: "Dr",
        particular: "",
        ledger: "",
        amount: invoice?.invoiceDetails?.total || 0,
        bill: invoice?.invoiceNumber || "",
        narration: invoice ? `Payment for ${invoice.invoiceNumber}` : "",
      }],
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues, control, reset } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "details"
  });

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
    
    const outstanding = invoiceData.invoiceDetails?.outstanding ?? invoiceData.invoiceDetails?.total ?? 0;
    // Auto-fill form with invoice data
    setValue("invoice", {
      id: invoiceData.id,
      number: invoiceData.invoiceNumber,
      amount: outstanding,
      leaseId: invoiceData.lease?.id,
      tenantId: invoiceData.tenant?.id,
    });
    
    setValue("payeeInfo.payeeType", "tenant");
    setValue("payeeInfo.payeeName", invoiceData.tenant?.name ?? "");
    setValue("payeeInfo.payeeId", invoiceData.tenant?.id ?? "");
    setValue("payeeInfo.email", invoiceData.tenant?.email ?? "");
    setValue("payeeInfo.contactNumber", invoiceData.tenant?.phone ?? invoiceData.tenant?.contactNumber ?? "");
    
    setValue("paymentDetails.amount", outstanding);
    
    setValue("paymentPurpose.description", `Payment for ${invoiceData.invoiceNumber} - ${invoiceData.description ?? ""}`);
    setValue("paymentPurpose.referenceNumber", invoiceData.invoiceNumber);
    setValue("paymentPurpose.property", invoiceData.property?.name ?? "");
    setValue("paymentPurpose.unit", invoiceData.property?.unit ?? "");

    // Populate details section
    replace([{
      drCr: "Dr",
      particular: "Customer",
      ledger: "",
      amount: outstanding,
      bill: invoiceData.invoiceNumber,
      narration: `Payment for ${invoiceData.invoiceNumber}`,
    }]);
  };

  const handleInvoiceDetailToggle = (invoiceData: any, checked: boolean) => {
    const currentDetails = getValues("details") || [];
    if (checked) {
      // Add to details
      const newDetail = {
        drCr: "Dr" as const,
        particular: "Supplier",
        ledger: "",
        amount: invoiceData.totalAmount || invoiceData.total || 0,
        bill: invoiceData.invoiceNumber,
        narration: `Payment for ${invoiceData.invoiceNumber}`,
      };
      
      // If the first row is empty, replace it, otherwise append
      if (currentDetails.length === 1 && !currentDetails[0].particular && !currentDetails[0].bill) {
        replace([newDetail]);
      } else {
        append(newDetail);
      }
    } else {
      // Remove from details
      const filteredDetails = currentDetails.filter(d => d.bill !== invoiceData.invoiceNumber);
      replace(filteredDetails.length > 0 ? filteredDetails : [{
        drCr: "Dr" as const,
        particular: "",
        ledger: "",
        amount: 0,
        bill: "",
        narration: "",
      }]);
    }
    
    // Update total amount in payment details
    const total = (getValues("details") || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    setValue("paymentDetails.amount", total);
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      approved: 'default',
      pending_approval: 'secondary',
      rejected: 'destructive',
      pending: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'default'} className={status === 'approved' ? 'bg-green-600' : ''}>
        {(status || "").replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
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
    if (initialData?.isPosted) {
      toast.error("Voucher is posted and locked for editing.");
      return;
    }
    let invoiceAllocations:
      | { invoiceKind: string; invoiceId: number; amount: number }[]
      | undefined;
    if (data.paymentType === "invoice_payment" && allocationRows.length > 0) {
      const payAmt = Number(data.paymentDetails?.amount || 0);
      invoiceAllocations = allocationRows
        .filter((r) => r.invoiceId && Number(r.amount) > 0)
        .map((r) => ({
          invoiceKind: "tenant",
          invoiceId: Number(r.invoiceId),
          amount: Number(r.amount),
        }));
      const sum = invoiceAllocations.reduce((s, a) => s + a.amount, 0);
      if (invoiceAllocations.length > 0 && Math.abs(sum - payAmt) > 0.02) {
        toast.error(
          `Allocations (${sum.toFixed(2)}) must equal payment amount (${payAmt.toFixed(2)}).`
        );
        return;
      }
      if (invoiceAllocations.length === 0) invoiceAllocations = undefined;
    }
    onSubmit({ ...data, invoiceAllocations });
  };

  const handlePost = async () => {
    if (!initialData?.id) return;
    try {
      setIsPosting(true);
      const res = await paymentsAPI.post(initialData.id);
      if (res.data.success) {
        toast.success("Payment Voucher posted successfully");
        onClose();
        // Trigger a refresh of the parent list if possible, 
        // usually by navigating or a callback
        navigate("/finance", { state: { activeTab: 'payments' } });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to post payment voucher");
    } finally {
      setIsPosting(false);
    }
  };

  const handleUnpost = async () => {
    if (!initialData?.id) return;
    try {
      setIsUnposting(true);
      const res = await paymentsAPI.unpost(initialData.id);
      if (res.data.success) {
        toast.success("Payment Voucher unposted successfully");
        onClose();
        navigate("/finance", { state: { activeTab: 'payments' } });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to unpost payment voucher");
    } finally {
      setIsUnposting(false);
    }
  };

  const onFormError = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    
    // Find the first field with an error to determine which tab to switch to
    const fieldToTab: Record<string, string> = {
      paymentType: "type",
      paymentNumber: "type",
      paymentDate: "type",
      payeeInfo: "payee",
      paymentPurpose: "purpose",
      paymentDetails: "details",
      details: "details",
      taxInfo: "review",
      status: "review",
      processedBy: "review",
      approvedBy: "review"
    };

    const firstError = Object.keys(errors)[0];
    if (firstError) {
      if (fieldToTab[firstError]) {
        setActiveTab(fieldToTab[firstError]);
      }
      
      // Get the error message from the nested structure if needed
      let message = "Please fill in all required fields correctly.";
      const errorObj = errors[firstError];
      
      if (errorObj?.message) {
        message = errorObj.message;
      } else if (typeof errorObj === 'object') {
        const firstSubKey = Object.keys(errorObj)[0];
        if (errorObj[firstSubKey]?.message) {
          message = errorObj[firstSubKey].message;
        } else if (Array.isArray(errorObj) && errorObj[0]) {
          // Handle array errors like 'details'
          const detailError = errorObj[0];
          const firstDetailKey = Object.keys(detailError)[0];
          if (detailError[firstDetailKey]?.message) {
            message = detailError[firstDetailKey].message;
          }
        }
      }
      
      toast.error(message);
    }
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

  const invoiceBanner = invoice ? (
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
  ) : null;

  const detailsGrid = (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between px-0">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Entry Details
        </CardTitle>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => append({ drCr: "Dr", particular: "", ledger: "", amount: 0, bill: "", narration: "" })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full">
          <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px] px-4">DR/CR</TableHead>
                  <TableHead className="w-[180px]">Particular</TableHead>
                  <TableHead className="w-[220px]">Ledger</TableHead>
                  <TableHead className="w-[150px]">Amount</TableHead>
                  <TableHead className="w-[180px]">Bill</TableHead>
                  <TableHead className="min-w-[200px]">Narration</TableHead>
                  <TableHead className="w-[50px] sticky right-0 bg-muted/50"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id} className="group hover:bg-muted/20 transition-colors">
                    <TableCell className="px-4">
                      <Select
                        value={watchedValues.details?.[index]?.drCr}
                        onValueChange={(value) => setValue(`details.${index}.drCr`, value as any)}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="shadow-sm bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dr">Debit (Dr)</SelectItem>
                          <SelectItem value="Cr">Credit (Cr)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={watchedValues.details?.[index]?.particular}
                        onValueChange={(value) => setValue(`details.${index}.particular`, value)}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="shadow-sm bg-white">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employee">Employee</SelectItem>
                          <SelectItem value="Supplier">Supplier</SelectItem>
                          <SelectItem value="Customer">Customer</SelectItem>
                          <SelectItem value="Bank">Bank</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <SearchableSelect
                        value={watchedValues.details?.[index]?.ledger}
                        onValueChange={(value) => setValue(`details.${index}.ledger`, value)}
                        disabled={isLocked || watchedValues.details?.[index]?.particular === "Other"}
                        placeholder={watchedValues.details?.[index]?.particular === "Other" ? "Other" : "Select item..."}
                        options={[
                          ...(watchedValues.details?.[index]?.particular === "Employee" ? employees.map((emp) => ({
                            value: emp.id.toString(),
                            label: emp.name || emp.username
                          })) : []),
                          ...(watchedValues.details?.[index]?.particular === "Supplier" ? vendors.map((v) => ({
                            value: v.id.toString(),
                            label: v.vendorName
                          })) : []),
                          ...(watchedValues.details?.[index]?.particular === "Customer" ? customers.map((c) => ({
                            value: c.id.toString(),
                            label: c.name
                          })) : []),
                          ...(watchedValues.details?.[index]?.particular === "Bank" ? banks.map((b) => ({
                            value: b.chartAccountId?.toString() || "",
                            label: `${b.bankName} (${b.accountNumber})`
                          })) : []),
                          ...( ["Employee", "Supplier", "Customer", "Other"].includes(watchedValues.details?.[index]?.particular || "") ? accounts.map((acc) => ({
                            value: acc.id.toString(),
                            label: acc.accountName
                          })) : [])
                        ]}
                        className="shadow-sm bg-white"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        step="any"
                        {...register(`details.${index}.amount` as const, { valueAsNumber: true })}
                        placeholder="0.00"
                        className="shadow-sm font-semibold bg-white"
                        disabled={isLocked}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={watchedValues.details?.[index]?.bill}
                        onValueChange={(value) => setValue(`details.${index}.bill`, value)}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="shadow-sm bg-white">
                          <SelectValue placeholder="Select bill..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPaymentType === "invoice_payment" && filteredInvoices.map(inv => (
                            <SelectItem key={inv.id} value={inv.invoiceNumber}>{inv.invoiceNumber}</SelectItem>
                          ))}
                          {selectedPaymentType === "supplier_payment" && supplierInvoices.map(inv => (
                            <SelectItem key={inv.id} value={inv.invoiceNumber}>{inv.invoiceNumber}</SelectItem>
                          ))}
                          <SelectItem value="none">Fixed / No Bill</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        {...register(`details.${index}.narration` as const)}
                        placeholder="Transaction details..."
                        className="shadow-sm bg-white"
                        disabled={isLocked}
                      />
                    </TableCell>
                    <TableCell className="sticky right-0 bg-slate-50/80 group-hover:bg-muted/0 backdrop-blur-sm">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="mt-6 p-6 bg-gradient-to-br from-primary/5 to-muted/50 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Entry Summary</p>
              <p className="text-base font-bold text-foreground">Total items: {fields.length}</p>
            </div>
          </div>
          <div className="text-center sm:text-right space-y-0.5">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Grand Total Amount</p>
            <p className="text-3xl font-black text-primary drop-shadow-sm">
              {formatCurrency((Array.isArray(watchedValues.details) ? watchedValues.details : []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const formContent = (
    <>
      <form id="payment-voucher-form" onSubmit={handleSubmit(onFormSubmit, onFormError)} className="space-y-4 pb-[3rem] ">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
              <TabsList className="inline-flex w-auto min-w-full lg:flex lg:w-full lg:grid lg:grid-cols-5 p-1 bg-muted/50 rounded-xl">
                <TabsTrigger value="type" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 lg:px-2">Payment Type</TabsTrigger>
                <TabsTrigger value="payee" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 lg:px-2">Payee Info</TabsTrigger>
                <TabsTrigger value="purpose" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 lg:px-2">Purpose</TabsTrigger>
                <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 lg:px-2">Payment Details</TabsTrigger>
                <TabsTrigger value="review" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 lg:px-2">Review</TabsTrigger>
              </TabsList>
            </div>

            {/* Payment Type Tab */}
            <TabsContent value="type" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Select Payment Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <div
                          key={type.value}
                          className={cn(
                            "p-5 border rounded-xl cursor-pointer transition-all duration-300 group",
                            selectedPaymentType === type.value
                              ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
                              : "border-border hover:border-primary/50 hover:bg-muted/30 hover:shadow-md"
                          )}
                          onClick={() => !isLocked && handlePaymentTypeChange(type.value)}
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center transition-colors duration-300",
                                selectedPaymentType === type.value ? "bg-primary shadow-glow" : "bg-primary/10 group-hover:bg-primary/20"
                              )}>
                                <IconComponent className={cn(
                                  "h-6 w-6",
                                  selectedPaymentType === type.value ? "text-white" : "text-primary"
                                )} />
                              </div>
                              <span className="font-bold text-lg">{type.label}</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{type.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Basic Info */}
                  <div className="mt-4 space-y-3">
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
                        disabled={isLocked}
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
                        disabled={isLocked}
                      />
                      {errors.paymentDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.paymentDate.message}</p>
                      )}
                      </div>
                    </div>
                  </div>

                  {/* Settlement Mode & Channel (Moved up) */}
                  <div className="mt-6 space-y-4">
                    <div className="p-4 border-2 border-dashed border-blue-100 rounded-2xl bg-blue-50/20">
                      <h4 className="font-bold flex items-center gap-2 text-blue-900 mb-4">
                        <Wallet className="h-5 w-5 text-blue-600" />
                        Settlement Mode & Channel
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="paymentMode" className="text-sm font-semibold">Financial Mode *</Label>
                          <Select
                            value={selectedPaymentMode}
                            onValueChange={(value) => {
                              setSelectedPaymentMode(value);
                              setValue("paymentDetails.paymentMode", value as any);
                              // Sync with paymentMethod enum for reference generation etc.
                              if (value === "Cash") handlePaymentMethodChange("cash");
                              else if (value === "Bank") handlePaymentMethodChange("bank_transfer");
                              else if (value === "PDC") handlePaymentMethodChange("pdc");
                            }}
                            disabled={isLocked}
                          >
                            <SelectTrigger id="paymentMode" className="h-11 shadow-sm bg-white border-blue-200">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">💵 Cash Settlement</SelectItem>
                              <SelectItem value="Bank">🏦 Bank Transfer / Direct Ledger</SelectItem>
                              <SelectItem value="PDC">📄 Post Dated Cheque (PDC)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {(selectedPaymentMode === "Cash" || selectedPaymentType === "petty_cash") && (
                          <div className="space-y-2">
                            <Label htmlFor="pettyCashAccount" className="text-sm font-semibold">Petty Cash Account *</Label>
                            <Select
                              value={watchedValues.paymentDetails?.pettyCashAccount}
                              onValueChange={(value) => setValue("paymentDetails.pettyCashAccount", value)}
                              disabled={isLocked}
                            >
                              <SelectTrigger id="pettyCashAccount" className="h-11 shadow-sm bg-white border-blue-200">
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                              <SelectContent>
                                {pettyCashAccounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id.toString()}>
                                    {acc.accountName} ({acc.accountCode})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {(selectedPaymentMode === "Bank" || selectedPaymentMode === "PDC") && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="bankAccount" className="text-sm font-semibold">Paying Bank Account *</Label>
                              <Select
                                value={watchedValues.paymentDetails?.bankAccount}
                                onValueChange={(value) => setValue("paymentDetails.bankAccount", value)}
                                disabled={isLocked}
                              >
                                <SelectTrigger id="bankAccount" className="h-11 shadow-sm bg-white border-blue-200">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {banks.map((b) => {
                                    const value =
                                      b.chartAccountId !== undefined &&
                                      b.chartAccountId !== null &&
                                      b.chartAccountId !== ""
                                        ? String(b.chartAccountId)
                                        : String(b.id);

                                    return (
                                      <SelectItem key={b.id} value={value}>
                                        {b.bankName} ({b.accountNumber})
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="bankNameSelect" className="text-sm font-semibold">Bank Name (Manual/Reference)</Label>
                              <Select
                                value={watchedValues.paymentDetails?.bankName}
                                onValueChange={(value) => setValue("paymentDetails.bankName", value)}
                                disabled={isLocked}
                              >
                                <SelectTrigger id="bankNameSelect" className="h-11 shadow-sm bg-white border-blue-200">
                                  <SelectValue placeholder="Select UAE Bank" />
                                </SelectTrigger>
                                <SelectContent>
                                  {uaeBanks.map((bank) => (
                                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="instrumentNumber" className="text-sm font-semibold">
                                {selectedPaymentMode === "PDC" ? "Cheque Number *" : "Transaction ID *"}
                              </Label>
                              <Input
                                id="instrumentNumber"
                                {...register("paymentDetails.instrumentNumber")}
                                placeholder={selectedPaymentMode === "PDC" ? "CHQ-001234" : "TRN-998877"}
                                className="h-11 shadow-sm bg-white border-blue-200 uppercase font-mono"
                                disabled={isLocked}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="instrumentDate" className="text-sm font-semibold">
                                {selectedPaymentMode === "PDC" ? "Cheque Date *" : "Execution Date *"}
                              </Label>
                              <Input
                                id="instrumentDate"
                                type="date"
                                {...register("paymentDetails.instrumentDate")}
                                className="h-11 shadow-sm bg-white border-blue-200"
                                disabled={isLocked}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Supplier Selection (if supplier payment) */}
                  {selectedPaymentType === "supplier_payment" && (
                    <div className="mt-4 space-y-3 p-4 border rounded-lg bg-orange-50/50">
                      <h4 className="font-semibold flex items-center gap-2 text-orange-800">
                        <Truck className="h-4 w-4" />
                        Supplier Selection
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="supplierSelect" className="text-sm font-semibold">Select Supplier *</Label>
                          <Select
                            value={selectedSupplier}
                            onValueChange={handleSupplierChange}
                          >
                            <SelectTrigger id="supplierSelect" className="h-11 shadow-sm">
                              <SelectValue placeholder="Search or select a supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendors.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{vendor.vendorName}</span>
                                    {vendor.supplierCode && <span className="text-xs text-muted-foreground">{vendor.supplierCode}</span>}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {selectedSupplier && supplierInvoices.length > 0 && (
                        <div className="mt-6 space-y-3">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-orange-600" />
                            Select Invoices (Approved / Pending for Payment)
                          </Label>
                          <Select 
                            onValueChange={(val) => {
                               const inv = supplierInvoices.find(i => i.invoiceNumber === val);
                               if (inv) handleInvoiceDetailToggle(inv, true);
                            }}
                          >
                             <SelectTrigger className="shadow-sm h-11 bg-white border-orange-200 mt-2">
                               <SelectValue placeholder="Select an invoice from the supplier" />
                             </SelectTrigger>
                             <SelectContent>
                               {supplierInvoices.map((inv) => (
                                 <SelectItem key={inv.id} value={inv.invoiceNumber}>
                                   <div className="flex justify-between items-center w-full gap-8 pr-4">
                                      <span className="font-medium">{inv.invoiceNumber}</span>
                                      <span className="font-bold text-primary">{formatCurrency(inv.totalAmount)}</span>
                                   </div>
                                 </SelectItem>
                               ))}
                             </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Integrated Grid for Supplier Payment */}
                      {Array.isArray(watchedValues.details) && watchedValues.details.length > 0 && watchedValues.details.some(d => d.bill) && (
                        <div className="mt-4 bg-white p-4 rounded-xl border-2 border-orange-100 shadow-sm">
                           {detailsGrid}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Invoice Selector (if invoice payment and no pre-selected invoice) */}
                  {selectedPaymentType === "invoice_payment" && !selectedInvoice && showInvoiceSelector && (
                    <div className="mt-8 space-y-4 p-6 border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">Select Invoice for Disbursement</h4>
                            <p className="text-xs text-muted-foreground">Pick an unpaid or partially paid invoice</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-white">
                          {filteredInvoices.length} Available
                        </Badge>
                      </div>

                      <Select 
                        onValueChange={(val) => {
                          const inv = filteredInvoices.find(i => i.invoiceNumber === val);
                          if (inv) handleInvoiceSelect(inv);
                        }}
                      >
                        <SelectTrigger className="h-12 bg-white border-primary/20 shadow-sm rounded-xl">
                          <SelectValue placeholder="Search and select an invoice..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {filteredInvoices.map((inv) => (
                            <SelectItem key={inv.id} value={inv.invoiceNumber} className="py-3">
                              <div className="flex justify-between items-center w-full gap-8">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">{inv.tenant?.name || 'Unknown Tenant'} • {inv.property?.name || 'N/A'}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-black text-primary">{formatCurrency(inv.invoiceDetails?.outstanding ?? inv.invoiceDetails?.total)}</div>
                                  <div className="text-[9px] font-bold text-orange-600 uppercase">Due {new Date(inv.dueDate).toLocaleDateString()}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {filteredInvoices.length === 0 && (
                         <p className="text-center py-4 text-sm text-muted-foreground italic">No unpaid invoices found.</p>
                      )}
                    </div>
                  )}

                  {/* Selected Invoice Details with Grid Integrated */}
                  {selectedPaymentType === "invoice_payment" && selectedInvoice && (
                    <div className="mt-4 space-y-4">
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <Receipt className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-lg text-slate-900">Active Voucher Attachment</h4>
                                <p className="text-xs text-slate-500">Linked systematically to the current payment record</p>
                              </div>
                            </div>
                            {!invoice && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all font-bold"
                                onClick={() => {
                                  setSelectedInvoice(null);
                                  setShowInvoiceSelector(true);
                                }}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Detach & Re-select
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Identifier</p>
                              <p className="font-black text-slate-800 tracking-tight">{selectedInvoice.invoiceNumber}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Tenant</p>
                              <p className="font-bold text-slate-800 flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" />
                                {selectedInvoice.tenant?.name ?? "—"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Location</p>
                              <p className="font-bold text-slate-700 truncate">{selectedInvoice.property?.name ?? "—"} <span className="text-slate-300 mx-1">/</span> {selectedInvoice.property?.unit ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settlement Target</p>
                              <p className="text-xl font-black text-red-600 tabular-nums">{formatCurrency(selectedInvoice.invoiceDetails?.outstanding ?? selectedInvoice.invoiceDetails?.total)}</p>
                            </div>
                          </div>
                          
                          {selectedInvoice.paymentStatus === "partial" && (
                            <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-4">
                              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                                <AlertCircle className="h-5 w-5 text-orange-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-orange-900">Aggregated Partial Settlement Found</p>
                                <p className="text-xs text-orange-700 opacity-80 mt-0.5">
                                  Current balance matches {formatCurrency(selectedInvoice.invoiceDetails?.outstanding)}. (Original: {formatCurrency(selectedInvoice.invoiceDetails?.total)})
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Multi-invoice allocation
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Each line pays a tenant invoice; amounts must sum to the payment total (
                              {formatCurrency(watchedValues.paymentDetails?.amount || 0)}).
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setAllocationRows((prev) => [...prev, { invoiceId: 0, amount: 0 }])
                            }
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add line
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {allocationRows.map((row, idx) => (
                            <div key={idx} className="flex flex-wrap gap-2 items-end">
                              <div className="min-w-[200px] flex-1">
                                <Label className="text-xs">Invoice</Label>
                                <Select
                                  value={row.invoiceId ? String(row.invoiceId) : ""}
                                  onValueChange={(v) => {
                                    const id = parseInt(v, 10);
                                    setAllocationRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, invoiceId: id } : r))
                                    );
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select invoice" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[280px]">
                                    {filteredAvailableInvoices.map((inv) => (
                                      <SelectItem key={inv.id} value={String(inv.id)}>
                                        {inv.invoiceNumber} · {inv.tenant?.name ?? "—"}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-36">
                                <Label className="text-xs">Amount</Label>
                                <Input
                                  type="number"
                                  step="any"
                                  value={row.amount === 0 ? "" : row.amount}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setAllocationRows((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, amount: val } : r))
                                    );
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-red-600 shrink-0"
                                disabled={allocationRows.length <= 1}
                                onClick={() =>
                                  setAllocationRows((prev) => prev.filter((_, i) => i !== idx))
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Integrated Grid for Invoice Payment */}
                      <div className="bg-slate-50/50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                         {detailsGrid}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payee Information Tab */}
            <TabsContent value="payee" className="space-y-4">
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
                        disabled={isLocked}
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
                        disabled={isLocked}
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
                        disabled={isLocked}
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
                        disabled={isLocked}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        {...register("payeeInfo.address")}
                        placeholder="Vendor/payee address"
                        rows={2}
                        disabled={isLocked}
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
            <TabsContent value="purpose" className="space-y-4">
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
                        disabled={isLocked}
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
                        disabled={isLocked}
                      />
                    </div>

                    <div>
                      <Label htmlFor="purchaseOrderNo">Purchase Order No.</Label>
                      <Input
                        id="purchaseOrderNo"
                        {...register("paymentPurpose.purchaseOrderNo")}
                        placeholder="PO-2024-001"
                        disabled={isLocked}
                      />
                    </div>

                    <div>
                      <Label htmlFor="accountCode">Account Code (Chart of Accounts)</Label>
                      <SearchableSelect
                        options={accountOptions}
                        value={watchedValues.taxInfo?.accountCode || ""}
                        onValueChange={(value) => setValue("taxInfo.accountCode", value)}
                        placeholder="Search and select account..."
                        searchPlaceholder="Type code or name..."
                        disabled={isLocked}
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
                            disabled={isLocked}
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
            <TabsContent value="details" className="space-y-4">
               <div className="p-6 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-semibold">Consolidated Entry View Enabled</p>
                  <p className="text-sm mt-2">All transaction entries are now managed directly in the "Payment Type" tab for a streamlined workflow.</p>
                  <Button 
                    variant="outline" 
                    className="mt-6"
                    onClick={() => setActiveTab("type")}
                  >
                    Go to Primary View
                  </Button>
               </div>
            </TabsContent>

            {/* Review Tab */}
            <TabsContent value="review" className="space-y-4">
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
                  <div className="p-6 bg-gradient-to-br from-blue-50/50 via-green-50/30 to-white rounded-2xl border-2 border-blue-100/50 shadow-inner">
                    <div className="flex flex-col md:flex-row items-start gap-6">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200 shrink-0">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Voucher Executive Summary</h3>
                          <p className="text-sm text-slate-500 mt-1">Please double check the details before recording the payment.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Category</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-bold px-3 py-1">
                                {paymentTypes.find(t => t.value === selectedPaymentType)?.label || "Miscellaneous"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payee Recipient</p>
                            <p className="font-bold text-slate-800 flex items-center gap-2">
                              <User className="h-4 w-4 text-slate-400" />
                              {watchedValues.payeeInfo?.payeeName || "Not specified"}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accounting Head</p>
                            <p className="font-bold text-slate-800">
                              {expenseCategories.find(c => c.value === watchedValues.paymentPurpose?.category)?.label || "General Expense"}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Mode</p>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-green-600" />
                              <span className="font-bold text-slate-800">{paymentMethods.find(m => m.value === selectedPaymentMethod)?.label || "Bank Transfer"}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Ref</p>
                            <code className="text-xs bg-slate-100 px-2 py-1 rounded border font-mono font-bold text-slate-700">
                              {watchedValues.paymentDetails?.paymentReference || "GEN-REF-PENDING"}
                            </code>
                          </div>
                        </div>

                        <Separator className="bg-slate-200/60" />

                        <div className="flex flex-col sm:flex-row justify-between items-end gap-6">
                          <div className="space-y-1 w-full sm:w-auto">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sm:text-left">Net Payable Amount</p>
                            <div className="flex items-center gap-3">
                              <span className="text-4xl font-black text-primary drop-shadow-sm tracking-tight">
                                {formatCurrency((Array.isArray(watchedValues.details) ? watchedValues.details : []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0)}
                              </span>
                              {vatEnabled && (
                                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 font-bold">
                                  Excl. VAT
                                </Badge>
                              )}
                            </div>
                          </div>

                          {vatEnabled && (
                            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-green-100 shadow-sm w-full sm:w-auto">
                              <div className="flex justify-between items-center gap-8 border-b pb-2 mb-2">
                                <span className="text-xs font-semibold text-slate-500 italic">VAT ({watchedValues.taxInfo?.vatPercentage}%)</span>
                                <span className="font-bold text-slate-700">{formatCurrency(watchedValues.taxInfo?.vatAmount || 0)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-8">
                                <span className="text-sm font-bold text-slate-600">Total Including VAT</span>
                                <span className="text-xl font-black text-green-600 tracking-tight">{formatCurrency(watchedValues.taxInfo?.totalWithVat || 0)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="button" variant="outline" disabled={!!initialData?.isPosted}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" disabled={!!initialData?.isPosted}>
                <Upload className="h-4 w-4 mr-2" />
                Attach Documents
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-primary shadow-glow"
                disabled={!!initialData?.isPosted}
              >
                <Check className="h-4 w-4 mr-2" />
                {mode === "create" ? "Record Payment" : "Update Payment"}
              </Button>
            </div>
          </div>
        </form>
    </>
  );

  if (embedPage) {
    return (
      <div className="space-y-6">
        <Button type="button" variant="ghost" onClick={() => navigate("/finance")}>
          ← Back to Finance
        </Button>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {mode === "create" ? "Record New Payment" : "Edit Payment"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "create"
                ? "Record a payment for invoices, suppliers, contractors, employees, or other expenses"
                : "Update the payment details"}
            </p>
          </div>
          {mode === "edit" && (
            <div className="flex items-center gap-2">
              {initialData?.isPosted ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={handleUnpost}
                  disabled={isUnposting}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {isUnposting ? "Unposting..." : "UnPost"}
                </Button>
              ) : (
                <Button 
                  type="button" 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handlePost}
                  disabled={isPosting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isPosting ? "Posting..." : "Post"}
                </Button>
              )}
            </div>
          )}
        </div>
        {invoiceBanner}
        {formContent}
      </div>
    );
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 rounded-none flex flex-col">
        <DialogHeader className="p-4 pb-2 shrink-0 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold">
                {mode === "create" ? "Record New Payment" : "Edit Payment"}
              </DialogTitle>
              <p className="text-muted-foreground text-sm">
                {mode === "create"
                  ? "Record a payment for invoices, suppliers, contractors, employees, or other expenses"
                  : "Update the payment details"}
              </p>
            </div>
            {mode === "edit" && (
              <div className="flex items-center gap-2">
                {initialData?.isPosted ? (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    onClick={handleUnpost}
                    disabled={isUnposting}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {isUnposting ? "Unposting..." : "UnPost"}
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handlePost}
                    disabled={isPosting}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isPosting ? "Posting..." : "Post"}
                  </Button>
                )}
              </div>
            )}
          </div>
          {invoiceBanner}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
