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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { vendorsAPI, vendorInvoicesAPI, purchaseInvoicesAPI, chartOfAccountsAPI, ledgerSetupsAPI } from "@/services/api";
import { toast } from "sonner";

// Modified receipt types for Receivables section
const receiptTypes = [
  { value: "invoice_payment", label: "Tenant Invoice", icon: Receipt, description: "Receipt against property/tenant invoices" },
  { value: "misc_receipt", label: "Miscellaneous Receipt", icon: Wrench, description: "Miscellaneous incoming receipts" },
];

// Expense categories for receipts
const receiptCategories = [
  { value: "rent", label: "Rent" },
  { value: "security_deposit", label: "Security Deposit" },
  { value: "maintenance_fee", label: "Maintenance Fee" },
  { value: "utility_recovery", label: "Utility Recovery" },
  { value: "late_fee", label: "Late Fee" },
  { value: "admin_fee", label: "Admin Fee" },
  { value: "misc", label: "Miscellaneous" }
];

// Receipt form validation schema
const receiptFormSchema = z.object({
  // Receipt Type
  paymentType: z.string().min(1, "Receipt type is required"),
  
  // Basic Information
  paymentNumber: z.string().min(1, "Receipt number is required"),
  paymentDate: z.string().min(1, "Receipt date is required"),
  
  // Conditional: Invoice Information (for invoice receipts)
  invoice: z.object({
    id: z.coerce.string().optional(),
    number: z.string().optional(),
    amount: z.number().optional(),
    leaseId: z.coerce.number().optional(),
    tenantId: z.coerce.number().optional(),
  }).optional(),
  
  // Customer Information (Renamed from Payee Info)
  payeeInfo: z.object({
    payeeType: z.string().min(1, "Customer type is required"),
    payeeName: z.string().min(1, "Tenant Name is required"),
    payeeId: z.coerce.string().optional(),
    contactNumber: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
    taxId: z.string().optional(),
    licenseNumber: z.string().optional(),
  }),
  
  // Service Details (Renamed from Purpose)
  paymentPurpose: z.object({
    category: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    referenceNumber: z.string().optional(),
    purchaseOrderNo: z.string().optional(), // Becomes Order No in UI
    property: z.string().optional(),
    unit: z.string().optional(),
  }),
  
  // Receipt Details (Renamed from Payment Details)
  paymentDetails: z.object({
    amount: z.number().min(0.01, "Receipt amount must be greater than 0"),
    currency: z.string().min(1, "Currency is required"),
    paymentMethod: z.enum(["bank_transfer", "cheque", "cash", "credit_card", "online_payment", "pdc"], {
      required_error: "Please select a payment method",
    }),
    paymentMode: z.enum(["Cash", "Bank", "PDC"]).optional(),
    pettyCashAccount: z.string().optional(),
    bankName: z.string().optional(),
    instrumentNumber: z.string().optional(),
    instrumentDate: z.string().optional(),
    paymentReference: z.string().min(1, "Receipt reference is required"),
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
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    bill: z.string().optional(),
    narration: z.string().optional(),
  })).min(1, "At least one detail line is required"),
  
  // Tax & Accounting
  taxInfo: z.object({
    vatApplicable: z.boolean(),
    vatPercentage: z.number().optional(),
    vatAmount: z.number().optional(),
    totalWithVat: z.number().optional(),
    accountCode: z.string().optional(),
  }),
  
  // Status and Processing
  status: z.enum(["pending", "paid", "overdue", "cancelled", "refunded"]),
  processedBy: z.string().min(1, "Processed by is required"),
  approvedBy: z.string().optional(),
  
  // Additional Information
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type ReceiptFormData = z.infer<typeof receiptFormSchema>;

interface ReceiptFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReceiptFormData) => void;
  initialData?: any;
  mode: "create" | "edit";
  invoice?: any;
  availableInvoices?: any[];
  embedPage?: boolean;
}

const paymentMethodsData = [
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "cheque", label: "Cheque", icon: FileText },
  { value: "pdc", label: "Post Dated Cheque (PDC)", icon: FileCheck },
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "online_payment", label: "Online Payment", icon: Globe },
];

const uaeBanks = [
  "Emirates NBD", "ADCB (Abu Dhabi Commercial Bank)", "FAB (First Abu Dhabi Bank)",
  "Mashreq Bank", "RAKBANK", "Dubai Islamic Bank", "ADIB (Abu Dhabi Islamic Bank)",
  "Emirates Islamic Bank", "HSBC UAE", "Standard Chartered UAE", "Citibank UAE", "Other"
];

