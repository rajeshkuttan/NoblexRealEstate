import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Calendar, 
  User, 
  Building2, 
  DollarSign, 
  FileText, 
  Shield, 
  Settings,
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
  MapPin,
  Phone,
  Mail,
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
  Bell, 
  Send, 
  MessageSquare, 
  Home, 
  Building, 
  Car, 
  Wifi,
  FileCheck,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield as ShieldIcon,
  Camera,
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
  Minus
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

// UAE-specific lease form validation schema
const leaseFormSchema = z.object({
  // Basic Information
  leaseNumber: z.string().min(1, "Lease number is required"),
  leaseType: z.enum(["residential", "commercial", "industrial", "retail"], {
    required_error: "Please select a lease type",
  }),
  
  // Tenant Information
  tenant: z.object({
    name: z.string().min(1, "Tenant name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    emiratesId: z.string().min(1, "Emirates ID is required"),
    nationality: z.string().min(1, "Nationality is required"),
    passportNumber: z.string().min(1, "Passport number is required"),
    visaNumber: z.string().min(1, "Visa number is required"),
    visaExpiry: z.string().min(1, "Visa expiry date is required"),
    emergencyContact: z.object({
      name: z.string().min(1, "Emergency contact name is required"),
      phone: z.string().min(1, "Emergency contact phone is required"),
      relation: z.string().min(1, "Relation is required"),
    }),
  }),
  
  // Property Information
  property: z.object({
    name: z.string().min(1, "Property name is required"),
    unit: z.string().min(1, "Unit number is required"),
    address: z.string().min(1, "Property address is required"),
    type: z.enum(["residential", "commercial", "industrial", "retail"]),
    area: z.number().min(1, "Area must be greater than 0"),
    bedrooms: z.number().min(0),
    bathrooms: z.number().min(0),
    parking: z.number().min(0),
  }),
  
  // Lease Terms
  leaseDetails: z.object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    duration: z.number().min(1, "Duration must be at least 1 month"),
    monthlyRent: z.number().min(1, "Monthly rent must be greater than 0"),
    annualRent: z.number().min(1, "Annual rent must be greater than 0"),
    securityDeposit: z.number().min(0),
    agencyFee: z.number().min(0),
    ejariFee: z.number().min(0),
    dewaDeposit: z.number().min(0),
    municipalityFee: z.number().min(0),
    totalDeposits: z.number().min(0),
    paymentTerms: z.enum(["monthly", "quarterly", "semi-annually", "annually"]),
    gracePeriod: z.number().min(0),
    lateFee: z.number().min(0),
    renewalTerms: z.string().min(1, "Renewal terms are required"),
    terminationNotice: z.number().min(1, "Termination notice period is required"),
  }),
  
  // Special Terms and Conditions
  specialTerms: z.array(z.string()).optional(),
  
  // Compliance Requirements
  compliance: z.object({
    ejariRequired: z.boolean(),
    dewaConnection: z.boolean(),
    municipalityRegistration: z.boolean(),
    insuranceRequired: z.boolean(),
    fireSafetyCertificate: z.boolean(),
    maintenanceCertificate: z.boolean(),
  }),
  
  // Additional Information
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type LeaseFormData = z.infer<typeof leaseFormSchema>;

interface LeaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeaseFormData) => void;
  initialData?: any;
  mode: "create" | "edit";
}

const nationalities = [
  "UAE", "Saudi Arabia", "Kuwait", "Qatar", "Bahrain", "Oman", "Egypt", "Jordan", "Lebanon", "Syria",
  "India", "Pakistan", "Bangladesh", "Sri Lanka", "Philippines", "Indonesia", "Malaysia", "Thailand",
  "United Kingdom", "United States", "Canada", "Australia", "Germany", "France", "Italy", "Spain",
  "Netherlands", "Sweden", "Norway", "Denmark", "Finland", "Switzerland", "Austria", "Belgium",
  "South Africa", "Nigeria", "Kenya", "Ghana", "Morocco", "Tunisia", "Algeria", "Sudan",
  "China", "Japan", "South Korea", "Singapore", "Hong Kong", "Taiwan", "Vietnam", "Cambodia",
  "Brazil", "Argentina", "Chile", "Mexico", "Colombia", "Peru", "Venezuela", "Uruguay",
  "Russia", "Ukraine", "Poland", "Czech Republic", "Hungary", "Romania", "Bulgaria", "Croatia",
  "Other"
];

const propertyTypes = [
  { value: "residential", label: "Residential", icon: Home },
  { value: "commercial", label: "Commercial", icon: Building },
  { value: "industrial", label: "Industrial", icon: Building2 },
  { value: "retail", label: "Retail", icon: Building },
];

