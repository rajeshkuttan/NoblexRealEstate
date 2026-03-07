import { useState, useEffect, useRef } from "react";
import { differenceInMonths, parseISO, isValid, addDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  tenantsAPI,
  propertiesAPI,
  unitsAPI,
  settingsAPI,
  servicesAPI,
  leasesAPI,
} from "@/services/api";
import type { Service } from "@/types/service";
import type { ServiceTemplate } from "@/types/serviceTemplate";
import ServiceTemplatePicker from "@/components/common/ServiceTemplatePicker";
import PDCDialog from "@/components/leases/PDCDialog";
import { toast } from "sonner";
import {
  Calendar,
  User,
  Building2,
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
  Edit,
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
  Eye,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Minus,
  Loader2

} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { useConfirm } from "@/hooks/use-confirm";

// UAE-specific lease form validation schema
const leaseFormSchema = z.object({
  // Basic Information
  leaseNumber: z.string().optional(),
  leaseType: z.enum(["residential", "commercial", "industrial", "retail"], {
    required_error: "Please select a lease type",
  }),
  isRentalTaxable: z.boolean().default(false),

  // Tenant Information
  tenantId: z.string().min(1, "Please select a tenant"),
  tenant: z.object({
    name: z.string().min(1, "Tenant name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    emiratesId: z.string().optional(),
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
  unitId: z.string().min(1, "Please select a property unit"),
  property: z.object({
    id: z.string().optional(),
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
    securityDeposit: z
      .number()
      .min(1, "Security deposit must be greater than 0"),
    agencyFee: z.number().min(0),
    ejariFee: z.number().min(0),
    dewaDeposit: z.number().min(0),
    municipalityFee: z.number().min(0),
    totalDeposits: z.number().min(0),
    paymentTerms: z.enum(["monthly", "quarterly", "semi-annually", "annually"]),
    gracePeriod: z.number().min(0),
    lateFee: z.number().min(0),
    renewalTerms: z.string().min(1, "Renewal terms are required"),
    terminationNotice: z
      .number()
      .min(1, "Termination notice period is required"),
  }),

  // Special Terms and Conditions
  specialTerms: z.array(z.string()).optional(),

  // Compliance Requirements
  compliance: z.object({
    ejariRequired: z.boolean().default(false),
    dewaConnection: z.boolean().default(false),
    municipalityRegistration: z.boolean().default(false),
    insuranceRequired: z.boolean().default(false),
    fireSafetyCertificate: z.boolean().default(false),
    maintenanceCertificate: z.boolean().default(false),
  }),

  // Additional Information
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  services: z.array(z.any()).optional(), // Add current services state to form data
});

type LeaseFormData = z.infer<typeof leaseFormSchema>;

interface LeaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeaseFormData, files?: File[]) => Promise<void> | void;
  initialData?: any;
  mode: "create" | "edit" | "renew";
}

const nationalities = [
  "UAE",
  "Saudi Arabia",
  "Kuwait",
  "Qatar",
  "Bahrain",
  "Oman",
  "Egypt",
  "Jordan",
  "Lebanon",
  "Syria",
  "India",
  "Pakistan",
  "Bangladesh",
  "Sri Lanka",
  "Philippines",
  "Indonesia",
  "Malaysia",
  "Thailand",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Switzerland",
  "Austria",
  "Belgium",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Ghana",
  "Morocco",
  "Tunisia",
  "Algeria",
  "Sudan",
  "China",
  "Japan",
  "South Korea",
  "Singapore",
  "Hong Kong",
  "Taiwan",
  "Vietnam",
  "Cambodia",
  "Brazil",
  "Argentina",
  "Chile",
  "Mexico",
  "Colombia",
  "Peru",
  "Venezuela",
  "Uruguay",
  "Russia",
  "Ukraine",
  "Poland",
  "Czech Republic",
  "Hungary",
  "Romania",
  "Bulgaria",
  "Croatia",
  "Other",
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

export default function LeaseForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: LeaseFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [customTerms, setCustomTerms] = useState<string[]>([]);
  const [newCustomTerm, setNewCustomTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  
  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { confirm: confirmAction, isOpen: isConfirmOpen, options: confirmOptions, onConfirm: handleConfirm, onCancel: handleCancel } = useConfirm();

  // State for fetched data from database
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // UAE Settings state
  const [uaeSettings, setUaeSettings] = useState<any>({
    uae_ejari_fee: 220,
    uae_dewa_deposit_percentage: 10,
    uae_security_deposit_months: 1,
    uae_agency_fee_percentage: 5,
    uae_municipality_fee_percentage: 5,
    lease_grace_period_days: 5,
  });

  // PDC Schedule state
  const [pdcSchedule, setPdcSchedule] = useState<any[]>([]);
  const [pdcStartDate, setPdcStartDate] = useState<string>("");
  const [showPDCDialog, setShowPDCDialog] = useState(false);
  const [editingPDC, setEditingPDC] = useState<any>(null);
  const [pdcDialogMode, setPdcDialogMode] = useState<"add" | "edit">("add");

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  
  // SAFE REF implementation to prevent stale closures
  const servicesRefSafe = useRef<Service[]>(services);
  // Moved useEffect after useForm destructuring to avoid ReferenceError

  // Debug log for render
  console.log("LeaseForm Render: services state=", services);

  const [taxRate, setTaxRate] = useState(5); // UAE VAT rate
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Rental tax state
  const [isRentalTaxable, setIsRentalTaxable] = useState(false);

  // Track if initial data has been loaded to prevent overwriting user edits
  const dataLoadedRef = useRef(false);

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: initialData || {
      leaseNumber: "",
      leaseType: "residential",
      tenantId: "",
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
      unitId: "",
      property: {
        id: "",
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    clearErrors,
    trigger,
  } = form;

  // Sync services state with form data (and Safe Ref)
  useEffect(() => {
    servicesRefSafe.current = services;
    setValue("services", services); 
  }, [services, setValue]);

  const watchedValues = watch();



  // Helper function to parse JSON arrays
  const parseJSON = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return [];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };
  
  const triggerFileInput = (e?: React.MouseEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling just in case
    }
    console.log("triggerFileInput called");

    // Try ref first
    if (fileInputRef.current) {
        console.log("Opening via Ref");
        fileInputRef.current.click();
        return;
    }
    
    // Fallback to ID
    const input = document.getElementById('document-upload-input');
    if (input) {
        console.log("Opening via ID");
        input.click();
    } else {
        // One last desperate attempt: querySelector
        const queryInput = document.querySelector('input[type="file"][id="document-upload-input"]') as HTMLInputElement;
        if (queryInput) {
            console.log("Opening via querySelector");
            queryInput.click();
        } else {
            console.error("File input not found via Ref, ID, or Query");
            toast.error("Could not open file picker - system error");
        }
    }
  };

  const onSubmitForm = async (data: LeaseFormData) => {
      // Merge PDC data from state into submission payload
      const payload = {
        ...data,
        pdcSchedule,
        pdcStartDate
      };
      await onSubmit(payload, selectedFiles);
  };

  const onError = (errors: any) => {
    console.error("Form validation errors:", errors);
    toast.error("Please fill in all required fields", {
      description: "Check the form for highlighted errors.",
    });
    
    // Optional: Toast specific errors for better UX
    const errorMessages = Object.values(errors)
      .map((error: any) => error.message)
      .filter(Boolean);
      
    if (errorMessages.length > 0) {
       // Show the first error specificially
       toast.error(String(errorMessages[0]));
    }
  };


   
  // Load edit data when modal opens in edit mode
  useEffect(() => {
    if (!isOpen) return;

    if ((mode === "edit" || mode === "create") && initialData) {
      // Delay for dialog render
      setTimeout(() => {
        // Parse JSON fields
        const parsedDocuments = parseJSON(initialData.documents);
        const parsedSpecialTerms = parseJSON(initialData.specialTerms);

        const formData = {
          leaseNumber: initialData.leaseNumber || "",
          leaseType: initialData.leaseType || initialData.propertyType || "residential", // fallback if missing

          tenantId: String(
            initialData.tenantId || initialData.tenant?.id || "",
          ),

          tenant: {
            id: String(initialData.tenantId || initialData.tenant?.id || ""),
            name: initialData.tenant?.name || "",
            email: initialData.tenant?.email || "",
            phone: initialData.tenant?.phone || "",
            emiratesId: initialData.tenant?.emiratesId || "",
            nationality: initialData.tenant?.nationality || "",
            passportNumber: initialData.tenant?.passportNumber || "",
            visaNumber: initialData.tenant?.visaNumber || "",
            visaExpiry: initialData.tenant?.visaExpiry || "",
            emergencyContact: {
              name: typeof initialData.tenant?.emergencyContact === 'string' 
                ? initialData.tenant.emergencyContact 
                : (initialData.tenant?.emergencyContact?.name || ""),
              phone: initialData.tenant?.emergencyPhone || 
                initialData.tenant?.emergencyContact?.phone || "",
              relation: initialData.tenant?.emergencyRelation || 
                initialData.tenant?.emergencyContact?.relation || "",
            },
          },

          unitId: String(initialData.unitId || initialData.unit?.id || ""),

          property: {
            id: String(
              initialData.unit?.propertyId || initialData.property?.id || "",
            ),
            name:
              initialData.unit?.property?.title ||
              initialData.property?.title ||
              initialData.unit?.property?.name ||
              "",
            unit: initialData.unit?.unitNumber || "",
            address:
              initialData.unit?.property?.location ||
              initialData.property?.location ||
              "",
            type: (
              initialData.unit?.property?.buildingType || "residential"
            ).toLowerCase(),
            area: Number(initialData.unit?.area || 0),
            bedrooms: Number(initialData.unit?.bedrooms || 0),
            bathrooms: Number(initialData.unit?.bathrooms || 0),
            parking: Number(initialData.unit?.parking || 0),
          },

          leaseDetails: {
            startDate: initialData.startDate?.split("T")[0] || "",
            endDate: initialData.endDate?.split("T")[0] || "",
            duration: Number(initialData.duration || 12),
            monthlyRent: Number(initialData.rentAmount || 0),
            annualRent: Number(initialData.annualRent || (initialData.rentAmount * 12) || 0),
            securityDeposit: Number(initialData.depositAmount || 0),
            agencyFee: Number(initialData.agencyFee || 0),
            ejariFee: Number(initialData.ejariFee || 0), // Use existing value or input
            dewaDeposit: Number(initialData.dewaDeposit || 0),
            municipalityFee: Number(initialData.municipalityFee || 0),
            totalDeposits: Number(initialData.totalDeposits || 0),
            paymentTerms: initialData.paymentFrequency || "monthly",
            gracePeriod: Number(initialData.gracePeriod || 5),
            lateFee: Number(initialData.lateFee || 0),
            renewalTerms: initialData.renewalTerms || "",
            terminationNotice: Number(initialData.terminationNotice || 60),
          },

          specialTerms: initialData.specialConditions 
              ? (Array.isArray(initialData.specialConditions) ? initialData.specialConditions : initialData.specialConditions.split("; ")) 
              : [],
          compliance: (typeof initialData.compliance === 'string' ? parseJSON(initialData.compliance) : initialData.compliance) || {
            ejariRequired: true,
            dewaConnection: true,
            municipalityRegistration: true,
            insuranceRequired: true,
            fireSafetyCertificate: true,
            maintenanceCertificate: true,
          },
          notes: initialData.terms || initialData.notes || "",
          attachments: parseJSON(initialData.documents || "[]"),
        };


        // Reset form with all values
        form.reset(formData);

        // Lock property & unit in edit mode
        if (initialData.unit?.property) {
          setSelectedProperty(initialData.unit.property);
          setAvailableUnits([initialData.unit]); // only current unit visible
        }
        if (initialData.unit || initialData.property?.unit) {
          setSelectedUnit(initialData.unit || initialData.property?.unit);
        }

        // Load PDC schedule if exists
        setValue(
          "compliance",
          typeof initialData.compliance === "string"
            ? JSON.parse(initialData.compliance || "{}")
            : initialData.compliance || {},
        );

        setValue(
          "pdcSchedule",
          Array.isArray(initialData.pdcSchedule)
            ? initialData.pdcSchedule
            : typeof initialData.pdcSchedule === "string"
            ? JSON.parse(initialData.pdcSchedule || "[]")
            : [],
        );
        
        if (initialData.pdcStartDate) {
             setValue("pdcStartDate", initialData.pdcStartDate);
        }
        
        // Ensure property type is loaded if missing from form state but present in initialData
        if (initialData.propertyType) {
             setValue("property.type", initialData.propertyType);
        }
        
        // Original PDC schedule loading logic (kept for setPdcSchedule state)
        let initialPdcSchedule = initialData.pdcSchedule;
        if (typeof initialPdcSchedule === "string") {
          try {
            initialPdcSchedule = JSON.parse(initialPdcSchedule);
          } catch (e) {
            initialPdcSchedule = [];
          }
        }

        if (initialPdcSchedule && Array.isArray(initialPdcSchedule)) {
           // Ensure dates are parsed if they are strings
           const parsedSchedule = initialPdcSchedule.map((cheque: any) => ({
             ...cheque,
             date: cheque.date ? new Date(cheque.date) : new Date()
           }));
           setPdcSchedule(parsedSchedule);
        } else {
          setPdcSchedule([]);
        }

        // Load PDC start date
        if (initialData.pdcStartDate) {
          setPdcStartDate(initialData.pdcStartDate);
        }

        // Load rental tax status correctly with robust checking
        const rawTax = initialData.isRentalTaxable;
        const rawSnakeTax = initialData.is_rental_taxable;
        let loadedTax = false;

        if (rawTax !== undefined && rawTax !== null) {
           loadedTax = rawTax === true || rawTax === 1 || String(rawTax).toLowerCase() === 'true';
           setIsRentalTaxable(loadedTax);
           setValue("isRentalTaxable", loadedTax);
        } else if (rawSnakeTax !== undefined && rawSnakeTax !== null) {
           loadedTax = rawSnakeTax === true || rawSnakeTax === 1 || String(rawSnakeTax).toLowerCase() === 'true';
           setIsRentalTaxable(loadedTax);
           setValue("isRentalTaxable", loadedTax);
        } else {
           // Default based on lease type
           setIsRentalTaxable(initialData.leaseType !== "residential");
           setValue("isRentalTaxable", initialData.leaseType !== "residential");
        }
        console.log(`[LeaseForm] Edit Mode - Loaded tax status: ${loadedTax}`);

        setValue(
          "unitId",
          String(initialData.unitId || initialData.unit?.id || ""),
        );
        setValue(
          "tenantId",
          String(initialData.tenantId || initialData.tenant?.id || ""),
        );

        setValue(
          "leaseDetails.monthlyRent",
          Number(
            initialData.monthlyRent ||
              initialData.rentAmount ||
              initialData.leaseDetails?.monthlyRent ||
              0,
          ),
        );

        setValue(
          "leaseDetails.startDate",
          (
            initialData.startDate ||
            initialData.leaseDetails?.startDate ||
            ""
          ).split("T")[0] || "",
        );

        setValue(
          "leaseDetails.endDate",
          (
            initialData.endDate ||
            initialData.leaseDetails?.endDate ||
            ""
          ).split("T")[0] || "",
        );

        // Services from existing lease (most important for edit!)
        if (!dataLoadedRef.current && initialData.services) {
          const loaded = Array.isArray(initialData.services)
            ? initialData.services
            : parseJSON(initialData.services) || [];
          setServices(loaded);

        } else if (!initialData.services && !dataLoadedRef.current) {
             setServices([]);
        }
        
        // Mark as loaded so we don't overwrite user changes
        dataLoadedRef.current = true;
      }, 150);

    } else if (mode === "renew" && initialData) {
        // Renew Mode: Prefill data but treat as new lease
        setTimeout(() => {
          // Parse JSON fields
          const parsedDocuments = parseJSON(initialData.documents);
          
          // Calculate new start date (day after old end date)
          let newStartDate = new Date();
          if (initialData.endDate) {
              const oldEnd = new Date(initialData.endDate);
              oldEnd.setDate(oldEnd.getDate() + 1);
              newStartDate = oldEnd;
          }
          
          // Calculate new end date (1 year duration default)
          const newEndDate = new Date(newStartDate);
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
          newEndDate.setDate(newEndDate.getDate() - 1);

          const formData = {
            leaseNumber: `${initialData.leaseNumber || ""}-R`, // Auto-fill with -R suffix
            leaseType: initialData.leaseType || initialData.propertyType || "residential",

            tenantId: String(initialData.tenantId || initialData.tenant?.id || ""),
            tenant: {
              name: initialData.tenant?.name || "",
              email: initialData.tenant?.email || "",
              phone: initialData.tenant?.phone || "",
              emiratesId: initialData.tenant?.emiratesId || "",
              nationality: initialData.tenant?.nationality || "",
              passportNumber: initialData.tenant?.passportNumber || "",
              visaNumber: initialData.tenant?.visaNumber || "",
              visaExpiry: initialData.tenant?.visaExpiry || "",
              emergencyContact: {
                name: initialData.tenant?.emergencyContact || "",
                phone: initialData.tenant?.emergencyPhone || "",
                relation: initialData.tenant?.emergencyRelation || "",
              },
            },

            unitId: String(initialData.unitId || initialData.unit?.id || ""),
            property: {
              id: String(initialData.unit?.propertyId || initialData.property?.id || ""),
              name: initialData.unit?.property?.title || initialData.property?.title || "",
              unit: initialData.unit?.unitNumber || "",
              address: initialData.unit?.property?.location || initialData.property?.location || "",
              type: (initialData.unit?.property?.buildingType || "residential").toLowerCase(),
              area: Number(initialData.unit?.area || 0),
              bedrooms: Number(initialData.unit?.bedrooms || 0),
              bathrooms: Number(initialData.unit?.bathrooms || 0),
              parking: Number(initialData.unit?.parking || 0),
            },

            leaseDetails: {
              startDate: newStartDate.toISOString().split('T')[0],
              endDate: newEndDate.toISOString().split('T')[0],
              duration: 12, // Default to 1 year
              monthlyRent: Number(initialData.rentAmount || 0), // Keeping same rent
              annualRent: Number(initialData.annualRent || (initialData.rentAmount * 12) || 0),
              securityDeposit: Number(initialData.depositAmount || 0),
              agencyFee: Number(initialData.agencyFee || 0), 
              ejariFee: Number(initialData.ejariFee || 0), 
              dewaDeposit: Number(initialData.dewaDeposit || 0),
              municipalityFee: Number(initialData.municipalityFee || 0),
              totalDeposits: Number(initialData.totalDeposits || 0),
              paymentTerms: initialData.paymentFrequency || "monthly",
              gracePeriod: Number(initialData.gracePeriod || 5),
              lateFee: Number(initialData.lateFee || 0),
              renewalTerms: initialData.renewalTerms || "",
              terminationNotice: Number(initialData.terminationNotice || 60),
            },

            specialTerms: initialData.specialConditions 
                ? (Array.isArray(initialData.specialConditions) ? initialData.specialConditions : initialData.specialConditions.split("; ")) 
                : [],
            compliance: {
               // Reset compliance for new lease
               ejariRequired: true,
               dewaConnection: true,
               municipalityRegistration: true,
               insuranceRequired: true,
               fireSafetyCertificate: true,
               maintenanceCertificate: true,
               ...initialData.compliance 
            },
            notes: `Renewed from lease ${initialData.leaseNumber}. ` + (initialData.terms || ""),
            attachments: [], // Don't copy old attachments
          };

          form.reset(formData);

           // Lock property & unit 
           if (initialData.unit?.property) {
            setSelectedProperty(initialData.unit.property);
            setAvailableUnits([initialData.unit]); 
          }
          if (initialData.unit || initialData.property?.unit) {
            setSelectedUnit(initialData.unit || initialData.property?.unit);
          }
          
           if (rawTax !== undefined && rawTax !== null) {
              loadedTax = rawTax === true || rawTax === 1 || String(rawTax).toLowerCase() === 'true';
              setIsRentalTaxable(loadedTax);
              setValue("isRentalTaxable", loadedTax);
           } else if (rawSnakeTax !== undefined && rawSnakeTax !== null) {
              loadedTax = rawSnakeTax === true || rawSnakeTax === 1 || String(rawSnakeTax).toLowerCase() === 'true';
              setIsRentalTaxable(loadedTax);
              setValue("isRentalTaxable", loadedTax);
           } else {
              // Fallback default
              setIsRentalTaxable(initialData.leaseType !== "residential");
              setValue("isRentalTaxable", initialData.leaseType !== "residential");
           }
           console.log(`[LeaseForm] Loaded tax status: ${loadedTax} (Raw: ${rawTax}, Snake: ${rawSnakeTax})`);
           
           // Copy services
           if (initialData.services) {
            console.log("[LeaseForm] Loading services from initialData:", initialData.services);
            const loaded = Array.isArray(initialData.services)
              ? initialData.services
              : (typeof initialData.services === 'string' ? JSON.parse(initialData.services) : []);
            setServices(loaded);
            console.log("[LeaseForm] Services state set to:", loaded);
           } else {
             console.log("[LeaseForm] No services in initialData");
             setServices([]);
           }

          dataLoadedRef.current = true;
          toast.info("Lease data prefilled for renewal. Please verify dates and rent.");
      }, 150);

    } else if (mode === "create") {
      dataLoadedRef.current = false; // Reset for new create
      // Reset form for create mode
      form.reset({
        leaseNumber: "",
        leaseType: "residential",
        tenantId: "",
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
        unitId: "",
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
      });
      setCustomTerms([]);
      setSelectedProperty(null);
      setSelectedUnit(null);
      setPdcSchedule([]);
      setPdcStartDate("");
      setIsRentalTaxable(false);
    }
  }, [isOpen, mode, initialData, form]);

  // Fetch tenants and properties from database
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;

      setLoadingData(true);
      try {
        // Fetch all data in parallel with pagination limits (limit: 100 for dropdowns)
        console.log("🔵 Fetching lease form data in parallel...");

        const [
          tenantsResponse,
          propertiesResponse,
          allUnitsResponse,
          settingsResponse,
        ] = await Promise.all([
          // Fetch tenants with pagination limit
          tenantsAPI.getAll({ limit: 100 }).catch((err) => {
            console.warn("⚠️ Failed to fetch tenants:", err);
            return { data: { data: [] } };
          }),
          // Fetch properties with pagination limit
          propertiesAPI.getAll({ limit: 100 }).catch((err) => {
            console.warn("⚠️ Failed to fetch properties:", err);
            return { data: { data: [] } };
          }),
          // Fetch all units at once (with limit) instead of per-property
          unitsAPI.getAll({ limit: 500 }).catch((err) => {
            console.warn("⚠️ Failed to fetch units:", err);
            return { data: { data: [] } };
          }),
          // Fetch UAE settings
          settingsAPI.getAll({ category: "UAE" }).catch((err) => {
            console.warn("⚠️ Failed to fetch UAE settings:", err);
            return { data: { data: { settings: {} } } };
          }),
        ]);

        // Handle tenants
        let fetchedTenants =
          tenantsResponse.data?.data?.tenants ||
          tenantsResponse.data?.tenants ||
          tenantsResponse.data?.rows ||
          tenantsResponse.data?.data ||
          tenantsResponse.data ||
          [];

        const mappedTenants = Array.isArray(fetchedTenants)
          ? fetchedTenants.map((tenant: any) => ({
              id: tenant.id,
              name: tenant.name || "",
              email: tenant.email || "",
              phone: tenant.phone || "",
              emiratesId: tenant.emiratesId || "",
              nationality: tenant.nationality || "",
              address: tenant.address || "",
              passportNumber: tenant.passportNumber || "",
              visaNumber: tenant.visaNumber || "",
              visaExpiry: tenant.visaExpiry || "",
              emergencyName: tenant.emergencyName || "",
              emergencyContact: tenant.emergencyPhone || "",
              emergencyRelation: tenant.emergencyRelation || "",
            }))
          : [];

        setTenants(mappedTenants);
        console.log("✅ Fetched tenants:", mappedTenants.length);

        // Handle UAE settings
        const settings = settingsResponse.data?.data?.settings || {};
        if (Object.keys(settings).length > 0) {
          setUaeSettings(settings);
          if (settings.uae_vat_rate) {
            setTaxRate(parseFloat(settings.uae_vat_rate));
          }
          console.log("✅ Fetched UAE settings");
        }

        // Handle properties
        let fetchedProperties =
          propertiesResponse.data?.data?.properties ||
          propertiesResponse.data?.properties ||
          propertiesResponse.data?.rows ||
          propertiesResponse.data?.data ||
          propertiesResponse.data ||
          [];

        if (!Array.isArray(fetchedProperties)) {
          fetchedProperties = [];
        }

        // Handle all units at once (optimized - no N+1 queries)
        let allUnits =
          allUnitsResponse.data?.data?.units ||
          allUnitsResponse.data?.units ||
          allUnitsResponse.data?.rows ||
          allUnitsResponse.data?.data ||
          allUnitsResponse.data ||
          [];

        if (!Array.isArray(allUnits)) {
          allUnits = [];
        }

        // Group units by propertyId
        const unitsByProperty = allUnits.reduce((acc: any, unit: any) => {
          const propertyId = unit.propertyId || unit.property_id;
          if (!acc[propertyId]) {
            acc[propertyId] = [];
          }
          acc[propertyId].push(unit);
          return acc;
        }, {});

        // Map properties with their units
        const propertiesWithUnits = fetchedProperties.map((property: any) => {
          const propertyUnits = unitsByProperty[property.id] || [];
          return {
            id: property.id,
            name: property.title || property.name || "",
            address: property.location || property.address || "",
            type: property.buildingType || property.type || "residential",
            area: parseFloat(property.area) || 0,
            bedrooms: property.bedrooms || 0,
            bathrooms: property.bathrooms || 0,
            parking: property.parking || 0,
            units: propertyUnits.map((unit: any) => ({
              id: unit.id,
              unit: unit.unitNumber || unit.unit_number,
              area: parseFloat(unit.area) || 0,
              bedrooms: unit.bedrooms || 0,
              bathrooms: unit.bathrooms || 0,
              parking: Number(unit.parking || unit.parkingSpaces) || 0,
              monthlyRent: parseFloat(unit.rentAmount || unit.rent_amount) || 0,
              status: (unit.status || 'available').toLowerCase(),
            })),
          };
        });

        setProperties(propertiesWithUnits);
        console.log(
          "✅ Fetched properties with units:",
          propertiesWithUnits.length,
        );
      } catch (error: any) {
        console.error("❌ Failed to fetch lease form data:", error);
        toast.error(
          "Failed to load tenants and properties. Please refresh the page.",
        );
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Auto-set security deposit logic remains
  useEffect(() => {
    const monthlyRent = watch("leaseDetails.monthlyRent") || 0;
    const currentDeposit = watch("leaseDetails.securityDeposit") || 0;

    if (monthlyRent > 0 && currentDeposit === 0) {
      // Only auto-set if currently 0
      const calculatedDeposit = monthlyRent * 1; // 1 month (change to 2 if needed, or use uaeSettings.uae_security_deposit_months)
      setValue("leaseDetails.securityDeposit", calculatedDeposit, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      // Optional: Update totalDeposits too
      const currentDetails = getValues("leaseDetails");
      const newTotal =
        calculatedDeposit +
        (currentDetails.agencyFee || 0) +
        (currentDetails.ejariFee || 0) +
        (currentDetails.dewaDeposit || 0) +
        (currentDetails.municipalityFee || 0);
      setValue("leaseDetails.totalDeposits", newTotal);
    }
  }, [watch("leaseDetails.monthlyRent"), setValue, getValues]);

  // Auto-calculate duration from start/end dates
  useEffect(() => {
    const startDateStr = watchedValues.leaseDetails?.startDate;
    const endDateStr = watchedValues.leaseDetails?.endDate;

    if (startDateStr && endDateStr) {
      const start = parseISO(startDateStr);
      const end = parseISO(endDateStr);

      if (isValid(start) && isValid(end) && end >= start) {
        // Most real estate systems treat inclusive dates. 
        // 01-03-2026 to 01-03-2027 is 12 months.
        // differenceInMonths(Mar 1 2027, Mar 1 2026) = 12
        // If it's 01-03-2026 to 28-02-2027, differenceInMonths would be 11.
        // So we add 1 day to the end date for calculation.
        const calculatedMonths = differenceInMonths(addDays(end, 1), start);
        
        if (calculatedMonths > 0 && calculatedMonths !== watchedValues.leaseDetails?.duration) {
          setValue("leaseDetails.duration", calculatedMonths, {
            shouldValidate: true,
            shouldDirty: true,
          });
          calculateDerivedValues();
        }
      }
    }
  }, [watchedValues.leaseDetails?.startDate, watchedValues.leaseDetails?.endDate]);

  // Calculate derived values based on UAE settings
  const calculateDerivedValues = () => {
    const monthlyRent = watchedValues.leaseDetails?.monthlyRent || 0;
    const annualRent = monthlyRent * 12;

    // Use UAE settings for calculations
    const securityDepositMonths = uaeSettings.uae_security_deposit_months || 1;

    const agencyFeePercentage = uaeSettings.uae_agency_fee_percentage || 5;
    const ejariFeeAmount = uaeSettings.uae_ejari_fee || 220;
    const dewaDepositPercentage = uaeSettings.uae_dewa_deposit_percentage || 10;
    const municipalityFeePercentage =
      uaeSettings.uae_municipality_fee_percentage || 5;

    // Calculate based on UAE standards
    const securityDeposit = Math.round(monthlyRent * securityDepositMonths);
    const agencyFee = Math.round(annualRent * (agencyFeePercentage / 100));
    const ejariFee = ejariFeeAmount;
    const dewaDeposit = Math.round(monthlyRent * (dewaDepositPercentage / 100));
    const municipalityFee = Math.round(
      annualRent * (municipalityFeePercentage / 100),
    );
    const totalDeposits =
      securityDeposit + agencyFee + ejariFee + dewaDeposit + municipalityFee;

    setValue("leaseDetails.annualRent", annualRent);
    setValue("leaseDetails.securityDeposit", securityDeposit);
    setValue("leaseDetails.agencyFee", agencyFee);
    setValue("leaseDetails.ejariFee", ejariFee);
    setValue("leaseDetails.dewaDeposit", dewaDeposit);
    setValue("leaseDetails.municipalityFee", municipalityFee);
    setValue("leaseDetails.totalDeposits", totalDeposits);


  };

  // Handle template selection
  const handleTemplateSelect = (template: ServiceTemplate) => {
    setServices([
      ...services,
      {
        name: template.name,
        amount: template.defaultAmount,
        isTaxable: template.isTaxable,
        billingMethod: template.billingMethod,
        entityType: "lease",
        entityId: 0,
        sortOrder: services.length,
        includeInPDC: template.billingMethod === "included_in_rental",
        description: template.description,
      },
    ]);
  };

  // Add custom service (empty)
  const addCustomService = () => {
    setServices([
      ...services,
      {
        name: "",
        amount: 0,
        isTaxable: false,
        billingMethod: "charged_separately",
        entityType: "lease",
        entityId: 0,
        sortOrder: services.length,
        includeInPDC: false,
      },
    ]);
  };

  // Generate PDC Schedule automatically
  const generatePDCSchedule = () => {
    const monthlyRent = watchedValues.leaseDetails?.monthlyRent || 0;
    const paymentTerms = watchedValues.leaseDetails?.paymentTerms || "monthly";
    const leaseStart = watchedValues.leaseDetails?.startDate;
    const duration = watchedValues.leaseDetails?.duration || 12;

    if (!monthlyRent || !leaseStart) {
      toast.error("Please enter monthly rent and lease start date first");
      return;
    }

    // Use PDC start date if provided, otherwise use lease start date
    const startDate = pdcStartDate || leaseStart;

    // Show warning if PDCs already exist (will be replaced)
    if (pdcSchedule.length > 0) {
      if (
        !confirm(
          `This will replace ${pdcSchedule.length} existing PDC entries. Continue?`,
        )
      ) {
        return;
      }
    }

    // Calculate services to include in PDC (based on billing method)
    const servicesToInclude = services.filter(
      (s) => s.billingMethod === "included_in_rental"
    );
    const servicesTotal = servicesToInclude.reduce((sum, s) => {
      const serviceTotal = s.isTaxable
        ? Number(s.amount) * (1 + taxRate / 100)
        : Number(s.amount);
      return sum + serviceTotal;
    }, 0);

    // Calculate number of cheques and amount per cheque based on payment terms
    let numberOfCheques = 0;
    let rentPerCheque = 0;
    let monthsPerCheque = 0;

    // Apply rental VAT if applicable
    const baseRent = monthlyRent;
    const rentWithTax = isRentalTaxable ? baseRent * 1.05 : baseRent;

    switch (paymentTerms) {
      case "monthly":
        numberOfCheques = duration;
        rentPerCheque = rentWithTax;
        monthsPerCheque = 1;
        break;
      case "quarterly":
        numberOfCheques = Math.ceil(duration / 3);
        rentPerCheque = rentWithTax * 3;
        monthsPerCheque = 3;
        break;
      case "semi-annually":
        numberOfCheques = Math.ceil(duration / 6);
        rentPerCheque = rentWithTax * 6;
        monthsPerCheque = 6;
        break;
      case "annually":
        numberOfCheques = Math.ceil(duration / 12);
        rentPerCheque = rentWithTax * 12;
        monthsPerCheque = 12;
        break;
      default:
        numberOfCheques = duration;
        rentPerCheque = rentWithTax;
        monthsPerCheque = 1;
    }

    // Distribute services total across cheques
    const servicesPerCheque =
      numberOfCheques > 0 ? servicesTotal / numberOfCheques : 0;
    const amountPerCheque = rentPerCheque + servicesPerCheque;

    // Generate simplified PDC entries
    const schedule = [];
    const firstPDCDate = new Date(startDate);

    for (let i = 0; i < numberOfCheques; i++) {
      const dueDate = new Date(firstPDCDate);
      dueDate.setMonth(dueDate.getMonth() + i * monthsPerCheque);

      schedule.push({
        id: Date.now() + i, // Unique ID using timestamp
        amount: Math.round(amountPerCheque * 100) / 100, // Round to 2 decimal places
        dueDate: dueDate.toISOString().split("T")[0],
        status: "pending",
        notes: isRentalTaxable ? "Includes 5% VAT on rental" : "",
      });
    }

    setPdcSchedule(schedule);


    if (servicesToInclude.length > 0) {
      toast.success(
        `Generated ${numberOfCheques} PDC entries for ${paymentTerms} payment (includes ${servicesToInclude.length} service(s))`,
      );
    } else {
      toast.success(
        `Generated ${numberOfCheques} PDC entries for ${paymentTerms} payment`,
      );
    }
  };

  // Fetch and load services from selected unit
  const loadUnitServices = async (unitId: string) => {
    if (!unitId) return;

    try {
      const response = await servicesAPI.getByEntity("unit", parseInt(unitId));
      const unitServices: Service[] = response?.data?.services || [];

      if (unitServices.length === 0) {
        toast.info("This unit has no associated services");
        return;
      }

      // Transform unit services to lease context
      const transformedServices = unitServices.map(
        (service: Service, index: number) => ({
          ...service,
          // Reset entity context for lease
          entityType: "lease",
          entityId: 0,
          // Give temporary negative ID for new items (if needed)
          tempId: service.id ? undefined : `new-${Date.now()}-${index}`,
        }),
      );

      // In create mode → just set them
      // In edit mode → only add if user hasn't added/removed anything yet (services.length === 0)
      setServices((prev) => {
        // If user already has services (edit + manual changes), we append only new/unique ones
        if (prev.length > 0 && mode === "edit") {
          const existingNames = new Set(
            prev.map((s) => s.name.toLowerCase().trim()),
          );
          const toAdd = transformedServices.filter(
            (s) => !existingNames.has(s.name.toLowerCase().trim()),
          );

          if (toAdd.length > 0) {
            toast.info(`Adding ${toAdd.length} new service(s) from unit`);
            return [...prev, ...toAdd];
          }
          return prev;
        }

        // First time or create mode → replace/set
        toast.success(
          `Loaded ${transformedServices.length} service(s) from selected unit`,
        );
        return transformedServices;
      });
    } catch (err) {
      console.error("Failed to load unit services:", err);
      toast.error("Could not load services from selected unit");
    }
  };

  // PDC CRUD handlers
  const handleAddPDC = () => {
    setEditingPDC(null);
    setPdcDialogMode("add");
    setShowPDCDialog(true);
  };

  const handleEditPDC = (pdc: any) => {
    setEditingPDC(pdc);
    setPdcDialogMode("edit");
    setShowPDCDialog(true);
  };

  const handleDeletePDC = async (id: number) => {
    const confirmed = await confirmAction({
      title: "Delete PDC Entry",
      description: "Are you sure you want to delete this PDC entry?",
      confirmText: "Delete",
      variant: "destructive"
    });

    if (confirmed) {
      setPdcSchedule(pdcSchedule.filter((p) => p.id !== id));
      toast.success("PDC entry deleted");
    }
  };

  const handlePDCSubmit = (pdcData: any) => {
    if (pdcDialogMode === "add") {
      setPdcSchedule([...pdcSchedule, { ...pdcData, id: Date.now() }]);
      toast.success("PDC entry added");
    } else {
      setPdcSchedule(
        pdcSchedule.map((p) =>
          p.id === editingPDC.id ? { ...pdcData, id: editingPDC.id } : p,
        ),
      );
      toast.success("PDC entry updated");
    }
    setShowPDCDialog(false);
  };

  // Status badge color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "received":
        return "bg-blue-100 text-blue-800";
      case "deposited":
        return "bg-purple-100 text-purple-800";
      case "cleared":
        return "bg-green-100 text-green-800";
      case "bounced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const addCustomTerm = () => {
    if (newCustomTerm.trim()) {
      const currentTerms = getValues("specialTerms") || [];
      const updatedTerms = [...currentTerms, newCustomTerm.trim()];
      setValue("specialTerms", updatedTerms, { shouldDirty: true, shouldValidate: true });
      setNewCustomTerm("");
    }
  };

  const removeCustomTerm = (index: number) => {
    const currentTerms = getValues("specialTerms") || [];
    const updatedTerms = currentTerms.filter((_: string, i: number) => i !== index);
    setValue("specialTerms", updatedTerms, { shouldDirty: true, shouldValidate: true });
  };

  const onFormSubmit = (data: LeaseFormData) => {
    // Prefer data.services (synced via setValue) over Ref, but fallback to Ref if needed
    const currentServices = data.services || servicesRefSafe.current; 

    const formData = {
      ...data,
      services: currentServices,  
 
      pdcSchedule: pdcSchedule,
      pdcStartDate: pdcStartDate,
      isRentalTaxable: isRentalTaxable,
      status: 'active', // Force active status for now to ensure unit locking works
      ...(mode === "renew" && initialData?.id ? { renewedFromLeaseId: initialData.id } : {}),
    };
    onSubmit(formData, selectedFiles);
  };

  const [hasInvoices, setHasInvoices] = useState(false);

  useEffect(() => {
    const monthly = watch("leaseDetails.monthlyRent") || 0;
    setValue("leaseDetails.annualRent", monthly * 12, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [watch("leaseDetails.monthlyRent")]);

  // Check if lease has invoices when in edit/renew mode
  useEffect(() => {
    setHasInvoices(false); // Reset state to avoid false positives
    const checkInvoices = async () => {
       if ((mode === 'edit' || mode === 'renew') && initialData?.id) {
           try {
               const res = await leasesAPI.getById(initialData.id);
               const lease = res.data?.data || res.data;
               if (lease && lease.invoices && lease.invoices.length > 0) {
                   setHasInvoices(true);
               }
           } catch (error) {
               console.error("Failed to check invoices for lease:", error);
           }
       }
    };
    checkInvoices();
  }, [mode, initialData?.id, isOpen]);

  // Called when validation fails
  const onInvalid = (formErrors: any) => {
    const getErrorMessages = (errors: any, prefix = ""): string[] => {
      const msgs: string[] = [];
      Object.keys(errors).forEach((key) => {
        const value = errors[key];
        const currentPath = prefix ? `${prefix}.${key}` : key;
        if (value?.message) {
          // it's a field error
          msgs.push(`${currentPath}: ${value.message}`);
        } else if (typeof value === "object" && value !== null) {
          msgs.push(...getErrorMessages(value, currentPath));
        }
      });
      return msgs;
    };

    const errorMessages = getErrorMessages(formErrors);
    if (errorMessages.length > 0) {
      toast.error(`Please fill required fields: ${errorMessages.join(", ")}`);
    } else {
      toast.error("Please fill all required fields.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen rounded-none m-0 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            {mode === "create"
              ? "Create New Lease Agreement"
              : mode === "renew"
              ? "Renew Lease Agreement" 
              : "Edit Lease Agreement"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "create"
              ? "Fill in the details to create a new lease agreement following UAE standards"
              : mode === "renew"
              ? "Create a new lease based on the existing lease details"
              : "Update the lease agreement details"}
          </p>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onFormSubmit, onInvalid)}
          className="flex-1 flex flex-col min-h-0"
        >
          <ScrollArea className="flex-1">
            <div className=" p-6 space-y-6">
          {/* Global File Input - Always rendered */}
          <input
            id="document-upload-input"
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
          />

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
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
                      <Label htmlFor="leaseNumber">Lease Number</Label>
                      <Input
                        id="leaseNumber"
                        {...register("leaseNumber")}
                        placeholder="Auto-generating..."
                        className={errors.leaseNumber ? "border-red-500" : ""}
                        readOnly
                        disabled
                      />
                      {errors.leaseNumber && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.leaseNumber.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="leaseType">Lease Type *</Label>
                      <Select
                        value={watchedValues.leaseType}
                        onValueChange={(value) => {
                          setValue("leaseType", value as any, {
                            shouldValidate: true,
                            shouldDirty: true
                          });
                          
                          // Auto-set tax status based on lease type (User interaction only)
                          if (value !== "residential") {
                            setIsRentalTaxable(true);
                            setValue("isRentalTaxable", true);
                          } else {
                            setIsRentalTaxable(false);
                            setValue("isRentalTaxable", false);
                          }
                        }}
                      >
                        <SelectTrigger
                          className={errors.leaseType ? "border-red-500" : ""}
                        >
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
                        <p className="text-sm text-red-500 mt-1">
                          {errors.leaseType.message}
                        </p>
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
                        className={
                          errors.leaseDetails?.startDate ? "border-red-500" : ""
                        }
                      />
                      {errors.leaseDetails?.startDate && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.leaseDetails.startDate.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        {...register("leaseDetails.endDate")}
                        className={
                          errors.leaseDetails?.endDate ? "border-red-500" : ""
                        }
                      />
                      {errors.leaseDetails?.endDate && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.leaseDetails.endDate.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration (Months) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        {...register("leaseDetails.duration", {
                          valueAsNumber: true,
                        })}
                        className={
                          errors.leaseDetails?.duration ? "border-red-500" : ""
                        }
                        onChange={(e) => {
                          setValue(
                            "leaseDetails.duration",
                            parseInt(e.target.value) || 0,
                          );
                          calculateDerivedValues();
                        }}
                      />
                      {errors.leaseDetails?.duration && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.leaseDetails.duration.message}
                        </p>
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
                    <SearchableSelect
                      value={watchedValues.tenantId || ""}
                      onValueChange={(value) => {
                        const selectedTenant = tenants.find(
                          (t) => t.id.toString() === value,
                        );
                        if (selectedTenant) {
                          setValue("tenantId", value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          setValue("tenant", {
                            name: selectedTenant.name || "",
                            email: selectedTenant.email || "",
                            phone: selectedTenant.phone || "",
                            emiratesId: selectedTenant.emiratesId || "",
                            nationality: selectedTenant.nationality || "",
                            passportNumber: selectedTenant.passportNumber || "",
                            visaNumber: selectedTenant.visaNumber || "",
                            visaExpiry: selectedTenant.visaExpiry || "",
                            emergencyContact: {
                              name: selectedTenant.emergencyName || "",
                              phone: selectedTenant.emergencyContact || "",
                              relation: selectedTenant.emergencyRelation || "",
                            },
                          });
                          clearErrors("tenant");
                          clearErrors("tenantId");
                        }
                      }}
                      disabled={loadingData}
                      placeholder={loadingData ? "Loading tenants..." : "Choose an existing tenant"}
                      searchPlaceholder="Search tenants..."
                      emptyMessage="No tenants found. Please add a tenant first."
                      className={errors.tenantId ? "border-red-500" : ""}
                      options={tenants.map((tenant) => ({
                        value: tenant.id.toString(),
                        label: tenant.name,
                        description: tenant.email,
                      }))}
                    />
                    {errors.tenantId && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.tenantId.message}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Selected Tenant Details Display */}
                  {watchedValues.tenantId && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Selected Tenant Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">
                            {watchedValues.tenant.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">
                            {watchedValues.tenant.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">
                            {watchedValues.tenant.phone}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Nationality
                          </p>
                          <p className="font-medium">
                            {watchedValues.tenant.nationality}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Emirates ID
                          </p>
                          <p className="font-medium">
                            {watchedValues.tenant.emiratesId}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Address
                          </p>
                          <p className="font-medium">
                            {
                              tenants.find(
                                (t) =>
                                  t.id.toString() === watchedValues.tenantId,
                              )?.address
                            }
                          </p>
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
                          setValue("tenantId", "");
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
                            className={
                              errors.tenant?.name ? "border-red-500" : ""
                            }
                          />
                          {errors.tenant?.name && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.tenant.name.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="tenantEmail">Email Address *</Label>
                          <Input
                            id="tenantEmail"
                            type="email"
                            {...register("tenant.email")}
                            placeholder="tenant@email.com"
                            className={
                              errors.tenant?.email ? "border-red-500" : ""
                            }
                          />
                          {errors.tenant?.email && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.tenant.email.message}
                            </p>
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
                            className={
                              errors.tenant?.phone ? "border-red-500" : ""
                            }
                          />
                          {errors.tenant?.phone && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.tenant.phone.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="tenantNationality">
                            Nationality *
                          </Label>
                          <Select
                            value={watchedValues.tenant?.nationality}
                            onValueChange={(value) =>
                              setValue("tenant.nationality", value)
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.tenant?.nationality
                                  ? "border-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select nationality" />
                            </SelectTrigger>
                            <SelectContent>
                              {nationalities.map((nationality) => (
                                <SelectItem
                                  key={nationality}
                                  value={nationality}
                                >
                                  {nationality}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.tenant?.nationality && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.tenant.nationality.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="emiratesId">Emirates ID</Label>
                          <Input
                            id="emiratesId"
                            {...register("tenant.emiratesId")}
                            placeholder="784-1985-1234567-8"
                            className={
                              errors.tenant?.emiratesId ? "border-red-500" : ""
                            }
                          />
                          {errors.tenant?.emiratesId && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.tenant.emiratesId.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="passportNumber">
                            Passport Number *
                          </Label>
                          <Input
                            id="passportNumber"
                            {...register("tenant.passportNumber")}
                            placeholder="A1234567"
                            className={
                              errors.tenant?.passportNumber
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {errors.tenant?.passportNumber && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.tenant.passportNumber.message}
                            </p>
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
                            className={
                              errors.tenant?.visaNumber ? "border-red-500" : ""
                            }
                          />
                          {errors.tenant?.visaNumber && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.tenant.visaNumber.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="visaExpiry">Visa Expiry Date *</Label>
                          <Input
                            id="visaExpiry"
                            type="date"
                            {...register("tenant.visaExpiry")}
                            className={
                              errors.tenant?.visaExpiry ? "border-red-500" : ""
                            }
                          />
                          {errors.tenant?.visaExpiry && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.tenant.visaExpiry.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-semibold mb-4">
                          Emergency Contact
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="emergencyName">
                              Contact Name *
                            </Label>
                            <Input
                              id="emergencyName"
                              {...register("tenant.emergencyContact.name")}
                              placeholder="Emergency contact name"
                              className={
                                errors.tenant?.emergencyContact?.name
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                            {errors.tenant?.emergencyContact?.name && (
                              <p className="text-sm text-red-500 mt-1">
                                {errors.tenant.emergencyContact.name.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="emergencyPhone">
                              Contact Phone *
                            </Label>
                            <Input
                              id="emergencyPhone"
                              {...register("tenant.emergencyContact.phone")}
                              placeholder="+971 50 987 6543"
                              className={
                                errors.tenant?.emergencyContact?.phone
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                            {errors.tenant?.emergencyContact?.phone && (
                              <p className="text-sm text-red-500 mt-1">
                                {errors.tenant.emergencyContact.phone.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="emergencyRelation">
                              Relation *
                            </Label>
                            <Input
                              id="emergencyRelation"
                              {...register("tenant.emergencyContact.relation")}
                              placeholder="Spouse, Father, etc."
                              className={
                                errors.tenant?.emergencyContact?.relation
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                            {errors.tenant?.emergencyContact?.relation && (
                              <p className="text-sm text-red-500 mt-1">
                                {
                                  errors.tenant.emergencyContact.relation
                                    .message
                                }
                              </p>
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
                    Select an existing property and unit or add new property
                    details
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Property Selection */}
                  <div>
                    <Label htmlFor="propertySelect">Select Property</Label>
                    <SearchableSelect
                      value={watchedValues.property?.id || ""}
                      onValueChange={(value) => {
                        const property = properties.find(
                          (p) => p.id.toString() === value,
                        );
                        if (property) {
                          setSelectedProperty(property);
                          setAvailableUnits(property.units);
                          setSelectedUnit(null);
                          setValue("property.name", property.name);
                          setValue("property.id", String(property.id));
                          setValue("property.address", property.address);
                          const rawType = (property.buildingType || property.type || "residential").toLowerCase();
                          // Map building types to lease types if necessary
                          let leaseType = rawType;
                          if (['apartment', 'villa', 'penthouse', 'townhouse', 'studio', 'duplex'].includes(rawType)) {
                              leaseType = 'residential';
                          } else if (['office', 'warehouse', 'shop'].includes(rawType)) {
                              leaseType = 'commercial';
                          }
                          
                          setValue("property.type", leaseType as any);
                          setValue("property.area", property.area);
                          setValue("property.bedrooms", property.bedrooms);
                          setValue("property.bathrooms", property.bathrooms);
                          setValue("property.parking", property.parking);
                        }
                      }}
                      disabled={mode === "edit" || loadingData}
                      placeholder={loadingData ? "Loading properties..." : "Choose an existing property"}
                      searchPlaceholder="Search properties..."
                      emptyMessage="No properties found. Please add a property first."
                      className={errors.property?.name ? "border-red-500" : ""}
                      options={properties.map((property) => ({
                        value: property.id.toString(),
                        label: property.name,
                        description: property.address,
                      }))}
                    />
                    {errors.property?.name && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.property.name.message}
                      </p>
                    )}
                  </div>

                  {/* Unit Selection */}
                  {selectedProperty && (
                    <div>
                      <Label htmlFor="unitSelect">Select Unit</Label>
                      <SearchableSelect
                        value={watchedValues.unitId || ""}
                        onValueChange={(unitId) => {
                          setValue("unitId", unitId);

                          // Find selected unit data (you probably already do something similar)
                          const foundUnit = availableUnits.find(
                            (u) => String(u.id) === unitId,
                          );
                          if (foundUnit) {
                            setSelectedUnit(foundUnit);

                            // Update property/unit related fields (you probably have some of these already)
                            setValue(
                              "property.unit",
                              foundUnit.unit || foundUnit.unitNumber || "",
                            );
                            setValue(
                              "property.area",
                              Number(foundUnit.area) || 0,
                            );
                            setValue(
                              "property.bedrooms",
                              Number(foundUnit.bedrooms) || 0,
                            );
                            setValue(
                              "property.bathrooms",
                              Number(foundUnit.bathrooms) || 0,
                            );
                            setValue(
                              "property.parking",
                              Number(foundUnit.parking || foundUnit.parkingSpaces) || 0,
                            );
                            setValue(
                              "leaseDetails.monthlyRent",
                              Number(
                                foundUnit.monthlyRent || foundUnit.rentAmount,
                              ) || 0,
                            );
                            loadUnitServices(unitId);
                          }
                        }}
                        disabled={mode === "edit"}
                        placeholder="Choose a unit"
                        searchPlaceholder="Search units..."
                        emptyMessage="No units available"
                        className={errors.unitId ? "border-red-500" : ""}
                        options={availableUnits
                          .filter((unit) => (unit.status || 'available').toLowerCase() !== 'occupied')
                          .map((unit) => ({
                            value: unit.id.toString(),
                            label: unit.unit,
                            description: `${unit.area} sq ft • ${unit.bedrooms} bed • ${unit.bathrooms} bath • AED ${unit.monthlyRent?.toLocaleString()}/month`,
                          }))}
                      />
                      {errors.unitId && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.unitId.message}
                        </p>
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
                          <p className="text-sm text-muted-foreground">
                            Property
                          </p>
                          <p className="font-medium">{selectedProperty.title || selectedProperty.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedProperty.address || selectedProperty.location}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Unit</p>
                          <p className="font-medium">{selectedUnit.unit}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedUnit.area} sq ft • {selectedUnit.bedrooms}{" "}
                            bed • {selectedUnit.bathrooms} bath
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Monthly Rent
                          </p>
                          <p className="font-bold text-lg text-primary">
                            AED {(selectedUnit.monthlyRent || selectedUnit.rentAmount || selectedUnit.rent || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Parking
                          </p>
                          <p className="font-medium">
                            {selectedUnit.parking || selectedUnit.parkingSpaces || 0} space(s)
                          </p>

                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Manual Entry Option */}
                  <div>
                    {mode === "create" && <div className="flex items-center gap-2 mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Clear property and unit selection to allow manual entry
                          setSelectedProperty(null);
                          setAvailableUnits([]);
                          setSelectedUnit(null);
                          setValue("unitId", "");
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
                    </div>}

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="propertyName">Property Name *</Label>
                          <Input
                            id="propertyName"
                            {...register("property.name")}
                            placeholder="Marina Heights Tower"
                            className={
                              errors.property?.name ? "border-red-500" : ""
                            }
                          />
                          {errors.property?.name && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.property.name.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="propertyUnit">Unit Number *</Label>
                          <Input
                            id="propertyUnit"
                            {...register("property.unit")}
                            placeholder="Unit 305"
                            className={
                              errors.property?.unit ? "border-red-500" : ""
                            }
                            disabled={!!watchedValues.unitId}
                          />
                          {errors.property?.unit && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.property.unit.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="propertyAddress">
                          Property Address *
                        </Label>
                        <Textarea
                          id="propertyAddress"
                          {...register("property.address")}
                          placeholder="Marina Walk, Dubai Marina, Dubai, UAE"
                          rows={2}
                          className={
                            errors.property?.address ? "border-red-500" : ""
                          }
                        />
                        {errors.property?.address && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.property.address.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="propertyType">Property Type *</Label>
                          <Select
                            value={watchedValues.property.type}
                            onValueChange={(value) =>
                              setValue("property.type", value as any)
                            }
                          >
                            <SelectTrigger
                              className={
                                errors.property?.type ? "border-red-500" : ""
                              }
                            >
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
                            <p className="text-sm text-red-500 mt-1">
                              {errors.property.type.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="propertyArea">Area (sq ft) *</Label>
                          <Input
                            id="propertyArea"
                            type="number"
                            {...register("property.area", {
                              valueAsNumber: true,
                            })}
                            placeholder="1200"
                            className={
                              errors.property?.area ? "border-red-500" : ""
                            }
                          />
                          {errors.property?.area && (
                            <p className="text-sm text-red-500 mt-1">
                              {errors.property.area.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="bedrooms">Bedrooms</Label>
                          <Input
                            id="bedrooms"
                            type="number"
                            {...register("property.bedrooms", {
                              valueAsNumber: true,
                            })}
                            placeholder="2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="bathrooms">Bathrooms</Label>
                          <Input
                            id="bathrooms"
                            type="number"
                            {...register("property.bathrooms", {
                              valueAsNumber: true,
                            })}
                            placeholder="2"
                          />
                        </div>

                        <div>
                          <Label htmlFor="parking">Parking Spaces</Label>
                          <Input
                            id="parking"
                            type="number"
                            {...register("property.parking", {
                              valueAsNumber: true,
                            })}
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
              {hasInvoices && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-center gap-2 mb-4">
                      <Lock className="h-4 w-4" />
                      <p className="text-sm font-medium">Financial details are locked because this lease has generated invoices.</p>
                  </div>
              )}
              {/* Section 1: Rental Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Rental Details
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Base rental amount and payment configuration
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="monthlyRent">Monthly Rent (AED) *</Label>
                      <Input
                        id="monthlyRent"
                        type="number"
                        {...register("leaseDetails.monthlyRent", {
                          valueAsNumber: true,
                        })}
                        placeholder="85000"
                        className={
                          errors.leaseDetails?.monthlyRent
                            ? "border-red-500"
                            : ""
                        }
                        disabled={hasInvoices}
                        onChange={(e) => {
                          setValue(
                            "leaseDetails.monthlyRent",
                            parseInt(e.target.value) || 0,
                          );
                          setValue("leaseDetails.securityDeposit", rent);
                          calculateDerivedValues();
                        }}
                      />
                      {errors.leaseDetails?.monthlyRent && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.leaseDetails.monthlyRent.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="annualRent">Annual Rent (AED)</Label>
                      <Input
                        id="annualRent"
                        type="number"
                        value={
                          (watchedValues.leaseDetails?.monthlyRent || 0) * 12
                        }
                        disabled
                        className="bg-muted font-semibold"
                      />
                    </div>
                  </div>

                  {/* Rental Tax Checkbox */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <div className="flex items-center space-x-2 p-4 border rounded-lg">
                        <Checkbox
                          id="rentalTaxable"
                          checked={isRentalTaxable}
                          onCheckedChange={(checked) => {
                            const val = !!checked;
                            setIsRentalTaxable(val);
                            setValue("isRentalTaxable", val, { shouldDirty: true });
                          }}
                        />
                        <Label
                          htmlFor="rentalTaxable"
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <span>Taxable Rental (5% VAT)</span>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {watchedValues.leaseType === "residential"
                          ? "Residential leases are typically not subject to VAT in UAE"
                          : "Commercial properties are subject to 5% VAT on rental"}
                      </p>
                    </div>
                  </div>

                  {/* Rental Tax Breakdown - Inline Display */}
                  {isRentalTaxable &&
                    watchedValues.leaseDetails?.monthlyRent > 0 && (
                      <div className="col-span-2">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="font-semibold text-blue-900 mb-3">
                            Rental Tax Breakdown
                          </h5>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700">
                                Monthly Rent (Base):
                              </span>
                              <span className="font-medium">
                                AED{" "}
                                {(
                                  watchedValues.leaseDetails.monthlyRent || 0
                                ).toLocaleString("en-AE", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700">VAT (5%):</span>
                              <span className="font-medium">
                                AED{" "}
                                {(
                                  (watchedValues.leaseDetails.monthlyRent ||
                                    0) * 0.05
                                ).toLocaleString("en-AE", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-blue-300">
                              <span className="font-semibold text-blue-900">
                                Total Monthly (Incl. VAT):
                              </span>
                              <span className="font-bold text-blue-900">
                                AED{" "}
                                {(
                                  (watchedValues.leaseDetails.monthlyRent ||
                                    0) * 1.05
                                ).toLocaleString("en-AE", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm pt-2">
                              <span className="text-blue-700">
                                Annual Total (Incl. VAT):
                              </span>
                              <span className="font-medium">
                                AED{" "}
                                {(
                                  (watchedValues.leaseDetails.monthlyRent ||
                                    0) *
                                  12 *
                                  1.05
                                ).toLocaleString("en-AE", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms *</Label>
                      <Select
                        value={watchedValues.leaseDetails?.paymentTerms}
                        onValueChange={(value) =>
                          setValue("leaseDetails.paymentTerms", value as any)
                        }
                        disabled={hasInvoices}
                      >
                        <SelectTrigger
                          className={
                            errors.leaseDetails?.paymentTerms
                              ? "border-red-500"
                              : ""
                          }
                        >
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
                        <p className="text-sm text-red-500 mt-1">
                          {errors.leaseDetails.paymentTerms.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
                      <Input
                        id="gracePeriod"
                        type="number"
                        {...register("leaseDetails.gracePeriod", {
                          valueAsNumber: true,
                        })}
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
                        {...register("leaseDetails.lateFee", {
                          valueAsNumber: true,
                        })}
                        placeholder="500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="terminationNotice">
                        Termination Notice (Days)
                      </Label>
                      <Input
                        id="terminationNotice"
                        type="number"
                        {...register("leaseDetails.terminationNotice", {
                          valueAsNumber: true,
                        })}
                        placeholder="60"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pdcStartDate">PDC Start Date</Label>
                      <Input
                        id="pdcStartDate"
                        type="date"
                        value={pdcStartDate}
                        onChange={(e) => setPdcStartDate(e.target.value)}
                        placeholder="When should first PDC be due?"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to use lease start date
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Services & Additional Charges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-5 w-5" />
                      Services & Additional Charges
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={() => setShowTemplatePicker(true)}
                        disabled={hasInvoices}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Select from Templates
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addCustomService}
                        disabled={hasInvoices}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Custom
                      </Button>
                    </div>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Additional charges like security deposit, agency fee, agency
                    fee, DEWA deposit, etc.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Banknote className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No services added yet</p>
                      <p className="text-sm">
                        Add services for security deposit, agency fees, and
                        other charges
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {services.map((service, index) => (
                        <Card key={index} className="p-4 bg-muted/30">
                          <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-3">
                              <Label>Service Name</Label>
                              <Input
                                value={service.name}
                                onChange={(e) => {
                                  const updated = [...services];
                                  updated[index].name = e.target.value;
                                  setServices(updated);
                                }}
                                placeholder="e.g., Security Deposit"
                                disabled={hasInvoices}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Amount (AED)</Label>
                              <Input
                                type="number"
                                value={service.amount}
                                onChange={(e) => {
                                  const updated = [...services];
                                  updated[index].amount =
                                    parseFloat(e.target.value) || 0;
                                  setServices(updated);
                                }}
                                placeholder="0.00"
                                disabled={hasInvoices}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Billing</Label>
                              <Select
                                value={service.billingMethod}
                                onValueChange={(
                                  value:
                                    | "included_in_rental"
                                    | "charged_separately",
                                ) => {
                                  const updated = [...services];
                                  updated[index].billingMethod = value;
                                  setServices(updated);
                                }}
                                disabled={hasInvoices}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="included_in_rental">
                                    Included
                                  </SelectItem>
                                  <SelectItem value="charged_separately">
                                    Separate
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label>Tax ({taxRate}%)</Label>
                              <Input
                                type="number"
                                value={
                                  service.isTaxable
                                    ? (
                                        (Number(service.amount) * taxRate) /
                                        100
                                      ).toFixed(2)
                                    : "0.00"
                                }
                                disabled
                                className="bg-muted"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Total</Label>
                              <Input
                                type="number"
                                value={
                                  service.isTaxable
                                    ? (
                                        Number(service.amount) *
                                        (1 + taxRate / 100)
                                      ).toFixed(2)
                                    : Number(service.amount).toFixed(2)
                                }
                                disabled
                                className="bg-muted font-semibold"
                              />
                            </div>
                            <div className="col-span-1 flex items-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setServices(
                                    services.filter((_, i) => i !== index),
                                  );
                                }}
                                disabled={hasInvoices}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-12 gap-3 mt-3">
                            <div className="col-span-3 flex items-center space-x-2">
                              <Checkbox
                                id={`taxable-${index}`}
                                checked={service.isTaxable}
                                onCheckedChange={(checked) => {
                                  const updated = [...services];
                                  updated[index].isTaxable = checked as boolean;
                                  setServices(updated);
                                }}
                                disabled={hasInvoices}
                              />
                              <label
                                htmlFor={`taxable-${index}`}
                                className="text-sm font-medium"
                              >
                                Taxable ({taxRate}% VAT)
                              </label>
                            </div>
                            {/* Removed "Include in PDC" checkbox - logic driven by billing method */}
                            <div className="col-span-6">
                              <Input
                                value={service.description || ""}
                                onChange={(e) => {
                                  const updated = [...services];
                                  updated[index].description = e.target.value;
                                  setServices(updated);
                                }}
                                placeholder="Optional description"
                                disabled={hasInvoices}
                              />
                            </div>
                          </div>
                        </Card>
                      ))}

                      {/* Tax Summary Card - Shows ALL taxes */}
                      {(isRentalTaxable ||
                        services.some((s) => s.isTaxable)) && (
                        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Receipt className="h-5 w-5 text-indigo-600" />
                              Tax Summary (5% UAE VAT)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {/* Rental Tax */}
                              {isRentalTaxable &&
                                watchedValues.leaseDetails?.monthlyRent > 0 && (
                                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                    <div>
                                      <p className="font-medium">
                                        Rental VAT (Monthly)
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Base: AED{" "}
                                        {(
                                          watchedValues.leaseDetails
                                            .monthlyRent || 0
                                        ).toLocaleString()}
                                      </p>
                                    </div>
                                    <p className="text-lg font-bold text-indigo-600">
                                      AED{" "}
                                      {(
                                        (watchedValues.leaseDetails
                                          .monthlyRent || 0) * 0.05
                                      ).toLocaleString("en-AE", {
                                        minimumFractionDigits: 2,
                                      })}
                                    </p>
                                  </div>
                                )}

                              {/* Services Tax */}
                              {services.some((s) => s.isTaxable) && (
                                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                  <div>
                                    <p className="font-medium">Services VAT</p>
                                    <p className="text-sm text-muted-foreground">
                                      {
                                        services.filter((s) => s.isTaxable)
                                          .length
                                      }{" "}
                                      taxable service(s)
                                    </p>
                                  </div>
                                  <p className="text-lg font-bold text-indigo-600">
                                    AED{" "}
                                    {services
                                      .reduce(
                                        (sum, s) =>
                                          sum +
                                          (s.isTaxable
                                            ? (Number(s.amount) * taxRate) / 100
                                            : 0),
                                        0,
                                      )
                                      .toLocaleString("en-AE", {
                                        minimumFractionDigits: 2,
                                      })}
                                  </p>
                                </div>
                              )}

                              {/* Total Tax */}
                              <div className="flex justify-between items-center p-3 bg-indigo-100 rounded-lg border-2 border-indigo-300">
                                <p className="font-bold text-indigo-900">
                                  Total VAT (Annual)
                                </p>
                                <p className="text-xl font-bold text-indigo-900">
                                  AED{" "}
                                  {(
                                    (isRentalTaxable
                                      ? (watchedValues.leaseDetails
                                          ?.monthlyRent || 0) *
                                        12 *
                                        0.05
                                      : 0) +
                                    services.reduce(
                                      (sum, s) =>
                                        sum +
                                        (s.isTaxable
                                          ? (Number(s.amount) * taxRate) / 100
                                          : 0),
                                      0,
                                    )
                                  ).toLocaleString("en-AE", {
                                    minimumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {services.length > 0 && (
                        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">
                                  Total Services
                                </p>
                                <p className="text-lg font-semibold">
                                  AED{" "}
                                  {services
                                    .reduce(
                                      (sum, s) => sum + Number(s.amount),
                                      0,
                                    )
                                    .toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Total Tax
                                </p>
                                <p className="text-lg font-semibold">
                                  AED{" "}
                                  {services
                                    .reduce(
                                      (sum, s) =>
                                        sum +
                                        (s.isTaxable
                                          ? (Number(s.amount) * taxRate) / 100
                                          : 0),
                                      0,
                                    )
                                    .toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Services Total
                                </p>
                                <p className="text-lg font-semibold">
                                  AED{" "}
                                  {services
                                    .reduce(
                                      (sum, s) =>
                                        sum +
                                        (s.isTaxable
                                          ? Number(s.amount) *
                                            (1 + taxRate / 100)
                                          : Number(s.amount)),
                                      0,
                                    )
                                    .toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Grand Total (Annual)
                                </p>
                                <p className="text-lg font-semibold text-primary">
                                  AED{" "}
                                  {
                                    // Annual rent with tax
                                    (
                                      (watchedValues.leaseDetails
                                        ?.monthlyRent || 0) *
                                        12 *
                                        (isRentalTaxable ? 1.05 : 1) +
                                      // Services total
                                      services.reduce(
                                        (sum, s) =>
                                          sum +
                                          (s.isTaxable
                                            ? Number(s.amount) *
                                              (1 + taxRate / 100)
                                            : Number(s.amount)),
                                        0,
                                      )
                                    ).toLocaleString("en-AE", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })
                                  }
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
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
                      className={
                        errors.leaseDetails?.renewalTerms
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {errors.leaseDetails?.renewalTerms && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.leaseDetails.renewalTerms.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Special Terms and Conditions</Label>
                    <div className="space-y-3">
                      {specialTermsOptions.map((term, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`term-${index}`}
                            onCheckedChange={(checked) => {
                              const currentTerms =
                                watchedValues.specialTerms || [];
                              if (checked) {
                                setValue("specialTerms", [
                                  ...currentTerms,
                                  term,
                                ]);
                              } else {
                                setValue(
                                  "specialTerms",
                                  currentTerms.filter((t) => t !== term),
                                );
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
                          onKeyPress={(e) =>
                            e.key === "Enter" && addCustomTerm()
                          }
                        />
                        <Button type="button" onClick={addCustomTerm} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Use watch to render terms directly from form state */}
                      {(watchedValues.specialTerms || []).map((term: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-muted p-2 rounded"
                        >
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
              {hasInvoices && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex items-center gap-2 mb-4">
                      <Lock className="h-4 w-4" />
                      <p className="text-sm font-medium">PDC Schedule is locked because invoices have been generated.</p>
                  </div>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Post Dated Cheques (PDC) Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage post dated cheques for rent payments as per UAE real
                    estate standards
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Auto-Generate PDC Button */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-blue-900">
                          Auto-Generate PDC Schedule
                        </h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Generate cheque schedule automatically based on
                          payment terms and lease duration
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={generatePDCSchedule}
                        disabled={hasInvoices}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate Schedule
                      </Button>
                    </div>
                  </div>

                  {/* PDC Schedule */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold">PDC Schedule</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddPDC}
                        disabled={hasInvoices}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add PDC
                      </Button>
                    </div>

                    {/* PDC Summary */}
                    {pdcSchedule.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-blue-700">
                            Total PDC Entries
                          </p>
                          <p className="text-2xl font-bold text-blue-900">
                            {pdcSchedule.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700">Total Amount</p>
                          <p className="text-2xl font-bold text-blue-900">
                            AED{" "}
                            {pdcSchedule
                              .reduce((sum, p) => sum + Number(p.amount), 0)
                              .toLocaleString("en-AE", {
                                minimumFractionDigits: 2,
                              })}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {pdcSchedule.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                          <FileCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                          <p className="text-muted-foreground">
                            No PDC entries yet
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Generate schedule automatically or add PDCs manually
                          </p>
                        </div>
                      ) : (
                        pdcSchedule.map((pdc, index) => (
                          <div
                            key={pdc.id}
                            className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg hover:bg-muted/30 transition"
                          >
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Cheque #{index + 1}
                              </p>
                              <p className="font-medium">
                                AED{" "}
                                {Number(pdc.amount).toLocaleString("en-AE", {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Due Date
                              </p>
                              <p className="font-medium">
                                {new Date(pdc.dueDate).toLocaleDateString(
                                  "en-GB",
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Status
                              </p>
                              <Badge className={getStatusColor(pdc.status)}>
                                {pdc.status.charAt(0).toUpperCase() +
                                  pdc.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPDC(pdc)}
                                disabled={hasInvoices}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletePDC(pdc.id)}
                                disabled={hasInvoices}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* PDC Terms */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">
                      PDC Terms & Conditions
                    </h4>
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
                            AED 500 penalty for bounced cheques plus bank
                            charges
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Replacement Policy</p>
                          <p className="text-sm text-muted-foreground">
                            PDCs can be replaced with 7 days notice and valid
                            reason
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
                          <p className="text-sm text-muted-foreground">
                            Required for all residential and commercial leases
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={watchedValues.compliance?.ejariRequired}
                        onCheckedChange={(checked) =>
                          setValue("compliance.ejariRequired", !!checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium">DEWA Connection</p>
                          <p className="text-sm text-muted-foreground">
                            Electricity and water connection required
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={watchedValues.compliance?.dewaConnection}
                        onCheckedChange={(checked) =>
                          setValue("compliance.dewaConnection", !!checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">
                            Municipality Registration
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Required for property registration
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={
                          watchedValues.compliance?.municipalityRegistration
                        }
                        onCheckedChange={(checked) =>
                          setValue(
                            "compliance.municipalityRegistration",
                            !!checked,
                          )
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <ShieldIcon className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Insurance Policy</p>
                          <p className="text-sm text-muted-foreground">
                            Property insurance required
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={watchedValues.compliance?.insuranceRequired}
                        onCheckedChange={(checked) =>
                          setValue("compliance.insuranceRequired", !!checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium">Fire Safety Certificate</p>
                          <p className="text-sm text-muted-foreground">
                            Required for commercial properties
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={
                          watchedValues.compliance?.fireSafetyCertificate
                        }
                        onCheckedChange={(checked) =>
                          setValue(
                            "compliance.fireSafetyCertificate",
                            !!checked,
                          )
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium">Maintenance Certificate</p>
                          <p className="text-sm text-muted-foreground">
                            Building maintenance compliance
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={
                          watchedValues.compliance?.maintenanceCertificate
                        }
                        onCheckedChange={(checked) =>
                          setValue(
                            "compliance.maintenanceCertificate",
                            !!checked,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">
                          UAE Compliance Notice
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          All lease agreements must comply with UAE federal laws
                          and local regulations. Ensure all required documents
                          and certificates are obtained before lease execution.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </TabsContent>
          </Tabs>

          {/* Additional Documents - Global Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Attached Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Existing Attachments Preview */}
                    {watchedValues.attachments && watchedValues.attachments.length > 0 && (
                        <div className="space-y-2">
                            <Label>Existing Documents</Label>
                            {watchedValues.attachments.map((doc: string, index: number) => {
                                const fileName = doc.split('/').pop() || `Document ${index + 1}`;
                                return (
                                  <div key={`existing-${index}`} className="flex items-center justify-between p-3 border rounded bg-muted/20">
                                      <div className="flex items-center gap-3">
                                          <FileCheck className="h-4 w-4 text-green-600" />
                                          <div>
                                              <p className="text-sm font-medium">{fileName}</p>
                                              <p className="text-xs text-muted-foreground">Stored on server</p>
                                          </div>
                                      </div>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => {
                                           const current = getValues("attachments") || [];
                                           setValue("attachments", current.filter((_, i) => i !== index), { shouldDirty: true });
                                        }}
                                      >
                                          <X className="h-4 w-4 text-red-500" />
                                      </Button>
                                  </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                            <Label>Selected Documents to Upload</Label>
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded bg-muted/20">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-blue-600" />
                                        <div>
                                            <p className="text-sm font-medium">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                                        <X className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Button to add files */}
                      <label 
                        htmlFor="document-upload-input" 
                        className="w-full border-dashed border-2 py-8 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Upload className="h-6 w-6 mb-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to attach documents (PDF, JPG, PNG)</span>
                      </label>
                  </div>
              </div>
            </CardContent>
          </Card>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            id="document-upload-input"
            style={{ 
              position: 'absolute', 
              width: '1px', 
              height: '1px', 
              padding: 0, 
              margin: '-1px', 
              overflow: 'hidden', 
              clip: 'rect(0, 0, 0, 0)', 
              whiteSpace: 'nowrap', 
              borderWidth: 0,
              opacity: 0.1 // Keeping tiny opacity just to ensure browser renders interaction
            }}
            multiple
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />

            </div>
          </ScrollArea>

          {/* Form Actions - Fixed at bottom */}
          <div className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="outline" className="hidden md:flex">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <label 
                htmlFor="document-upload-input" 
                className="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </label>
              <Button onClick={handleSubmit(onSubmitForm, onError)} className="bg-gradient-primary shadow-glow min-w-[140px]" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {mode === "create" ? "Create Lease" : "Update Lease"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Service Template Picker */}
      <ServiceTemplatePicker
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelect={handleTemplateSelect}
      />

      {/* PDC Dialog */}
      <PDCDialog
        isOpen={showPDCDialog}
        onClose={() => setShowPDCDialog(false)}
        onSubmit={handlePDCSubmit}
        initialData={editingPDC}
        mode={pdcDialogMode}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={confirmOptions?.title || ""}
        description={confirmOptions?.description || ""}
        confirmText={confirmOptions?.confirmText}
        cancelText={confirmOptions?.cancelText}
        variant={confirmOptions?.variant}
      />
    </Dialog>
  );
}
