import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
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
  AlertCircle, 
  Info, 
  Clock, 
  Target, 
  Award, 
  Star, 
  Heart, 
  Zap, 
  Globe, 
  Home, 
  Building, 
  Store, 
  Warehouse, 
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
  Minus,
  Search,
  Filter,
  Grid3X3,
  List,
  BarChart3,
  PieChart,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Banknote,
  Wallet,
  History,
  RefreshCw,
  Trash2,
  Copy,
  Share,
  ExternalLink,
  Lock,
  Unlock,
  Flag,
  Bell,
  Send,
  MessageSquare,
  Users,
  TrendingUp,
  TrendingDown
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

// UAE-compliant invoice form validation schema
const invoiceFormSchema = z.object({
  // Basic Information
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  period: z.string().min(1, "Period is required"),
  
  // Tenant Information
  tenant: z.object({
    id: z.number(),
    name: z.string().min(1, "Tenant name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    emiratesId: z.string().min(1, "Emirates ID is required"),
    nationality: z.string().min(1, "Nationality is required"),
    address: z.string().min(1, "Address is required"),
  }),
  
  // Property Information
  property: z.object({
    id: z.number(),
    name: z.string().min(1, "Property name is required"),
    unit: z.string().min(1, "Unit number is required"),
    address: z.string().min(1, "Property address is required"),
  }),
  
  // Lease Information
  lease: z.object({
    id: z.string().min(1, "Lease ID is required"),
    startDate: z.string().min(1, "Lease start date is required"),
    endDate: z.string().min(1, "Lease end date is required"),
    monthlyRent: z.number().min(0, "Monthly rent must be 0 or greater"),
  }),
  
  // Invoice Details
  invoiceDetails: z.object({
    description: z.string().min(1, "Description is required"),
    subtotal: z.number().min(0, "Subtotal must be 0 or greater"),
    vatRate: z.number().min(0).max(100, "VAT rate must be between 0 and 100"),
    vatAmount: z.number().min(0, "VAT amount must be 0 or greater"),
    total: z.number().min(0, "Total must be 0 or greater"),
    currency: z.string().min(1, "Currency is required"),
    paymentTerms: z.string().min(1, "Payment terms are required"),
    lateFee: z.number().min(0, "Late fee must be 0 or greater"),
    gracePeriod: z.number().min(0, "Grace period must be 0 or greater"),
  }),
  
  // PDC Selection
  selectedPDC: z.array(z.object({
    id: z.string(),
    chequeNumber: z.string(),
    amount: z.number(),
    dueDate: z.string(),
    status: z.string(),
  })).optional(),
  
  // Company Information
  companyInfo: z.object({
    name: z.string().min(1, "Company name is required"),
    license: z.string().min(1, "License number is required"),
    address: z.string().min(1, "Company address is required"),
    phone: z.string().min(1, "Phone number is required"),
    email: z.string().email("Invalid email address"),
    vatNumber: z.string().min(1, "VAT number is required"),
  }),
  
  // Additional Information
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => void;
  initialData?: any;
  mode: "create" | "edit";
}

const currencies = [
  { value: "AED", label: "UAE Dirham (AED)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
];

const vatRates = [
  { value: 0, label: "0% - Zero Rated" },
  { value: 5, label: "5% - Standard Rate" },
  { value: 20, label: "20% - Special Rate" },
];

const paymentTerms = [
  "Net 15 days",
  "Net 30 days",
  "Net 45 days",
  "Net 60 days",
  "Due on receipt",
  "Cash on delivery",
  "Prepaid",
];

// Sample tenants and properties for selection
const tenants = [
  {
    id: 1,
    name: "Sarah Ahmed",
    email: "sarah.ahmed@email.com",
    phone: "+971 50 123 4567",
    emiratesId: "784-1985-1234567-8",
    nationality: "UAE",
    address: "Marina Heights Tower, Unit 305, Dubai Marina, Dubai, UAE"
  },
  {
    id: 2,
    name: "Mohammed Al Mansoori",
    email: "m.almansoori@email.com",
    phone: "+971 55 987 6543",
    emiratesId: "784-1980-2345678-9",
    nationality: "UAE",
    address: "Business Bay Commercial Plaza, Unit 102, Dubai, UAE"
  },
  {
    id: 3,
    name: "Jennifer Smith",
    email: "j.smith@email.com",
    phone: "+971 52 456 7890",
    emiratesId: "784-1990-3456789-0",
    nationality: "British",
    address: "Palm Jumeirah Residences, Unit 204, Dubai, UAE"
  }
];

const properties = [
  {
    id: 1,
    name: "Marina Heights Tower",
    unit: "Unit 305",
    address: "Marina Walk, Dubai Marina, Dubai, UAE"
  },
  {
    id: 2,
    name: "Business Bay Commercial Plaza",
    unit: "Unit 102",
    address: "Sheikh Zayed Road, Business Bay, Dubai, UAE"
  },
  {
    id: 3,
    name: "Palm Jumeirah Residences",
    unit: "Unit 204",
    address: "Palm Jumeirah, Dubai, UAE"
  }
];

const leases = [
  {
    id: "LSE-2024-001",
    tenantId: 1,
    propertyId: 1,
    startDate: "2024-01-15",
    endDate: "2025-01-14",
    monthlyRent: 85000
  },
  {
    id: "LSE-2024-002",
    tenantId: 2,
    propertyId: 2,
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    monthlyRent: 120000
  },
  {
    id: "LSE-2023-003",
    tenantId: 3,
    propertyId: 3,
    startDate: "2023-06-10",
    endDate: "2024-06-09",
    monthlyRent: 150000
  }
];

// Sample PDC data
const pdcData = [
  {
    id: "PDC-001",
    leaseId: "LSE-2024-001",
    tenantId: 1,
    chequeNumber: "CHQ-001",
    amount: 85000,
    dueDate: "2024-04-15",
    status: "pending",
    bankName: "Emirates NBD",
    accountNumber: "1234567890"
  },
  {
    id: "PDC-002",
    leaseId: "LSE-2024-001",
    tenantId: 1,
    chequeNumber: "CHQ-002",
    amount: 85000,
    dueDate: "2024-05-15",
    status: "pending",
    bankName: "Emirates NBD",
    accountNumber: "1234567890"
  },
  {
    id: "PDC-003",
    leaseId: "LSE-2024-001",
    tenantId: 1,
    chequeNumber: "CHQ-003",
    amount: 85000,
    dueDate: "2024-06-15",
    status: "pending",
    bankName: "Emirates NBD",
    accountNumber: "1234567890"
  },
  {
    id: "PDC-004",
    leaseId: "LSE-2024-002",
    tenantId: 2,
    chequeNumber: "CHQ-004",
    amount: 120000,
    dueDate: "2024-04-01",
    status: "pending",
    bankName: "ADCB",
    accountNumber: "0987654321"
  },
  {
    id: "PDC-005",
    leaseId: "LSE-2024-002",
    tenantId: 2,
    chequeNumber: "CHQ-005",
    amount: 120000,
    dueDate: "2024-05-01",
    status: "pending",
    bankName: "ADCB",
    accountNumber: "0987654321"
  }
];

export default function InvoiceForm({ isOpen, onClose, onSubmit, initialData, mode }: InvoiceFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [selectedPDC, setSelectedPDC] = useState<any[]>([]);
  const [availablePDC, setAvailablePDC] = useState<any[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: initialData || {
      invoiceNumber: "",
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: "",
      period: "",
      tenant: {
        id: 0,
        name: "",
        email: "",
        phone: "",
        emiratesId: "",
        nationality: "",
        address: "",
      },
      property: {
        id: 0,
        name: "",
        unit: "",
        address: "",
      },
      lease: {
        id: "",
        startDate: "",
        endDate: "",
        monthlyRent: 0,
      },
      invoiceDetails: {
        description: "",
        subtotal: 0,
        vatRate: 5,
        vatAmount: 0,
        total: 0,
        currency: "AED",
        paymentTerms: "Net 30 days",
        lateFee: 0,
        gracePeriod: 5,
      },
      companyInfo: {
        name: "PropManage UAE Properties LLC",
        license: "DED-123456789",
        address: "Business Bay, Dubai, UAE",
        phone: "+971 4 123 4567",
        email: "info@propmanage.ae",
        vatNumber: "100123456789123",
      },
      notes: "",
      attachments: [],
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = form;

  const watchedValues = watch();

  // Calculate derived values
  const calculateDerivedValues = () => {
    const subtotal = watchedValues.invoiceDetails?.subtotal || 0;
    const vatRate = watchedValues.invoiceDetails?.vatRate || 0;
    const vatAmount = (subtotal * vatRate) / 100;
    const total = subtotal + vatAmount;

    setValue("invoiceDetails.vatAmount", vatAmount);
    setValue("invoiceDetails.total", total);
  };

  // Auto-fill invoice details when PDCs are selected
  useEffect(() => {
    if (selectedPDC.length > 0) {
      const totalPDCAmount = selectedPDC.reduce((sum, pdc) => sum + pdc.amount, 0);
      const vatRate = 5; // UAE VAT rate
      const vatAmount = (totalPDCAmount * vatRate) / 100;
      const totalAmount = totalPDCAmount + vatAmount;

      // Update form values
      setValue("invoiceDetails.subtotal", totalPDCAmount);
      setValue("invoiceDetails.vatRate", vatRate);
      setValue("invoiceDetails.vatAmount", vatAmount);
      setValue("invoiceDetails.total", totalAmount);
      setValue("invoiceDetails.description", `Rent payment for ${selectedProperty?.name} - ${selectedProperty?.unit} (PDC: ${selectedPDC.map(pdc => pdc.chequeNumber).join(", ")})`);
      setValue("invoiceDetails.currency", "AED");
      setValue("invoiceDetails.paymentTerms", "Due on receipt");
      setValue("invoiceDetails.lateFee", 0);
      setValue("invoiceDetails.gracePeriod", 0);
    }
  }, [selectedPDC, setValue, selectedProperty]);

  const handleTenantSelect = (tenant: any) => {
    setSelectedTenant(tenant);
    setValue("tenant", tenant);
    
    // Find associated lease
    const lease = leases.find(l => l.tenantId === tenant.id);
    if (lease) {
      setSelectedLease(lease);
      setValue("lease", lease);
      
      // Find associated property
      const property = properties.find(p => p.id === lease.propertyId);
      if (property) {
        setSelectedProperty(property);
        setValue("property", property);
      }
      
      // Filter available PDCs for this lease
      const availablePDCs = pdcData.filter(pdc => 
        pdc.leaseId === lease.id && pdc.status === "pending"
      );
      setAvailablePDC(availablePDCs);
    }
  };

  const handlePropertySelect = (property: any) => {
    setSelectedProperty(property);
    setValue("property", property);
  };

  const onFormSubmit = (data: InvoiceFormData) => {
    const invoiceData = {
      ...data,
      selectedPDC: selectedPDC,
      pdcTotal: selectedPDC.reduce((sum, pdc) => sum + pdc.amount, 0)
    };
    onSubmit(invoiceData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Create New Invoice" : "Edit Invoice"}
          </DialogTitle>
          <p className="text-muted-foreground">
            {mode === "create" 
              ? "Create a new invoice following UAE VAT compliance standards"
              : "Update the invoice details"
            }
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="tenant">Tenant</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="pdc">PDC Selection</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Invoice Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                      <Input
                        id="invoiceNumber"
                        {...register("invoiceNumber")}
                        placeholder="INV-2024-001"
                        className={errors.invoiceNumber ? "border-red-500" : ""}
                      />
                      {errors.invoiceNumber && (
                        <p className="text-sm text-red-500 mt-1">{errors.invoiceNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="period">Period *</Label>
                      <Input
                        id="period"
                        {...register("period")}
                        placeholder="March 2024"
                        className={errors.period ? "border-red-500" : ""}
                      />
                      {errors.period && (
                        <p className="text-sm text-red-500 mt-1">{errors.period.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="issueDate">Issue Date *</Label>
                      <Input
                        id="issueDate"
                        type="date"
                        {...register("issueDate")}
                        className={errors.issueDate ? "border-red-500" : ""}
                      />
                      {errors.issueDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.issueDate.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="dueDate">Due Date *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        {...register("dueDate")}
                        className={errors.dueDate ? "border-red-500" : ""}
                      />
                      {errors.dueDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.dueDate.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      {...register("invoiceDetails.description")}
                      placeholder="Monthly Rent - March 2024"
                      rows={2}
                      className={errors.invoiceDetails?.description ? "border-red-500" : ""}
                    />
                    {errors.invoiceDetails?.description && (
                      <p className="text-sm text-red-500 mt-1">{errors.invoiceDetails.description.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tenant Information Tab */}
            <TabsContent value="tenant" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Tenant Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all duration-200",
                          selectedTenant?.id === tenant.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => handleTenantSelect(tenant)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{tenant.name}</p>
                            <p className="text-sm text-muted-foreground">{tenant.nationality}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>{tenant.email}</p>
                          <p>{tenant.phone}</p>
                          <p className="text-xs">{tenant.emiratesId}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedTenant && (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold mb-2">Selected Tenant</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-medium">{selectedTenant.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{selectedTenant.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{selectedTenant.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Emirates ID</p>
                            <p className="font-medium">{selectedTenant.emiratesId}</p>
                          </div>
                        </div>
                      </div>

                      {selectedProperty && (
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Property Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Property Name</p>
                              <p className="font-medium">{selectedProperty.name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Unit Number</p>
                              <p className="font-medium">{selectedProperty.unit}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-sm text-muted-foreground">Address</p>
                              <p className="font-medium">{selectedProperty.address}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedLease && (
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Lease Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Lease ID</p>
                              <p className="font-medium">{selectedLease.id}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Start Date</p>
                              <p className="font-medium">{new Date(selectedLease.startDate).toLocaleDateString("en-AE")}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">End Date</p>
                              <p className="font-medium">{new Date(selectedLease.endDate).toLocaleDateString("en-AE")}</p>
                            </div>
                            <div className="md:col-span-3">
                              <p className="text-sm text-muted-foreground">Monthly Rent</p>
                              <p className="font-medium text-lg">{formatCurrency(selectedLease.monthlyRent)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoice Details Tab */}
            <TabsContent value="details" className="space-y-6">
              {/* PDC Selection Summary */}
              {selectedPDC.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileCheck className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">PDC Auto-Fill Active</h4>
                    </div>
                    <p className="text-sm text-blue-800 mb-3">
                      The following details have been automatically filled based on your PDC selection:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">Selected PDCs:</span>
                        <p className="text-blue-900">{selectedPDC.map(pdc => pdc.chequeNumber).join(", ")}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Total PDC Amount:</span>
                        <p className="text-blue-900 font-bold">{formatCurrency(selectedPDC.reduce((sum, pdc) => sum + pdc.amount, 0))}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Auto-calculated VAT:</span>
                        <p className="text-blue-900 font-bold">{formatCurrency((selectedPDC.reduce((sum, pdc) => sum + pdc.amount, 0) * 5) / 100)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subtotal">Subtotal (AED) *</Label>
                      <Input
                        id="subtotal"
                        type="number"
                        {...register("invoiceDetails.subtotal", { valueAsNumber: true })}
                        placeholder="85000"
                        className={errors.invoiceDetails?.subtotal ? "border-red-500" : ""}
                        onChange={(e) => {
                          setValue("invoiceDetails.subtotal", parseInt(e.target.value) || 0);
                          calculateDerivedValues();
                        }}
                      />
                      {errors.invoiceDetails?.subtotal && (
                        <p className="text-sm text-red-500 mt-1">{errors.invoiceDetails.subtotal.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="vatRate">VAT Rate (%) *</Label>
                      <Select
                        value={watchedValues.invoiceDetails?.vatRate?.toString()}
                        onValueChange={(value) => {
                          setValue("invoiceDetails.vatRate", parseInt(value));
                          calculateDerivedValues();
                        }}
                      >
                        <SelectTrigger className={errors.invoiceDetails?.vatRate ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select VAT rate" />
                        </SelectTrigger>
                        <SelectContent>
                          {vatRates.map((rate) => (
                            <SelectItem key={rate.value} value={rate.value.toString()}>
                              {rate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.invoiceDetails?.vatRate && (
                        <p className="text-sm text-red-500 mt-1">{errors.invoiceDetails.vatRate.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vatAmount">VAT Amount (AED)</Label>
                      <Input
                        id="vatAmount"
                        type="number"
                        value={watchedValues.invoiceDetails?.vatAmount || 0}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div>
                      <Label htmlFor="total">Total Amount (AED)</Label>
                      <Input
                        id="total"
                        type="number"
                        value={watchedValues.invoiceDetails?.total || 0}
                        disabled
                        className="bg-muted font-bold text-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency *</Label>
                      <Select
                        value={watchedValues.invoiceDetails?.currency}
                        onValueChange={(value) => setValue("invoiceDetails.currency", value)}
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

                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms *</Label>
                      <Select
                        value={watchedValues.invoiceDetails?.paymentTerms}
                        onValueChange={(value) => setValue("invoiceDetails.paymentTerms", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTerms.map((term) => (
                            <SelectItem key={term} value={term}>
                              {term}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lateFee">Late Fee (AED)</Label>
                      <Input
                        id="lateFee"
                        type="number"
                        {...register("invoiceDetails.lateFee", { valueAsNumber: true })}
                        placeholder="500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
                      <Input
                        id="gracePeriod"
                        type="number"
                        {...register("invoiceDetails.gracePeriod", { valueAsNumber: true })}
                        placeholder="5"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PDC Selection Tab */}
            <TabsContent value="pdc" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    PDC Selection
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select Post Dated Cheques to claim in this invoice
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedLease ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Available PDCs for {selectedTenant?.name}</h3>
                        <Badge variant="outline">
                          {availablePDC.length} available
                        </Badge>
                      </div>
                      
                      {availablePDC.length > 0 ? (
                        <div className="space-y-3">
                          {availablePDC.map((pdc) => (
                            <div key={pdc.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id={`pdc-${pdc.id}`}
                                  checked={selectedPDC.some(p => p.id === pdc.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPDC([...selectedPDC, pdc]);
                                    } else {
                                      setSelectedPDC(selectedPDC.filter(p => p.id !== pdc.id));
                                    }
                                  }}
                                  className="h-4 w-4 text-primary"
                                />
                                <div>
                                  <p className="font-medium">{pdc.chequeNumber}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {pdc.bankName} • Due: {new Date(pdc.dueDate).toLocaleDateString("en-AE")}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(pdc.amount)}</p>
                                <p className="text-sm text-muted-foreground capitalize">{pdc.status}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No PDCs available for this lease</p>
                        </div>
                      )}

                      {selectedPDC.length > 0 && (
                        <div className="mt-6 p-4 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-semibold">Selected PDCs</h4>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Auto-fill Active
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {selectedPDC.map((pdc) => (
                              <div key={pdc.id} className="flex items-center justify-between">
                                <span className="text-sm">{pdc.chequeNumber}</span>
                                <span className="font-medium">{formatCurrency(pdc.amount)}</span>
                              </div>
                            ))}
                            <Separator />
                            <div className="flex items-center justify-between font-semibold">
                              <span>Total PDC Amount:</span>
                              <span>{formatCurrency(selectedPDC.reduce((sum, pdc) => sum + pdc.amount, 0))}</span>
                            </div>
                          </div>
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <Info className="h-4 w-4 inline mr-1" />
                              These PDCs will automatically fill the invoice amount and details in the "Details" tab.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Please select a tenant and lease first</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Company Information Tab */}
            <TabsContent value="company" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        {...register("companyInfo.name")}
                        placeholder="PropManage UAE Properties LLC"
                        className={errors.companyInfo?.name ? "border-red-500" : ""}
                      />
                      {errors.companyInfo?.name && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyInfo.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="license">License Number *</Label>
                      <Input
                        id="license"
                        {...register("companyInfo.license")}
                        placeholder="DED-123456789"
                        className={errors.companyInfo?.license ? "border-red-500" : ""}
                      />
                      {errors.companyInfo?.license && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyInfo.license.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="companyAddress">Company Address *</Label>
                    <Textarea
                      id="companyAddress"
                      {...register("companyInfo.address")}
                      placeholder="Business Bay, Dubai, UAE"
                      rows={2}
                      className={errors.companyInfo?.address ? "border-red-500" : ""}
                    />
                    {errors.companyInfo?.address && (
                      <p className="text-sm text-red-500 mt-1">{errors.companyInfo.address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyPhone">Phone Number *</Label>
                      <Input
                        id="companyPhone"
                        {...register("companyInfo.phone")}
                        placeholder="+971 4 123 4567"
                        className={errors.companyInfo?.phone ? "border-red-500" : ""}
                      />
                      {errors.companyInfo?.phone && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyInfo.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="companyEmail">Email Address *</Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        {...register("companyInfo.email")}
                        placeholder="info@propmanage.ae"
                        className={errors.companyInfo?.email ? "border-red-500" : ""}
                      />
                      {errors.companyInfo?.email && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyInfo.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="vatNumber">VAT Registration Number *</Label>
                    <Input
                      id="vatNumber"
                      {...register("companyInfo.vatNumber")}
                      placeholder="100123456789123"
                      className={errors.companyInfo?.vatNumber ? "border-red-500" : ""}
                    />
                    {errors.companyInfo?.vatNumber && (
                      <p className="text-sm text-red-500 mt-1">{errors.companyInfo.vatNumber.message}</p>
                    )}
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">UAE VAT Compliance</p>
                        <p className="text-sm text-blue-700 mt-1">
                          This invoice will be generated with proper UAE VAT compliance. 
                          Ensure all company details are accurate for legal compliance.
                        </p>
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
                Upload Documents
              </Button>
              <Button type="submit" className="bg-gradient-primary shadow-glow">
                <Check className="h-4 w-4 mr-2" />
                {mode === "create" ? "Create Invoice" : "Update Invoice"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