const paymentTerms = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi-annually", label: "Semi-Annually" },
  { value: "annually", label: "Annually" },
];

const specialTermsOptions = [
  "No pets allowed",
  "Pet-friendly (specify conditions)",
  "No smoking in common areas",
  "No smoking anywhere on premises",
  "Quiet hours: 10 PM - 7 AM",
  "Parking space included",
  "Parking space not included",
  "Gym access included",
  "Pool access included",
  "Beach access included",
  "Business use only",
  "Residential use only",
  "High-speed internet required",
  "Furnished property",
  "Unfurnished property",
  "Utilities included",
  "Utilities not included",
  "Maintenance included",
  "Tenant responsible for maintenance",
  "Garden/balcony access",
  "Storage space included",
  "Security deposit required",
  "Insurance required",
  "Reference checks required",
  "Credit check required",
  "Guarantor required",
  "Early termination allowed",
  "Subletting allowed",
  "Subletting not allowed",
  "Renovation allowed",
  "Renovation not allowed",
];

// Sample tenant data for selection
const tenants = [
  {
    id: 1,
    name: "Sarah Ahmed",
    email: "sarah.ahmed@email.com",
    phone: "+971 50 123 4567",
    emiratesId: "784-1985-1234567-8",
    nationality: "UAE",
    address: "Marina Heights Tower, Unit 305, Dubai Marina, Dubai, UAE",
    passportNumber: "A1234567",
    visaNumber: "V1234567",
    visaExpiry: "2025-12-31",
    emergencyName: "Ahmed Hassan",
    emergencyContact: "+971 50 987 6543",
    emergencyRelation: "Spouse"
  },
  {
    id: 2,
    name: "Mohammed Al Mansoori",
    email: "m.almansoori@email.com",
    phone: "+971 55 987 6543",
    emiratesId: "784-1980-2345678-9",
    nationality: "UAE",
    address: "Business Bay Commercial Plaza, Unit 102, Dubai, UAE",
    passportNumber: "A2345678",
    visaNumber: "V2345678",
    visaExpiry: "2025-06-30",
    emergencyName: "Fatima Al Mansoori",
    emergencyContact: "+971 50 111 2222",
    emergencyRelation: "Wife"
  },
  {
    id: 3,
    name: "Jennifer Smith",
    email: "j.smith@email.com",
    phone: "+971 52 456 7890",
    emiratesId: "784-1990-3456789-0",
    nationality: "British",
    address: "Palm Jumeirah Residences, Unit 204, Dubai, UAE",
    passportNumber: "A3456789",
    visaNumber: "V3456789",
    visaExpiry: "2025-03-15",
    emergencyName: "John Smith",
    emergencyContact: "+971 50 333 4444",
    emergencyRelation: "Brother"
  }
];

// Sample property data for selection
const properties = [
  {
    id: 1,
    name: "Marina Heights Tower",
    address: "Marina Walk, Dubai Marina, Dubai, UAE",
    type: "residential",
    area: 1200,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    units: [
      { id: 1, unit: "Unit 305", area: 1200, bedrooms: 2, bathrooms: 2, parking: 1, monthlyRent: 85000 },
      { id: 2, unit: "Unit 306", area: 1100, bedrooms: 2, bathrooms: 2, parking: 1, monthlyRent: 80000 },
      { id: 3, unit: "Unit 405", area: 1300, bedrooms: 3, bathrooms: 2, parking: 1, monthlyRent: 95000 }
    ]
  },
  {
    id: 2,
    name: "Business Bay Commercial Plaza",
    address: "Sheikh Zayed Road, Business Bay, Dubai, UAE",
    type: "commercial",
    area: 2000,
    bedrooms: 0,
    bathrooms: 2,
    parking: 2,
    units: [
      { id: 4, unit: "Unit 102", area: 2000, bedrooms: 0, bathrooms: 2, parking: 2, monthlyRent: 120000 },
      { id: 5, unit: "Unit 103", area: 1800, bedrooms: 0, bathrooms: 2, parking: 2, monthlyRent: 110000 },
      { id: 6, unit: "Unit 202", area: 2200, bedrooms: 0, bathrooms: 3, parking: 2, monthlyRent: 130000 }
    ]
  },
  {
    id: 3,
    name: "Palm Jumeirah Residences",
    address: "Palm Jumeirah, Dubai, UAE",
    type: "residential",
    area: 1500,
    bedrooms: 3,
    bathrooms: 3,
    parking: 2,
    units: [
      { id: 7, unit: "Unit 204", area: 1500, bedrooms: 3, bathrooms: 3, parking: 2, monthlyRent: 150000 },
      { id: 8, unit: "Unit 304", area: 1600, bedrooms: 3, bathrooms: 3, parking: 2, monthlyRent: 160000 },
      { id: 9, unit: "Unit 404", area: 1700, bedrooms: 4, bathrooms: 4, parking: 2, monthlyRent: 180000 }
    ]
  }
];

