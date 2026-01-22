import { useState, useEffect } from "react";
import { leasesAPI, servicesAPI, tenantsAPI } from "@/services/api";
import { toast } from "sonner";
import { 
  FileText, 
  Search, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock,
  Download,
  Printer,
  Edit,
  Eye,
  MoreHorizontal,
  Filter,
  Grid3X3,
  List,
  AlertCircle,
  DollarSign,
  Users,
  Building2,
  Target,
  TrendingUp,
  TrendingDown,
  Star,
  Shield,
  FileCheck,
  Upload,
  Settings,
  BarChart3,
  PieChart,
  Bell,
  Send,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Home,
  User,
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
  Zap,
  Globe,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh,
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
  Plus as PlusIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import LeaseForm from "@/components/leases/LeaseForm";
import LeaseAgreement from "@/components/leases/LeaseAgreement";
import LeaseDetails from "@/components/leases/LeaseDetails";
import LeaseAnalytics from "@/components/leases/LeaseAnalytics";

// Mock data removed - now using live database via leasesAPI
/* Enhanced lease data with comprehensive UAE compliance information
const leasesOLD_MOCK = [
  {
    id: 1,
    leaseNumber: "LSE-2024-001",
    tenant: {
      id: 1,
      name: "Sarah Ahmed",
      email: "sarah.ahmed@email.com",
      phone: "+971 50 123 4567",
      emiratesId: "784-1985-1234567-8",
      nationality: "UAE",
      passportNumber: "A1234567",
      visaNumber: "V1234567",
      visaExpiry: "2025-12-31"
    },
    property: {
      id: 1,
      name: "Marina Heights Tower",
      unit: "Unit 305",
      address: "Marina Walk, Dubai Marina, Dubai, UAE",
      type: "Residential",
      area: 1200,
      bedrooms: 2,
      bathrooms: 2,
      parking: 1
    },
    leaseDetails: {
      startDate: "2024-01-15",
      endDate: "2025-01-14",
      duration: 12,
      monthlyRent: 85000,
      annualRent: 1020000,
      securityDeposit: 170000,
      agencyFee: 51000,
      ejariFee: 5000,
      dewaDeposit: 2000,
      municipalityFee: 1000,
      totalDeposits: 179000,
      paymentTerms: "Monthly",
      gracePeriod: 5,
      lateFee: 500,
      renewalTerms: "Automatic renewal unless notice given 60 days prior",
      terminationNotice: 60
    },
    status: "active",
    ejariStatus: "registered",
    ejariNumber: "EJ-2024-001234",
    ejariRegistrationDate: "2024-01-20",
    ejariExpiryDate: "2025-01-14",
    paymentStatus: "current",
    lastPayment: "2024-06-01",
    nextPayment: "2024-07-01",
    totalPaid: 510000,
    outstanding: 0,
    latePayments: 0,
    renewalCount: 0,
    satisfaction: 4.8,
    compliance: {
      ejariCompliant: true,
      dewaConnected: true,
      municipalityRegistered: true,
      insuranceValid: true,
      fireSafety: true,
      maintenanceUpToDate: true
    },
    documents: {
      leaseAgreement: "signed",
      ejariCertificate: "registered",
      dewaConnection: "active",
      municipalityApproval: "approved",
      insurancePolicy: "valid",
      fireSafetyCertificate: "valid",
      maintenanceCertificate: "valid"
    },
    specialTerms: [
      "No pets allowed",
      "No smoking in common areas",
      "Quiet hours: 10 PM - 7 AM",
      "Parking space included",
      "Gym access included"
    ],
    emergencyContact: {
      name: "Ahmed Hassan",
      phone: "+971 50 987 6543",
      relation: "Spouse"
    },
    createdDate: "2024-01-10",
    lastModified: "2024-06-01",
    createdBy: "Property Manager",
    notes: "Excellent tenant, always pays on time. No maintenance issues reported.",
    attachments: [
      "lease_agreement_001.pdf",
      "ejari_certificate_001.pdf",
      "tenant_passport_copy.pdf",
      "emirates_id_copy.pdf"
    ]
  },
  {
    id: 2,
    leaseNumber: "LSE-2024-002",
    tenant: {
      id: 2,
      name: "Mohammed Al Mansoori",
      email: "m.almansoori@email.com",
      phone: "+971 55 987 6543",
      emiratesId: "784-1980-2345678-9",
      nationality: "UAE",
      passportNumber: "A2345678",
      visaNumber: "V2345678",
      visaExpiry: "2025-11-30"
    },
    property: {
      id: 2,
      name: "Business Bay Commercial Plaza",
      unit: "Unit 102",
      address: "Sheikh Zayed Road, Business Bay, Dubai, UAE",
      type: "Commercial",
      area: 2000,
      bedrooms: 0,
      bathrooms: 2,
      parking: 2
    },
    leaseDetails: {
      startDate: "2024-03-01",
      endDate: "2025-02-28",
      duration: 12,
      monthlyRent: 120000,
      annualRent: 1440000,
      securityDeposit: 240000,
      agencyFee: 72000,
      ejariFee: 5000,
      dewaDeposit: 5000,
      municipalityFee: 2000,
      totalDeposits: 252000,
      paymentTerms: "Monthly",
      gracePeriod: 5,
      lateFee: 1000,
      renewalTerms: "Renewal subject to mutual agreement",
      terminationNotice: 90
    },
    status: "active",
    ejariStatus: "registered",
    ejariNumber: "EJ-2024-002345",
    ejariRegistrationDate: "2024-03-05",
    ejariExpiryDate: "2025-02-28",
    paymentStatus: "current",
    lastPayment: "2024-06-01",
    nextPayment: "2024-07-01",
    totalPaid: 480000,
    outstanding: 0,
    latePayments: 0,
    renewalCount: 0,
    satisfaction: 4.6,
    compliance: {
      ejariCompliant: true,
      dewaConnected: true,
      municipalityRegistered: true,
      insuranceValid: true,
      fireSafety: true,
      maintenanceUpToDate: true
    },
    documents: {
      leaseAgreement: "signed",
      ejariCertificate: "registered",
      dewaConnection: "active",
      municipalityApproval: "approved",
      insurancePolicy: "valid",
      fireSafetyCertificate: "valid",
      maintenanceCertificate: "valid"
    },
    specialTerms: [
      "Business use only",
      "No residential use",
      "Parking for 2 vehicles",
      "Business center access",
      "Meeting room access"
    ],
    emergencyContact: {
      name: "Fatima Al Mansoori",
      phone: "+971 50 111 2222",
      relation: "Spouse"
    },
    createdDate: "2024-02-25",
    lastModified: "2024-06-01",
    createdBy: "Property Manager",
    notes: "Business tenant, requires parking for 2 vehicles. Excellent payment history.",
    attachments: [
      "lease_agreement_002.pdf",
      "ejari_certificate_002.pdf",
      "trade_license_copy.pdf",
      "emirates_id_copy.pdf"
    ]
  },
  {
    id: 3,
    leaseNumber: "LSE-2023-003",
    tenant: {
      id: 3,
      name: "Jennifer Smith",
      email: "j.smith@email.com",
      phone: "+971 52 456 7890",
      emiratesId: "784-1990-3456789-0",
      nationality: "British",
      passportNumber: "GB1234567",
      visaNumber: "V3456789",
      visaExpiry: "2024-12-31"
    },
    property: {
      id: 3,
      name: "Palm Jumeirah Residences",
      unit: "Unit 204",
      address: "Palm Jumeirah, Dubai, UAE",
      type: "Residential",
      area: 1800,
      bedrooms: 3,
      bathrooms: 3,
      parking: 2
    },
    leaseDetails: {
      startDate: "2023-06-10",
      endDate: "2024-06-09",
      duration: 12,
      monthlyRent: 150000,
      annualRent: 1800000,
      securityDeposit: 300000,
      agencyFee: 90000,
      ejariFee: 5000,
      dewaDeposit: 3000,
      municipalityFee: 1500,
      totalDeposits: 309500,
      paymentTerms: "Monthly",
      gracePeriod: 5,
      lateFee: 750,
      renewalTerms: "Renewal discussion needed",
      terminationNotice: 60
    },
    status: "expiring",
    ejariStatus: "registered",
    ejariNumber: "EJ-2023-003456",
    ejariRegistrationDate: "2023-06-15",
    ejariExpiryDate: "2024-06-09",
    paymentStatus: "current",
    lastPayment: "2024-05-01",
    nextPayment: "2024-06-01",
    totalPaid: 1500000,
    outstanding: 0,
    latePayments: 0,
    renewalCount: 0,
    satisfaction: 4.9,
    compliance: {
      ejariCompliant: true,
      dewaConnected: true,
      municipalityRegistered: true,
      insuranceValid: true,
      fireSafety: true,
      maintenanceUpToDate: true
    },
    documents: {
      leaseAgreement: "signed",
      ejariCertificate: "registered",
      dewaConnection: "active",
      municipalityApproval: "approved",
      insurancePolicy: "valid",
      fireSafetyCertificate: "valid",
      maintenanceCertificate: "valid"
    },
    specialTerms: [
      "Pet-friendly (1 small dog)",
      "Beach access included",
      "Pool access included",
      "Gym access included",
      "Quiet environment preferred"
    ],
    emergencyContact: {
      name: "Robert Smith",
      phone: "+971 50 333 4444",
      relation: "Father"
    },
    createdDate: "2023-06-05",
    lastModified: "2024-05-01",
    createdBy: "Property Manager",
    notes: "Lease expiring soon, renewal discussion needed. Excellent tenant with pet.",
    attachments: [
      "lease_agreement_003.pdf",
      "ejari_certificate_003.pdf",
      "passport_copy.pdf",
      "visa_copy.pdf"
    ]
  },
  {
    id: 4,
    leaseNumber: "LSE-2024-004",
    tenant: {
      id: 4,
      name: "Ahmed Hassan",
      email: "a.hassan@email.com",
      phone: "+971 54 321 0987",
      emiratesId: "784-1988-4567890-1",
      nationality: "Egyptian",
      passportNumber: "A3456789",
      visaNumber: "V4567890",
      visaExpiry: "2025-08-31"
    },
    property: {
      id: 4,
      name: "Downtown Office Complex",
      unit: "Unit 801",
      address: "Mohammed Bin Rashid Boulevard, Downtown Dubai, UAE",
      type: "Commercial",
      area: 1500,
      bedrooms: 0,
      bathrooms: 1,
      parking: 1
    },
    leaseDetails: {
      startDate: "2024-02-20",
      endDate: "2025-02-19",
      duration: 12,
      monthlyRent: 95000,
      annualRent: 1140000,
      securityDeposit: 190000,
      agencyFee: 57000,
      ejariFee: 5000,
      dewaDeposit: 3000,
      municipalityFee: 1500,
      totalDeposits: 201000,
      paymentTerms: "Monthly",
      gracePeriod: 5,
      lateFee: 500,
      renewalTerms: "Standard renewal terms",
      terminationNotice: 60
    },
    status: "pending",
    ejariStatus: "pending",
    ejariNumber: null,
    ejariRegistrationDate: null,
    ejariExpiryDate: null,
    paymentStatus: "pending",
    lastPayment: null,
    nextPayment: "2024-07-01",
    totalPaid: 0,
    outstanding: 95000,
    latePayments: 0,
    renewalCount: 0,
    satisfaction: 4.2,
    compliance: {
      ejariCompliant: false,
      dewaConnected: false,
      municipalityRegistered: false,
      insuranceValid: false,
      fireSafety: false,
      maintenanceUpToDate: false
    },
    documents: {
      leaseAgreement: "pending",
      ejariCertificate: "pending",
      dewaConnection: "pending",
      municipalityApproval: "pending",
      insurancePolicy: "pending",
      fireSafetyCertificate: "pending",
      maintenanceCertificate: "pending"
    },
    specialTerms: [
      "High-speed internet required",
      "Quiet workspace",
      "Parking space included",
      "Business use only"
    ],
    emergencyContact: {
      name: "Mona Hassan",
      phone: "+971 50 555 6666",
      relation: "Spouse"
    },
    createdDate: "2024-02-15",
    lastModified: "2024-02-20",
    createdBy: "Property Manager",
    notes: "KYC documents pending, some compliance issues to resolve.",
    attachments: [
      "lease_agreement_004.pdf",
      "passport_copy.pdf",
      "visa_copy.pdf"
    ]
  }
];
*/

const leaseStatuses = ["All", "Active", "Expiring", "Pending", "Expired", "Terminated"];
const ejariStatuses = ["All", "Registered", "Pending", "Expired", "Not Required"];
const paymentStatuses = ["All", "Current", "Overdue", "Pending", "Partial"];
const sortOptions = ["Lease Number", "Tenant Name", "Start Date", "End Date", "Rent Amount", "Status"];

export default function Leases() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedEjariStatus, setSelectedEjariStatus] = useState("All");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("All");
  const [sortBy, setSortBy] = useState("Lease Number");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [showLeaseDetails, setShowLeaseDetails] = useState(false);
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  
  // State for API data
  const [leasesData, setLeasesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch leases from API on mount
  useEffect(() => {
    fetchLeases();
  }, []);

  const fetchLeases = async () => {
    try {
      setIsLoading(true);
      const response = await leasesAPI.getAll();
      const fetchedLeases = response.data?.data?.leases || response.data?.data || response.data || [];
      
      console.log("✅ Fetched leases:", fetchedLeases.length);
      setLeasesData(fetchedLeases);
    } catch (error: any) {
      console.error("❌ Error fetching leases:", error);
      toast.error("Failed to load leases");
      setLeasesData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeases = leasesData
    .filter((lease) => {
      const tenantName = lease.tenant?.name || '';
      const propertyName = lease.property?.name || lease.property?.title || '';
      const leaseNum = lease.leaseNumber || '';
      
      const matchesSearch =
        tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leaseNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lease.property.unit.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === "All" || lease.status === selectedStatus.toLowerCase();
      const matchesEjariStatus = selectedEjariStatus === "All" || lease.ejariStatus === selectedEjariStatus.toLowerCase();
      const matchesPaymentStatus = selectedPaymentStatus === "All" || lease.paymentStatus === selectedPaymentStatus.toLowerCase();
      
      return matchesSearch && matchesStatus && matchesEjariStatus && matchesPaymentStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "Tenant Name":
          return a.tenant.name.localeCompare(b.tenant.name);
        case "Start Date":
          return new Date(a.leaseDetails.startDate).getTime() - new Date(b.leaseDetails.startDate).getTime();
        case "End Date":
          return new Date(a.leaseDetails.endDate).getTime() - new Date(b.leaseDetails.endDate).getTime();
        case "Rent Amount":
          return b.leaseDetails.monthlyRent - a.leaseDetails.monthlyRent;
        case "Status":
          return a.status.localeCompare(b.status);
        default:
          return a.leaseNumber.localeCompare(b.leaseNumber);
      }
    });

  // Calculate stats from live database data
  const totalLeases = leasesData.length;
  const activeLeases = leasesData.filter(l => l.status === "active" || l.status === "Active").length;
  
  // Calculate expiring leases (next 90 days)
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
  const expiringLeases = leasesData.filter(lease => {
    const endDate = new Date(lease.endDate || lease.leaseDetails?.endDate);
    return endDate <= ninetyDaysFromNow && endDate >= new Date() && (lease.status === "active" || lease.status === "Active");
  }).length;
  
  // Calculate total monthly rent from all active leases
  const totalRent = leasesData.reduce((sum, lease) => {
    const rentAmount = lease.monthlyRent || lease.rentAmount || lease.leaseDetails?.monthlyRent || 0;
    return sum + parseFloat(rentAmount);
  }, 0);
  
  // Count Ejari compliant leases
  const ejariCompliant = leasesData.filter(l => l.ejariStatus === "registered" || l.ejariStatus === "Registered").length;
  
  // Count overdue payments
  const overdueLeases = leasesData.filter(l => l.paymentStatus === "overdue" || l.paymentStatus === "Overdue").length;
  
  console.log("📊 Lease Stats:", { 
    totalLeases, 
    activeLeases, 
    expiringLeases, 
    totalRent, 
    ejariCompliant, 
    overdueLeases 
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "expiring":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "terminated":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEjariStatusColor = (status: string) => {
    switch (status) {
      case "registered":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "current":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "partial":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleAddLease = () => {
    setFormMode("create");
    setSelectedLease(null);
    setShowLeaseForm(true);
  };

  const handleEditLease = async (lease: any) => {
    try {
      // Fetch full lease data from API, skipping cache to get latest services
      const response = await leasesAPI.getById(lease.id, true);
      const leaseData = response.data?.data || response.data;
      
      console.log("✅ Loaded lease for edit:", leaseData);
      
      setSelectedLease(leaseData);
      setFormMode("edit");
      setShowLeaseForm(true);
    } catch (error: any) {
      console.error("❌ Error loading lease:", error);
      toast.error("Failed to load lease details");
    }
  };

  const handleViewLease = (lease: any) => {
    setSelectedLease(lease);
    setShowLeaseDetails(true);
  };

  const handleViewAgreement = (lease: any) => {
    setSelectedLease(lease);
    setShowAgreement(true);
  };

  const handleLeaseSubmit = async (data: any) => {
    try {
      console.log("📋 Raw form data:", data);

      if (
        data.leaseDetails.securityDeposit === 0 &&
        data.leaseDetails.monthlyRent > 0
      ) {
        data.leaseDetails.securityDeposit = data.leaseDetails.monthlyRent * 1; 
      }
      
      // Extract tenant ID - could be in different formats
      let tenantId = null;
      if (data.tenant?.id) {
        tenantId = parseInt(data.tenant.id);
      } else if (data.tenantId) {
        tenantId = parseInt(data.tenantId);
      }
      
      // Extract unit ID - could be in different formats
      let unitId = null;
      if (data.unitId) {
        unitId = parseInt(data.unitId);
      } else if (data.property?.unitId) {
        unitId = parseInt(data.property.unitId);
      } else if (typeof data.property?.unit === 'number') {
        unitId = data.property.unit;
      }
      
      // Transform frontend data to backend format
      const backendData = {
        leaseType: data.leaseType.toLowerCase(),
        tenantId: parseInt(data.tenantId),
        unitId: parseInt(data.unitId),
        startDate: data.leaseDetails.startDate,
        endDate: data.leaseDetails.endDate,
        duration: data.leaseDetails.duration,
        rentAmount: data.leaseDetails.monthlyRent, // CORRECTED MAPPING
        annualRent: data.leaseDetails.annualRent,
        depositAmount: data.leaseDetails.securityDeposit, // CORRECTED MAPPING
        agencyFee: data.leaseDetails.agencyFee,
        ejariFee: data.leaseDetails.ejariFee,
        dewaDeposit: data.leaseDetails.dewaDeposit,
        municipalityFee: data.leaseDetails.municipalityFee,
        totalDeposits: data.leaseDetails.totalDeposits,
        paymentFrequency: data.leaseDetails.paymentTerms,
        gracePeriod: data.leaseDetails.gracePeriod,
        lateFee: data.leaseDetails.lateFee,
        renewalTerms: data.leaseDetails.renewalTerms,
        terminationNotice: data.leaseDetails.terminationNotice,
        terms: data.notes, 
        specialConditions: data.specialTerms
          ? data.specialTerms.join("; ")
          : "", 
        compliance: data.compliance,
        pdcSchedule: data.pdcSchedule,
        pdcStartDate: data.pdcStartDate, // Added
        isRentalTaxable: data.isRentalTaxable,
        documents: data.attachments || [],
        paymentDay: 1, // Default payment day to 1st of month
        propertyType: data.property?.type || "residential", // Added snapshot
        status: data.leaseDetails.status || "draft",
        autoRenewal: false,
        renewalPeriod: null,
        renewalUnit: null,
        signedDate: null,
        signedBy: null,
        witness1: null,
        witness2: null,
        isActive: true,
        services: data.services,
        property: data.property, // Pass property details for Unit update
      };
      
      console.log("🔄 Transformed backend data:", backendData);

      // Check if we need to update existing tenant details (e.g. passport, visa info added in form)
      if (backendData.tenantId && data.tenant) {
          try {
             // Only update if we have new info fields
             if (data.tenant.passportNumber || data.tenant.visaNumber || data.tenant.emergencyContact?.relation) {
                 console.log(`[TenantUpdate] Updating tenant ${backendData.tenantId} with new details...`);
                 await tenantsAPI.update(backendData.tenantId, {
                    passportNumber: data.tenant.passportNumber,
                    visaNumber: data.tenant.visaNumber,
                    visaExpiry: data.tenant.visaExpiry,
                    emergencyName: data.tenant.emergencyContact?.name,
                    emergencyPhone: data.tenant.emergencyContact?.phone,
                    emergencyRelation: data.tenant.emergencyContact?.relation,
                    // Preserve other fields if needed, or API handles partial updates (usually does)
                 });
                 toast.success("Tenant details updated");
             }
          } catch(err) {
              console.error("Failed to update tenant details:", err);
              // Don't block lease creation/update if tenant update fails, but warn user
              toast.warning("Lease saved, but failed to update some tenant details.");
          }
      }
      
      // Validate required fields
      if (!backendData.tenantId) {
        // Handle inline tenant creation
        if (data.tenant && data.tenant.name && data.tenant.phone) {
          try {
            toast.info("Creating new tenant...");
            const newTenantResponse = await tenantsAPI.create({
              name: data.tenant.name,
              email: data.tenant.email,
              phone: data.tenant.phone,
              emiratesId: data.tenant.emiratesId,
              nationality: data.tenant.nationality,
              passportNumber: data.tenant.passportNumber,
              visaNumber: data.tenant.visaNumber,
              visaExpiry: data.tenant.visaExpiry,
              emergencyName: data.tenant.emergencyContact?.name,
              emergencyPhone: data.tenant.emergencyContact?.phone,
              emergencyRelation: data.tenant.emergencyContact?.relation,
              status: "active",
              type: "individual"
            });
            
            const newTenantId = newTenantResponse.data?.data?.id || newTenantResponse.data?.id;
            
            if (newTenantId) {
              backendData.tenantId = parseInt(newTenantId);
              toast.success("New tenant created successfully");
            } else {
              throw new Error("Failed to get new tenant ID");
            }
          } catch (err) {
            console.error("Failed to create tenant:", err);
            toast.error("Failed to create new tenant. Please try selecting an existing one.");
            return;
          }
        } else {
          toast.error("Please select a tenant or provide full tenant details");
          return;
        }
      }
      if (!backendData.unitId) {
        toast.error("Please select a property unit");
        return;
      }
      if (!backendData.startDate) {
        toast.error("Please enter lease start date");
        return;
      }
      if (!backendData.endDate) {
        toast.error("Please enter lease end date");
        return;
      }
      if (!backendData.rentAmount || backendData.rentAmount <= 0) {
        toast.error("Please enter a valid rent amount");
        return;
      }
      if (!backendData.depositAmount || backendData.depositAmount < 0) {
        toast.error("Please enter a valid deposit amount");
        return;
      }
      
      let leaseId = selectedLease?.id;
      
      if (formMode === "create") {
        const response = await leasesAPI.create(backendData);
        leaseId = response.data?.data?.id || response.data?.id;
        toast.success("Lease created successfully");
      } else if (selectedLease?.id) {
        await leasesAPI.update(selectedLease.id, backendData);
        toast.success("Lease updated successfully");
      }

      // Save services - always run this block if we have a valid leaseId
      if (leaseId && Array.isArray(data.services)) {
        try {
          console.log(`[ServicesDebug] Processing services for lease ${leaseId}. FormMode: ${formMode}. Service Count: ${data.services.length}`);
          
          // Delete existing services for this lease (if editing)
          if (formMode === "edit" || selectedLease?.id === leaseId) {
            console.log(`[ServicesDebug] Fetching existing services to delete (SKIP CACHE)...`);
            const existingServices = await servicesAPI.getByEntity('lease', leaseId, true);
            const servicesToDelete = existingServices.data?.services || [];
            console.log(`[ServicesDebug] Found ${servicesToDelete.length} services to delete.`);
            
            if (servicesToDelete.length > 0) {
              await Promise.all(
                servicesToDelete.map((service: any) => {
                  console.log(`[ServicesDebug] Deleting service ${service.id}...`);
                  return servicesAPI.delete(service.id, true);
                })
              );
              console.log(`[ServicesDebug] All old services deleted.`);
            }
          }

          // Create new services if any
          if (data.services.length > 0) {
             console.log(`[ServicesDebug] Creating ${data.services.length} new services...`);
            const servicesToCreate = data.services.map((service: any, index: number) => ({
              name: service.name,
              amount: parseFloat(service.amount) || 0,
              isTaxable: Boolean(service.isTaxable),
              billingMethod: service.billingMethod || 'charged_separately',
              description: service.description || '',
              sortOrder: index,
              entityType: 'lease',
              entityId: leaseId
            }));

            await servicesAPI.bulkCreate({
              services: servicesToCreate,
              entityType: 'lease',
              entityId: leaseId
            });
            console.log(`[ServicesDebug] New services created.`);
          }
        } catch (servicesError) {
          console.error("Error saving services:", servicesError);
          toast.error("Lease saved but failed to save services");
        }
      }

      setShowLeaseForm(false);
      fetchLeases(); // Reload the list
    } catch (error: any) {
      console.error("❌ Error saving lease:", error);
      console.error("❌ Error details:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to save lease");
    }
  };

  const handlePrintAgreement = (lease: any) => {
    console.log("Print agreement for:", lease);
    // Implement print functionality
  };

  const handleDownloadAgreement = (lease: any) => {
    console.log("Download agreement for:", lease);
    // Implement download functionality
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            Lease Management
          </h1>
          <p className="text-muted-foreground mt-2">
            UAE-compliant lease agreements and management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(true)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            className="bg-gradient-primary shadow-glow"
            onClick={handleAddLease}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Lease
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Leases
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {totalLeases}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeLeases} active
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Monthly Revenue
                </p>
                <p className="text-3xl font-bold text-foreground">
                  AED {(totalRent / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-muted-foreground">
                  Total collection
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">
                  Ejari Compliant
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {ejariCompliant}
                </p>
                <p className="text-sm text-muted-foreground">
                  of {totalLeases} leases
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Expiring Soon
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {expiringLeases}
                </p>
                <p className="text-sm text-muted-foreground">Need renewal</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Overdue
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {overdueLeases}
                </p>
                <p className="text-sm text-muted-foreground">
                  Payments pending
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Compliance
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {Math.round((ejariCompliant / totalLeases) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">UAE compliant</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Award className="h-6 w-6 text-purple-600" />
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
            placeholder="Search leases, tenants, or properties..."
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
              <label className="text-sm font-medium text-foreground mb-2 block">
                Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leaseStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Ejari Status
              </label>
              <Select
                value={selectedEjariStatus}
                onValueChange={setSelectedEjariStatus}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ejariStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Payment Status
              </label>
              <Select
                value={selectedPaymentStatus}
                onValueChange={setSelectedPaymentStatus}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Loading leases...</h3>
            <p className="text-muted-foreground">
              Please wait while we fetch your lease data.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && filteredLeases.length === 0 && leasesData.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leases found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first lease agreement.
            </p>
            <Button
              onClick={handleAddLease}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Lease
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Results After Filter */}
      {!isLoading && filteredLeases.length === 0 && leasesData.length > 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No matching leases</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or filters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leases Display */}
      {!isLoading && viewMode === "grid" && filteredLeases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeases.map((lease) => (
            <Card
              key={lease.id}
              className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group"
            >
              <CardContent className="p-6">
                {/* Lease Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {lease.leaseNumber}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {lease.tenant.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lease.unit?.property?.title} - {lease.unit?.propertyId}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(lease.status)}>
                      {lease.status}
                    </Badge>
                    <Badge className={getEjariStatusColor(lease.ejariStatus)}>
                      {lease.ejariStatus === "registered" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ejari
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Ejari Pending
                        </>
                      )}
                    </Badge>
                  </div>
                </div>

                {/* Lease Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Lease Period
                    </span>
                    <span className="text-sm font-medium">
                      {lease.startDate} - {lease.endDate}
                    </span>
                  </div>
                  {/* <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Monthly Rent</span>
                    <span className="text-lg font-bold text-foreground">
                      AED {lease.monthlyRent.toLocaleString()}
                    </span>
                  </div> */}
                  {/* <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Security Deposit</span>
                    <span className="text-sm font-medium">
                      AED {lease.securityDeposit.toLocaleString()}
                    </span>
                  </div> */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Payment Status
                    </span>
                    <Badge
                      className={getPaymentStatusColor(lease.paymentStatus)}
                    >
                      {lease.paymentStatus}
                    </Badge>
                  </div>
                </div>

                {/* Compliance Status */}
                {/* <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Compliance Status</span>
                    <span className="text-xs text-muted-foreground">
                      {Object.values(lease.compliance).filter(Boolean).length}/6
                    </span>
                  </div>
                  <Progress 
                    value={(Object.values(lease.compliance).filter(Boolean).length / 6) * 100} 
                    className="h-2" 
                  />
                </div> */}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewLease(lease)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAgreement(lease)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleViewLease(lease)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditLease(lease)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Lease
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleViewAgreement(lease)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Agreement
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePrintAgreement(lease)}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Agreement
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownloadAgreement(lease)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate Lease
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Renew Lease
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Terminate Lease
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
      {!isLoading && viewMode === "list" && filteredLeases.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-6 font-medium text-muted-foreground">
                    Lease
                  </th>
                  <th className="text-left p-6 font-medium text-muted-foreground">
                    Tenant
                  </th>
                  <th className="text-left p-6 font-medium text-muted-foreground">
                    Property
                  </th>
                  <th className="text-left p-6 font-medium text-muted-foreground">
                    Period
                  </th>
                  <th className="text-left p-6 font-medium text-muted-foreground">
                    Rent
                  </th>
                  <th className="text-left p-6 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left p-6 font-medium text-muted-foreground">
                    Ejari
                  </th>
                  <th className="text-left p-6 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLeases.map((lease) => (
                  <tr
                    key={lease.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-6">
                      <div>
                        <p className="font-medium text-foreground">
                          {lease.leaseNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          #{lease.id}
                        </p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="font-medium text-foreground">
                          {lease.tenant.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {lease.tenant.nationality}
                        </p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="font-medium text-foreground">
                          {lease.unit.property.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {lease.unit.unitNumber}
                        </p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="text-sm font-medium">{lease.startDate}</p>
                        <p className="text-sm text-muted-foreground">
                          to {lease.endDate}
                        </p>
                      </div>
                    </td>
                    {/* <td className="p-6">
                      <div>
                        <p className="font-medium">AED {lease.monthlyRent.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">monthly</p>
                      </div>
                    </td> */}
                    <td className="p-6">
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusColor(lease.status)}>
                          {lease.status}
                        </Badge>
                        <Badge
                          className={getPaymentStatusColor(lease.paymentStatus)}
                        >
                          {lease.paymentStatus}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-6">
                      <Badge className={getEjariStatusColor(lease.ejariStatus)}>
                        {lease.ejariStatus === "registered" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ejari
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLease(lease)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLease(lease)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAgreement(lease)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => handleViewLease(lease)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditLease(lease)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Lease
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleViewAgreement(lease)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Agreement
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handlePrintAgreement(lease)}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print Agreement
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownloadAgreement(lease)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate Lease
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Renew Lease
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Terminate Lease
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

      {/* Empty State */}
      {filteredLeases.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Leases Found
          </h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search criteria or create a new lease.
          </p>
          <Button
            className="bg-gradient-primary shadow-glow"
            onClick={handleAddLease}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Lease
          </Button>
        </Card>
      )}

      {/* Lease Form Modal */}
      <LeaseForm
        isOpen={showLeaseForm}
        onClose={() => setShowLeaseForm(false)}
        onSubmit={handleLeaseSubmit}
        initialData={selectedLease}
        mode={formMode}
      />

      {/* Lease Agreement Modal */}
      {showAgreement && selectedLease && (
        <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <LeaseAgreement lease={selectedLease} />
          </DialogContent>
        </Dialog>
      )}

      {/* Lease Details View Modal */}
      <LeaseDetails 
        lease={selectedLease} 
        isOpen={showLeaseDetails} 
        onClose={() => setShowLeaseDetails(false)}
        onEdit={(lease) => {
           setShowLeaseDetails(false);
           handleEditLease(lease);
        }}
      />

      {/* Lease Analytics Modal */}
      {showAnalytics && (
        <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <LeaseAnalytics leases={leases} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}