const customerTypes = [
  { value: "tenant", label: "Tenant" },
  { value: "other", label: "Other" },
];

export default function ReceiptForm({ isOpen, onClose, onSubmit, initialData, mode, invoice, availableInvoices = [], embedPage = false }: ReceiptFormProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("type");
  const [selectedReceiptType, setSelectedReceiptType] = useState<string>(invoice ? "invoice_payment" : "");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>("");
  const [vatEnabled, setVatEnabled] = useState(false);
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [pettyCashAccounts, setPettyCashAccounts] = useState<any[]>([]);
  const [ledgerSetups, setLedgerSetups] = useState<any[]>([]);
  
  const [showInvoiceSelector, setShowInvoiceSelector] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(invoice || null);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");

  const [filteredAvailableInvoices, setFilteredAvailableInvoices] = useState<any[]>([]);

  useEffect(() => {
    const unpaid = availableInvoices.filter(inv => {
      const isPaid = inv.status?.toLowerCase() === "paid";
      const outstanding = Number(inv.invoiceDetails?.outstanding ?? inv.invoiceDetails?.total ?? inv.totalAmount ?? 0);
      const paymentPaid = inv.paymentStatus?.toLowerCase() === "paid";
      return !isPaid && (outstanding > 0 || !paymentPaid);
    });
    setFilteredAvailableInvoices(unpaid);
  }, [availableInvoices]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const accountsRes = await chartOfAccountsAPI.getHierarchy();
        const tree = accountsRes.data?.data || [];
        
        // Flatten tree and collect leaf nodes (connects properly with Ledger Setup posting types)
        const allAccounts: any[] = [];
        const walk = (nodes: any[]) => {
          if (!Array.isArray(nodes)) return;
          nodes.forEach((n) => {
            const hasNoChildren = !n.subAccounts || n.subAccounts.length === 0;
            if (hasNoChildren && n.id) {
              allAccounts.push(n);
            } else if (n.subAccounts && n.subAccounts.length > 0) {
              walk(n.subAccounts);
            }
          });
        };
        walk(tree);
        
        setAccounts(allAccounts);
        
        const pettyCash = allAccounts.filter((acc: any) => 
          (acc.accountName || '').toLowerCase().includes('cash') || 
          (acc.accountType || '').toLowerCase() === 'cash'
        );
        setPettyCashAccounts(pettyCash);

        const ledgersRes = await ledgerSetupsAPI.getAll({ limit: 500 });
        setLedgerSetups(ledgersRes.data?.data?.ledgerSetups || []);
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
      }
    };
    fetchData();
  }, []);

  const form = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: initialData || {
      paymentType: invoice ? "invoice_payment" : "",
      paymentNumber: `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      paymentDate: new Date().toISOString().split('T')[0],
      invoice: invoice ? {
        id: invoice.id,
        number: invoice.invoiceNumber,
        amount: invoice.invoiceDetails?.total || invoice.totalAmount || 0,
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
      status: "paid",
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
        narration: invoice ? `Receipt for ${invoice.invoiceNumber}` : "",
      }],
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues, control, reset } = form;
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "details"
  });

  const watchedValues = watch();

  useEffect(() => {
    if (invoice && (isOpen || embedPage)) {
      setSelectedReceiptType("invoice_payment");
      const outstandingAmount = invoice.invoiceDetails?.outstanding || invoice.invoiceDetails?.total || invoice.totalAmount || 0;
      
      reset({
        ...form.getValues(),
        paymentType: "invoice_payment",
        invoice: {
          id: invoice.id,
          number: invoice.invoiceNumber,
          amount: outstandingAmount,
          leaseId: invoice.lease?.id,
          tenantId: invoice.tenant?.id,
        },
        payeeInfo: {
          ...form.getValues().payeeInfo,
          payeeType: "tenant",
          payeeName: invoice.tenant?.name || "",
          payeeId: invoice.tenant?.id?.toString() || "",
          email: invoice.tenant?.email || "",
          contactNumber: invoice.tenant?.contactNumber || "",
        },
        paymentDetails: {
          ...form.getValues().paymentDetails,
          amount: outstandingAmount,
        },
        paymentPurpose: {
          ...form.getValues().paymentPurpose,
          category: "rent",
          description: `Receipt for ${invoice.invoiceNumber} - ${invoice.description || 'Invoice Receipt'}`,
          referenceNumber: invoice.invoiceNumber,
          property: invoice.property?.name || "",
          unit: invoice.property?.unit || "",
        },
        // We will populate both Dr and Cr lines dynamically in the ledgerSetups useEffect
        details: [{
          drCr: "Dr",
          particular: "Customer",
          ledger: "",
          amount: outstandingAmount,
          bill: invoice.invoiceNumber,
          narration: `Receipt for ${invoice.invoiceNumber}`,
        }],
      });
    }
  }, [invoice, isOpen, embedPage, reset, form]);

  // Load ledgers for initial load or when changing payment mode without invoice
  useEffect(() => {
    if (ledgerSetups.length > 0 && mode === "create" && isOpen) {
      const currentDetails = getValues("details");
      
      // Auto-fill if we have default blank row OR if we switch to misc_receipt and want to default ledgers
      if (currentDetails.length === 1 && !currentDetails[0].ledger) {
        const paymentMode = selectedPaymentMode || "Bank";
        const outstanding = invoice ? (invoice.invoiceDetails?.outstanding ?? invoice.invoiceDetails?.total ?? invoice.totalAmount ?? 0) : 0;
        const billNo = invoice?.invoiceNumber || "none";
        const narration = invoice ? `Receipt for ${invoice.invoiceNumber}` : "Miscellaneous Receipt";
        
        const drSetup = ledgerSetups.find((l: any) => l.documentType === 'Receipt' && l.amountType === 'Dr');
        const drLedger = drSetup?.postingType ? String(drSetup.postingType) : "";

        const crSetup = ledgerSetups.find((l: any) => l.documentType === 'Receipt' && l.amountType === 'Cr' && (l.subDocument === paymentMode || !l.subDocument));
        const crLedger = crSetup?.postingType ? String(crSetup.postingType) : "";
        let crParticular = paymentMode === "Cash" ? "Cash" : "Bank";

        replace([
          {
            drCr: "Dr",
            particular: "Customer",
            ledger: drLedger,
            amount: outstanding,
            bill: billNo,
            narration: narration,
          },
          {
            drCr: "Cr",
            particular: crParticular,
            ledger: crLedger,
            amount: outstanding,
            bill: "none",
            narration: narration,
          }
        ]);
      }
    }
  }, [ledgerSetups, invoice, mode, selectedPaymentMode, replace, getValues, isOpen, selectedReceiptType]);

  useEffect(() => {
    if (mode === "edit" && initialData && isOpen) {
      let parsedDetails = initialData.details;
      if (typeof parsedDetails === 'string') {
        try { parsedDetails = JSON.parse(parsedDetails); } catch(e) {}
      }
      const validDetails = Array.isArray(parsedDetails) && parsedDetails.length > 0 ? parsedDetails : null;

      let parsedTaxInfo = initialData.taxInfo;
      if (typeof parsedTaxInfo === 'string') {
        try { parsedTaxInfo = JSON.parse(parsedTaxInfo); } catch(e) {}
      }

      let parsedPaymentDetails = initialData.paymentDetails;
      if (typeof parsedPaymentDetails === 'string') {
        try { parsedPaymentDetails = JSON.parse(parsedPaymentDetails); } catch(e) {}
      }

      reset({
        ...form.getValues(),
        paymentType: initialData.paymentType || "",
        paymentNumber: initialData.paymentNumber || "",
        paymentDate: initialData.paymentDate ? new Date(initialData.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        invoice: initialData.invoice,
        payeeInfo: {
          payeeType: initialData.payeeType || (initialData.tenant ? "tenant" : "other"),
          payeeName: initialData.tenant?.name || initialData.tenant || initialData.payeeName || initialData.vendor?.vendorName || "",
          payeeId: initialData.tenantId?.toString() || initialData.payeeId || initialData.vendorId?.toString() || "",
          email: initialData.tenant?.email || initialData.payeeEmail || initialData.vendor?.email || "",
          contactNumber: initialData.tenant?.phone || initialData.payeePhone || initialData.vendor?.phone || "",
          address: initialData.tenant?.address || initialData.payeeAddress || initialData.address || "",
          taxId: initialData.payeeTaxId || initialData.taxId || "",
          licenseNumber: initialData.payeeLicenseNumber || initialData.licenseNumber || "",
        },
        paymentPurpose: {
          category: initialData.category || "rent",
          description: initialData.description || "",
          referenceNumber: initialData.reference || initialData.paymentReference || initialData.invoiceId || "",
          property: initialData.propertyName || initialData.property || initialData.tenant?.property || "",
          unit: initialData.unitNumber || initialData.unit || "",
        },
        paymentDetails: {
          amount: parseFloat(initialData.amount) || parseFloat(initialData.totalAmount) || 0,
          currency: initialData.currency || "AED",
          paymentMethod: initialData.paymentMethod || "bank_transfer",
          paymentMode: parsedPaymentDetails?.paymentMode || initialData.paymentMode || (initialData.paymentMethod === 'cash' ? "Cash" : initialData.paymentMethod === 'pdc' ? "PDC" : "Bank"),
          bankName: initialData.bankName || parsedPaymentDetails?.bankName || "",
          instrumentNumber: initialData.instrumentNumber || parsedPaymentDetails?.instrumentNumber || (initialData.reference && !String(initialData.reference).includes("-2024-") ? initialData.reference : ""),
          instrumentDate: initialData.instrumentDate ? new Date(initialData.instrumentDate).toISOString().split('T')[0] : (parsedPaymentDetails?.instrumentDate || ""),
          paymentReference: initialData.reference || initialData.paymentReference || parsedPaymentDetails?.paymentReference || "",
          bankDetails: parsedPaymentDetails?.bankDetails || initialData.bankDetails || {
            bankName: initialData.bankName || "",
            accountNumber: "",
            transactionId: initialData.instrumentNumber || "",
          },
        },
        taxInfo: parsedTaxInfo || { vatApplicable: false },
        details: validDetails || [{
          drCr: "Dr",
          particular: "Customer",
          ledger: "",
          amount: initialData.amount || 0,
          bill: "",
          narration: initialData.description || "",
        }],
        status: initialData.status === 'completed' ? 'paid' : (initialData.status || "paid"),
        processedBy: initialData.processedBy || "Finance Manager",
      });
      
      const invoiceRef = initialData.invoiceId || initialData.invoice?.id || initialData.invoice?.invoiceNumber || initialData.reference || initialData.paymentReference;
      const isInvoicePayment = initialData.paymentType === "invoice_payment" || !!invoiceRef;
      
      const derivedPaymentType = initialData.paymentType || (isInvoicePayment ? "invoice_payment" : "misc_receipt");
      const derivedPaymentMode = initialData.paymentDetails?.paymentMode || initialData.paymentMode || (initialData.paymentMethod === 'cash' ? "Cash" : initialData.paymentMethod === 'pdc' ? "PDC" : "Bank");

      setSelectedReceiptType(derivedPaymentType);
      setSelectedPaymentMode(derivedPaymentMode);
      
      // Auto-select invoice if it exists in initialData
      if (initialData.invoice) {
        setSelectedInvoice(initialData.invoice);
        setShowInvoiceSelector(false);
      } else if (invoiceRef && availableInvoices) {
        const found = availableInvoices.find((i: any) => 
          String(i.id) === String(invoiceRef) || 
          String(i.invoiceNumber) === String(invoiceRef) ||
          (initialData.reference && String(i.invoiceNumber) === String(initialData.reference)) ||
          (initialData.paymentReference && String(i.invoiceNumber) === String(initialData.paymentReference))
        );
        if (found) {
          setSelectedInvoice(found);
          setShowInvoiceSelector(false);
        } else if (derivedPaymentType === "invoice_payment") {
          // Fallback to fetch from what's there
          setSelectedInvoice({ 
            invoiceNumber: invoiceRef, 
            tenant: { name: initialData.tenant?.name || initialData.tenant || initialData.payeeName } 
          });
          setShowInvoiceSelector(false);
        }
      }

      if (derivedPaymentType === "invoice_payment" && !selectedInvoice && !invoiceRef) {
         setShowInvoiceSelector(true);
      }

      setActiveTab("type"); // Start at the first tab
    }
  }, [mode, initialData, isOpen, reset, form, availableInvoices]);

  const filteredInvoicesList = filteredAvailableInvoices.filter(inv => {
    const searchLower = (invoiceSearchQuery ?? "").trim().toLowerCase();
    if (!searchLower) return true;
    return (
      (inv.invoiceNumber ?? "").toLowerCase().includes(searchLower) ||
      (inv.tenant?.name ?? "").toLowerCase().includes(searchLower) ||
      (inv.property?.name ?? "").toLowerCase().includes(searchLower) ||
      (inv.property?.unit ?? "").toLowerCase().includes(searchLower)
    );
  });

  const generateReceiptReference = () => {
    const method = watchedValues.paymentDetails?.paymentMethod || "bank_transfer";
    const prefix = method === "bank_transfer" ? "TXN" : 
                  method === "cheque" ? "CHQ" : 
                  method === "cash" ? "CASH" : 
                  method === "credit_card" ? "CC" : 
                  method === "pdc" ? "PDC" : "ONLINE";
    const timestamp = new Date().getTime().toString().slice(-6);
    return `${prefix}-2024-${timestamp}`;
  };

  const handleReceiptTypeChange = (type: string) => {
    setSelectedReceiptType(type);
    setValue("paymentType", type);
    if (type === "invoice_payment" && !invoice) {
      setShowInvoiceSelector(true);
    }
    if (type === "invoice_payment") {
       setValue("paymentPurpose.category", "rent");
    }
  };

  const handleInvoiceSelect = (invoiceData: any) => {
    setSelectedInvoice(invoiceData);
    setShowInvoiceSelector(false);
    const outstanding = invoiceData.invoiceDetails?.outstanding ?? invoiceData.invoiceDetails?.total ?? 0;
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
    setValue("payeeInfo.address", invoiceData.tenant?.address ?? "");
    setValue("paymentDetails.amount", outstanding);
    setValue("paymentPurpose.description", `Receipt for ${invoiceData.invoiceNumber} - ${invoiceData.description ?? ""}`);
    setValue("paymentPurpose.referenceNumber", invoiceData.invoiceNumber);
    setValue("paymentPurpose.property", invoiceData.property?.name ?? "");
    setValue("paymentPurpose.unit", invoiceData.property?.unit ?? "");
    
    // Auto populate Debit and Credit rows from Ledger Setup
    const paymentMode = selectedPaymentMode || "Bank";
    const drSetup = ledgerSetups.find((l: any) => l.documentType === 'Receipt' && l.amountType === 'Dr');
    const drLedger = drSetup?.postingType ? String(drSetup.postingType) : "";

    const crSetup = ledgerSetups.find((l: any) => l.documentType === 'Receipt' && l.amountType === 'Cr' && (l.subDocument === paymentMode || !l.subDocument));
    const crLedger = crSetup?.postingType ? String(crSetup.postingType) : "";
    let crParticular = paymentMode === "Cash" ? "Cash" : "Bank";

    replace([
      {
        drCr: "Dr",
        particular: "Customer",
        ledger: drLedger,
        amount: outstanding,
        bill: invoiceData.invoiceNumber,
        narration: `Receipt for ${invoiceData.invoiceNumber}`,
      },
      {
        drCr: "Cr",
        particular: crParticular,
        ledger: crLedger,
        amount: outstanding,
        bill: "none",
        narration: `Receipt for ${invoiceData.invoiceNumber}`,
      }
    ]);
  };

  const handlePaymentMethodChange = (method: string) => {
    setSelectedPaymentMethod(method);
    setValue("paymentDetails.paymentMethod", method as any);
    const reference = generateReceiptReference();
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
    if (checked) calculateVAT();
  };

  const onFormSubmit = (data: ReceiptFormData) => {
    // Validate Dr/Cr totals
    const totalDr = data.details.filter(d => d.drCr === 'Dr').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalCr = data.details.filter(d => d.drCr === 'Cr').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    
    // Use a small epsilon for floating point comparison
    const calculatedAmount = data.paymentDetails?.amount || totalDr;
    if (Math.abs(totalDr - totalCr) > 0.01) {
      toast.error(`Debit (${formatCurrency(totalDr)}) and Credit (${formatCurrency(totalCr)}) totals must be equal. Please adjust the amounts.`);
      setActiveTab("details");
      return;
    }

    const payload = {
      ...data,
      amount: calculatedAmount,
      paymentMethod: data.paymentDetails.paymentMethod,
      dueDate: data.paymentDate, // Backend sometimes expects dueDate for receipts
      paymentDetails: {
        ...data.paymentDetails,
        amount: calculatedAmount
      },
      payeeName: data.payeeInfo.payeeName,
      payeeType: data.payeeInfo.payeeType,
      tenantId: data.invoice?.tenantId || data.payeeInfo.payeeId || null,
      description: data.paymentPurpose.description,
      category: data.paymentPurpose.category,
      reference: data.paymentDetails.paymentReference || data.paymentPurpose.referenceNumber,
    };

    onSubmit(payload as any);
  };

  const onFormError = (errors: any) => {
    // Determine which tab to switch to based on where the error is
    let targetTab = "type";
    
    if (errors.payeeInfo) {
      targetTab = "payee";
      toast.error("Please fill in the required Customer Info fields.");
    } else if (errors.paymentPurpose) {
      targetTab = "purpose";
      toast.error("Please fill in the required Service Details fields.");
    } else if (errors.paymentDetails || errors.details) {
      targetTab = "details";
      toast.error("Please fill in the required Receipt Details fields. Ensure a Ledger Account is selected for all rows.");
    } else if (errors.paymentNumber || errors.paymentDate || errors.paymentType) {
      targetTab = "type";
      toast.error("Please fill in the required Basic Information fields.");
    } else if (errors.status || errors.processedBy) {
      targetTab = "review";
      toast.error("Please fill in the required Review & Submit fields.");
    } else {
      toast.error("Please fix the validation errors before submitting.");
    }

    setActiveTab(targetTab);
  };

  const formatCurrency = (amount: any) => {
    const value = Number(amount);
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(isNaN(value) ? 0 : value);
  };

  const invoiceBanner = invoice ? (
    <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900">Recording Receipt for Invoice</h4>
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
          Receipt Details
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
                      >
                        <SelectTrigger className="shadow-sm bg-white">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Customer">Customer</SelectItem>
                          <SelectItem value="Bank">Bank</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={watchedValues.details?.[index]?.ledger}
                        onValueChange={(value) => setValue(`details.${index}.ledger`, value)}
                      >
                        <SelectTrigger className={cn("shadow-sm bg-white", errors.details?.[index]?.ledger ? "border-red-500 ring-1 ring-red-500" : "")}>
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.filter(acc => {
                            const particular = watchedValues.details?.[index]?.particular;
                            const code = String(acc.accountCode || '');
                            if (particular === 'Customer') return code.startsWith('1');
                            if (particular === 'Bank') return code.startsWith('11');
                            if (particular === 'Cash') return code.startsWith('11');
                            return true;
                          }).map((acc) => (
                            <SelectItem key={acc.id} value={acc.id.toString()}>
                              {acc.accountCode ? `${acc.accountCode} - ${acc.accountName}` : acc.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        step="any"
                        {...register(`details.${index}.amount` as const, { valueAsNumber: true })}
                        placeholder="0.00"
                        className="shadow-sm font-semibold bg-white"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={watchedValues.details?.[index]?.bill}
                        onValueChange={(value) => setValue(`details.${index}.bill`, value)}
                      >
                        <SelectTrigger className="shadow-sm bg-white">
                          <SelectValue placeholder="Select bill..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedReceiptType === "invoice_payment" && filteredInvoicesList.map(inv => (
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
              {formatCurrency(watchedValues.details?.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const formContent = (
    <>
      <form id="receipt-voucher-form" onSubmit={handleSubmit(onFormSubmit, onFormError)} className="space-y-4 pb-[3rem] ">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
              <TabsList className="inline-flex w-auto min-w-full lg:flex lg:w-full lg:grid lg:grid-cols-5 p-1 bg-muted/50 rounded-xl">
                <TabsTrigger value="type" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 lg:px-2">
                  Receipt Type
                  {(errors.paymentType || errors.paymentNumber || errors.paymentDate) && (
                     <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="payee" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 lg:px-2">
                  Customer Info
                  {errors.payeeInfo && (
                     <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="purpose" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 lg:px-2">
                  Service Details
                  {errors.paymentPurpose && (
                     <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="details" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 lg:px-2">
                  Receipt Details
                  {(errors.paymentDetails || errors.details) && (
                     <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="review" className="relative rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 lg:px-2">
                  Review
                  {(errors.status || errors.processedBy) && (
                     <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Receipt Type Tab */}
            <TabsContent value="type" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Select Receipt Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {receiptTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <div
                          key={type.value}
                          className={cn(
                            "p-5 border rounded-xl cursor-pointer transition-all duration-300 group",
                            selectedReceiptType === type.value
                              ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
                              : "border-border hover:border-primary/50 hover:bg-muted/30 hover:shadow-md"
                          )}
                          onClick={() => handleReceiptTypeChange(type.value)}
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center transition-colors duration-300",
                                selectedReceiptType === type.value ? "bg-primary shadow-glow" : "bg-primary/10 group-hover:bg-primary/20"
                              )}>
                                <IconComponent className={cn(
                                  "h-6 w-6",
                                  selectedReceiptType === type.value ? "text-white" : "text-primary"
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
                      <Label htmlFor="paymentNumber">Receipt Number *</Label>
                      <Input
                        id="paymentNumber"
                        {...register("paymentNumber")}
                        placeholder="REC-2024-001"
                        className={errors.paymentNumber ? "border-red-500" : ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentDate">Receipt Date *</Label>
                      <Input
                        id="paymentDate"
                        type="date"
                        {...register("paymentDate")}
                        className={errors.paymentDate ? "border-red-500" : ""}
                      />
                      </div>
                    </div>
                  </div>

                  {/* Settlement Mode */}
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
                              if (value === "Cash") handlePaymentMethodChange("cash");
                              else if (value === "Bank") handlePaymentMethodChange("bank_transfer");
                              else if (value === "PDC") handlePaymentMethodChange("pdc");

                              // Update Credit ledger side based on new selected financial mode
                              const currentDetails = getValues("details");
                              if (mode === "create") {
                                const crSetup = ledgerSetups.find((l: any) => 
                                  l.documentType === 'Receipt' && 
                                  l.amountType === 'Cr' && 
                                  (l.subDocument === value || !l.subDocument)
                                );
                                const crLedger = crSetup?.postingType ? String(crSetup.postingType) : "";
                                let crParticular = value === "Cash" ? "Cash" : "Bank";
                                
                                if (currentDetails && currentDetails.length > 1) {
                                  const newDetails = currentDetails.map(d => {
                                    if (d.drCr === 'Cr') {
                                      return { ...d, ledger: crLedger, particular: crParticular };
                                    }
                                    return d;
                                  });
                                  replace(newDetails as any);
                                } else {
                                  // Re-trigger the default state initialization for both legs if rows are corrupted
                                  replace([{ drCr: "Dr", particular: "Customer", ledger: "", amount: 0, bill: "", narration: "" }]);
                                }
                              }
                            }}
                          >
                            <SelectTrigger id="paymentMode" className="h-11 shadow-sm bg-white border-blue-200">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">Cash Settlement</SelectItem>
                              <SelectItem value="Bank">Bank Transfer / Direct Ledger</SelectItem>
                              <SelectItem value="PDC">Post Dated Cheque (PDC)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(selectedPaymentMode === "Bank" || selectedPaymentMode === "PDC") && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="bankName" className="text-sm font-semibold">Receiving Bank *</Label>
                              <Select
                                value={watchedValues.paymentDetails?.bankName}
                                onValueChange={(value) => setValue("paymentDetails.bankName", value)}
                              >
                                <SelectTrigger id="bankName" className="h-11 shadow-sm bg-white border-blue-200">
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
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Invoice Selector */}
                  {selectedReceiptType === "invoice_payment" && !selectedInvoice && showInvoiceSelector && (
                    <div className="mt-8 space-y-4 p-6 border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">Select Invoice for Receipt</h4>
                            <p className="text-xs text-muted-foreground">Pick an unpaid or partially paid invoice</p>
                          </div>
                        </div>
                      </div>
                      <Select 
                        onValueChange={(val) => {
                          const inv = filteredInvoicesList.find(i => i.invoiceNumber === val);
                          if (inv) handleInvoiceSelect(inv);
                        }}
                      >
                        <SelectTrigger className="h-12 bg-white border-primary/20 shadow-sm rounded-xl">
                          <SelectValue placeholder="Search and select an invoice..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {filteredInvoicesList.map((inv) => (
                            <SelectItem key={inv.id} value={inv.invoiceNumber} className="py-3">
                              <div className="flex justify-between items-center w-full gap-8">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase">{inv.tenant?.name || 'Unknown Tenant'} • {inv.property?.name || 'N/A'}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-black text-primary">{formatCurrency(inv.invoiceDetails?.outstanding ?? inv.invoiceDetails?.total)}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Selected Invoice Details */}
                  {selectedReceiptType === "invoice_payment" && selectedInvoice && (
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
                                <h4 className="font-bold text-lg text-slate-900">Linked Invoice Details</h4>
                              </div>
                            </div>
                            {!invoice && (
                              <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedInvoice(null); setShowInvoiceSelector(true); }}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Re-select
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Number</p>
                              <p className="font-black text-slate-800 tracking-tight">{selectedInvoice.invoiceNumber}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tenant Name</p>
                              <p className="font-bold text-slate-800">{selectedInvoice.tenant?.name ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property / Unit</p>
                              <p className="font-bold text-slate-700 truncate">{selectedInvoice.property?.name ?? "—"} / {selectedInvoice.property?.unit ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outstanding</p>
                              <p className="text-xl font-black text-red-600 tabular-nums">{formatCurrency(selectedInvoice.invoiceDetails?.outstanding ?? selectedInvoice.invoiceDetails?.total)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customer Information Tab */}
            <TabsContent value="payee" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="payeeType">Customer Type *</Label>
                      <Select value={watchedValues.payeeInfo?.payeeType} onValueChange={(value) => setValue("payeeInfo.payeeType", value)}>
                        <SelectTrigger className={errors.payeeInfo?.payeeType ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {customerTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="payeeName">Tenant Name *</Label>
                      <Input id="payeeName" {...register("payeeInfo.payeeName")} placeholder="Enter Tenant Name" className={errors.payeeInfo?.payeeName ? "border-red-500" : ""} />
                    </div>
                    <div>
                      <Label htmlFor="payeeId">Customer ID</Label>
                      <Input id="payeeId" {...register("payeeInfo.payeeId")} placeholder="TEN-001" />
                    </div>
                    <div>
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input id="contactNumber" {...register("payeeInfo.contactNumber")} placeholder="+971 50 123 4567" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" {...register("payeeInfo.email")} placeholder="tenant@example.com" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea id="address" {...register("payeeInfo.address")} placeholder="Customer address" rows={2} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Service Details Tab */}
            <TabsContent value="purpose" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Service Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select value={watchedValues.paymentPurpose?.category} onValueChange={(value) => setValue("paymentPurpose.category", value)}>
                        <SelectTrigger className={errors.paymentPurpose?.category ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {receiptCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="referenceNumber">Reference Number</Label>
                      <Input id="referenceNumber" {...register("paymentPurpose.referenceNumber")} placeholder="INV-2024-001" />
                    </div>
                    <div>
                      <Label htmlFor="purchaseOrderNo">Order No.</Label>
                      <Input id="purchaseOrderNo" {...register("paymentPurpose.purchaseOrderNo")} placeholder="ORD-2024-001" />
                    </div>
                    <div>
                      <Label htmlFor="property">Property (if applicable)</Label>
                      <Input id="property" {...register("paymentPurpose.property")} placeholder="Marina Heights" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="description">Receipt Details *</Label>
                      <Textarea id="description" {...register("paymentPurpose.description")} placeholder="Details of the receipt..." rows={3} className={errors.paymentPurpose?.description ? "border-red-500" : ""} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Receipt Details Tab */}
            <TabsContent value="details" className="space-y-4">
              {detailsGrid}
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
                    <Label htmlFor="status">Receipt Status *</Label>
                    <Select value={watchedValues.status} onValueChange={(value) => setValue("status", value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="processedBy">Processed By *</Label>
                      <Input id="processedBy" {...register("processedBy")} placeholder="Finance Manager" className={errors.processedBy ? "border-red-500" : ""} />
                    </div>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-blue-50/50 via-green-50/30 to-white rounded-2xl border-2 border-blue-100/50 shadow-inner">
                    <div className="flex flex-col md:flex-row items-start gap-6">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200 shrink-0">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt Category</p>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-bold px-3 py-1">
                              {receiptTypes.find(t => t.value === selectedReceiptType)?.label || "Tenant Invoice"}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tenant Recipient</p>
                            <p className="font-bold text-slate-800 flex items-center gap-2">
                              {watchedValues.payeeInfo?.payeeName || "Not specified"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt Mode</p>
                            <span className="font-bold text-slate-800">{paymentMethodsData.find(m => m.value === selectedPaymentMethod)?.label || "Bank Transfer"}</span>
                          </div>
                        </div>
                        <Separator className="bg-slate-200/60" />
                        <div className="flex flex-col sm:flex-row justify-between items-end gap-6">
                          <div className="space-y-1 w-full sm:w-auto">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sm:text-left">Net Receipt Amount</p>
                            <div className="flex items-center gap-3">
                              <span className="text-4xl font-black text-primary drop-shadow-sm tracking-tight">
                                {formatCurrency(watchedValues.details?.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button type="submit" className="bg-gradient-primary shadow-glow">
                <Check className="h-4 w-4 mr-2" />
                {mode === "create" ? "Record Receipt" : "Update Receipt"}
              </Button>
            </div>
          </div>
        </form>
    </>
  );

  if (embedPage) {
    return (
      <div className="space-y-6">
        <Button type="button" variant="ghost" onClick={() => navigate("/receivables")}>
          ← Back to Receivables
        </Button>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            {mode === "create" ? "Record New Receipt" : "Edit Receipt"}
          </h1>
          <p className="text-muted-foreground italic">
            {mode === "create" ? "Record a receipt for tenant invoices or miscellaneous income" : "Update the receipt details"}
          </p>
          {invoiceBanner}
        </div>
        {formContent}
      </div>
    );
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 rounded-none flex flex-col">
        <DialogHeader className="p-4 pb-2 shrink-0 bg-slate-50/50 border-b border-slate-100">
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Record New Receipt" : "Edit Receipt"}
          </DialogTitle>
          <p className="text-muted-foreground italic">
            {mode === "create" ? "Record a receipt for tenant invoices or miscellaneous income" : "Update the receipt details"}
          </p>
          {invoiceBanner}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