export default function LeaseForm({ isOpen, onClose, onSubmit, initialData, mode }: LeaseFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [customTerms, setCustomTerms] = useState<string[]>([]);
  const [newCustomTerm, setNewCustomTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: initialData || {
      leaseNumber: "",
      leaseType: "residential",
      tenant: {
        name: "",
        email: "",
        phone: "",
        emiratesId: "",
        nationality: "",
        passportNumber: "",
        visaNumber: "",
        visaExpiry: "",
        emergencyContact: {
          name: "",
          phone: "",
          relation: "",
        },
      },
      property: {
        name: "",
        unit: "",
        address: "",
        type: "residential",
        area: 0,
        bedrooms: 0,
        bathrooms: 0,
        parking: 0,
      },
      leaseDetails: {
        startDate: "",
        endDate: "",
        duration: 12,
        monthlyRent: 0,
        annualRent: 0,
        securityDeposit: 0,
        agencyFee: 0,
        ejariFee: 5000,
        dewaDeposit: 0,
        municipalityFee: 0,
        totalDeposits: 0,
        paymentTerms: "monthly",
        gracePeriod: 5,
        lateFee: 0,
        renewalTerms: "",
        terminationNotice: 60,
      },
      specialTerms: [],
      compliance: {
        ejariRequired: true,
        dewaConnection: true,
        municipalityRegistration: true,
        insuranceRequired: true,
        fireSafetyCertificate: true,
        maintenanceCertificate: true,
      },
      notes: "",
      attachments: [],
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = form;

  const watchedValues = watch();

  // Calculate derived values
  const calculateDerivedValues = () => {
    const monthlyRent = watchedValues.leaseDetails?.monthlyRent || 0;
    const duration = watchedValues.leaseDetails?.duration || 12;
    const securityDeposit = monthlyRent * 2; // Typically 2 months rent
    const agencyFee = monthlyRent * 0.5; // Typically 5% of annual rent
    const ejariFee = 5000; // Standard Ejari fee
    const dewaDeposit = monthlyRent * 0.1; // Typically 10% of monthly rent
    const municipalityFee = monthlyRent * 0.05; // Typically 5% of monthly rent
    const totalDeposits = securityDeposit + agencyFee + ejariFee + dewaDeposit + municipalityFee;

    setValue("leaseDetails.annualRent", monthlyRent * 12);
    setValue("leaseDetails.securityDeposit", securityDeposit);
    setValue("leaseDetails.agencyFee", agencyFee);
    setValue("leaseDetails.ejariFee", ejariFee);
    setValue("leaseDetails.dewaDeposit", dewaDeposit);
    setValue("leaseDetails.municipalityFee", municipalityFee);
    setValue("leaseDetails.totalDeposits", totalDeposits);
  };

  const addCustomTerm = () => {
    if (newCustomTerm.trim()) {
      setCustomTerms([...customTerms, newCustomTerm.trim()]);
      setNewCustomTerm("");
    }
  };

  const removeCustomTerm = (index: number) => {
    setCustomTerms(customTerms.filter((_, i) => i !== index));
  };

  const onFormSubmit = (data: LeaseFormData) => {
    const formData = {
      ...data,
      specialTerms: [...(data.specialTerms || []), ...customTerms],
    };
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Create New Lease Agreement" : "Edit Lease Agreement"}
          </DialogTitle>
          <p className="text-muted-foreground">
            {mode === "create" 
              ? "Fill in the details to create a new lease agreement following UAE standards"
              : "Update the lease agreement details"
            }
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="tenant">Tenant</TabsTrigger>
              <TabsTrigger value="property">Property</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="pdc">PDC</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Basic Lease Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="leaseNumber">Lease Number *</Label>
                      <Input
                        id="leaseNumber"
                        {...register("leaseNumber")}
                        placeholder="LSE-2024-001"
                        className={errors.leaseNumber ? "border-red-500" : ""}
                      />
                      {errors.leaseNumber && (
                        <p className="text-sm text-red-500 mt-1">{errors.leaseNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="leaseType">Lease Type *</Label>
                      <Select
                        value={watchedValues.leaseType}
                        onValueChange={(value) => setValue("leaseType", value as any)}
                      >
                        <SelectTrigger className={errors.leaseType ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select lease type" />
                        </SelectTrigger>
                        <SelectContent>
                          {propertyTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.leaseType && (
                        <p className="text-sm text-red-500 mt-1">{errors.leaseType.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        {...register("leaseDetails.startDate")}
                        className={errors.leaseDetails?.startDate ? "border-red-500" : ""}
                      />
                      {errors.leaseDetails?.startDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.leaseDetails.startDate.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        {...register("leaseDetails.endDate")}
                        className={errors.leaseDetails?.endDate ? "border-red-500" : ""}
                      />
                      {errors.leaseDetails?.endDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.leaseDetails.endDate.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration (Months) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        {...register("leaseDetails.duration", { valueAsNumber: true })}
                        className={errors.leaseDetails?.duration ? "border-red-500" : ""}
                        onChange={(e) => {
                          setValue("leaseDetails.duration", parseInt(e.target.value) || 0);
                          calculateDerivedValues();
                        }}
                      />
                      {errors.leaseDetails?.duration && (
                        <p className="text-sm text-red-500 mt-1">{errors.leaseDetails.duration.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Any additional information about this lease..."
                      rows={3}
                    />
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
                    Tenant Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select an existing tenant or add new tenant details
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tenant Selection */}
                  <div>
                    <Label htmlFor="tenantSelect">Select Existing Tenant</Label>
                    <Select
                      value={watchedValues.tenant?.id?.toString() || ""}
                      onValueChange={(value) => {
                        const selectedTenant = tenants.find(t => t.id.toString() === value);
                        if (selectedTenant) {
                          setValue("tenant", {
                            id: selectedTenant.id,
                            name: selectedTenant.name,
                            email: selectedTenant.email,
                            phone: selectedTenant.phone,
                            emiratesId: selectedTenant.emiratesId,
                            nationality: selectedTenant.nationality,
                            passportNumber: selectedTenant.passportNumber || "",
                            visaNumber: selectedTenant.visaNumber || "",
                            visaExpiry: selectedTenant.visaExpiry || "",
                            emergencyContact: {
                              name: selectedTenant.emergencyName || "",
                              phone: selectedTenant.emergencyContact || "",
                              relation: selectedTenant.emergencyRelation || "",
                            },
                          });
                        }
                      }}
                    >
                      <SelectTrigger className={errors.tenant?.name ? "border-red-500" : ""}>
                        <SelectValue placeholder="Choose an existing tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id.toString()}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <div>
                                <p className="font-medium">{tenant.name}</p>
                                <p className="text-sm text-muted-foreground">{tenant.email}</p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.tenant?.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.tenant.name.message}</p>
                    )}
                  </div>

                  <Separator />

                  {/* Selected Tenant Details Display */}
                  {watchedValues.tenant?.id && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Selected Tenant Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{watchedValues.tenant.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{watchedValues.tenant.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{watchedValues.tenant.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Nationality</p>
                          <p className="font-medium">{watchedValues.tenant.nationality}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Emirates ID</p>
                          <p className="font-medium">{watchedValues.tenant.emiratesId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium">{tenants.find(t => t.id === watchedValues.tenant.id)?.address}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Manual Entry Option */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Clear tenant selection to allow manual entry
                          setValue("tenant", {
                            name: "",
                            email: "",
                            phone: "",
                            emiratesId: "",
                            nationality: "",
                            passportNumber: "",
                            visaNumber: "",
                            visaExpiry: "",
                            emergencyContact: {
                              name: "",
                              phone: "",
                              relation: "",
                            },
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Tenant
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Or manually enter tenant details below
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="tenantName">Full Name *</Label>
                          <Input
                            id="tenantName"
                            {...register("tenant.name")}
                            placeholder="Enter tenant's full name"
                            className={errors.tenant?.name ? "border-red-500" : ""}
                          />
                          {errors.tenant?.name && (
                            <p className="text-sm text-red-500 mt-1">{errors.tenant.name.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="tenantEmail">Email Address *</Label>
                          <Input
                            id="tenantEmail"
                            type="email"
                            {...register("tenant.email")}
                            placeholder="tenant@email.com"
                            className={errors.tenant?.email ? "border-red-500" : ""}
                          />
                          {errors.tenant?.email && (
                            <p className="text-sm text-red-500 mt-1">{errors.tenant.email.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="tenantPhone">Phone Number *</Label>
                          <Input
                            id="tenantPhone"
                            {...register("tenant.phone")}
                            placeholder="+971 50 123 4567"
                            className={errors.tenant?.phone ? "border-red-500" : ""}
                          />
                          {errors.tenant?.phone && (
                            <p className="text-sm text-red-500 mt-1">{errors.tenant.phone.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="tenantNationality">Nationality *</Label>
                          <Select
                            value={watchedValues.tenant?.nationality}
                            onValueChange={(value) => setValue("tenant.nationality", value)}
                          >
                            <SelectTrigger className={errors.tenant?.nationality ? "border-red-500" : ""}>
                              <SelectValue placeholder="Select nationality" />
                            </SelectTrigger>
                            <SelectContent>
                              {nationalities.map((nationality) => (
                                <SelectItem key={nationality} value={nationality}>
                                  {nationality}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.tenant?.nationality && (
                            <p className="text-sm text-red-500 mt-1">{errors.tenant.nationality.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="emiratesId">Emirates ID *</Label>
                          <Input
                            id="emiratesId"
                            {...register("tenant.emiratesId")}
                            placeholder="784-1985-1234567-8"
                            className={errors.tenant?.emiratesId ? "border-red-500" : ""}
                          />
                          {errors.tenant?.emiratesId && (
                            <p className="text-sm text-red-500 mt-1">{errors.tenant.emiratesId.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="passportNumber">Passport Number *</Label>
                          <Input
                            id="passportNumber"
                            {...register("tenant.passportNumber")}
                            placeholder="A1234567"
                            className={errors.tenant?.passportNumber ? "border-red-500" : ""}
                          />
                          {errors.tenant?.passportNumber && (
                            <p className="text-sm text-red-500 mt-1">{errors.tenant.passportNumber.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="visaNumber">Visa Number *</Label>
                          <Input
                            id="visaNumber"
                            {...register("tenant.visaNumber")}
                            placeholder="V1234567"
                            className={errors.tenant?.visaNumber ? "border-red-500" : ""}
                          />
                          {errors.tenant?.visaNumber && (
                            <p className="text-sm text-red-500 mt-1">{errors.tenant.visaNumber.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="visaExpiry">Visa Expiry Date *</Label>
                          <Input
                            id="visaExpiry"
                            type="date"
                            {...register("tenant.visaExpiry")}
                            className={errors.tenant?.visaExpiry ? "border-red-500" : ""}
                          />
                          {errors.tenant?.visaExpiry && (
                            <p className="text-sm text-red-500 mt-1">{errors.tenant.visaExpiry.message}</p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-4">Emergency Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="emergencyName">Contact Name *</Label>
                            <Input
                              id="emergencyName"
                              {...register("tenant.emergencyContact.name")}
                              placeholder="Emergency contact name"
                              className={errors.tenant?.emergencyContact?.name ? "border-red-500" : ""}
                            />
                            {errors.tenant?.emergencyContact?.name && (
                              <p className="text-sm text-red-500 mt-1">{errors.tenant.emergencyContact.name.message}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="emergencyPhone">Contact Phone *</Label>
                            <Input
                              id="emergencyPhone"
                              {...register("tenant.emergencyContact.phone")}
                              placeholder="+971 50 987 6543"
                              className={errors.tenant?.emergencyContact?.phone ? "border-red-500" : ""}
                            />
                            {errors.tenant?.emergencyContact?.phone && (
                              <p className="text-sm text-red-500 mt-1">{errors.tenant.emergencyContact.phone.message}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="emergencyRelation">Relation *</Label>
                            <Input
                              id="emergencyRelation"
                              {...register("tenant.emergencyContact.relation")}
                              placeholder="Spouse, Father, etc."
                              className={errors.tenant?.emergencyContact?.relation ? "border-red-500" : ""}
                            />
                            {errors.tenant?.emergencyContact?.relation && (
                              <p className="text-sm text-red-500 mt-1">{errors.tenant.emergencyContact.relation.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Property Information Tab */}
            <TabsContent value="property" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Property Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select an existing property and unit or add new property details
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Property Selection */}
                  <div>
                    <Label htmlFor="propertySelect">Select Property</Label>
                    <Select
                      value={selectedProperty?.id?.toString() || ""}
                      onValueChange={(value) => {
                        const property = properties.find(p => p.id.toString() === value);
                        if (property) {
                          setSelectedProperty(property);
                          setAvailableUnits(property.units);
                          setSelectedUnit(null);
                          // Auto-fill property details
                          setValue("property.name", property.name);
                          setValue("property.address", property.address);
                          setValue("property.type", property.type);
                          setValue("property.area", property.area);
                          setValue("property.bedrooms", property.bedrooms);
                          setValue("property.bathrooms", property.bathrooms);
                          setValue("property.parking", property.parking);
                        }
                      }}
                    >
                      <SelectTrigger className={errors.property?.name ? "border-red-500" : ""}>
                        <SelectValue placeholder="Choose an existing property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id.toString()}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <div>
                                <p className="font-medium">{property.name}</p>
                                <p className="text-sm text-muted-foreground">{property.address}</p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.property?.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.property.name.message}</p>
                    )}
                  </div>

                  {/* Unit Selection */}
                  {selectedProperty && (
                    <div>
                      <Label htmlFor="unitSelect">Select Unit</Label>
                      <Select
                        value={selectedUnit?.id?.toString() || ""}
                        onValueChange={(value) => {
                          const unit = availableUnits.find(u => u.id.toString() === value);
                          if (unit) {
                            setSelectedUnit(unit);
                            // Auto-fill unit details
                            setValue("property.unit", unit.unit);
                            setValue("property.area", unit.area);
                            setValue("property.bedrooms", unit.bedrooms);
                            setValue("property.bathrooms", unit.bathrooms);
                            setValue("property.parking", unit.parking);
                            // Auto-fill monthly rent
                            setValue("leaseDetails.monthlyRent", unit.monthlyRent);
                            calculateDerivedValues();
                          }
                        }}
                      >
                        <SelectTrigger className={errors.property?.unit ? "border-red-500" : ""}>
                          <SelectValue placeholder="Choose a unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id.toString()}>
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                <div>
                                  <p className="font-medium">{unit.unit}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {unit.area} sq ft • {unit.bedrooms} bed • {unit.bathrooms} bath • AED {unit.monthlyRent.toLocaleString()}/month
                                  </p>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.property?.unit && (
                        <p className="text-sm text-red-500 mt-1">{errors.property.unit.message}</p>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Selected Property & Unit Display */}
                  {selectedProperty && selectedUnit && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Selected Property & Unit
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Property</p>
                          <p className="font-medium">{selectedProperty.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedProperty.address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Unit</p>
                          <p className="font-medium">{selectedUnit.unit}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedUnit.area} sq ft • {selectedUnit.bedrooms} bed • {selectedUnit.bathrooms} bath
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly Rent</p>
                          <p className="font-bold text-lg text-primary">AED {selectedUnit.monthlyRent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Parking</p>
                          <p className="font-medium">{selectedUnit.parking} space(s)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Manual Entry Option */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Clear property and unit selection to allow manual entry
                          setSelectedProperty(null);
                          setAvailableUnits([]);
                          setSelectedUnit(null);
                          setValue("property", {
                            name: "",
                            unit: "",
                            address: "",
                            type: "residential",
                            area: 0,
                            bedrooms: 0,
                            bathrooms: 0,
                            parking: 0,
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Property
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Or manually enter property details below
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="propertyName">Property Name *</Label>
                          <Input
                            id="propertyName"
                            {...register("property.name")}
                            placeholder="Marina Heights Tower"
                            className={errors.property?.name ? "border-red-500" : ""}
                          />
                          {errors.property?.name && (
                            <p className="text-sm text-red-500 mt-1">{errors.property.name.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="propertyUnit">Unit Number *</Label>
                          <Input
                            id="propertyUnit"
                            {...register("property.unit")}
                            placeholder="Unit 305"
                            className={errors.property?.unit ? "border-red-500" : ""}
                          />
                          {errors.property?.unit && (
                            <p className="text-sm text-red-500 mt-1">{errors.property.unit.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="propertyAddress">Property Address *</Label>
                        <Textarea
                          id="propertyAddress"
                          {...register("property.address")}
                          placeholder="Marina Walk, Dubai Marina, Dubai, UAE"
                          rows={2}
                          className={errors.property?.address ? "border-red-500" : ""}
                        />
                        {errors.property?.address && (
                          <p className="text-sm text-red-500 mt-1">{errors.property.address.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="propertyType">Property Type *</Label>
                          <Select
                            value={watchedValues.property?.type}
                            onValueChange={(value) => setValue("property.type", value as any)}
                          >
                            <SelectTrigger className={errors.property?.type ? "border-red-500" : ""}>
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                            <SelectContent>
                              {propertyTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <type.icon className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.property?.type && (
                            <p className="text-sm text-red-500 mt-1">{errors.property.type.message}</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="propertyArea">Area (sq ft) *</Label>
                          <Input
                            id="propertyArea"
                            type="number"
                            {...register("property.area", { valueAsNumber: true })}
                            placeholder="1200"
                            className={errors.property?.area ? "border-red-500" : ""}
                          />
                          {errors.property?.area && (
                            <p className="text-sm text-red-500 mt-1">{errors.property.area.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="bedrooms">Bedrooms</Label>
                          <Input
                            id="bedrooms"
                            type="number"
                            {...register("property.bedrooms", { valueAsNumber: true })}
                            placeholder="2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="bathrooms">Bathrooms</Label>
                          <Input
                            id="bathrooms"
                            type="number"
                            {...register("property.bathrooms", { valueAsNumber: true })}
                            placeholder="2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="parking">Parking Spaces</Label>
                          <Input
                            id="parking"
                            type="number"
                            {...register("property.parking", { valueAsNumber: true })}
                            placeholder="1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Information Tab */}
            <TabsContent value="financial" className="space-y-6">
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
                      <Label htmlFor="monthlyRent">Monthly Rent (AED) *</Label>
                      <Input
                        id="monthlyRent"
                        type="number"
                        {...register("leaseDetails.monthlyRent", { valueAsNumber: true })}
                        placeholder="85000"
                        className={errors.leaseDetails?.monthlyRent ? "border-red-500" : ""}
                        onChange={(e) => {
                          setValue("leaseDetails.monthlyRent", parseInt(e.target.value) || 0);
                          calculateDerivedValues();
                        }}
                      />
                      {errors.leaseDetails?.monthlyRent && (
                        <p className="text-sm text-red-500 mt-1">{errors.leaseDetails.monthlyRent.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="annualRent">Annual Rent (AED)</Label>
                      <Input
                        id="annualRent"
                        type="number"
                        value={watchedValues.leaseDetails?.annualRent || 0}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="securityDeposit">Security Deposit (AED)</Label>
                      <Input
                        id="securityDeposit"
                        type="number"
                        value={watchedValues.leaseDetails?.securityDeposit || 0}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div>
                      <Label htmlFor="agencyFee">Agency Fee (AED)</Label>
                      <Input
                        id="agencyFee"
                        type="number"
                        value={watchedValues.leaseDetails?.agencyFee || 0}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="ejariFee">Ejari Fee (AED)</Label>
                      <Input
                        id="ejariFee"
                        type="number"
                        value={watchedValues.leaseDetails?.ejariFee || 0}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div>
                      <Label htmlFor="dewaDeposit">DEWA Deposit (AED)</Label>
                      <Input
                        id="dewaDeposit"
                        type="number"
                        value={watchedValues.leaseDetails?.dewaDeposit || 0}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div>
                      <Label htmlFor="municipalityFee">Municipality Fee (AED)</Label>
                      <Input
                        id="municipalityFee"
                        type="number"
                        value={watchedValues.leaseDetails?.municipalityFee || 0}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="totalDeposits">Total Deposits (AED)</Label>
                    <Input
                      id="totalDeposits"
                      type="number"
                      value={watchedValues.leaseDetails?.totalDeposits || 0}
                      disabled
                      className="bg-muted font-bold text-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms *</Label>
                      <Select
                        value={watchedValues.leaseDetails?.paymentTerms}
                        onValueChange={(value) => setValue("leaseDetails.paymentTerms", value as any)}
                      >
                        <SelectTrigger className={errors.leaseDetails?.paymentTerms ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTerms.map((term) => (
                            <SelectItem key={term.value} value={term.value}>
                              {term.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.leaseDetails?.paymentTerms && (
                        <p className="text-sm text-red-500 mt-1">{errors.leaseDetails.paymentTerms.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
                      <Input
                        id="gracePeriod"
                        type="number"
                        {...register("leaseDetails.gracePeriod", { valueAsNumber: true })}
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lateFee">Late Fee (AED)</Label>
                      <Input
                        id="lateFee"
                        type="number"
                        {...register("leaseDetails.lateFee", { valueAsNumber: true })}
                        placeholder="500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="terminationNotice">Termination Notice (Days)</Label>
                      <Input
                        id="terminationNotice"
                        type="number"
                        {...register("leaseDetails.terminationNotice", { valueAsNumber: true })}
                        placeholder="60"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Terms and Conditions Tab */}
            <TabsContent value="terms" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Terms and Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="renewalTerms">Renewal Terms *</Label>
                    <Textarea
                      id="renewalTerms"
                      {...register("leaseDetails.renewalTerms")}
                      placeholder="Automatic renewal unless notice given 60 days prior to expiry..."
                      rows={3}
                      className={errors.leaseDetails?.renewalTerms ? "border-red-500" : ""}
                    />
                    {errors.leaseDetails?.renewalTerms && (
                      <p className="text-sm text-red-500 mt-1">{errors.leaseDetails.renewalTerms.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Special Terms and Conditions</Label>
                    <div className="space-y-3">
                      {specialTermsOptions.map((term, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`term-${index}`}
                            onCheckedChange={(checked) => {
                              const currentTerms = watchedValues.specialTerms || [];
                              if (checked) {
                                setValue("specialTerms", [...currentTerms, term]);
                              } else {
                                setValue("specialTerms", currentTerms.filter(t => t !== term));
                              }
                            }}
                          />
                          <Label htmlFor={`term-${index}`} className="text-sm">
                            {term}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Custom Terms</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newCustomTerm}
                          onChange={(e) => setNewCustomTerm(e.target.value)}
                          placeholder="Add custom term..."
                          onKeyPress={(e) => e.key === "Enter" && addCustomTerm()}
                        />
                        <Button type="button" onClick={addCustomTerm} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {customTerms.map((term, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                          <span className="text-sm">{term}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomTerm(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PDC Tab */}
            <TabsContent value="pdc" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Post Dated Cheques (PDC) Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage post dated cheques for rent payments as per UAE real estate standards
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* PDC Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          PDC Required
                        </label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select PDC requirement" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="required">Required</SelectItem>
                            <SelectItem value="optional">Optional</SelectItem>
                            <SelectItem value="not-required">Not Required</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Number of PDCs
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter number of PDCs"
                          {...register("pdc.numberOfCheques")}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          PDC Amount per Cheque
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter PDC amount"
                          {...register("pdc.amountPerCheque")}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          First PDC Date
                        </label>
                        <Input
                          type="date"
                          {...register("pdc.firstChequeDate")}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          PDC Frequency
                        </label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Bank Name
                        </label>
                        <Input
                          placeholder="Enter bank name"
                          {...register("pdc.bankName")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* PDC Schedule */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold">PDC Schedule</h4>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add PDC
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Sample PDC entries */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Cheque #1</p>
                          <p className="font-medium">AED 85,000</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Date</p>
                          <p className="font-medium">01/04/2024</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Received
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Cheque #2</p>
                          <p className="font-medium">AED 85,000</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Date</p>
                          <p className="font-medium">01/05/2024</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PDC Terms */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">PDC Terms & Conditions</h4>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">PDC Collection</p>
                          <p className="text-sm text-muted-foreground">
                            All PDCs must be collected before lease commencement
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Bounce Policy</p>
                          <p className="text-sm text-muted-foreground">
                            AED 500 penalty for bounced cheques plus bank charges
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Replacement Policy</p>
                          <p className="text-sm text-muted-foreground">
                            PDCs can be replaced with 7 days notice and valid reason
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    UAE Compliance Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Ejari Registration</p>
                          <p className="text-sm text-muted-foreground">Required for all residential and commercial leases</p>
                        </div>
                      </div>
                      <Checkbox
                        checked={watchedValues.compliance?.ejariRequired}
                        onCheckedChange={(checked) => setValue("compliance.ejariRequired", !!checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium">DEWA Connection</p>
                          <p className="text-sm text-muted-foreground">Electricity and water connection required</p>
                        </div>
                      </div>
                      <Checkbox
                        checked={watchedValues.compliance?.dewaConnection}
                        onCheckedChange={(checked) => setValue("compliance.dewaConnection", !!checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">Municipality Registration</p>
                          <p className="text-sm text-muted-foreground">Required for property registration</p>
                        </div>
                      </div>
                      <Checkbox
                        checked={watchedValues.compliance?.municipalityRegistration}
                        onCheckedChange={(checked) => setValue("compliance.municipalityRegistration", !!checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <ShieldIcon className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Insurance Policy</p>
                          <p className="text-sm text-muted-foreground">Property insurance required</p>
                        </div>
                      </div>
                      <Checkbox
                        checked={watchedValues.compliance?.insuranceRequired}
                        onCheckedChange={(checked) => setValue("compliance.insuranceRequired", !!checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium">Fire Safety Certificate</p>
                          <p className="text-sm text-muted-foreground">Required for commercial properties</p>
                        </div>
                      </div>
                      <Checkbox
                        checked={watchedValues.compliance?.fireSafetyCertificate}
                        onCheckedChange={(checked) => setValue("compliance.fireSafetyCertificate", !!checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium">Maintenance Certificate</p>
                          <p className="text-sm text-muted-foreground">Building maintenance compliance</p>
                        </div>
                      </div>
                      <Checkbox
                        checked={watchedValues.compliance?.maintenanceCertificate}
                        onCheckedChange={(checked) => setValue("compliance.maintenanceCertificate", !!checked)}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">UAE Compliance Notice</p>
                        <p className="text-sm text-blue-700 mt-1">
                          All lease agreements must comply with UAE federal laws and local regulations. 
                          Ensure all required documents and certificates are obtained before lease execution.
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
                {mode === "create" ? "Create Lease" : "Update Lease"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}