import { useState, useEffect, useRef, type CSSProperties } from "react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Map,
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  Banknote,
  Calendar,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Download,
  Upload,
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
  ChevronLeft,
  ChevronRight,
  Wallet
} from "lucide-react";
import PropertyForm from "@/components/properties/PropertyForm";
import PropertyAnalytics from "@/components/properties/PropertyAnalytics";
import UnitForm from "@/components/properties/UnitForm";
import UnitDetails from "@/components/properties/UnitDetails";
import { propertiesAPI } from "@/services/api";
import { cacheService } from "@/services/cache";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn, resolveImageUrl } from "@/lib/utils";
import { displayLocationToPropertyEmirateSlug } from "@/lib/emirateAuthorityMap";
import { ListPagination } from "@/components/common/ListPagination";
// Property type interface
interface Property {
  id?: number;
  name: string;
  location: string;
  address: string;
  type: string;
  category: string;
  units?: number;
  occupied?: number;
  vacant?: number;
  revenue?: number;
  revenueChange?: number;
  occupancyRate?: number;
  status?: string;
  rating?: number;
  yearBuilt: number;
  floors: number;
  totalUnits: number;
  amenities?: string[];
  images?: string[];
  propertyManager: string;
  marketValue?: number;
  monthlyRevenue?: number;
  maintenanceCost?: number;
  insuranceCost?: number;
  contactEmail: string;
  contactPhone: string;
  ejariStatus: string;
  insuranceExpiry: string;
  [key: string]: any;
}

const propertyTypes = ["All", "Residential", "Commercial", "Mixed Use"];
const propertyCategories = ["All", "Luxury Apartment", "Villa", "Office Building", "Beachfront Apartment", "Grade A Office", "Mixed Use"];
const statusOptions = ["All", "Active", "Under Maintenance", "Renovation", "Vacant"];
const sortOptions = ["Name", "Revenue", "Occupancy", "Rating", "Year Built", "Market Value"];

const safeParseNumber = (val: any) => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  return Number(String(val).replace(/,/g, "")) || 0;
};

const mapBuildingTypeToFrontend = (buildingType: string): { type: string; category: string } => {
  const bt = (buildingType || "").toLowerCase();

  if (bt === "studio") return { type: "Residential", category: "Studio Apartment" };
  if (bt === "apartment") return { type: "Residential", category: "Luxury Apartment" };
  if (bt === "penthouse") return { type: "Residential", category: "Penthouse" };
  if (bt === "villa") return { type: "Residential", category: "Villa" };
  if (bt === "townhouse") return { type: "Residential", category: "Townhouse" };
  if (bt === "duplex") return { type: "Residential", category: "Duplex" };
  if (bt === "office") return { type: "Commercial", category: "Office Building" };
  if (bt === "retail") return { type: "Commercial", category: "Retail Space" };
  if (bt === "warehouse") return { type: "Commercial", category: "Warehouse" };

  return { type: "Residential", category: "Luxury Apartment" };
};

const transformPropertyForDisplay = (property: any): Property => {
  let images = property.images;
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

  let amenities = property.amenities;
  if (typeof amenities === "string") {
    try {
      amenities = JSON.parse(amenities);
    } catch {
      amenities = [];
    }
  }
  if (!Array.isArray(amenities)) {
    amenities = [];
  }

  const actualTotalUnits = safeParseNumber(property.actualTotalUnits);
  const capacity = safeParseNumber(property.totalUnits);
  const occupiedUnits = safeParseNumber(property.occupiedUnits || property.occupied);
  const vacant = safeParseNumber(property.vacantUnits || property.vacant);
  const totalUnits = capacity > 0 ? capacity : (actualTotalUnits || (occupiedUnits + vacant));
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const monthlyRevenue = safeParseNumber(property.monthlyRevenue || property.price || property.revenue);
  const displayRevenue = totalUnits > 0 ? (monthlyRevenue / totalUnits) * 100 : 0;
  const revenueChange = safeParseNumber(property.revenueChange);
  const { type: mappedType, category: mappedCategory } = mapBuildingTypeToFrontend(property.buildingType);

  return {
    ...property,
    name: property.title || property.name,
    type: property.type || mappedType,
    category: property.category || mappedCategory,
    address: property.location || property.address || "",
    status: property.availability || property.status || "active",
    images,
    amenities,
    units: totalUnits,
    occupied: occupiedUnits,
    vacant,
    occupancyRate,
    monthlyRevenue,
    revenue: displayRevenue,
    revenueChange,
    actualRevenue: safeParseNumber(property.actualRevenue || property.actual_revenue),
    roi: property.roi || 0,
    rating: property.rating || 0,
  };
};

