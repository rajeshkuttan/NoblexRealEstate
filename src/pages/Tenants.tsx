import { useState, useEffect, useRef, type CSSProperties, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { tenantsAPI } from "@/services/api";
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  FileCheck, 
  Filter,
  Grid3X3,
  List,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  Calendar,
  Banknote,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Building2,
  CreditCard,
  Download,
  Upload,
  Settings,
  BarChart3,
  Bell,
  Send,
  Star,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  FileText,
  Home,
  MapPin,
  CalendarDays,
  Clock3,
  UserCheck,
  UserX,
  MailOpen,
  PhoneCall,
  MessageCircle,
  History,
  Receipt,
  Wallet,
  Percent,
  Award,
  Badge as BadgeIcon,
  Flag,
  Globe,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh
} from "lucide-react";
import * as XLSX from "xlsx";
import TenantForm from "@/components/tenants/TenantFormSimplified";
import PaymentHistory from "@/components/tenants/PaymentHistory";
import MaintenanceHistory from "@/components/tenants/MaintenanceHistory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Enhanced tenant data with comprehensive information
const mockTenants = [
  {
    id: 1,
    name: "Sarah Ahmed",
    email: "sarah.ahmed@email.com",
    phone: "+971 50 123 4567",
    emiratesId: "784-1985-1234567-8",
    nationality: "UAE",
    dateOfBirth: "1985-03-15",
    gender: "Female",
    maritalStatus: "Married",
    occupation: "Marketing Director",
    company: "Dubai Marketing Group",
    emergencyContact: "+971 50 987 6543",
    emergencyName: "Ahmed Hassan",
    property: "Marina Heights Tower",
    unit: "Unit 305",
    address: "Marina Walk, Dubai Marina, Dubai, UAE",
    leaseStart: "2024-01-01",
    leaseEnd: "2024-12-31",
    leaseDuration: 12,
    monthlyRent: 85000,
    securityDeposit: 170000,
    rentPaid: 850000,
    rentDue: 0,
    lastPayment: "2024-06-01",
    nextPayment: "2024-07-01",
    paymentMethod: "Bank Transfer",
    bankAccount: "****1234",
    status: "active",
    kycStatus: "verified",
    paymentStatus: "current",
    leaseStatus: "active",
    satisfaction: 4.8,
    communication: "excellent",
    maintenanceRequests: 2,
    complaints: 0,
    latePayments: 0,
    leaseRenewals: 1,
    moveInDate: "2024-01-01",
    moveOutDate: null,
    notes: "Excellent tenant, always pays on time",
    preferences: ["Quiet environment", "Parking space", "Gym access"],
    documents: ["Passport", "Emirates ID", "Employment Letter", "Bank Statement"],
    profileImage: "/api/placeholder/100/100",
    rating: 4.8,
    totalRentPaid: 850000,
    averagePaymentTime: 2,
    preferredLanguage: "English",
    preferredContact: "Email",
    specialRequirements: "Wheelchair accessible",
    pets: false,
    smoking: false,
    visitors: "Regular",
    maintenanceHistory: [
      { date: "2024-05-15", type: "AC Repair", status: "Completed", cost: 500 },
      { date: "2024-04-20", type: "Plumbing", status: "Completed", cost: 300 }
    ],
    paymentHistory: [
      { date: "2024-06-01", amount: 85000, status: "Paid", method: "Bank Transfer" },
      { date: "2024-05-01", amount: 85000, status: "Paid", method: "Bank Transfer" },
      { date: "2024-04-01", amount: 85000, status: "Paid", method: "Bank Transfer" }
    ]
  },
  {
    id: 2,
    name: "Mohammed Al Mansoori",
    email: "m.almansoori@email.com",
    phone: "+971 55 987 6543",
    emiratesId: "784-1980-2345678-9",
    nationality: "UAE",
    dateOfBirth: "1980-07-22",
    gender: "Male",
    maritalStatus: "Married",
    occupation: "Business Owner",
    company: "Al Mansoori Trading LLC",
    emergencyContact: "+971 50 111 2222",
    emergencyName: "Fatima Al Mansoori",
    property: "Business Bay Commercial Plaza",
    unit: "Unit 102",
    address: "Sheikh Zayed Road, Business Bay, Dubai, UAE",
    leaseStart: "2024-03-01",
    leaseEnd: "2025-02-28",
    leaseDuration: 12,
    monthlyRent: 120000,
    securityDeposit: 240000,
    rentPaid: 480000,
    rentDue: 0,
    lastPayment: "2024-06-01",
    nextPayment: "2024-07-01",
    paymentMethod: "Cheque",
    bankAccount: "****5678",
    status: "active",
    kycStatus: "verified",
    paymentStatus: "current",
    leaseStatus: "active",
    satisfaction: 4.6,
    communication: "good",
    maintenanceRequests: 1,
    complaints: 0,
    latePayments: 0,
    leaseRenewals: 0,
    moveInDate: "2024-03-01",
    moveOutDate: null,
    notes: "Business tenant, requires parking for 2 vehicles",
    preferences: ["Parking", "Business center access", "Meeting rooms"],
    documents: ["Trade License", "Emirates ID", "Bank Statement", "Insurance"],
    profileImage: "/api/placeholder/100/100",
    rating: 4.6,
    totalRentPaid: 480000,
    averagePaymentTime: 1,
    preferredLanguage: "Arabic",
    preferredContact: "Phone",
    specialRequirements: "Business parking",
    pets: false,
    smoking: false,
    visitors: "Business",
    maintenanceHistory: [
      { date: "2024-05-10", type: "Elevator", status: "Completed", cost: 800 }
    ],
    paymentHistory: [
      { date: "2024-06-01", amount: 120000, status: "Paid", method: "Cheque" },
      { date: "2024-05-01", amount: 120000, status: "Paid", method: "Cheque" },
      { date: "2024-04-01", amount: 120000, status: "Paid", method: "Cheque" }
    ]
  },
  {
    id: 3,
    name: "Jennifer Smith",
    email: "j.smith@email.com",
    phone: "+971 52 456 7890",
    emiratesId: "784-1990-3456789-0",
    nationality: "British",
    dateOfBirth: "1990-11-08",
    gender: "Female",
    maritalStatus: "Single",
    occupation: "Marketing Manager",
    company: "Dubai International Corp",
    emergencyContact: "+971 50 333 4444",
    emergencyName: "Robert Smith",
    property: "Palm Jumeirah Residences",
    unit: "Unit 204",
    address: "Palm Jumeirah, Dubai, UAE",
    leaseStart: "2023-06-01",
    leaseEnd: "2024-05-31",
    leaseDuration: 12,
    monthlyRent: 150000,
    securityDeposit: 300000,
    rentPaid: 1500000,
    rentDue: 0,
    lastPayment: "2024-05-01",
    nextPayment: "2024-06-01",
    paymentMethod: "Bank Transfer",
    bankAccount: "****9012",
    status: "expiring",
    kycStatus: "verified",
    paymentStatus: "current",
    leaseStatus: "expiring",
    satisfaction: 4.9,
    communication: "excellent",
    maintenanceRequests: 0,
    complaints: 0,
    latePayments: 0,
    leaseRenewals: 0,
    moveInDate: "2023-06-01",
    moveOutDate: "2024-05-31",
    notes: "Lease expiring soon, renewal discussion needed",
    preferences: ["Beach access", "Pool", "Gym", "Quiet environment"],
    documents: ["Passport", "Visa", "Employment Letter", "Bank Statement"],
    profileImage: "/api/placeholder/100/100",
    rating: 4.9,
    totalRentPaid: 1500000,
    averagePaymentTime: 1,
    preferredLanguage: "English",
    preferredContact: "Email",
    specialRequirements: "Pet-friendly",
    pets: true,
    smoking: false,
    visitors: "Regular",
    maintenanceHistory: [],
    paymentHistory: [
      { date: "2024-05-01", amount: 150000, status: "Paid", method: "Bank Transfer" },
      { date: "2024-04-01", amount: 150000, status: "Paid", method: "Bank Transfer" },
      { date: "2024-03-01", amount: 150000, status: "Paid", method: "Bank Transfer" }
    ]
  },
  {
    id: 4,
    name: "Ahmed Hassan",
    email: "a.hassan@email.com",
    phone: "+971 54 321 0987",
    emiratesId: "784-1988-4567890-1",
    nationality: "Egyptian",
    dateOfBirth: "1988-12-03",
    gender: "Male",
    maritalStatus: "Married",
    occupation: "Software Engineer",
    company: "Tech Solutions Dubai",
    emergencyContact: "+971 50 555 6666",
    emergencyName: "Mona Hassan",
    property: "Downtown Office Complex",
    unit: "Unit 801",
    address: "Mohammed Bin Rashid Boulevard, Downtown Dubai, UAE",
    leaseStart: "2024-02-01",
    leaseEnd: "2025-01-31",
    leaseDuration: 12,
    monthlyRent: 95000,
    securityDeposit: 190000,
    rentPaid: 475000,
    rentDue: 0,
    lastPayment: "2024-06-01",
    nextPayment: "2024-07-01",
    paymentMethod: "Bank Transfer",
    bankAccount: "****3456",
    status: "active",
    kycStatus: "pending",
    paymentStatus: "current",
    leaseStatus: "active",
    satisfaction: 4.2,
    communication: "good",
    maintenanceRequests: 3,
    complaints: 1,
    latePayments: 1,
    leaseRenewals: 0,
    moveInDate: "2024-02-01",
    moveOutDate: null,
    notes: "KYC documents pending, some maintenance issues reported",
    preferences: ["High-speed internet", "Quiet workspace", "Parking"],
    documents: ["Passport", "Visa", "Employment Letter"],
    profileImage: "/api/placeholder/100/100",
    rating: 4.2,
    totalRentPaid: 475000,
    averagePaymentTime: 5,
    preferredLanguage: "Arabic",
    preferredContact: "WhatsApp",
    specialRequirements: "High-speed internet",
    pets: false,
    smoking: false,
    visitors: "Occasional",
    maintenanceHistory: [
      { date: "2024-06-10", type: "Internet", status: "In Progress", cost: 0 },
      { date: "2024-05-25", type: "AC Repair", status: "Completed", cost: 400 },
      { date: "2024-05-15", type: "Plumbing", status: "Completed", cost: 250 }
    ],
    paymentHistory: [
      { date: "2024-06-01", amount: 95000, status: "Paid", method: "Bank Transfer" },
      { date: "2024-05-01", amount: 95000, status: "Paid", method: "Bank Transfer" },
      { date: "2024-04-01", amount: 95000, status: "Paid", method: "Bank Transfer" }
    ]
  },
  {
    id: 5,
    name: "Layla Al-Zahra",
    email: "layla.alzahra@email.com",
    phone: "+971 56 789 0123",
    emiratesId: "784-1992-5678901-2",
    nationality: "UAE",
    dateOfBirth: "1992-04-18",
    gender: "Female",
    maritalStatus: "Single",
    occupation: "Graphic Designer",
    company: "Creative Studio Dubai",
    emergencyContact: "+971 50 777 8888",
    emergencyName: "Omar Al-Zahra",
    property: "JBR Beachfront Apartments",
    unit: "Unit 450",
    address: "JBR Walk, Jumeirah Beach Residence, Dubai, UAE",
    leaseStart: "2024-01-15",
    leaseEnd: "2025-01-14",
    leaseDuration: 12,
    monthlyRent: 110000,
    securityDeposit: 220000,
    rentPaid: 660000,
    rentDue: 0,
    lastPayment: "2024-06-15",
    nextPayment: "2024-07-15",
    paymentMethod: "Bank Transfer",
    bankAccount: "****7890",
    status: "active",
    kycStatus: "verified",
    paymentStatus: "current",
    leaseStatus: "active",
    satisfaction: 4.7,
    communication: "excellent",
    maintenanceRequests: 1,
    complaints: 0,
    latePayments: 0,
    leaseRenewals: 0,
    moveInDate: "2024-01-15",
    moveOutDate: null,
    notes: "Creative professional, very satisfied with the property",
    preferences: ["Beach access", "Natural light", "Quiet environment", "Gym"],
    documents: ["Emirates ID", "Employment Letter", "Bank Statement", "Portfolio"],
    profileImage: "/api/placeholder/100/100",
    rating: 4.7,
    totalRentPaid: 660000,
    averagePaymentTime: 1,
    preferredLanguage: "Arabic",
    preferredContact: "Email",
    specialRequirements: "Natural lighting",
    pets: false,
    smoking: false,
    visitors: "Regular",
    maintenanceHistory: [
      { date: "2024-04-20", type: "Balcony Door", status: "Completed", cost: 600 }
    ],
    paymentHistory: [
      { date: "2024-06-15", amount: 110000, status: "Paid", method: "Bank Transfer" },
      { date: "2024-05-15", amount: 110000, status: "Paid", method: "Bank Transfer" },
      { date: "2024-04-15", amount: 110000, status: "Paid", method: "Bank Transfer" }
    ]
  },
  {
    id: 6,
    name: "David Johnson",
    email: "d.johnson@email.com",
    phone: "+971 58 123 4567",
    emiratesId: "784-1987-6789012-3",
    nationality: "American",
    dateOfBirth: "1987-09-12",
    gender: "Male",
    maritalStatus: "Married",
    occupation: "Investment Banker",
    company: "Dubai Financial Services",
    emergencyContact: "+971 50 999 0000",
    emergencyName: "Lisa Johnson",
    property: "DIFC Financial Center",
    unit: "Unit 1205",
    address: "Dubai International Financial Centre, Dubai, UAE",
    leaseStart: "2024-04-01",
    leaseEnd: "2025-03-31",
    leaseDuration: 12,
    monthlyRent: 180000,
    securityDeposit: 360000,
    rentPaid: 540000,
    rentDue: 0,
    lastPayment: "2024-06-01",
    nextPayment: "2024-07-01",
    paymentMethod: "Bank Transfer",
    bankAccount: "****2468",
    status: "active",
    kycStatus: "verified",
    paymentStatus: "current",
    leaseStatus: "active",
    satisfaction: 4.5,
    communication: "good",
    maintenanceRequests: 0,
    complaints: 0,
    latePayments: 0,
    leaseRenewals: 0,
    moveInDate: "2024-04-01",
    moveOutDate: null,
    notes: "High-value tenant, corporate lease",
    preferences: ["Premium location", "Business facilities", "Parking", "Security"],
    documents: ["Passport", "Visa", "Employment Letter", "Bank Statement", "Company Letter"],
    profileImage: "/api/placeholder/100/100",
    rating: 4.5,
    totalRentPaid: 540000,
    averagePaymentTime: 1,
    preferredLanguage: "English",
    preferredContact: "Email",
    specialRequirements: "Premium parking",
    pets: false,
    smoking: false,
    visitors: "Business",
    maintenanceHistory: [],
    paymentHistory: [
      { date: "2024-06-01", amount: 180000, status: "Paid", method: "Bank Transfer" },
      { date: "2024-05-01", amount: 180000, status: "Paid", method: "Bank Transfer" },
      { date: "2024-04-01", amount: 180000, status: "Paid", method: "Bank Transfer" }
    ]
  }
];

