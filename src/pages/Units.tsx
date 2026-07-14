import { useState, useEffect, useRef, type CSSProperties } from "react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { ListPagination } from "@/components/common/ListPagination";
import {
  NobleXKpiCard,
  NobleXKpiStrip,
  NobleXKpiSkeleton,
  NobleXPageHeader,
} from "@/components/noblex";
import { House as PhHouse, Users as PhUsers, Key as PhKey, Warning as PhWarning, CurrencyCircleDollar as PhCurrencyCircleDollar } from "@phosphor-icons/react";
import { 
  Building2, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Star,
  TrendingUp,
  TrendingDown,
  Banknote,
  Calendar,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Download,
  Upload,
  Settings,
  BarChart3,
  PieChart,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Home,
  Building,
  Store,
  Warehouse,
  Bed,
  Bath,
  Car,
  Square,
  Wifi,
  Shield,
  User,
  Phone,
  Mail,
  FileText,
  Camera,
  Video,
  Share2,
  Heart,
  Bookmark,
  X
} from "lucide-react";
import UnitForm from "@/components/units/UnitForm";
import UnitDetails from "@/components/units/UnitDetails";
import UnitAnalytics from "@/components/units/UnitAnalytics";
import api, { unitsAPI, servicesAPI, propertiesAPI, leasesAPI } from "@/services/api";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

import { cn, resolveImageUrl } from "@/lib/utils";
import { chunkArray, getImportBatchSize, postWithRetry } from "@/utils/bulkImport";
import { useConfirm } from "@/hooks/use-confirm";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Unit {
  id?: number;
  unitNumber: string;
  propertyId: number;
  propertyName?: string;
  type: string;
  category?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  monthlyRent?: number;
  deposit?: number;
  status?: string;
  furnished?: string;
  [key: string]: any;
}

const unitTypes = ["All", "Apartment", "Villa", "Office", "Retail", "Warehouse"];
const unitCategories = [
  "All",
  "6BR",
  "ADV",
  "BASEMENT",
  "Commen Parking Space",
  "COMMON AREA",
  "FLAT",
  "FLOOR",
  "Ground Floor",
  "GYM",
  "HOTEL APARTMENTS",
  "Labour Camp",
  "Mezzanine",
  "OFFICE",
  "Penthouse",
  "SHOP",
  "SHOWROOM",
  "Store",
  "TERACE",
  "WAREHOUSE",
  "Studio",
  "1BR",
  "2BR",
  "3BR",
  "4BR",
  "5BR+",
  "Duplex",
  "Townhouse",
  "Executive Suite",
  "3BR Villa",
  "4BR Villa",
  "5BR Villa",
  "6BR Villa",
];
const statusOptions = ["All", "Available", "Occupied", "Maintenance", "Reserved", "Inactive", "Dispute", "NPA", "Case"];
const sortOptions = ["Unit Number", "Rent", "Area", "Status", "Property", "Last Updated"];

const mapBackendUnitTypeToFrontend = (type: string): string => {
  const typeLower = (type || "").toLowerCase();

  if (typeLower === "studio") return "Studio";
  if (typeLower === "apartment") return "Apartment";
  if (typeLower === "penthouse") return "Penthouse";
  if (typeLower === "villa") return "Villa";
  if (typeLower === "townhouse") return "Townhouse";
  if (typeLower === "duplex") return "Duplex";

  return "Apartment";
};

const mapBackendFurnishedToFrontend = (furnished: boolean): string => {
  return furnished ? "Furnished" : "Unfurnished";
};

const transformUnitForDisplay = (unit: any): Unit => {
  let images = unit.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [];
    }
  }
  if (!Array.isArray(images)) {
    images = [];
  }

  let status = "Available";
  if (unit.status) {
    const normalizedStatus = String(unit.status).toLowerCase();
    if (normalizedStatus === "npa") status = "NPA";
    else if (normalizedStatus === "inactive") status = "Inactive";
    else status = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1).toLowerCase();
  }

  if (status === "Occupied" && (!unit.leases || unit.leases.length === 0)) {
    status = "Available";
  }

  return {
    ...unit,
    type: mapBackendUnitTypeToFrontend(unit.type),
    status,
    furnished: mapBackendFurnishedToFrontend(unit.furnished),
    propertyName: unit.property?.title || unit.propertyName || "N/A",
    propertyLocation: unit.property?.location || unit.location || "N/A",
    tenantName: unit.leases?.[0]?.tenant?.name || unit.tenantName || unit.tenant_name || null,
    tenantEmail: unit.leases?.[0]?.tenant?.email || unit.tenantEmail || unit.tenant_email || null,
    tenantPhone: unit.leases?.[0]?.tenant?.phone || unit.tenantPhone || unit.tenant_phone || null,
    monthlyRent: unit.rentAmount || unit.monthlyRent || unit.monthly_rent || unit.rent_amount || 0,
    deposit: unit.depositAmount || unit.deposit || unit.deposit_amount || 0,
    floor: unit.floor ?? unit.floorNumber ?? unit.floor_number ?? unit.level ?? 0,
    marketValue: unit.marketValue || unit.market_value || 0,
    roi: unit.roi || 0,
    orientation: unit.orientation || "N/A",
    energyRating: unit.energyRating || unit.energy_rating || "N/A",
    maintenanceStatus: unit.maintenanceStatus || unit.maintenance_status || "N/A",
    lastMaintenance: unit.lastMaintenance || unit.last_maintenance || null,
    nextInspection: unit.nextInspection || unit.next_inspection || null,
    maintenanceRequests: unit.maintenanceRequests || unit.maintenance_requests || 0,
    leaseDuration: unit.leaseDuration || unit.lease_duration || null,
    leaseStartDate: unit.leaseStartDate || unit.lease_start_date || unit.lease_start || null,
    leaseEndDate: unit.leaseEndDate || unit.lease_end_date || unit.lease_end || null,
    virtualTourUrl: unit.virtualTourUrl || unit.virtual_tour_url || "",
    images,
  };
};