const ImageCarousel = ({ images, alt }: { images: string[], alt: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = (e: any) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: any) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="relative h-full min-h-[192px] w-full overflow-hidden group">
      <img
        src={resolveImageUrl(images[currentIndex])}
        alt={`${alt} - Image ${currentIndex + 1}`}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] duration-[var(--transition-slow)]"
      />
      
      {images.length > 1 && (
        <>
          <button 
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 w-1.5 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function Properties() {
  // State for properties data
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortBy, setSortBy] = useState("Name");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showUnitDetails, setShowUnitDetails] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  
  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchProperties();
  }, [page, itemsPerPage, searchQuery, selectedType, selectedCategory, selectedStatus, sortBy]); // Add itemsPerPage to dependencies

  const buildPropertyQueryParams = (pageNumber: number, limit: number) => ({
    page: pageNumber,
    limit,
    search: searchQuery,
    type: selectedType,
    category: selectedCategory,
    status: selectedStatus,
    sortBy,
    includeImages: true,
  });

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = buildPropertyQueryParams(page, itemsPerPage);
      
      const response = await propertiesAPI.getAll(params);
      
      const data = (response as any).data?.data || (response as any).data || {};
      let propertiesData = data.properties || data.rows || [];
      
      if (Array.isArray(response.data)) {
        propertiesData = response.data;
      }

      // Update pagination info
      if (data.pagination) {
        setTotalPages(data.pagination.pages || 1);
        setTotalItems(data.pagination.total || 0);
      } else if (data.count) {
         // Fallback if pagination is at root
         setTotalPages(Math.ceil(data.count / itemsPerPage));
         setTotalItems(data.count);
      }

      
      // Transform backend fields to match frontend interface
      // Backend uses: title, buildingType, etc.
      // Frontend expects: name, type, category, etc.
      if (Array.isArray(propertiesData)) {
        propertiesData = propertiesData.map(transformPropertyForDisplay);
      }
      
      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      if (propertiesData.length > 0) {
        toast.success(`${propertiesData.length} properties loaded successfully`);
      } else {
        toast.info("No properties found");
      }
    } catch (error: any) {
      console.error("Error fetching properties:", error);
      toast.error(error.response?.data?.message || "Failed to load properties");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties
    .filter((property) => {
      const matchesSearch = 
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = selectedType === "All" || property.type === selectedType;
      const matchesCategory = selectedCategory === "All" || property.category === selectedCategory;
      const matchesStatus = selectedStatus === "All" || property.status === selectedStatus.toLowerCase().replace(" ", "-");
      
      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "Revenue":
          return (b.revenue || b.monthlyRevenue || 0) - (a.revenue || a.monthlyRevenue || 0);
        case "Occupancy":
          return (b.occupancyRate || 0) - (a.occupancyRate || 0);
        case "Rating":
          return (b.rating || 0) - (a.rating || 0);
        case "Year Built":
          return (b.yearBuilt || 0) - (a.yearBuilt || 0);
        case "Market Value":
          return (b.marketValue || 0) - (a.marketValue || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // Helper for safe number parsing
  const parseNumber = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(/,/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const totalRevenue = properties.reduce((sum, property) => sum + parseNumber(property.revenue || property.monthlyRevenue), 0);
  const averageOccupancy = properties.length > 0 
    ? properties.reduce((sum, property) => sum + parseNumber(property.occupancyRate), 0) / properties.length 
    : 0;
  const totalUnits = properties.reduce((sum, property) => sum + parseNumber(property.units || property.totalUnits), 0);
  const occupiedUnits = properties.reduce((sum, property) => sum + parseNumber(property.occupied), 0);

  const getPropertyIcon = (type: string) => {
    switch (type) {
      case "Residential":
        return Home;
      case "Commercial":
        return Building;
      case "Mixed Use":
        return Store;
      default:
        return Building2;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "renovation":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMaintenanceStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "fair":
        return "text-yellow-600";
      case "poor":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const handleAddProperty = () => {
    setFormMode("create");
    setSelectedProperty(null);
    setShowPropertyForm(true);
  };

  const handleEditProperty = async (property: Property) => {
    try {
      // Fetch full property data if needed
      if (property.id) {
        const response = await propertiesAPI.getById(property.id);
        const propertyData = response.data?.data?.property || response.data?.property || response.data;
        setSelectedProperty(propertyData);
      } else {
        setSelectedProperty(property);
      }
      setFormMode("edit");
      setShowPropertyForm(true);
    } catch (error: any) {
      console.error("Error loading property:", error);
      toast.error("Failed to load property details");
    }
  };

  const handleViewAnalytics = async (property: Property) => {
    setSelectedProperty(property);
    setAnalyticsData(null); // Reset
    setShowAnalytics(true);
    
    try {
        if (property.id) {
            const response = await propertiesAPI.getAnalytics(property.id);
            if (response.data?.success) {
                setAnalyticsData(response.data.data);
            }
        }
    } catch (error) {
        console.error("Failed to load analytics", error);
        toast.error("Failed to load analytics data");
    }
  };

  const handlePropertySubmit = async (data: any) => {
    try {
      // Helper function to map frontend category to backend buildingType enum
      // Backend accepts: 'apartment', 'villa', 'townhouse', 'penthouse', 'duplex', 'studio', 'office', 'retail', 'warehouse'
      const mapCategoryToBuildingType = (category: string): string => {
        if (!category) return 'apartment';
        
        const categoryLower = category.toLowerCase();
        
        // Direct mappings for exact matches
        if (categoryLower.includes('studio')) return 'studio';
        if (categoryLower.includes('penthouse')) return 'penthouse';
        if (categoryLower.includes('villa')) return 'villa';
        if (categoryLower.includes('townhouse')) return 'townhouse';
        if (categoryLower.includes('duplex')) return 'duplex';
        
        // Apartment variations
        if (categoryLower.includes('apartment') || categoryLower.includes('loft')) return 'apartment';
        
        // Commercial types
        if (categoryLower.includes('office')) return 'office';
        if (categoryLower.includes('retail') || categoryLower.includes('shopping')) return 'retail';
        if (categoryLower.includes('warehouse') || categoryLower.includes('industrial')) return 'warehouse';
        
        // Default to apartment for any unmatched categories
        return 'apartment';
      };

      // Map frontend fields to backend fields
      const backendData = {
        title: data.name,  // Frontend 'name' → Backend 'title'
        plotNumber: data.plotNumber,
        location: data.location,
        community: data.address,  // Frontend 'address' → Backend 'community'
        emirate: displayLocationToPropertyEmirateSlug(data.location),
        buildingType: mapCategoryToBuildingType(data.category),  // Map category to valid buildingType enum
        type: data.type, // Persist exact type
        category: data.category, // Persist exact category
        furnished: 'furnished',  // Default value
        bedrooms: 0,  // Default value
        bathrooms: 0,  // Default value
        area: 0,  // Default value
        price: data.monthlyRevenue || 0,
        pricePerSqft: 0,  // Default value
        availability: 'available',  // Default value
        amenities: data.amenities || [],
        features: {
          hasElevator: data.hasElevator,
          hasGym: data.hasGym,
          hasPool: data.hasPool,
          hasParking: data.hasParking,
          hasSecurity: data.hasSecurity,
          hasConcierge: data.hasConcierge,
          parkingSpaces: data.parkingSpaces,
        },
        description: data.description || '',
        // Include additional fields for our extended property model
        yearBuilt: data.yearBuilt,
        floors: data.floors,
        totalUnits: data.totalUnits,
        unitsPerFloor: data.unitsPerFloor,
        marketValue: data.marketValue,
        monthlyRevenue: data.monthlyRevenue,
        maintenanceCost: data.maintenanceCost,
        insuranceCost: data.insuranceCost,
        propertyManager: data.propertyManager,
        managementCompany: data.managementCompany,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        lastInspection: data.lastInspection && data.lastInspection !== "Invalid date" ? data.lastInspection : null,
        nextInspection: data.nextInspection && data.nextInspection !== "Invalid date" ? data.nextInspection : null,
        compliance: data.compliance || [],
        notes: data.notes,
        images: data.images || [],  // Include uploaded images
        salesmanId: data.salesmanId,
        agentId: data.salesmanId,
        // Nested objects for potential backend requirements
        agent: {
            name: data.propertyManager,
            email: data.contactEmail,
            phone: data.contactPhone
        },
        management: {
            manager: data.propertyManager,
            company: data.managementCompany
        }
      };
      
      if (formMode === "create") {
        await propertiesAPI.create(backendData);
        toast.success("Property created successfully");
        cacheService.invalidatePattern(/\/properties/);
      } else if (formMode === "edit" && selectedProperty?.id) {
        await propertiesAPI.update(selectedProperty.id, backendData);
        toast.success("Property updated successfully");
        cacheService.invalidatePattern(/\/properties/);
      }
      setShowPropertyForm(false);
      fetchProperties();
    } catch (error: any) {
      console.error("Error saving property:", error);
      toast.error(error.response?.data?.message || `Failed to ${formMode === "create" ? "create" : "update"} property`);
    }
  };

  const confirmDeleteProperty = (property: Property) => {
    setPropertyToDelete(property);
    setShowDeleteDialog(true);
  };

  const handleDeleteProperty = async () => {
    if (!propertyToDelete?.id) return;
    
    try {
      await propertiesAPI.delete(propertyToDelete.id);
      toast.success("Property deleted successfully");
      // Invalidate property cache to ensure fresh list
      cacheService.invalidatePattern(/\/properties/);
      setShowDeleteDialog(false);
      setPropertyToDelete(null);
      fetchProperties(); // Reload the list
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast.error(error.response?.data?.message || "Failed to delete property");
    }
  };

  const handleAddUnit = (property: any) => {
    setSelectedProperty(property);
    setFormMode("create");
    setSelectedUnit(null);
    setShowUnitForm(true);
  };

  const handleEditUnit = (unit: any) => {
    setFormMode("edit");
    setSelectedUnit(unit);
    setShowUnitForm(true);
  };

  const handleViewUnit = (unit: any) => {
    setSelectedUnit(unit);
    setShowUnitDetails(true);
  };

  const handleUnitSubmit = (data: any) => {
    setShowUnitForm(false);
  };

  const handleDeleteUnit = (unit: any) => {
    setShowUnitDetails(false);
  };

  // Export properties to Excel
  const handleExport = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      const exportLimit = 100;
      let currentPage = 1;
      let allProperties: Property[] = [];
      let totalExportPages = 1;

      do {
        const response = await propertiesAPI.getAll(buildPropertyQueryParams(currentPage, exportLimit));
        const responseData = (response as any).data || {};
        const pageProperties = Array.isArray(responseData.properties)
          ? responseData.properties.map(transformPropertyForDisplay)
          : [];

        allProperties = [...allProperties, ...pageProperties];
        totalExportPages = responseData.pagination?.pages || (pageProperties.length === exportLimit ? currentPage + 1 : currentPage);
        currentPage += 1;

        if (!responseData.pagination && pageProperties.length < exportLimit) {
          break;
        }
      } while (currentPage <= totalExportPages);

      const exportData = allProperties.map(property => ({
        'Property Name': property.name,
        'Type': property.type,
        'Category': property.category,
        'Location': property.location,
        'Address': property.address,
        'Year Built': property.yearBuilt,
        'Floors': property.floors,
        'Total Units': property.totalUnits || property.units,
        // 'Occupied': property.occupied,
        // 'Vacant': property.vacant,
        // 'Occupancy Rate': property.occupancyRate ? `${property.occupancyRate}%` : '',
        'Property Manager': property.propertyManager,
        'Contact Email': property.contactEmail,
        'Contact Phone': property.contactPhone,
        "Registration status": property.ejariStatus,
        'Insurance Expiry': property.insuranceExpiry,
        'Market Value': property.marketValue,
        'Monthly Revenue': property.monthlyRevenue || property.revenue,
        // 'Status': property.status,
      }));

      if (exportData.length === 0) {
        toast.info("No properties available to export");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Properties");
      XLSX.writeFile(wb, `properties_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`${exportData.length} properties exported successfully`);
    } catch (error) {
      console.error("Error exporting properties:", error);
      toast.error("Failed to export properties");
    } finally {
      setIsExporting(false);
    }
  };

  // Import properties from Excel
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await propertiesAPI.import(formData);
      
      const { success, failed, errors } = response.data.data;
      
      if (failed === 0) {
          toast.success(`Successfully imported ${success} properties.`);
      } else {
         toast.warning(`Import processing complete. Success: ${success}, Failed: ${failed}`);
         console.error('Import errors:', errors);
      }
      
      cacheService.invalidatePattern(/\/properties/);
      fetchProperties();
    } catch (error: any) {
      console.error("Error importing properties:", error);
      toast.error(error.response?.data?.message || "Failed to import properties.");
    } finally {
        setLoading(false);
        event.target.value = ''; // Reset input
    }
  };

  // Download import template
  const handleDownloadTemplate = () => {
    const template = [{
      'Property Name': 'Sample Property',
      'Type': 'Residential',
      'Category': 'Luxury Apartment',
      'Location': 'Dubai Marina',
      'Address': 'Sample Address, Dubai, UAE',
      'Year Built': 2020,
      'Floors': 10,
      'Total Units': 50,
      'Property Manager': 'John Doe',
      'Contact Email': 'manager@example.com',
      'Contact Phone': '+971 XX XXX XXXX',
      "Registration status": "compliant",
      'Insurance Expiry': '2025-12-31',
      'Market Value': 10000000,
      'Monthly Revenue': 500000,
    }];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, 'properties_import_template.xlsx');
    toast.success("Template downloaded successfully");
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedType("All");
    setSelectedCategory("All");
    setSelectedStatus("All");
    setSortBy("Name");
    toast.success("Filters cleared");
  };

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 uiux-page-enter">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />

      <div className="uiux-page-header">
        <div>
          <h1 className="uiux-page-title">Properties</h1>
          <p className="uiux-page-subtitle">Manage your comprehensive property portfolio</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || isExporting || properties.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
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
          <Button variant="cta" onClick={handleAddProperty}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 uiux-card-grid">
        <div
          className="uiux-stat-card"
          style={{ "--card-accent-color": "#1E3A72", "--card-accent-bg": "#DBEAFE" } as CSSProperties}
        >
          <p className="uiux-stat-card-label">Total Properties</p>
          <p className="uiux-stat-card-value text-3xl">{properties.length}</p>
          <div className="uiux-stat-card-icon" aria-hidden>
            <Building2 className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        </div>
        <div
          className="uiux-stat-card"
          style={{ "--card-accent-color": "#C9922B", "--card-accent-bg": "#FEF3C7" } as CSSProperties}
        >
          <p className="uiux-stat-card-label">Portfolio Revenue</p>
          <p className="uiux-stat-card-value uiux-stat-card-value-currency text-2xl">AED {(totalRevenue / 1000000).toFixed(1)}M</p>
          <div className="uiux-stat-card-icon" aria-hidden>
            <Banknote className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        </div>
        <div
          className="uiux-stat-card"
          style={{ "--card-accent-color": "#16A34A", "--card-accent-bg": "#DCFCE7" } as CSSProperties}
        >
          <p className="uiux-stat-card-label">Avg Occupancy</p>
          <p className="uiux-stat-card-value text-3xl">{averageOccupancy.toFixed(1)}%</p>
          <div className="uiux-stat-card-icon" aria-hidden>
            <Target className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        </div>
        <div
          className="uiux-stat-card"
          style={{ "--card-accent-color": "#7C3AED", "--card-accent-bg": "#EDE9FE" } as CSSProperties}
        >
          <p className="uiux-stat-card-label">Total Units</p>
          <p className="uiux-stat-card-value text-3xl">{totalUnits}</p>
          <p className="uiux-stat-card-sub">{occupiedUnits} occupied</p>
          <div className="uiux-stat-card-icon" aria-hidden>
            <Users className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 uiux-filter-row">
        <div className="uiux-search-bar-wrap">
        <Search className="uiux-search-icon" strokeWidth={1.5} />
        <input
            type="search"
            placeholder="Search properties, locations, or addresses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="uiux-search-input"
            autoComplete="off"
        />
      </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-primary text-primary-foreground")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <div className="w-52">
            <SearchableSelect
              value={sortBy}
              onValueChange={setSortBy}
              options={sortOptions.map((option) => ({
                value: option,
                label: `Sort by ${option}`,
              }))}
              placeholder="Sort properties"
              searchPlaceholder="Search sort options..."
              emptyMessage="No sort option found"
            />
          </div>

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
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0 shadow-none"
              onClick={() => setViewMode("map")}
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="uiux-state-panel">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">Loading properties...</h3>
          <p className="text-muted-foreground text-sm">Please wait while we fetch your portfolio.</p>
        </div>
      )}

      {/* Advanced Filters */}
      {!loading && showFilters && (
        <div className="uiux-table-shell p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Property Type</label>
              <SearchableSelect
                value={selectedType}
                onValueChange={setSelectedType}
                options={propertyTypes.map((type) => ({
                  value: type,
                  label: type,
                }))}
                placeholder="All property types"
                searchPlaceholder="Search property types..."
                emptyMessage="No property type found"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
              <SearchableSelect
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                options={propertyCategories.map((category) => ({
                  value: category,
                  label: category,
                }))}
                placeholder="All categories"
                searchPlaceholder="Search categories..."
                emptyMessage="No category found"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
              <SearchableSelect
                value={selectedStatus}
                onValueChange={setSelectedStatus}
                options={statusOptions.map((status) => ({
                  value: status,
                  label: status,
                }))}
                placeholder="All statuses"
                searchPlaceholder="Search statuses..."
                emptyMessage="No status found"
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Properties Display */}
      {!loading && viewMode === "grid" && filteredProperties.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProperties.map((property) => (
          <div key={property.id} className="uiux-property-card group">
                <div className="uiux-property-card-image-wrap">
                  {property.images && property.images.length > 0 ? (
                    <ImageCarousel images={property.images} alt={property.name} />
                  ) : (
                    <div className="h-full w-full bg-[var(--color-bg-subtle)] flex items-center justify-center">
                      <Building2 className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}
                  <span className="uiux-property-badge-status capitalize">
                      {property.status}
                  </span>
                  <span className="uiux-property-badge-type">{property.type}</span>
                  <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs font-medium">{property.rating}</span>
                  </div>
                </div>

            <div className="uiux-property-card-body">
              <div>
                <h3 className="uiux-property-card-name group-hover:text-[var(--color-navy-500)] transition-colors">
                  {property.name}
                </h3>
                <div className="uiux-property-card-location">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="line-clamp-2">{property.location}</span>
                </div>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{property.category}</p>
              </div>

                  <div className="uiux-property-card-divider" />

                  <div className="uiux-property-card-stats">
                    <div>
                      <p className="uiux-property-stat-label">Units</p>
                      <p className="uiux-property-stat-value">{property.actualTotalUnits || 0} / {property.totalUnits || property.units || 0}</p>
                    </div>
                    <div>
                      <p className="uiux-property-stat-label">Occupied</p>
                      <p className="uiux-property-stat-value">{property.occupied || 0}</p>
                    </div>
                  </div>

                  <div className="uiux-property-revenue-bar mb-3">
                    <span className="uiux-property-revenue-label">Monthly (exp.)</span>
                    <span className="uiux-property-revenue-value">
                      AED {(property.occupied > 0 ? (property.monthlyRevenue || 0) : 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="rounded-[var(--radius-sm)] border border-[rgba(13,21,38,0.08)] bg-[var(--color-bg-subtle)] px-3 py-2.5 flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-[var(--color-navy-500)]" />
                      <span className="uiux-property-stat-label !mb-0">Actual revenue</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">
                      AED {(property.actualRevenue || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[rgba(13,21,38,0.08)]">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewAnalytics(property)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditProperty(property)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEditProperty(property)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Property
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewAnalytics(property)}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddUnit(property)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Unit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => confirmDeleteProperty(property)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Property
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === "list" && filteredProperties.length > 0 && (
        <div className="uiux-table-shell">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-5">Property</th>
                  <th className="text-left p-5">Type</th>
                  <th className="text-left p-5">Location</th>
                  <th className="text-left p-5">Units</th>
                  <th className="text-left p-5">Occupancy</th>
                  <th className="text-left p-5">Revenue</th>
                  <th className="text-left p-5">Rating</th>
                  <th className="text-left p-5">Status</th>
                  <th className="text-left p-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((property) => {
                  const PropertyIcon = getPropertyIcon(property.type);
                  return (
                    <tr key={property.id} className="border-b border-border">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-md overflow-hidden border border-border bg-muted/30 shrink-0">
                            <img 
                              src={property.images && property.images.length > 0 ? resolveImageUrl(property.images[0]) : "/placeholder.svg"} 
                              alt={property.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display font-semibold text-foreground truncate">{property.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{property.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <PropertyIcon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                          <Badge variant="secondary" className="text-xs font-medium">
                            {property.type}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                          <span className="text-sm truncate">{property.location}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div>
                          <p className="font-medium font-mono text-sm">{property.actualTotalUnits || 0} / {property.totalUnits || property.units || 0}</p>
                          <p className="text-sm text-muted-foreground">{property.occupied} occupied</p>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 min-w-0">
                            <Progress value={property.occupancyRate || 0} className="h-2" />
                          </div>
                          <span className="text-sm font-medium font-mono shrink-0">{property.occupancyRate || 0}%</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div>
                          <p className="font-semibold font-mono text-sm text-[#059669]">AED {(property.occupied > 0 ? (property.monthlyRevenue || 0) : 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground font-mono">Yr: AED {(property.occupied > 0 ? (property.monthlyRevenue || 0) * 12 : 0).toLocaleString()}</p>
                        </div>
                      </td>

                      <td className="p-5">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current shrink-0" />
                          <span className="font-medium">{property.rating}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <Badge className={getStatusColor(property.status)}>
                          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewAnalytics(property)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditProperty(property)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleEditProperty(property)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Property
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewAnalytics(property)}>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Analytics
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => confirmDeleteProperty(property)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Property
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

      {/* Pagination Controls */}
      {!loading && properties.length > 0 && viewMode !== "map" && (
        <ListPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          itemLabel="properties"
          onPageChange={setPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setPage(1);
          }}
          disabled={loading}
        />
      )}

      {/* Map View Placeholder */}
      {!loading && viewMode === "map" && (
        <div className="uiux-table-shell min-h-[24rem] flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <Map className="h-16 w-16 text-muted-foreground mx-auto mb-4" strokeWidth={1.25} />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">Map view</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Interactive map showing property locations will appear here.
            </p>
            <Button variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Enable map view
            </Button>
          </div>
        </div>
      )}

      {/* Empty State (grid/list; map has its own placeholder) */}
      {!loading && filteredProperties.length === 0 && viewMode !== "map" && (
        <div className="uiux-state-panel">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" strokeWidth={1.25} />
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">No properties found</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Try adjusting your search criteria or add a new property.
          </p>
          <Button variant="cta" onClick={handleAddProperty}>
            <Plus className="h-4 w-4 mr-2" />
            Add your first property
          </Button>
        </div>
      )}

      {/* Property Form Modal */}
      <PropertyForm
        isOpen={showPropertyForm}
        onClose={() => setShowPropertyForm(false)}
        onSubmit={handlePropertySubmit}
        initialData={selectedProperty as any}
        mode={formMode}
      />

      {/* Property Analytics Modal */}
      {showAnalytics && selectedProperty && (
        <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw]">
            {analyticsData ? (
                <PropertyAnalytics 
                    property={analyticsData.property} 
                    revenueData={analyticsData.revenueData}
                    occupancyData={analyticsData.occupancyData}
                    expenseBreakdown={analyticsData.expenseBreakdown}
                    expenseItems={analyticsData.expenseItems}
                />
            ) : (
                <div className="flex justify-center items-center h-64">
                    Loading analytics...
                </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Unit Form Modal */}
      <UnitForm
        isOpen={showUnitForm}
        onClose={() => setShowUnitForm(false)}
        onSubmit={handleUnitSubmit}
        initialData={selectedUnit}
        mode={formMode}
        propertyId={selectedProperty?.id?.toString()}
      />

      {/* Unit Details Modal */}
      {showUnitDetails && selectedUnit && (
        <UnitDetails
          unit={selectedUnit}
          isOpen={showUnitDetails}
          onClose={() => setShowUnitDetails(false)}
          onEdit={handleEditUnit}
          onDelete={handleDeleteUnit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{propertyToDelete?.name}"? This action cannot be undone.
              All units and data associated with this property will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPropertyToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProperty}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
