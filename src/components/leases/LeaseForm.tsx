import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { tenantsAPI, propertiesAPI, unitsAPI, settingsAPI, servicesAPI } from "@/services/api";
import type { Service } from "@/types/service";
import type { ServiceTemplate } from "@/types/serviceTemplate";
import ServiceTemplatePicker from "@/components/common/ServiceTemplatePicker";
import PDCDialog from "@/components/leases/PDCDialog";
import { toast } from "sonner";
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

export default function LeaseForm({ isOpen, onClose, onSubmit, initialData, mode }: LeaseFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [customTerms, setCustomTerms] = useState<string[]>([]);
  const [newCustomTerm, setNewCustomTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  
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
  const [taxRate, setTaxRate] = useState(5); // UAE VAT rate
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  
  // Rental tax state
  const [isRentalTaxable, setIsRentalTaxable] = useState(false);

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

  // Helper function to parse JSON arrays
  const parseJSON = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Load edit data when modal opens in edit mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && initialData) {
      // Delay for dialog render
      setTimeout(() => {
        // Parse JSON fields
        const parsedDocuments = parseJSON(initialData.documents);
        const parsedSpecialTerms = parseJSON(initialData.specialTerms);
        
        const formData = {
          leaseNumber: initialData.leaseNumber || "",
          leaseType: initialData.leaseType || "residential",
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
              name: initialData.tenant?.emergencyContact?.name || "",
              phone: initialData.tenant?.emergencyContact?.phone || "",
              relation: initialData.tenant?.emergencyContact?.relation || "",
            },
          },
          property: {
            name: initialData.property?.name || "",
            unit: initialData.property?.unit || "",
            address: initialData.property?.address || "",
            type: initialData.property?.type || "residential",
            area: initialData.property?.area || 0,
            bedrooms: initialData.property?.bedrooms || 0,
            bathrooms: initialData.property?.bathrooms || 0,
            parking: initialData.property?.parking || 0,
          },
          leaseDetails: {
            startDate: initialData.leaseDetails?.startDate || initialData.startDate || "",
            endDate: initialData.leaseDetails?.endDate || initialData.endDate || "",
            duration: initialData.leaseDetails?.duration || 12,
            monthlyRent: initialData.leaseDetails?.monthlyRent || initialData.rentAmount || 0,
            annualRent: initialData.leaseDetails?.annualRent || 0,
            securityDeposit: initialData.leaseDetails?.securityDeposit || initialData.depositAmount || 0,
            agencyFee: initialData.leaseDetails?.agencyFee || 0,
            ejariFee: initialData.leaseDetails?.ejariFee || 5000,
            dewaDeposit: initialData.leaseDetails?.dewaDeposit || 0,
            municipalityFee: initialData.leaseDetails?.municipalityFee || 0,
            totalDeposits: initialData.leaseDetails?.totalDeposits || 0,
            paymentTerms: initialData.leaseDetails?.paymentTerms || initialData.paymentFrequency || "monthly",
            gracePeriod: initialData.leaseDetails?.gracePeriod || 5,
            lateFee: initialData.leaseDetails?.lateFee || 0,
            renewalTerms: initialData.leaseDetails?.renewalTerms || "",
            terminationNotice: initialData.leaseDetails?.terminationNotice || 60,
          },
          specialTerms: parsedSpecialTerms,
          compliance: {
            ejariRequired: initialData.compliance?.ejariRequired ?? true,
            dewaConnection: initialData.compliance?.dewaConnection ?? true,
            municipalityRegistration: initialData.compliance?.municipalityRegistration ?? true,
            insuranceRequired: initialData.compliance?.insuranceRequired ?? true,
            fireSafetyCertificate: initialData.compliance?.fireSafetyCertificate ?? true,
            maintenanceCertificate: initialData.compliance?.maintenanceCertificate ?? true,
          },
          notes: initialData.notes || initialData.terms || "",
          attachments: parsedDocuments,
        };

        // Reset form with all values
        form.reset(formData);

        // Update state
        setCustomTerms(parsedSpecialTerms);
        if (initialData.tenant) {
          setSelectedProperty(initialData.property);
        }
        if (initialData.unit || initialData.property?.unit) {
          setSelectedUnit(initialData.unit || initialData.property?.unit);
        }
        
        // Load PDC schedule if exists
        if (initialData.pdcSchedule && Array.isArray(initialData.pdcSchedule)) {
          setPdcSchedule(initialData.pdcSchedule);
        } else {
          setPdcSchedule([]);
        }
        
        // Load PDC start date if exists
        if (initialData.pdcStartDate) {
          setPdcStartDate(initialData.pdcStartDate);
        } else {
          setPdcStartDate("");
        }
        
        // Load rental tax status
        if (initialData.isRentalTaxable !== undefined) {
          setIsRentalTaxable(initialData.isRentalTaxable);
        } else {
          // Default based on lease type
          setIsRentalTaxable(initialData.leaseType !== 'residential');
        }
      }, 150);
    } else if (mode === "create") {
      // Reset form for create mode
      form.reset({
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
          settingsAPI.getAll({ category: 'UAE' }).catch((err) => {
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
        
        const mappedTenants = Array.isArray(fetchedTenants) ? fetchedTenants.map((tenant: any) => ({
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
        })) : [];
        
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
            parking: 1,
            units: propertyUnits.map((unit: any) => ({
              id: unit.id,
              unit: unit.unitNumber || unit.unit_number,
              area: parseFloat(unit.area) || 0,
              bedrooms: unit.bedrooms || 0,
              bathrooms: unit.bathrooms || 0,
              parking: unit.parking ? 1 : 0,
              monthlyRent: parseFloat(unit.rentAmount || unit.rent_amount) || 0,
              status: unit.status
            }))
          };
        });
        
        setProperties(propertiesWithUnits);
        console.log("✅ Fetched properties with units:", propertiesWithUnits.length);
      } catch (error: any) {
        console.error("❌ Failed to fetch lease form data:", error);
        toast.error("Failed to load tenants and properties. Please refresh the page.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Auto-check rental tax based on lease type
  useEffect(() => {
    const leaseType = watchedValues.leaseType;
    if (leaseType && leaseType !== 'residential') {
      setIsRentalTaxable(true);
    } else {
      setIsRentalTaxable(false);
    }
  }, [watchedValues.leaseType]);

  // Calculate derived values based on UAE settings
  const calculateDerivedValues = () => {
    const monthlyRent = watchedValues.leaseDetails?.monthlyRent || 0;
    const annualRent = monthlyRent * 12;
    
    // Use UAE settings for calculations
    const securityDepositMonths = uaeSettings.uae_security_deposit_months || 1;
    const agencyFeePercentage = uaeSettings.uae_agency_fee_percentage || 5;
    const ejariFeeAmount = uaeSettings.uae_ejari_fee || 220;
    const dewaDepositPercentage = uaeSettings.uae_dewa_deposit_percentage || 10;
    const municipalityFeePercentage = uaeSettings.uae_municipality_fee_percentage || 5;
    
    // Calculate based on UAE standards
    const securityDeposit = Math.round(monthlyRent * securityDepositMonths);
    const agencyFee = Math.round(annualRent * (agencyFeePercentage / 100));
    const ejariFee = ejariFeeAmount;
    const dewaDeposit = Math.round(monthlyRent * (dewaDepositPercentage / 100));
    const municipalityFee = Math.round(annualRent * (municipalityFeePercentage / 100));
    const totalDeposits = securityDeposit + agencyFee + ejariFee + dewaDeposit + municipalityFee;

    setValue("leaseDetails.annualRent", annualRent);
    setValue("leaseDetails.securityDeposit", securityDeposit);
    setValue("leaseDetails.agencyFee", agencyFee);
    setValue("leaseDetails.ejariFee", ejariFee);
    setValue("leaseDetails.dewaDeposit", dewaDeposit);
    setValue("leaseDetails.municipalityFee", municipalityFee);
    setValue("leaseDetails.totalDeposits", totalDeposits);
    
    console.log("💰 Calculated financial values:", {
      monthlyRent,
      annualRent,
      securityDeposit,
      agencyFee,
      ejariFee,
      dewaDeposit,
      municipalityFee,
      totalDeposits
    });
  };

  // Handle template selection
  const handleTemplateSelect = (template: ServiceTemplate) => {
    setServices([...services, {
      name: template.name,
      amount: template.defaultAmount,
      isTaxable: template.isTaxable,
      billingMethod: template.billingMethod,
      entityType: 'lease',
      entityId: 0,
      sortOrder: services.length,
      includeInPDC: template.billingMethod === 'included_in_rental',
      description: template.description
    }]);
  };

  // Add custom service (empty)
  const addCustomService = () => {
    setServices([...services, {
      name: '',
      amount: 0,
      isTaxable: false,
      billingMethod: 'charged_separately',
      entityType: 'lease',
      entityId: 0,
      sortOrder: services.length,
      includeInPDC: false
    }]);
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
      if (!confirm(`This will replace ${pdcSchedule.length} existing PDC entries. Continue?`)) {
        return;
      }
    }
    
    // Calculate services to include in PDC
    const servicesToInclude = services.filter(s => s.includeInPDC);
    const servicesTotal = servicesToInclude.reduce((sum, s) => {
      const serviceTotal = s.isTaxable ? Number(s.amount) * (1 + taxRate / 100) : Number(s.amount);
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
    const servicesPerCheque = numberOfCheques > 0 ? servicesTotal / numberOfCheques : 0;
    const amountPerCheque = rentPerCheque + servicesPerCheque;
    
    // Generate simplified PDC entries
    const schedule = [];
    const firstPDCDate = new Date(startDate);
    
    for (let i = 0; i < numberOfCheques; i++) {
      const dueDate = new Date(firstPDCDate);
      dueDate.setMonth(dueDate.getMonth() + (i * monthsPerCheque));
      
      schedule.push({
        id: Date.now() + i, // Unique ID using timestamp
        amount: Math.round(amountPerCheque * 100) / 100, // Round to 2 decimal places
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'pending',
        notes: isRentalTaxable ? 'Includes 5% VAT on rental' : ''
      });
    }
    
    setPdcSchedule(schedule);
    console.log("✅ Generated PDC schedule:", schedule);
    
    if (servicesToInclude.length > 0) {
      toast.success(
        `Generated ${numberOfCheques} PDC entries for ${paymentTerms} payment (includes ${servicesToInclude.length} service(s))`
      );
    } else {
      toast.success(`Generated ${numberOfCheques} PDC entries for ${paymentTerms} payment`);
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

  const handleDeletePDC = (id: number) => {
    if (confirm("Are you sure you want to delete this PDC entry?")) {
      setPdcSchedule(pdcSchedule.filter(p => p.id !== id));
      toast.success("PDC entry deleted");
    }
  };

  const handlePDCSubmit = (pdcData: any) => {
    if (pdcDialogMode === "add") {
      setPdcSchedule([...pdcSchedule, { ...pdcData, id: Date.now() }]);
      toast.success("PDC entry added");
    } else {
      setPdcSchedule(pdcSchedule.map(p => 
        p.id === editingPDC.id ? { ...pdcData, id: editingPDC.id } : p
      ));
      toast.success("PDC entry updated");
    }
    setShowPDCDialog(false);
  };

  // Status badge color helper
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'deposited': return 'bg-purple-100 text-purple-800';
      case 'cleared': return 'bg-green-100 text-green-800';
      case 'bounced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
      services: services, // Include services with lease data
      pdcSchedule: pdcSchedule, // Include PDC schedule
      pdcStartDate: pdcStartDate, // Include PDC start date
      isRentalTaxable: isRentalTaxable // Include rental tax status
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
                          // Store tenant ID at top level for backend
                          setValue("tenantId", selectedTenant.id);
                          // Store full tenant details for display
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
                        <SelectValue placeholder={loadingData ? "Loading tenants..." : "Choose an existing tenant"} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingData ? (
                          <div className="p-4 text-center text-muted-foreground">
                            Loading tenants...
                          </div>
                        ) : tenants.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            No tenants found. Please add a tenant first.
                          </div>
                        ) : (
                          tenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id.toString()}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <div>
                                  <p className="font-medium">{tenant.name}</p>
                                  <p className="text-sm text-muted-foreground">{tenant.email}</p>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
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
                          setValue("property.type", property.buildingType || property.type || "residential");
                          setValue("property.area", property.area);
                          setValue("property.bedrooms", property.bedrooms);
                          setValue("property.bathrooms", property.bathrooms);
                          setValue("property.parking", property.parking);
                        }
                      }}
                    >
                      <SelectTrigger className={errors.property?.name ? "border-red-500" : ""}>
                        <SelectValue placeholder={loadingData ? "Loading properties..." : "Choose an existing property"} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingData ? (
                          <div className="p-4 text-center text-muted-foreground">
                            Loading properties...
                          </div>
                        ) : properties.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            No properties found. Please add a property first.
                          </div>
                        ) : (
                          properties.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <div>
                                  <p className="font-medium">{property.name}</p>
                                  <p className="text-sm text-muted-foreground">{property.address}</p>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
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
                        onValueChange={async (value) => {
                          const unit = availableUnits.find(u => u.id.toString() === value);
                          if (unit) {
                            setSelectedUnit(unit);
                            // Store unit ID for backend
                            setValue("unitId", unit.id);
                            // Auto-fill unit details for display
                            setValue("property.unit", unit.unit);
                            setValue("property.unitId", unit.id);
                            setValue("property.area", unit.area);
                            setValue("property.bedrooms", unit.bedrooms);
                            setValue("property.bathrooms", unit.bathrooms);
                            setValue("property.parking", unit.parking);
                            // Auto-fill monthly rent
                            setValue("leaseDetails.monthlyRent", unit.monthlyRent);
                            calculateDerivedValues();
                            
                            // Load services from unit
                            try {
                              const servicesResponse = await servicesAPI.getByEntity('unit', unit.id);
                              const unitServices = servicesResponse.data?.data?.services || [];
                              setServices(unitServices.map((s: Service) => ({
                                ...s,
                                entityType: 'lease' as const,
                                entityId: 0, // Will be set when lease is created
                                includeInPDC: s.billingMethod === 'included_in_rental'
                              })));
                              toast.success(`Loaded ${unitServices.length} service(s) from unit`);
                            } catch (error) {
                              console.error('Failed to load unit services:', error);
                            }
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
                        {...register("leaseDetails.monthlyRent", { valueAsNumber: true })}
                        placeholder="85000"
                        className={errors.leaseDetails?.monthlyRent ? "border-red-500" : ""}
                        onChange={(e) => {
                          setValue("leaseDetails.monthlyRent", parseInt(e.target.value) || 0);
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
                        value={(watchedValues.leaseDetails?.monthlyRent || 0) * 12}
                        disabled
                        className="bg-muted font-semibold"
                      />
                    </div>
                  </div>

                  {/* Rental Tax Checkbox */}
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <Checkbox
                        id="rentalTaxable"
                        checked={isRentalTaxable}
                        onCheckedChange={(checked) => setIsRentalTaxable(!!checked)}
                      />
                      <Label htmlFor="rentalTaxable" className="cursor-pointer flex items-center gap-2">
                        <span>Taxable Rental (5% VAT)</span>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {watchedValues.leaseType === 'residential' 
                        ? 'Residential leases are typically not subject to VAT in UAE'
                        : 'Commercial properties are subject to 5% VAT on rental'}
                    </p>
                  </div>

                  {/* Rental Tax Breakdown - Inline Display */}
                  {isRentalTaxable && watchedValues.leaseDetails?.monthlyRent > 0 && (
                    <div className="col-span-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-semibold text-blue-900 mb-3">Rental Tax Breakdown</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Monthly Rent (Base):</span>
                            <span className="font-medium">
                              AED {(watchedValues.leaseDetails.monthlyRent || 0).toLocaleString('en-AE', {minimumFractionDigits: 2})}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">VAT (5%):</span>
                            <span className="font-medium">
                              AED {((watchedValues.leaseDetails.monthlyRent || 0) * 0.05).toLocaleString('en-AE', {minimumFractionDigits: 2})}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-blue-300">
                            <span className="font-semibold text-blue-900">Total Monthly (Incl. VAT):</span>
                            <span className="font-bold text-blue-900">
                              AED {((watchedValues.leaseDetails.monthlyRent || 0) * 1.05).toLocaleString('en-AE', {minimumFractionDigits: 2})}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm pt-2">
                            <span className="text-blue-700">Annual Total (Incl. VAT):</span>
                            <span className="font-medium">
                              AED {((watchedValues.leaseDetails.monthlyRent || 0) * 12 * 1.05).toLocaleString('en-AE', {minimumFractionDigits: 2})}
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
                      <DollarSign className="h-5 w-5" />
                      Services & Additional Charges
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="default"
                        onClick={() => setShowTemplatePicker(true)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Select from Templates
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={addCustomService}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Custom
                      </Button>
                    </div>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Additional charges like security deposit, agency fee, DEWA deposit, etc.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No services added yet</p>
                      <p className="text-sm">Add services for security deposit, agency fees, and other charges</p>
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
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Amount (AED)</Label>
                              <Input
                                type="number"
                                value={service.amount}
                                onChange={(e) => {
                                  const updated = [...services];
                                  updated[index].amount = parseFloat(e.target.value) || 0;
                                  setServices(updated);
                                }}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Billing</Label>
                              <Select
                                value={service.billingMethod}
                                onValueChange={(value: 'included_in_rental' | 'charged_separately') => {
                                  const updated = [...services];
                                  updated[index].billingMethod = value;
                                  setServices(updated);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="included_in_rental">Included</SelectItem>
                                  <SelectItem value="charged_separately">Separate</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label>Tax ({taxRate}%)</Label>
                              <Input
                                type="number"
                                value={service.isTaxable ? (Number(service.amount) * taxRate / 100).toFixed(2) : '0.00'}
                                disabled
                                className="bg-muted"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Total</Label>
                              <Input
                                type="number"
                                value={service.isTaxable ? (Number(service.amount) * (1 + taxRate / 100)).toFixed(2) : Number(service.amount).toFixed(2)}
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
                                  setServices(services.filter((_, i) => i !== index));
                                }}
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
                              />
                              <label
                                htmlFor={`taxable-${index}`}
                                className="text-sm font-medium"
                              >
                                Taxable ({taxRate}% VAT)
                              </label>
                            </div>
                            <div className="col-span-3 flex items-center space-x-2">
                              <Checkbox
                                id={`pdc-${index}`}
                                checked={service.includeInPDC}
                                onCheckedChange={(checked) => {
                                  const updated = [...services];
                                  updated[index].includeInPDC = checked as boolean;
                                  setServices(updated);
                                }}
                              />
                              <label
                                htmlFor={`pdc-${index}`}
                                className="text-sm font-medium"
                              >
                                Include in PDC
                              </label>
                            </div>
                            <div className="col-span-6">
                              <Input
                                value={service.description || ''}
                                onChange={(e) => {
                                  const updated = [...services];
                                  updated[index].description = e.target.value;
                                  setServices(updated);
                                }}
                                placeholder="Optional description"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      {/* Tax Summary Card - Shows ALL taxes */}
                      {(isRentalTaxable || services.some(s => s.isTaxable)) && (
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
                              {isRentalTaxable && watchedValues.leaseDetails?.monthlyRent > 0 && (
                                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                  <div>
                                    <p className="font-medium">Rental VAT (Monthly)</p>
                                    <p className="text-sm text-muted-foreground">
                                      Base: AED {(watchedValues.leaseDetails.monthlyRent || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  <p className="text-lg font-bold text-indigo-600">
                                    AED {((watchedValues.leaseDetails.monthlyRent || 0) * 0.05).toLocaleString('en-AE', {minimumFractionDigits: 2})}
                                  </p>
                                </div>
                              )}
                              
                              {/* Services Tax */}
                              {services.some(s => s.isTaxable) && (
                                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                  <div>
                                    <p className="font-medium">Services VAT</p>
                                    <p className="text-sm text-muted-foreground">
                                      {services.filter(s => s.isTaxable).length} taxable service(s)
                                    </p>
                                  </div>
                                  <p className="text-lg font-bold text-indigo-600">
                                    AED {services.reduce((sum, s) => sum + (s.isTaxable ? Number(s.amount) * taxRate / 100 : 0), 0).toLocaleString('en-AE', {minimumFractionDigits: 2})}
                                  </p>
                                </div>
                              )}
                              
                              {/* Total Tax */}
                              <div className="flex justify-between items-center p-3 bg-indigo-100 rounded-lg border-2 border-indigo-300">
                                <p className="font-bold text-indigo-900">Total VAT (Annual)</p>
                                <p className="text-xl font-bold text-indigo-900">
                                  AED {(
                                    (isRentalTaxable ? (watchedValues.leaseDetails?.monthlyRent || 0) * 12 * 0.05 : 0) +
                                    services.reduce((sum, s) => sum + (s.isTaxable ? Number(s.amount) * taxRate / 100 : 0), 0)
                                  ).toLocaleString('en-AE', {minimumFractionDigits: 2})}
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
                                <p className="text-muted-foreground">Total Services</p>
                                <p className="text-lg font-semibold">
                                  AED {services.reduce((sum, s) => sum + Number(s.amount), 0).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total Tax</p>
                                <p className="text-lg font-semibold">
                                  AED {services.reduce((sum, s) => sum + (s.isTaxable ? Number(s.amount) * taxRate / 100 : 0), 0).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Services Total</p>
                                <p className="text-lg font-semibold">
                                  AED {services.reduce((sum, s) => sum + (s.isTaxable ? Number(s.amount) * (1 + taxRate / 100) : Number(s.amount)), 0).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Grand Total (Annual)</p>
                                <p className="text-lg font-semibold text-primary">
                                  AED {(
                                    // Annual rent with tax
                                    (watchedValues.leaseDetails?.monthlyRent || 0) * 12 * (isRentalTaxable ? 1.05 : 1) +
                                    // Services total
                                    services.reduce((sum, s) => sum + (s.isTaxable ? Number(s.amount) * (1 + taxRate / 100) : Number(s.amount)), 0)
                                  ).toLocaleString('en-AE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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
                  {/* Auto-Generate PDC Button */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-blue-900">Auto-Generate PDC Schedule</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Generate cheque schedule automatically based on payment terms and lease duration
                        </p>
                      </div>
                      <Button 
                        type="button" 
                        onClick={generatePDCSchedule}
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
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add PDC
                      </Button>
                    </div>

                    {/* PDC Summary */}
                    {pdcSchedule.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-blue-700">Total PDC Entries</p>
                          <p className="text-2xl font-bold text-blue-900">{pdcSchedule.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700">Total Amount</p>
                          <p className="text-2xl font-bold text-blue-900">
                            AED {pdcSchedule.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString('en-AE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {pdcSchedule.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                          <FileCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                          <p className="text-muted-foreground">No PDC entries yet</p>
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
                              <p className="text-sm text-muted-foreground">Cheque #{index + 1}</p>
                              <p className="font-medium">AED {Number(pdc.amount).toLocaleString('en-AE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Due Date</p>
                              <p className="font-medium">{new Date(pdc.dueDate).toLocaleDateString('en-GB')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              <Badge className={getStatusColor(pdc.status)}>
                                {pdc.status.charAt(0).toUpperCase() + pdc.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditPDC(pdc)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeletePDC(pdc.id)}
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
    </Dialog>
  );
}