const tenantStatuses = ["All", "Active", "Expiring", "Overdue", "Inactive"];
const kycStatuses = ["All", "Verified", "Pending", "Rejected"];
const paymentStatuses = ["All", "Current", "Overdue", "Partial"];
const sortOptions = ["Newest First", "Name", "Rent", "Lease End", "Rating", "Satisfaction", "Move In Date"];

/** Prefer total collected deposits, then contract deposit, then legacy security deposit field. */
function leaseDepositDisplayAmount(lease: Record<string, unknown>): number {
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const total = n(lease.totalDeposits);
  const dep = n(lease.depositAmount);
  const sec = n(lease.securityDeposit);
  if (total > 0) return total;
  if (dep > 0) return dep;
  return sec;
}

export default function Tenants() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedKycStatus, setSelectedKycStatus] = useState("All");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("All");
  const [sortBy, setSortBy] = useState("Newest First");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showTenantDetails, setShowTenantDetails] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  
  // API state
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearchQuery(searchQuery), 400);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, selectedStatus, selectedKycStatus, selectedPaymentStatus]);
  
  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<any>(null);

  // Fetch tenants from API
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true);
        const params = {
          page,
          limit: itemsPerPage,
          search: debouncedSearchQuery || undefined,
          status: selectedStatus !== "All" ? selectedStatus.toLowerCase() : undefined,
          kycStatus: selectedKycStatus !== "All" ? selectedKycStatus.toLowerCase() : undefined,
          paymentStatus: selectedPaymentStatus !== "All" ? selectedPaymentStatus.toLowerCase() : undefined,
          forceRefresh: refreshTrigger > 0 ? true : undefined
        };
        const response = await tenantsAPI.getAll(params);
        
        console.log('API Response:', response.data); // Debug log
        
        const responseData = response.data?.data || response.data;
        const tenantsArray = responseData.tenants || responseData.data || [];
        
        // Update pagination info
        if (responseData.pagination) {
           setTotalPages(responseData.pagination.pages || 1);
           setTotalItems(responseData.pagination.total || 0);
        } else if (response.data.count || response.data.total) {
           const count = response.data.count || response.data.total;
           setTotalPages(Math.ceil(count / itemsPerPage));
           setTotalItems(count);
        }

        // Map backend data to frontend format
        const mappedTenants = tenantsArray.map((tenant: any) => {
          const activeLease = tenant.leases && tenant.leases.length > 0 ? tenant.leases[0] : null;
          
          return {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            phone: tenant.phone,
            property: activeLease?.unit?.property || null,
            unit: activeLease?.unit?.unitNumber || null,
            monthlyRent: activeLease?.monthlyRent || 0,
            leaseStart: activeLease?.startDate || null,
            leaseEnd: activeLease?.endDate || null,
            leaseStatus: activeLease?.status || 'inactive',
            status: tenant.status || 'active',
            kycStatus:
              tenant.kycStatus ||
              (tenant.documents && typeof tenant.documents === "object" && tenant.documents !== null
                ? (tenant.documents as { kycStatus?: string; kyc_status?: string }).kycStatus ||
                  (tenant.documents as { kyc_status?: string }).kyc_status
                : undefined) ||
              "pending",
            paymentStatus: tenant.paymentStatus || 'current',
            nationality: tenant.nationality || null,
            occupation: tenant.jobTitle || null,
            company: tenant.company || null,
            rating: tenant.rating || 0,
            satisfaction: tenant.satisfaction || 0,
            moveInDate: activeLease?.startDate || null,
            profileImage: null,
            visaStatus: tenant.visaStatus,
            emiratesId: tenant.emiratesId,
            salary: tenant.salary,
            employer: tenant.employer,
            emergencyContact: tenant.emergencyContact || null,
            emergencyPhone: tenant.emergencyPhone || null,
            emergencyName: tenant.emergencyContact,
            address: tenant.address || null,
            city: tenant.city,
            emirate: tenant.emirate,
            notes: tenant.notes,
            documents: tenant.documents,
            securityDeposit: activeLease?.securityDeposit || 0,
            leaseDuration: activeLease?.duration || 0,
            allLeases: tenant.leases || [],
            dateOfBirth: tenant.dateOfBirth || null,
            gender: tenant.gender || null,
            maritalStatus: tenant.maritalStatus || null,
            maintenanceRequests: 0,
            latePayments: 0,
            preferredLanguage: 'English',
            preferredContact: 'Email',
            createdAt: tenant.created_at || tenant.createdAt
          };
        });
        
        setTenants(mappedTenants);
      } catch (err) {
        console.error('Error fetching tenants:', err);
        setError('Failed to fetch tenants');
        // Fallback to mock data
        setTenants(mockTenants);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    const fetchStats = async () => {
      try {
        const response = await tenantsAPI.getStats();
        setStats(response.data.data || response.data);
      } catch (err) {
        console.error('Error fetching tenant stats:', err);
      }
    };

    fetchTenants();
    fetchStats();
  }, [page, itemsPerPage, debouncedSearchQuery, selectedStatus, selectedKycStatus, selectedPaymentStatus, refreshTrigger]);

   // Filter locally for search only if backend search is not enough or for other complex filters not yet on backend
   // However, since we are doing server-side pagination, we should rely on backend for filtering.
   // But the current backend implementation might only support basic search. 
   // For now, let's keep client-side filtering logic minimal or assume backend handles it.
   // If backend handles search/status, valid.
   // The 'filteredTenants' variable is used for rendering.
   // If we rely on backend, 'tenants' state already contains the filtered page.
   // So 'filteredTenants' should just be 'tenants' unless we want to do extra client-side filtering 
   // (which breaks pagination if not careful).
   // Let's assume 'tenants' IS the filtered list from backend.
  // Since we are using server-side filtering and pagination, we mainly use this for client-side sorting of the current page.
  // Since we are using server-side filtering and pagination, we mainly use this for client-side sorting of the current page.
  const filteredTenants = [...tenants].sort((a, b) => {
      switch (sortBy) {
        case "Rent":
          return b.monthlyRent - a.monthlyRent;
        case "Lease End":
          return new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime();
        case "Rating":
          return b.rating - a.rating;
        case "Satisfaction":
          return b.satisfaction - a.satisfaction;
        case "Move In Date":
          return new Date(b.moveInDate).getTime() - new Date(a.moveInDate).getTime();
        case "Newest First":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const totalTenants = stats?.total || tenants.length;
  const activeTenants = stats?.active || tenants.filter(t => t.status === "active").length;
  const totalRent = tenants.reduce((sum, tenant) => sum + (tenant.monthlyRent || 0), 0);
  const averageSatisfaction = tenants.length > 0 ? tenants.reduce((sum, tenant) => sum + (tenant.satisfaction || 0), 0) / tenants.length : 0;
  const overdueTenants = tenants.filter(t => t.paymentStatus === "overdue").length;
  const expiringLeases = tenants.filter(t => t.leaseStatus === "expiring").length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "expiring":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case "verified":
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
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
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setShowTenantDetails(true);
  };
  const handleSendMessage = (tenant: any) => {
    console.log("Send message to:", tenant);
  };

  const handleCallTenant = (tenant: any) => {
    console.log("Call tenant:", tenant);
  };

  const handleExport = async () => {
    try {
      const response = await tenantsAPI.export();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'tenants.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Tenants exported successfully");
    } catch (error) {
      console.error("Error exporting tenants:", error);
      toast.error("Failed to export tenants");
    }
  };

  const handleDownloadTemplate = () => {
    const template = [{
      'Name': 'John Doe',
      'Email': 'john@example.com', 
      'Phone': '+971 50 123 4567',
      'Emirates ID': '784-1234-1234567-1',
      'Nationality': 'UAE',
      'Company': 'Example Corp',
      'Status': 'active'
    }];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, 'tenants_import_template.xlsx');
    toast.success("Template downloaded successfully");
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error('Invalid file format. Please upload an Excel file (.xlsx or .xls)');
      event.target.value = ''; // Reset input
      return;
    }

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await tenantsAPI.import(formData);
      
      const { success, failed, errors } = response.data.data;
      
      if (failed === 0) {
          toast.success(`Successfully imported ${success} tenants.`);
      } else {
         toast.error(`Import failed for ${failed} rows: ${errors.join(', ')}`);
         console.error('Import errors:', errors);
      }
      
      // Refresh list without reloading the page
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error: any) {
      console.error("Error importing tenants:", error);
      toast.error(error.response?.data?.message || "Failed to import tenants.");
    } finally {
        setIsImporting(false);
        if (event.target) {
            event.target.value = ''; // Safely reset input
        }
    }
  };

  const confirmDeleteTenant = (tenant: any) => {
    setTenantToDelete(tenant);
    setShowDeleteDialog(true);
  };

  const handleDeleteTenant = async () => {
    if (!tenantToDelete?.id) return;
    
    try {
      await tenantsAPI.delete(tenantToDelete.id);
      toast.success("Tenant deleted successfully");
      setShowDeleteDialog(false);
      setTenantToDelete(null);
      
      // Refresh list without reloading the page
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error("Error deleting tenant:", error);
      toast.error("Failed to delete tenant");
    }
  };

  const handleAddTenant = () => {
    console.log("🔵 Add Tenant button clicked");
    setFormMode("create");
    setSelectedTenant(null);
    setShowTenantForm(true);
    console.log("✅ Tenant form state set to open");
  };

  const handleEditTenant = async (tenant: any) => {
    try {
      // Fetch full tenant data from API, skipping cache to get latest values
      const response = await tenantsAPI.getById(tenant.id, true);
      const tenantData = response.data?.data || response.data;
      
      console.log("✅ Loaded tenant for edit:", tenantData);
      
      setSelectedTenant(tenantData);
      setFormMode("edit");
      setShowTenantForm(true);
    } catch (error: any) {
      console.error("❌ Error loading tenant:", error);
      toast.error("Failed to load tenant details");
    }
  };

  const handleTenantSubmit = async (data: any) => {
    try {
      if (formMode === "create") {
        await tenantsAPI.create(data);
        toast.success("Tenant created successfully");
      } else {
        await tenantsAPI.update(selectedTenant.id, data);
        toast.success("Tenant updated successfully");
      }
      
      // Refresh list using the established refresh mechanism
      setRefreshTrigger(prev => prev + 1);
      setShowTenantForm(false);
      setSelectedTenant(null);
    } catch (err) {
      console.error('Error saving tenant:', err);
      toast.error('Failed to save tenant');
      setError('Failed to save tenant');
    }
  };

  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tenants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header">
        <div>
          <h1 className="uiux-page-title">Tenants</h1>
          <p className="uiux-page-subtitle">Manage tenant relationships and communications</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleUploadClick}>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            accept=".xlsx,.xls"
          />
          <Button variant="cta" onClick={handleAddTenant}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tenant
        </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 uiux-card-grid">
        <div
          className="uiux-stat-card"
          style={{ "--card-accent-color": "#1E3A72", "--card-accent-bg": "#DBEAFE" } as CSSProperties}
        >
          <p className="uiux-stat-card-label">Total Tenants</p>
          <p className="uiux-stat-card-value text-3xl">{totalTenants}</p>
          <p className="uiux-stat-card-sub">{activeTenants} active</p>
          <div className="uiux-stat-card-icon" aria-hidden>
            <Users className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        </div>
        <div
          className="uiux-stat-card"
          style={{ "--card-accent-color": "#16A34A", "--card-accent-bg": "#DCFCE7" } as CSSProperties}
        >
          <p className="uiux-stat-card-label">Monthly Rent</p>
          <p className="uiux-stat-card-value uiux-stat-card-value-currency text-2xl">AED {totalRent.toLocaleString()}</p>
          <p className="uiux-stat-card-sub">Total collection</p>
          <div className="uiux-stat-card-icon" aria-hidden>
            <Banknote className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        </div>
        <div
          className="uiux-stat-card"
          style={{ "--card-accent-color": "#C9922B", "--card-accent-bg": "#FEF3C7" } as CSSProperties}
        >
          <p className="uiux-stat-card-label">Satisfaction</p>
          <p className="uiux-stat-card-value text-3xl">{averageSatisfaction.toFixed(1)}/5</p>
          <p className="uiux-stat-card-sub flex items-center gap-1">
            <Star className="h-3 w-3 text-[var(--color-gold-500)] fill-current" />
            Average
          </p>
          <div className="uiux-stat-card-icon" aria-hidden>
            <Star className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        </div>
        <div
          className="uiux-stat-card"
          style={{ "--card-accent-color": "#DC2626", "--card-accent-bg": "#FEE2E2" } as CSSProperties}
        >
          <p className="uiux-stat-card-label">Overdue</p>
          <p className="uiux-stat-card-value text-3xl">{overdueTenants}</p>
          <p className="uiux-stat-card-sub">Payments pending</p>
          <div className="uiux-stat-card-icon" aria-hidden>
            <AlertCircle className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        </div>
        <div
          className="uiux-stat-card"
          style={{ "--card-accent-color": "#7C3AED", "--card-accent-bg": "#EDE9FE" } as CSSProperties}
        >
          <p className="uiux-stat-card-label">Expiring</p>
          <p className="uiux-stat-card-value text-3xl">{expiringLeases}</p>
          <p className="uiux-stat-card-sub">Leases ending soon</p>
          <div className="uiux-stat-card-icon" aria-hidden>
            <Clock className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 uiux-filter-row">
        <div className="uiux-search-bar-wrap">
          <Search className="uiux-search-icon" strokeWidth={1.5} />
          <input
            type="search"
            placeholder="Search tenants, properties, or contact info..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="uiux-search-input"
            autoComplete="off"
          />
        </div>

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

          <div className="uiux-view-toggle">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0 shadow-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0 shadow-none"
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
                  {tenantStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">KYC Status</label>
              <Select value={selectedKycStatus} onValueChange={setSelectedKycStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kycStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Payment Status</label>
              <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
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
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedStatus("All");
                  setSelectedKycStatus("All");
                  setSelectedPaymentStatus("All");
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tenants Display */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTenants.map((tenant) => (
            <div key={tenant.id} className="uiux-record-card group">
                {/* Tenant Header */}
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={tenant.profileImage} />
                      <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                      {getInitials(tenant.name)}
                    </AvatarFallback>
                  </Avatar>
                      <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {tenant.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">{typeof tenant.property === "string" ? tenant.property : tenant.property?.title || "—"}</p>
                      <p className="text-xs text-muted-foreground">{tenant.unit}</p>
                    </div>
                      </div>
                  <div className="flex gap-1">
                    <Badge className={getStatusColor(tenant.status)}>
                          {tenant.status}
                        </Badge>
                    <Badge className={getKycStatusColor(tenant.kycStatus)}>
                          <FileCheck className="h-3 w-3 mr-1" />
                          {tenant.kycStatus}
                        </Badge>
                      </div>
                    </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                    <span className="truncate">{tenant.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{tenant.phone}</span>
                      </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Lease: {tenant.leaseStart} - {tenant.leaseEnd}</span>
                      </div>
                    </div>

                {/* Financial Info */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 rounded-lg bg-[var(--color-bg-subtle)] border border-[rgba(13,21,38,0.06)]">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Rent</p>
                    <p className="text-lg font-bold font-mono text-foreground">AED {tenant.monthlyRent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Status</p>
                    <Badge className={getPaymentStatusColor(tenant.paymentStatus)}>
                      {tenant.paymentStatus}
                    </Badge>
                  </div>
                </div>

                {/* Rating & Satisfaction */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">{tenant.rating}</span>
                    <span className="text-xs text-muted-foreground">({tenant.satisfaction}/5)</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tenant.nationality} • {tenant.occupation}
                  </div>
                      </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewTenant(tenant)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSendMessage(tenant)}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCallTenant(tenant)}>
                    <Phone className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleViewTenant(tenant)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Tenant
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendMessage(tenant)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCallTenant(tenant)}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call Tenant
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Receipt className="h-4 w-4 mr-2" />
                        Payment History
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <History className="h-4 w-4 mr-2" />
                        Maintenance History
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => confirmDeleteTenant(tenant)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Tenant
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            </div>
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
                  <th className="text-left p-6 font-medium text-muted-foreground">Tenant</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Property</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Contact</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Rent</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Rating</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={tenant.profileImage} />
                          <AvatarFallback className="bg-gradient-primary text-white">
                            {getInitials(tenant.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">{tenant.nationality}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="font-medium text-foreground">{tenant.property}</p>
                        <p className="text-sm text-muted-foreground">{tenant.unit}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{tenant.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{tenant.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="font-medium">AED {tenant.monthlyRent.toLocaleString()}</p>
                        <Badge className={getPaymentStatusColor(tenant.paymentStatus)}>
                          {tenant.paymentStatus}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusColor(tenant.status)}>
                          {tenant.status}
                        </Badge>
                        <Badge className={getKycStatusColor(tenant.kycStatus)}>
                          <FileCheck className="h-3 w-3 mr-1" />
                          {tenant.kycStatus}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{tenant.rating}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewTenant(tenant)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditTenant(tenant)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleSendMessage(tenant)}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleViewTenant(tenant)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Tenant
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendMessage(tenant)}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallTenant(tenant)}>
                              <Phone className="h-4 w-4 mr-2" />
                              Call Tenant
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Receipt className="h-4 w-4 mr-2" />
                              Payment History
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <History className="h-4 w-4 mr-2" />
                              Maintenance History
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => confirmDeleteTenant(tenant)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Tenant
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
      {filteredTenants.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Tenants Found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search criteria or add a new tenant.
          </p>
          <Button className="bg-gradient-primary shadow-glow">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Tenant
                        </Button>
        </Card>
      )}

      {/* Tenant Details Modal */}
      {showTenantDetails && selectedTenant && (
        <Dialog open={showTenantDetails} onOpenChange={setShowTenantDetails}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedTenant.profileImage} />
                  <AvatarFallback className="bg-gradient-primary text-white">
                    {getInitials(selectedTenant.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{selectedTenant.name}</h2>
                  <p className="text-muted-foreground">
                    {[selectedTenant.property, selectedTenant.unit].filter(Boolean).join(" - ")}
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="lease">Lease Details</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                <TabsTrigger value="communication">Communication</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {selectedTenant.emiratesId && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Emirates ID</p>
                            <p className="font-medium">{selectedTenant.emiratesId}</p>
                          </div>
                        )}
                        {selectedTenant.visaStatus && (
                          <div className="flex flex-col">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Visa Status</p>
                              <p className="font-medium capitalize">{selectedTenant.visaStatus}</p>
                            </div>
                            {selectedTenant.visaExpiry && (
                              <div className="mt-1">
                                <p className="text-xs text-muted-foreground italic">Expires: {selectedTenant.visaExpiry}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {selectedTenant.nationality && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Nationality</p>
                            <p className="font-medium">{selectedTenant.nationality}</p>
                          </div>
                        )}
                        {selectedTenant.passportNumber && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Passport Number</p>
                            <p className="font-medium">{selectedTenant.passportNumber}</p>
                          </div>
                        )}
                        {selectedTenant.dateOfBirth && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                            <p className="font-medium">{selectedTenant.dateOfBirth}</p>
                          </div>
                        )}
                        {selectedTenant.gender && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Gender</p>
                            <p className="font-medium">{selectedTenant.gender}</p>
                          </div>
                        )}
                        {selectedTenant.maritalStatus && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Marital Status</p>
                            <p className="font-medium">{selectedTenant.maritalStatus}</p>
                          </div>
                        )}
                      </div>
                      {(selectedTenant.occupation || selectedTenant.company || selectedTenant.salary || selectedTenant.employer) && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-2 gap-4">
                            {(selectedTenant.occupation || selectedTenant.employer) && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Occupation / Employer</p>
                                <p className="font-medium">{selectedTenant.occupation || selectedTenant.employer}</p>
                              </div>
                            )}
                            {selectedTenant.company && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Company</p>
                                <p className="font-medium">{selectedTenant.company}</p>
                              </div>
                            )}
                            {selectedTenant.salary > 0 && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Monthly Salary</p>
                                <p className="font-medium text-green-600 font-semibold">AED {selectedTenant.salary.toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {selectedTenant.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedTenant.email}</span>
                          </div>
                        )}
                        {selectedTenant.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedTenant.phone}</span>
                          </div>
                        )}
                        {selectedTenant.emergencyName && (
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Emergency: {selectedTenant.emergencyName}</span>
                          </div>
                        )}
                        {selectedTenant.emergencyContact && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedTenant.emergencyContact}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Tenant Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{selectedTenant.rating}</p>
                        <p className="text-sm text-muted-foreground">Rating</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{selectedTenant.satisfaction}/5</p>
                        <p className="text-sm text-muted-foreground">Satisfaction</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{selectedTenant.maintenanceRequests}</p>
                        <p className="text-sm text-muted-foreground">Maintenance Requests</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{selectedTenant.latePayments}</p>
                        <p className="text-sm text-muted-foreground">Late Payments</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="lease" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lease Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(!selectedTenant.allLeases || selectedTenant.allLeases.length === 0) ? (
                      <div className="py-8 text-center flex flex-col items-center justify-center space-y-4 border-2 border-dashed rounded-xl bg-muted/30">
                        <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                          <FileCheck className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="max-w-xs mx-auto">
                          <h3 className="text-lg font-semibold">No Lease History</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            This tenant doesn't have any lease agreements yet.
                          </p>
                        </div>
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white shadow-glow"
                          onClick={() => {
                            navigate("/leases", { 
                              state: { 
                                action: 'createLease', 
                                tenant: selectedTenant 
                              } 
                            });
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Lease for this Tenant
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {[...selectedTenant.allLeases]
                          .sort((a, b) => {
                            if (a.status === 'active' && b.status !== 'active') return -1;
                            if (a.status !== 'active' && b.status === 'active') return 1;
                            return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
                          })
                          .map((lease, index) => (
                            <div 
                              key={lease.id} 
                              className={`p-4 border rounded-xl transition-all ${
                                lease.status === 'active' 
                                  ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100 shadow-sm" 
                                  : "bg-white border-gray-100 opacity-80"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-lg">{lease.unit?.property?.title || selectedTenant.property || "Property Name"}</h4>
                                    <Badge className={
                                      lease.status === 'active' 
                                        ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" 
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                                    }>
                                      {lease.status?.toUpperCase() || "DRAFT"}
                                    </Badge>
                                    {lease.status === 'active' && (
                                      <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">Unit {lease.unit?.unitNumber || selectedTenant.unit} • {lease.leaseNumber}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-muted-foreground">Monthly Rent</p>
                                  <p className="font-bold text-indigo-600 text-lg">AED {Number(lease.rentAmount || lease.monthlyRent || 0).toLocaleString()}</p>
                                </div>
                              </div>

                              <Separator className="my-3 opacity-50" />

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                    <p className="text-sm font-medium">{(lease.startDate || '').split('T')[0]}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="h-3.5 w-3.5 text-red-500" />
                                    <p className="text-sm font-medium">{(lease.endDate || '').split('T')[0]}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</p>
                                  <p className="text-sm font-medium mt-1">{lease.duration} Months</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deposit</p>
                                  <p className="text-sm font-medium mt-1">
                                    AED {leaseDepositDisplayAmount(lease as Record<string, unknown>).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        
                        <div className="pt-2">
                           <Button 
                            variant="outline"
                            className="w-full border-dashed border-2 py-6 hover:bg-blue-50 hover:border-blue-300 group rounded-xl"
                            onClick={() => {
                              navigate("/leases", { 
                                state: { 
                                  action: 'createLease', 
                                  tenant: selectedTenant 
                                } 
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2 group-hover:scale-125 transition-transform" />
                            Create New Lease Agreement
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
          </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-6">
                <PaymentHistory tenant={selectedTenant} />
              </TabsContent>

              <TabsContent value="maintenance" className="space-y-6">
                <MaintenanceHistory tenant={selectedTenant} />
              </TabsContent>

              <TabsContent value="communication" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Communication Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTenant.preferredLanguage && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Preferred Language</p>
                          <p className="font-medium">{selectedTenant.preferredLanguage}</p>
                        </div>
                      )}
                      {selectedTenant.preferredContact && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Preferred Contact</p>
                          <p className="font-medium">{selectedTenant.preferredContact}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                      <Button variant="outline">
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                      <Button variant="outline">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Pagination Controls */}
      {!loading && tenants.length > 0 && viewMode !== "map" && (
        <Card className="mt-6">
          <div className="p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{((page - 1) * itemsPerPage) + 1}</span> to{" "}
              <span className="font-medium">{Math.min(page * itemsPerPage, totalItems)}</span> of{" "}
              <span className="font-medium">{totalItems}</span> tenants
            </div>

            <div className="flex items-center gap-4">
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setPage(1);
              }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tenant Form Modal */}
      <TenantForm
        isOpen={showTenantForm}
        onClose={() => setShowTenantForm(false)}
        onSubmit={handleTenantSubmit}
        initialData={selectedTenant}
        mode={formMode}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tenant
              and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTenant} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}