const ImageCarousel = ({ 
  images, 
  alt, 
  className = "" 
}: { 
  images: string[]; 
  alt: string; 
  className?: string 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images?.length) {
    return (
      <div className={cn("w-full h-full bg-gray-100 flex items-center justify-center text-gray-400", className)}>
        <Home className="h-10 w-10 opacity-40" />
      </div>
    );
  }

  const next = (e: any) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % images.length);
  };

  const prev = (e: any) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={cn("relative w-full h-full min-h-[192px] overflow-hidden group", className)}>
      <img
        src={resolveImageUrl(images[currentIndex])}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        onError={e => (e.currentTarget.src = "/placeholder.svg?text=No+Image")}
      />

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === currentIndex ? "bg-white w-5" : "bg-white/50 hover:bg-white/80"
                )}
                onClick={e => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function Units() {
  const { t } = useTranslation();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedProperty, setSelectedProperty] = useState("All");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState("All");
  const [unitOptions, setUnitOptions] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState("Unit Number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showUnitDetails, setShowUnitDetails] = useState(false);
  const [showUnitAnalytics, setShowUnitAnalytics] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  

  const [properties, setProperties] = useState<any[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState("30d");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importBatchProgress, setImportBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const { confirm, isOpen: isConfirmOpen, options: confirmOptions, onConfirm, onCancel } = useConfirm();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response: any = await api.get("/units/property-options", {
        skipCache: true
      } as any);
      const rd = response.data;
      const props = rd?.data?.properties || rd?.properties || [];
      setProperties(Array.isArray(props) ? props : []);
    } catch (error: any) {
      if (error?.cached && error?.data) {
        const cd = error.data;
        const props = cd?.data?.properties || cd?.properties || [];
        setProperties(Array.isArray(props) ? props : []);
      } else {
        console.error("Error fetching properties:", error);
      }
    }
  };

  const fetchUnitOptions = async (propertyId?: string) => {
    try {
      const params: any = {};
      if (propertyId && propertyId !== 'All') params.propertyId = propertyId;
      const response: any = await api.get("/units/unit-options", {
        params,
        skipCache: true
      } as any);
      const rd = response.data;
      const opts = rd?.data?.units || rd?.units || [];
      setUnitOptions(Array.isArray(opts) ? opts : []);
    } catch (error: any) {
      if (error?.cached && error?.data) {
        const cd = error.data;
        const opts = cd?.data?.units || cd?.units || [];
        setUnitOptions(Array.isArray(opts) ? opts : []);
      } else {
        console.error("Error fetching unit options:", error);
      }
    }
  };

  useEffect(() => {
    fetchUnitOptions(selectedProperty);
    setSelectedUnitFilter("All");
  }, [selectedProperty]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchUnits();
    fetchStats();
  }, [currentPage, itemsPerPage, selectedStatus, selectedType, selectedProperty, selectedCategory, selectedUnitFilter, debouncedSearchQuery]);

  useEffect(() => {
    if (!showUnitAnalytics) return;
    fetchStats(analyticsTimeRange);
  }, [showUnitAnalytics, analyticsTimeRange]);

  const buildUnitQueryParams = (pageNumber: number, limit: number, forceRefresh = false) => {
    const params: any = {
      page: pageNumber,
      limit,
      search: debouncedSearchQuery || undefined,
      includeLease: true,
      includeImages: true,
    };

    if (selectedStatus && selectedStatus !== "All") params.status = selectedStatus.toLowerCase();
    if (selectedType && selectedType !== "All") params.type = selectedType.toLowerCase();
    if (selectedProperty && selectedProperty !== "All") params.propertyId = selectedProperty;
    if (selectedUnitFilter && selectedUnitFilter !== "All") params.unitId = selectedUnitFilter;
    if (selectedCategory && selectedCategory !== "All") params.category = selectedCategory;
    if (forceRefresh) params._t = Date.now();

    return params;
  };

    const fetchStats = async (timeRange = analyticsTimeRange) => {
    try {
      setAnalyticsLoading(true);
      const params: any = { _t: Date.now() };
      if (selectedProperty && selectedProperty !== "All") {
        params.propertyId = selectedProperty;
      }
      if (timeRange) {
        params.timeRange = timeRange;
      }
      
      const response: any = await unitsAPI.getStats(params);
      if (response.data?.success && response.data?.data) {
        setAnalyticsData(response.data.data);
      } else if (response.data) {
         // Handle case where data might be directly returned or in a different structure
         setAnalyticsData(response.data);
      }
    } catch (error) {
      console.error("Error fetching unit stats:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchUnits = async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (forceRefresh) {
        setUnits([]); // Clear UI to show reload
      }

      const params = buildUnitQueryParams(currentPage, itemsPerPage, forceRefresh);

      const response = await unitsAPI.getAll(params);
      let unitsData = 
        response.data?.data?.units ||    
        response.data?.units ||          
        response.data?.rows ||            
        response.data || 
        [];
    
      const paginationData = response.data?.data?.pagination || response.data?.pagination;
      if (paginationData) {
        setTotalItems(paginationData.total || 0);
        setTotalPages(paginationData.pages || 0);
      }
      
      if (Array.isArray(unitsData)) {
        unitsData = unitsData.map(transformUnitForDisplay);
      }
      
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      if (unitsData.length > 0) {
        toast.success(`${unitsData.length} units loaded successfully`);
      } else {
        toast.info("No units found");
      }
    } catch (error: any) {
      console.error("Error fetching units:", error);
      toast.error(error.response?.data?.message || "Failed to load units");
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort units (Filtering handled by backend now)
  const filteredUnits = [...units].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case "Unit Number":
        aValue = a.unitNumber;
        bValue = b.unitNumber;
        break;
      case "Rent":
        aValue = a.monthlyRent;
        bValue = b.monthlyRent;
        break;
      case "Area":
        aValue = a.area;
        bValue = b.area;
        break;
      case "Status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "Property":
        aValue = a.propertyName;
        bValue = b.propertyName;
        break;
      default:
        aValue = a.unitNumber;
        bValue = b.unitNumber;
    }
    
    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Calculate analytics
  // Calculate analytics - Use backend data if available, fall back to local (though local is paginated and inaccurate for totals)
  // We prefer backend data for the cards.
  const summary = analyticsData?.summary || {};
  
  const totalUnits = summary.total || units.length; // Fallback only if stats fail
  const occupiedUnits = summary.occupied || units.filter(u => u.status === "Occupied").length;
  const availableUnits = summary.available || units.filter(u => u.status === "Available").length; 
  const disputeUnits = summary.dispute || units.filter(u => u.status === "Dispute").length;
  // Backend returns lowercase status keys in summary count if I used the previous logic? 
  // Wait, my backend logic explicitly put them in `summary` object: `occupied`, `available`. 
  // Frontend previously filtered by string "Occupied".
  
  const totalRevenue = summary.totalRevenue || units.filter(u => u.status === "Occupied").reduce((sum, unit) => sum + unit.monthlyRent, 0);
  const averageRent = summary.averageRent || (totalRevenue / (occupiedUnits || 1)) || 0;
  const occupancyRate = summary.occupancyRate || ((occupiedUnits / (totalUnits || 1)) * 100);


  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Apartment": return Home;
      case "Villa": return Building;
      case "Office": return Building2;
      case "Retail": return Store;
      case "Warehouse": return Warehouse;
      default: return Home;
    }
  };

  const handleViewUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setShowUnitDetails(true);
  };

  const handleEditUnit = async (unit: Unit) => {
    try {
      if (unit.id) {
        const response = await unitsAPI.getById(unit.id);
        const unitData = response.data?.data || response.data?.unit || response.data;
        setSelectedUnit(unitData);
      } else {
        setSelectedUnit(unit);
      }
      setFormMode("edit");
      setShowUnitForm(true);
    } catch (error: any) {
      console.error("❌ Error loading unit:", error);
      toast.error("Failed to load unit details");
    }
  };

  const handleAddUnit = () => {
    setSelectedUnit(null);
    setFormMode("create");
    setShowUnitForm(true);
  };

  const handleUnitSubmit = async (data: any) => {
    try {
      const mapTypeToBackendEnum = (type: string): string => {
        const typeLower = (type || '').toLowerCase();
      
        if (typeLower.includes('apartment')) return 'apartment';
        if (typeLower.includes('studio')) return 'studio';
        if (typeLower.includes('penthouse')) return 'penthouse';
        if (typeLower.includes('villa')) return 'villa';
        if (typeLower.includes('townhouse')) return 'townhouse';
        if (typeLower.includes('duplex')) return 'duplex';
        
        return 'apartment';
      };
      

      const mapFurnishedToBoolean = (furnished: string): boolean => {
        if (!furnished) return false;
        const furnishedLower = furnished.toLowerCase();
        return furnishedLower.includes('furnished') && !furnishedLower.includes('unfurnished');
      };
      

      const backendData = {
        unitNumber: data.unitNumber,
        propertyId: parseInt(data.propertyId),
        type: mapTypeToBackendEnum(data.type), 
        category: data.category || '', 
        floor: parseInt(data.floor) || 0,
        bedrooms: parseInt(data.bedrooms) || 0,
        bathrooms: parseInt(data.bathrooms) || 0,
        area: parseFloat(data.area) || 0,
        areaUnit: data.areaUnit || 'sqft',  
        status: data.status || 'available',  
        rentAmount: parseFloat(data.monthlyRent) || 0,
        depositAmount: parseFloat(data.deposit) || 0,
        marketValue: parseFloat(data.marketValue) || 0, 
        utilities: {},
        amenities: data.amenities || [],
        features: data.features || [], 
        description: data.description || '',
        specialNotes: data.specialNotes || '',
        images: data.images || [],  
        floorPlan: data.floorPlan ? 'yes' : '', 
        orientation: data.orientation || '',  
        energyRating: data.energyRating || '',  
        lastRenovation: data.lastRenovation || '',  
        balcony: Boolean(data.balcony),
        parking: parseInt(data.parking) || 0, 
        furnished: mapFurnishedToBoolean(data.furnished),  
        petFriendly: Boolean(data.petFriendly),
        virtualTour: Boolean(data.virtualTour),  
        smokingAllowed: Boolean(data.smokingAllowed),  
        documents: data.documents || [],  
      };

      let unitId = selectedUnit?.id;
      
      if (formMode === "create") {
        const response = await unitsAPI.create(backendData);
        unitId = response.data?.data?.id || response.data?.id;
        toast.success("Unit created successfully");
      } else if (formMode === "edit" && selectedUnit?.id) {
        await unitsAPI.update(selectedUnit.id, backendData);
        toast.success("Unit updated successfully");
      }


      if (data.services && data.services.length > 0 && unitId) {
        try {
          if (formMode === "edit") {
            const response: any = await servicesAPI.getByEntity('unit', unitId);
            const servicesToDelete = response.data?.data?.services || response.data?.services || [];
            await Promise.all(
              servicesToDelete.map((service: any) => 
                servicesAPI.delete(service.id, true)
              )
            );
          }


          const servicesToCreate = data.services.map((service: any, index: number) => ({
            name: service.name,
            amount: parseFloat(service.amount) || 0,
            isTaxable: Boolean(service.isTaxable),
            billingMethod: service.billingMethod || 'charged_separately',
            description: service.description || '',
            sortOrder: index,
            entityType: 'unit',
            entityId: unitId
          }));

          await servicesAPI.bulkCreate({
            services: servicesToCreate,
            entityType: 'unit',
            entityId: unitId
          });
        } catch (servicesError) {
          console.error("Error saving services:", servicesError);
          toast.error("Unit saved but failed to save services");
        }
      }

      setShowUnitForm(false);
      fetchUnits(true);
    } catch (error: any) {
      console.error("Error saving unit:", error);
      // Throw error so UnitForm can handle it and show correct feedback/prevent closing
      throw error;
    }
  };

  const confirmDeleteUnit = async (unit: Unit) => {
    const confirmed = await confirm({
      title: "Delete Unit",
      description: `Are you sure you want to delete unit ${unit.unitNumber}? This action cannot be undone.`,
      variant: "destructive",
      confirmText: "Delete",
      cancelText: "Cancel"
    });

    if (confirmed) {
      try {
        await unitsAPI.delete(unit.id!);
        toast.success("Unit deleted successfully");
        fetchUnits(true);
      } catch (error) {
        console.error("Error deleting unit:", error);
        toast.error("Failed to delete unit");
      }
    }
  };



  const handleViewAnalytics = () => {
    setShowUnitAnalytics(true);
  };

  // Export units to Excel
  const handleExport = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      const exportLimit = 100;
      let currentExportPage = 1;
      let totalExportPages = 1;
      let allUnits: Unit[] = [];

      do {
        const response = await unitsAPI.getAll(buildUnitQueryParams(currentExportPage, exportLimit));
        const responseData = (response as any).data || {};
        const pageUnits = Array.isArray(responseData.units)
          ? responseData.units.map(transformUnitForDisplay)
          : [];

        allUnits = [...allUnits, ...pageUnits];
        totalExportPages = responseData.pagination?.pages || (pageUnits.length === exportLimit ? currentExportPage + 1 : currentExportPage);
        currentExportPage += 1;

        if (!responseData.pagination && pageUnits.length < exportLimit) {
          break;
        }
      } while (currentExportPage <= totalExportPages);

      const exportData = allUnits.map(unit => ({
        'Unit Number': unit.unitNumber,
        'Property': unit.propertyName,
        'Type': unit.type,
        'Category': unit.category,
        'Area (sq ft)': unit.area,
        'Bedrooms': unit.bedrooms,
        'Bathrooms': unit.bathrooms,
        'Monthly Rent': unit.monthlyRent,
        'Deposit': unit.deposit,
        'Status': unit.status,
        'Furnished': unit.furnished,
        'Floor': unit.floor,
      }));

      if (exportData.length === 0) {
        toast.info("No units available to export");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Units");
      XLSX.writeFile(wb, `units_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(t("units.toast.exported"));
    } catch (error) {
      console.error("Error exporting units:", error);
      toast.error("Failed to export units");
    } finally {
      setIsExporting(false);
    }
  };

  // Import units from Excel
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("📂 File input changed", event.target.files);
    
    // Reset input value immediately so the same file can be selected again if needed
    // We capture the file first, of course
    const file = event.target.files?.[0];
    event.target.value = ''; 

    if (!file) {
        console.log("❌ No file selected");
        return;
    }

    // Immediate feedback
    console.log("🚀 Starting import for file:", file.name);
    setLoading(true);
    toast.info("Reading file...", { duration: 2000 });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        console.log("📖 File read complete, parsing...");
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log("📊 Parsed rows:", jsonData.length);

        if (jsonData.length === 0) {
            toast.warning("File appears to be empty or properly formatted data not found.");
            setLoading(false);
            return;
        }

        toast.info(`Found ${jsonData.length} rows. Mapping properties...`);

        // Fetch properties to map names to IDs
        // The backend limits us to 100 items per page, so we need to loop
        const allProperties: any[] = [];
        let page = 1;
        let hasMore = true;
        const MAX_PAGES = 50; // Safety break to prevent infinite loops

        while (hasMore && page <= MAX_PAGES) {
          try {
            console.log(`🔄 Fetching properties page ${page}...`);
            const propertiesResponse = await propertiesAPI.getAll({ limit: 100, page });
            // API wrapper returns { data: { properties: [...] } }
            const properties = propertiesResponse.data?.properties || [];
            
            if (properties.length > 0) {
              const newProps = properties.filter((p: any) => !allProperties.some(existing => existing.id === p.id));
              allProperties.push(...properties);
              
              if (properties.length < 100 || newProps.length === 0) {
                 // Stop if page is not full OR if we are just fetching duplicates (API ignoring pagination?)
                 hasMore = false;
              } else {
                page++;
              }
            } else {
              hasMore = false;
            }
          } catch (err) {
            console.error("Error fetching properties page", page, err);
            hasMore = false;
          }
        }
        
        console.log(`✅ Loaded ${allProperties.length} properties for mapping`);
        const propertyMap = new Map(allProperties.map((p: any) => [p.title.toLowerCase(), p.id]));
        
        toast.info(`Loaded properties. Importing units...`);

        const mapTypeToBackend = (type: string): string => {
          const typeLower = (type || '').toLowerCase();
          if (typeLower.includes('studio')) return 'studio';
          if (typeLower.includes('penthouse')) return 'penthouse';
          if (typeLower.includes('villa')) return 'villa';
          if (typeLower.includes('townhouse')) return 'townhouse';
          if (typeLower.includes('duplex')) return 'duplex';
          return 'apartment'; 
        };

        const errors: string[] = [];
        const unitsPayload: any[] = [];
        console.log("🛠️ Starting processing of", jsonData.length, "rows");

        if (jsonData.length > 0) {
            console.log("🔑 Row 1 Keys:", Object.keys(jsonData[0] as object));
        }

        let mapFailCount = 0;
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as any;
          console.log(`Processing row ${i+1}:`, JSON.stringify(row));

          const propertyName = row['Property']?.toString().trim();
          let propertyId = propertyMap.get(propertyName?.toLowerCase());

          if (propertyName && !propertyId) {
             console.log(`⚠️ Property check: '${propertyName?.toLowerCase()}' not found in map of ${propertyMap.size} properties.`);
          }

          if (!propertyName || !propertyId) {
            const msg = `Line ${i+1}: Property '${propertyName}' not found in system. Please check the name.`;
            if (mapFailCount < 3) {
                 toast.warning(msg);
            }
            console.warn(msg);
            errors.push(msg);
            mapFailCount++;
            continue; 
          }

          const furnishedStr = row['Furnished']?.toString().toLowerCase() || '';
          const isFurnished = furnishedStr === 'furnished' || furnishedStr === 'yes' || furnishedStr === 'true';

          const mappedType = mapTypeToBackend(row['Type']?.toString());

          const unitData = {
            unitNumber: row['Unit Number']?.toString() || `U-${Date.now()}-${i}`,
            propertyId: propertyId,
            type: mappedType,
            category: row['Category'],
            area: parseFloat(row['Area (sq ft)']) || 0,
            bedrooms: parseInt(row['Bedrooms']) || 0,
            bathrooms: parseInt(row['Bathrooms']) || 0,
            rentAmount: parseFloat(row['Monthly Rent']) || 0,
            depositAmount: parseFloat(row['Deposit']) || 0,
            status: row['Status']?.toLowerCase() || 'available',
            furnished: isFurnished,
            floor: parseInt(row['Floor']) || 0,
            areaUnit: 'sqft',
          };
          
          console.log(`➡️ Queued unit ${unitData.unitNumber} with payload:`, unitData);
          if (!unitData.propertyId) {
             console.error("❌ CRITICAL: Property ID is missing or invalid:", unitData.propertyId);
          }

          unitsPayload.push(unitData);
        }

        if (unitsPayload.length === 0) {
          toast.error("No valid rows to import.");
          if (errors.length > 0) {
            console.error("Import errors:", errors);
            toast.warning(`First issue: ${errors[0]}`);
          }
          console.log("🏁 Import finished (no rows).");
          return;
        }

        const batchSize = getImportBatchSize();
        const chunks = chunkArray(unitsPayload, batchSize);
        setImportBatchProgress({ current: 0, total: chunks.length });
        toast.info(`Sending ${unitsPayload.length} units in ${chunks.length} batch(es) of up to ${batchSize}…`);

        let successCount = 0;
        let failCount = mapFailCount;
        const batchFailures: { batchIndex: number; message: string }[] = [];

        for (let b = 0; b < chunks.length; b++) {
          setImportBatchProgress({ current: b + 1, total: chunks.length });
          try {
            const res = await postWithRetry(() => unitsAPI.bulkImport({ units: chunks[b] }));
            const d = res.data?.data;
            if (d) {
              successCount += d.success ?? 0;
              failCount += d.failed ?? 0;
              if (Array.isArray(d.errors)) errors.push(...d.errors);
            }
          } catch (err: any) {
            console.error(`❌ Batch ${b + 1} failed after retries:`, err);
            const msg = err.response?.data?.message || err.message || 'Unknown error';
            batchFailures.push({ batchIndex: b + 1, message: msg });
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} units`);
        }
        
        if (batchFailures.length > 0) {
          toast.error(
            `Failed batch(es): ${batchFailures.map((f) => `#${f.batchIndex}`).join(", ")}. ${batchFailures[0].message}`
          );
        }

        if (failCount > 0 && batchFailures.length === 0) {
          console.error("Import errors:", errors);
          toast.warning(`Some rows failed (${failCount} total including mapping). See console for details.`);
          if (errors.length > 0) {
             toast.warning(`First error: ${errors[0]}`);
          }
        }
        
        console.log("🏁 Import finished.");
        fetchUnits(true); // Force refresh to show new data
      } catch (error: any) {
        console.error("Error importing units:", error);
        toast.error("Failed to import units. Please check the file format.");
      } finally {
        setLoading(false);
        setImportBatchProgress(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadClick = (e: any) => {
    e.preventDefault(); // Prevent dropdown from hijacking the event if needed
    console.log("🖱️ Upload clicked, triggering input...");
    if (fileInputRef.current) {
        fileInputRef.current.click();
    } else {
        console.error("❌ File input ref is missing!");
        toast.error("Internal error: File input not found");
    }
  };

  // Delete unit with safety check
  const handleDeleteUnit = async (id: number) => {
    const confirmed = await confirm({
        title: "Delete Unit",
        description: "Are you sure you want to delete this unit?",
        confirmText: "Delete",
        variant: "destructive"
    });

    if (!confirmed) return;

    try {
        // Check if unit is attached to any lease
        // We assume leasesAPI.getAll supports filtering by unitId
        const leaseCheck = await leasesAPI.getAll({ unitId: id });
        const leases = leaseCheck.data?.data?.leases || leaseCheck.data?.leases || [];
        
        if (leases.length > 0) {
            const leaseIds = leases.map((l: any) => l.id).join(", ");
            toast.error(`Cannot delete unit. It is associated with Lease ID(s): ${leaseIds}`);
            return;
        }

        await unitsAPI.delete(id);
        toast.success("Unit deleted successfully");
        fetchUnits(true); // Force refresh
    } catch (error) {
        console.error("Error deleting unit:", error);
        toast.error("Failed to delete unit");
    }
  };

  // Download import template
  const handleDownloadTemplate = () => {
    const template = [{
      'Unit Number': '101',
      'Property': 'Sample Property',
      'Type': 'Apartment',
      'Category': '2BR',
      'Area (sq ft)': 1200,
      'Bedrooms': 2,
      'Bathrooms': 2,
      'Monthly Rent': 80000,
      'Deposit': 80000,
      'Status': 'Available',
      'Furnished': 'Unfurnished',
      'Floor': 1,
    }];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, 'units_import_template.xlsx');
    toast.success("Template downloaded successfully");
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedType("All");
    setSelectedCategory("All");
    setSelectedStatus("All");
    setSelectedProperty("All");
    setSelectedUnitFilter("All");
    setSortBy("Unit Number");
    toast.success(t("units.filtersCleared"));
  };

  console.log("🏢 Units Component Rendered", units);

  const unitStatusPillClass = (s?: string) => {
    const x = (s || "").toLowerCase();
    if (x === "occupied") return "occupied";
    if (x === "available") return "available";
    if (x === "dispute" || x === "disputed") return "disputed";
    if (x === "inactive") return "inactive";
    return "default";
  };

  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header">
        <div>
          <h1 className="uiux-page-title">{t("units.title")}</h1>
          <p className="uiux-page-subtitle">{t("units.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || isExporting || units.length === 0}>
            <Download className="h-4 w-4 me-2" />
            {isExporting ? t("properties.exporting") : t("common.export")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 me-2" />
                {t("common.import")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 me-2" />
                {t("properties.downloadTemplate")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleUploadClick}>
                <Upload className="h-4 w-4 me-2" />
                {t("units.uploadExcel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={handleViewAnalytics}>
            <BarChart3 className="h-4 w-4 me-2" />
            {t("units.analytics")}
          </Button>
          <Button variant="cta" onClick={handleAddUnit}>
            <Plus className="h-4 w-4 me-2" />
            {t("units.addUnit")}
          </Button>
        </div>
      </div>

      {importBatchProgress && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 space-y-2">
          <p className="text-sm font-medium text-blue-900">
            {t("units.processingBatch", {
              current: importBatchProgress.current,
              total: importBatchProgress.total,
            })}
          </p>
          <Progress
            value={
              importBatchProgress.total > 0
                ? (importBatchProgress.current / importBatchProgress.total) * 100
                : 0
            }
          />
        </div>
      )}

      <NobleXKpiStrip>
        <NobleXKpiCard label={t("units.kpi.totalUnits")} value={totalUnits} icon={<PhHouse size={20} weight="bold" />} />
        <NobleXKpiCard
          label={t("units.kpi.occupied")}
          value={occupiedUnits}
          subLabel={`${occupancyRate.toFixed(1)}%`}
          subLabelType={occupancyRate > 80 ? "positive" : occupancyRate >= 60 ? "neutral" : "negative"}
          icon={<PhUsers size={20} weight="bold" />}
        />
        <NobleXKpiCard label={t("units.kpi.available")} value={availableUnits} subLabel={t("units.kpi.readyToRent")} icon={<PhKey size={20} weight="bold" />} />
        <NobleXKpiCard label={t("units.status.disputed")} value={disputeUnits} icon={<PhWarning size={20} weight="bold" />} />
        <NobleXKpiCard label={t("units.kpi.avgRent")} value={`AED ${averageRent.toLocaleString()}`} isCurrency subLabel={t("units.kpi.unitsCount", { count: occupiedUnits })} icon={<PhCurrencyCircleDollar size={20} weight="bold" />} />
      </NobleXKpiStrip>

      <div className="flex flex-col lg:flex-row gap-4 uiux-filter-row">
        <div className="uiux-search-bar-wrap">
          <Search className="uiux-search-icon" strokeWidth={1.5} />
          <input
            type="search"
            placeholder={t("units.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="uiux-search-input"
            autoComplete="off"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="w-40">
            <SearchableSelect
              value={selectedType}
              onValueChange={(val) => {
                setSelectedType(val);
                setCurrentPage(1);
              }}
              options={unitTypes.map((type) => ({ value: type, label: type }))}
              placeholder={t("units.filtersPanel.type")}
              searchPlaceholder={t("units.filtersPanel.type")}
              emptyMessage={t("common.noResults")}
            />
          </div>

          <div className="w-40">
            <SearchableSelect
              value={selectedCategory}
              onValueChange={(val) => {
                setSelectedCategory(val);
                setCurrentPage(1);
              }}
              options={unitCategories.map((category) => ({ value: category, label: category }))}
              placeholder={t("units.filtersPanel.category")}
              searchPlaceholder={t("units.filtersPanel.category")}
              emptyMessage={t("common.noResults")}
            />
          </div>

          <div className="w-40">
            <SearchableSelect
              value={selectedStatus}
              onValueChange={(val) => {
                setSelectedStatus(val);
                setCurrentPage(1);
              }}
              options={statusOptions.map((status) => ({ value: status, label: status }))}
              placeholder={t("units.filtersPanel.status")}
              searchPlaceholder={t("units.filtersPanel.status")}
              emptyMessage={t("common.noResults")}
            />
          </div>

          <div className="w-48">
            <SearchableSelect
              value={selectedProperty}
              onValueChange={(val) => {
                setSelectedProperty(val);
                setSelectedUnitFilter("All");
                setCurrentPage(1);
              }}
              options={[
                { value: "All", label: t("units.filtersPanel.allProperties") },
                ...properties.map((property) => ({
                  value: property.id.toString(),
                  label: property.title,
                })),
              ]}
              placeholder={t("units.filtersPanel.allProperties")}
              searchPlaceholder={t("units.filtersPanel.allProperties")}
              emptyMessage={t("common.noResults")}
            />
          </div>

          <div className="w-48">
            <SearchableSelect
              value={selectedUnitFilter}
              onValueChange={(val) => {
                setSelectedUnitFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "All", label: t("units.filtersPanel.allUnits") },
                ...unitOptions.map((unit) => ({
                  value: unit.id.toString(),
                  label: unit.unitNumber,
                })),
              ]}
              placeholder={t("units.filtersPanel.allUnits")}
              searchPlaceholder={t("units.filtersPanel.allUnits")}
              emptyMessage={t("common.noResults")}
            />
          </div>

          {(searchQuery || selectedType !== "All" || selectedStatus !== "All" || selectedProperty !== "All" || selectedUnitFilter !== "All" || selectedCategory !== "All") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearFilters}
              className="h-10 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="me-2 h-4 w-4" />
              {t("common.clear")}
            </Button>
          )}

          <div className="w-40">
            <SearchableSelect
              value={sortBy}
              onValueChange={setSortBy}
              options={sortOptions.map((option) => ({ value: option, label: option }))}
              placeholder={t("units.filtersPanel.sortBy")}
              searchPlaceholder={t("units.filtersPanel.sortBy")}
              emptyMessage={t("common.noResults")}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          </Button>

          <div className="uiux-view-toggle">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-none border-0 shadow-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-none border-0 shadow-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="uiux-state-panel">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">{t("units.loading")}</h3>
          <p className="text-muted-foreground text-sm">{t("units.loadingHint")}</p>
        </div>
      )}

      {/* Units Display */}
      {!loading && viewMode === "grid" && filteredUnits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUnits.map((unit) => {
            const TypeIcon = getTypeIcon(unit.type);
            return (
              <div
                key={unit.id}
                className="uiux-content-card overflow-hidden cursor-pointer group"
              >
                <div className="uiux-unit-card-image-wrap">
                  <ImageCarousel
                    images={unit.images || []}
                    alt={`${unit.propertyName || "Property"} - ${unit.unitNumber}`}
                    className="!h-full !min-h-0"
                  />
                  <span className={`uiux-unit-status-pill ${unitStatusPillClass(unit.status)}`}>
                    {unit.status}
                  </span>
                  <span className="uiux-property-badge-type !top-3 !right-3 !left-auto">{unit.type}</span>
                  {unit.images && unit.images.length > 1 && (
                    <div className="uiux-unit-photo-count">
                      {unit.images.length} photos
                    </div>
                  )}
                </div>

                <div className="uiux-property-card-body">
                  <div>
                    <h3 className="uiux-property-card-name group-hover:text-[var(--color-navy-500)] transition-colors">
                      {unit.propertyName} - {unit.unitNumber}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{unit.propertyLocation}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {unit.propertyName} • {unit.area} sq ft
                    </p>
                  </div>

                  {/* Unit Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Bedrooms</p>
                      <p className="text-lg font-semibold text-foreground">
                        {unit.bedrooms}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bathrooms</p>
                      <p className="text-lg font-semibold text-foreground">
                        {unit.bathrooms}
                      </p>
                    </div>
                  </div>

                  {/* Rent */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Yearly Rent
                        </p>
                        <p className="text-lg font-bold text-accent">
                          AED {unit.monthlyRent.toLocaleString()}
                        </p>
                        {unit.status === "Occupied" && (
                          <p className="text-xs text-green-600">
                            Occupied by {unit.tenantName}
                          </p>
                        )}
                      </div>
                      {/* <div className="text-right">
                          <p className="text-xs text-muted-foreground">ROI</p>
                          <p className="text-sm font-semibold text-foreground">
                            {unit.roi}%
                          </p>
                        </div> */}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewUnit(unit)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditUnit(unit)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleViewUnit(unit)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditUnit(unit)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Unit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Camera className="h-4 w-4 mr-2" />
                          Add Photos
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Report
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onSelect={(e) => {
                             e.preventDefault();
                             handleDeleteUnit(unit.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Unit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === "list" && filteredUnits.length > 0 && (
        <div className="uiux-table-shell">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-5">{t("units.columns.unitNumber")}</th>
                  <th className="text-left p-5">{t("units.columns.type")}</th>
                  <th className="text-left p-5">{t("units.columns.property")}</th>
                  <th className="text-left p-5">{t("units.columns.area")}</th>
                  <th className="text-left p-5">{t("units.columns.rent")}</th>
                  <th className="text-left p-5">{t("units.columns.status")}</th>
                  <th className="text-left p-5">{t("units.columns.tenant")}</th>
                  <th className="text-left p-5">{t("units.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => {
                  const TypeIcon = getTypeIcon(unit.type);
                  return (
                    <tr
                      key={unit.id}
                      className="border-b border-border"
                    >
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-24 rounded-md overflow-hidden relative group border border-border bg-muted/30">
                            <ImageCarousel
                              images={unit.images || []}
                              alt={`${unit.propertyName || "Property"} - ${unit.unitNumber}`}
                              className="h-full"
                            />
                          </div>
                          <div>
                            <p className="font-display font-semibold text-foreground">
                              {unit.unitNumber}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {unit.category || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                          <span className="text-sm">{unit.type}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div>
                          <p className="font-medium text-foreground">{unit.propertyName}</p>
                          <p className="text-sm text-muted-foreground">
                            {unit.propertyLocation}
                          </p>
                        </div>
                      </td>
                      <td className="p-5">
                        <div>
                          <p className="font-medium font-mono text-sm">{unit.area} sq ft</p>
                          <p className="text-sm text-muted-foreground">
                            {unit.bedrooms}BR • {unit.bathrooms}BA
                          </p>
                        </div>
                      </td>
                      <td className="p-5">
                        <div>
                          <p className="font-medium font-mono text-sm">
                            AED {unit.monthlyRent.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ROI: {unit.roi}%
                          </p>
                        </div>
                      </td>
                      <td className="p-5">
                        <span
                          className={cn(
                            "uiux-unit-status-pill !relative !bottom-auto !left-auto !inline-flex",
                            unitStatusPillClass(unit.status)
                          )}
                        >
                          {unit.status}
                        </span>
                      </td>
                      <td className="p-5">
                        {unit.tenantName ? (
                          <div>
                            <p className="font-medium">{unit.tenantName}</p>
                            <p className="text-sm text-muted-foreground">
                              {unit.tenantPhone}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewUnit(unit)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUnit(unit)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => handleViewUnit(unit)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditUnit(unit)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Unit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Camera className="h-4 w-4 mr-2" />
                                Add Photos
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Report
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600"
                                onSelect={(e) => {
                                   e.preventDefault(); // Keep menu open during confirmation or let us handle it
                                   handleDeleteUnit(unit.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Unit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && filteredUnits.length === 0 && (
        <div className="uiux-state-panel">
          <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.25} />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">No units found</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Try adjusting your search criteria or add a new unit.
          </p>
          <Button variant="cta" onClick={handleAddUnit}>
            <Plus className="h-4 w-4 mr-2" />
            Add Unit
          </Button>
        </div>
      )}

      {/* Pagination */}
      {filteredUnits.length > 0 && (
        <ListPagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          itemLabel="units"
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
          disabled={loading}
        />
      )}

      {/* Modals */}
      <UnitForm
        key={selectedUnit?.id || 'new'}
        isOpen={showUnitForm}
        onClose={() => setShowUnitForm(false)}
        onSubmit={handleUnitSubmit}
        initialData={selectedUnit as any}
        mode={formMode}
      />

      <UnitDetails
        unit={selectedUnit}
        isOpen={showUnitDetails}
        onClose={() => setShowUnitDetails(false)}
        onEdit={handleEditUnit}
        onDelete={(unit) => handleDeleteUnit(unit.id)}
      />

      <UnitAnalytics
        isOpen={showUnitAnalytics}
        onClose={() => setShowUnitAnalytics(false)}
        loading={analyticsLoading}
        analyticsData={analyticsData}
        timeRange={analyticsTimeRange}
        onTimeRangeChange={setAnalyticsTimeRange}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete unit "{unitToDelete?.unitNumber}"? This action cannot be undone.
              All data associated with this unit will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnitToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteUnit(unitToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ConfirmationDialog 
        isOpen={isConfirmOpen}
        onClose={onCancel}
        onConfirm={onConfirm}
        title={confirmOptions?.title || ""}
        description={confirmOptions?.description || ""}
        confirmText={confirmOptions?.confirmText}
        cancelText={confirmOptions?.cancelText}
        variant={confirmOptions?.variant}
      />
    </div>
  );
}
