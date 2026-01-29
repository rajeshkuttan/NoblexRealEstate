import { useState, useEffect, useRef } from "react";
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
  DollarSign,
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
  ChevronLeft,
  ChevronRight
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
import { Card } from "@/components/ui/card";
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

const ImageCarousel = ({ images, alt }: { images: string[], alt: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="relative h-48 w-full overflow-hidden group">
      <img
        src={images[currentIndex]}
        alt={`${alt} - Image ${currentIndex + 1}`}
        className="h-full w-full object-cover transition-transform duration-500"
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

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: itemsPerPage,
        search: searchQuery,
        type: selectedType,
        category: selectedCategory,
        status: selectedStatus,
        sortBy
      };
      
      const response = await propertiesAPI.getAll(params);
      
      const data = response.data?.data || response.data || {};
      let propertiesData = data.properties || data.rows || [];
      
      if (Array.isArray(response.data)) {
        propertiesData = response.data;
      }

      // Update pagination info
      if (data.pagination) {
        setTotalPages(data.pagination.pages || 1);
        setTotalItems(data.pagination.total || 0);
      } else if (response.data?.count) {
         // Fallback if pagination is at root
         setTotalPages(Math.ceil(response.data.count / limit));
         setTotalItems(response.data.count);
      }

      
      // Transform backend fields to match frontend interface
      // Backend uses: title, buildingType, etc.
      // Frontend expects: name, type, category, etc.
      if (Array.isArray(propertiesData)) {
        propertiesData = propertiesData.map(property => {
          // Parse images if they're a JSON string
          let images = property.images;
          console.log(`Property ${property.title || property.name} - raw images:`, images, typeof images);
          if (typeof images === 'string') {
            try {
              images = JSON.parse(images);
              console.log(`Property ${property.title || property.name} - parsed images:`, images);
            } catch (e) {
              console.log(`Property ${property.title || property.name} - failed to parse images:`, e);
              images = [];
            }
          }
          if (!Array.isArray(images)) {
            console.log(`Property ${property.title || property.name} - images not array, setting to empty`);
            images = [];
          }
          
          // Parse amenities if it's a JSON string
          let amenities = property.amenities;
          if (typeof amenities === 'string') {
            try {
              amenities = JSON.parse(amenities);
            } catch (e) {
              amenities = [];
            }
          }
          
          // Helper function to map backend buildingType to frontend type and category
          // Backend enum: 'apartment', 'villa', 'townhouse', 'penthouse', 'duplex', 'studio', 'office', 'retail', 'warehouse'
          const mapBuildingTypeToFrontend = (buildingType: string): { type: string, category: string } => {
            const bt = (buildingType || '').toLowerCase();
            
            // Residential types
            if (bt === 'studio') return { type: 'Residential', category: 'Studio Apartment' };
            if (bt === 'apartment') return { type: 'Residential', category: 'Luxury Apartment' };
            if (bt === 'penthouse') return { type: 'Residential', category: 'Penthouse' };
            if (bt === 'villa') return { type: 'Residential', category: 'Villa' };
            if (bt === 'townhouse') return { type: 'Residential', category: 'Townhouse' };
            if (bt === 'duplex') return { type: 'Residential', category: 'Duplex' };
            
            // Commercial types
            if (bt === 'office') return { type: 'Commercial', category: 'Office Building' };
            if (bt === 'retail') return { type: 'Commercial', category: 'Retail Space' };
            if (bt === 'warehouse') return { type: 'Commercial', category: 'Warehouse' };
            
            // Default
            return { type: 'Residential', category: 'Luxury Apartment' };
          };
          
          // Calculate or provide default values for UI fields
          // Helper for parsing potentially formatted numbers
          const safeParse = (val: any) => {
             if (typeof val === 'number') return val;
             if (!val) return 0;
             return Number(String(val).replace(/,/g, '')) || 0;
          };

          // Use backend aggregated counts if available
          const actualTotalUnits = safeParse(property.actualTotalUnits); // Count of created units
          const capacity = safeParse(property.totalUnits); // Configured limit/capacity
          
          const occupiedUnits = safeParse(property.occupiedUnits || property.occupied);
          const vacant = safeParse(property.vacantUnits || property.vacant);
          
          // Use Capacity as the total if defined (per user requirement "property configured with total 10 units"),
          // otherwise fall back to created count or sum.
          const totalUnits = capacity > 0 ? capacity : (actualTotalUnits || (occupiedUnits + vacant));
          
          // Formula: Occupancy (%) = (Number of occupied units / Total units) * 100
          // Use actualTotalUnits (created) for occupancy rate to be fair? 
          // Or Capacity? "50% occupancy" usually implies "of buildable area".
          // But if I have 10 units capacity, and 2 created (1 occupied), is it 10% occupied (1/10) or 50% (1/2)?
          // Usually occupancy is based on "Rentable Units". If they aren't created, they aren't rentable?
          // Let's use totalUnits (Capacity) to ensure the progress bar reflects the PROPERTY setting.
          const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
          
          const monthlyRevenue = safeParse(property.monthlyRevenue || property.price || property.revenue);
          
          // Formula: Revenue = (Monthly Revenue / Total Units) * 100
          const displayRevenue = totalUnits > 0 ? (monthlyRevenue / totalUnits) * 100 : 0;
          
          const revenueChange = safeParse(property.revenueChange);
          
          // Map buildingType to frontend format BUT prioritize explicit category if available
          const { type: mappedType, category: mappedCategory } = mapBuildingTypeToFrontend(property.buildingType);
          
          return {
            ...property,
            name: property.title || property.name,  // Map title -> name
            type: property.type || mappedType, // Use stored type if available
            category: property.category || mappedCategory, // Use stored category if available
            address: property.location || property.address || "",
            status: property.availability || property.status || "active",
            images: images,
            amenities: amenities,
            // Calculated/default fields for display
            units: totalUnits,
            occupied: occupiedUnits,
            vacant: vacant,
            occupancyRate: occupancyRate,
            monthlyRevenue: monthlyRevenue,
            revenue: displayRevenue, // Updated calculation
            revenueChange: revenueChange,
            roi: property.roi || 0,
            rating: property.rating || 0,
          };
        });
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
        console.log("Backend response:", response.data);
        // Backend returns { success: true, data: { property: {...} } }
        // So we need response.data.data.property
        const propertyData = response.data?.data?.property || response.data?.property || response.data;
        console.log("Loaded property for edit:", propertyData);
        console.log("Property images:", propertyData.images, typeof propertyData.images);
        setSelectedProperty(propertyData);
      } else {
        console.log("Using property from list:", property);
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
      // Helper function to extract valid emirate from location string
      const extractEmirate = (location: string): string => {
        if (!location) return 'dubai'; // Default emirate
        
        const locationLower = location.toLowerCase();
        
        // Valid backend emirate values
        const validEmirates = [
          'dubai',
          'abu_dhabi',
          'sharjah',
          'ajman',
          'ras_al_khaimah',
          'fujairah',
          'umm_al_quwain'
        ];
        
        // Check if location contains any valid emirate
        for (const emirate of validEmirates) {
          // Handle both underscore and space formats
          const emirateWithSpaces = emirate.replace(/_/g, ' ');
          if (locationLower.includes(emirate) || locationLower.includes(emirateWithSpaces)) {
            return emirate;
          }
        }
        
        // Default to dubai if no match found
        return 'dubai';
      };

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
        location: data.location,
        community: data.address,  // Frontend 'address' → Backend 'community'
        emirate: extractEmirate(data.location),  // Extract valid emirate from location
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
        ejariStatus: data.ejariStatus,
        insuranceExpiry: data.insuranceExpiry,
        lastInspection: data.lastInspection,
        nextInspection: data.nextInspection,
        notes: data.notes,
        images: data.images || [],  // Include uploaded images
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

      console.log("📸 Images being submitted:", data.images?.length || 0, "images");
      
      if (formMode === "create") {
        await propertiesAPI.create(backendData);
        toast.success("Property created successfully");
        // Invalidate property cache to ensure fresh list
        cacheService.invalidatePattern(/\/properties/);
      } else if (formMode === "edit" && selectedProperty?.id) {
        await propertiesAPI.update(selectedProperty.id, backendData);
        toast.success("Property updated successfully");
        // Invalidate property cache to ensure fresh list
        cacheService.invalidatePattern(/\/properties/);
      }
      setShowPropertyForm(false);
      fetchProperties(); // Reload the list
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
    console.log("Unit data:", data);
    setShowUnitForm(false);
  };

  const handleDeleteUnit = (unit: any) => {
    console.log("Delete unit:", unit);
    setShowUnitDetails(false);
  };

  // Export properties to Excel
  const handleExport = () => {
    try {
      const exportData = properties.map(property => ({
        'Property Name': property.name,
        'Type': property.type,
        'Category': property.category,
        'Location': property.location,
        'Address': property.address,
        'Year Built': property.yearBuilt,
        'Floors': property.floors,
        'Total Units': property.totalUnits || property.units,
        'Occupied': property.occupied,
        'Vacant': property.vacant,
        'Occupancy Rate': property.occupancyRate ? `${property.occupancyRate}%` : '',
        'Monthly Revenue': property.monthlyRevenue || property.revenue,
        'Market Value': property.marketValue,
        'Property Manager': property.propertyManager,
        'Contact Email': property.contactEmail,
        'Contact Phone': property.contactPhone,
        'Ejari Status': property.ejariStatus,
        'Insurance Expiry': property.insuranceExpiry,
        'Status': property.status,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Properties");
      XLSX.writeFile(wb, `properties_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Properties exported successfully");
    } catch (error) {
      console.error("Error exporting properties:", error);
      toast.error("Failed to export properties");
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
      'Ejari Status': 'compliant',
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
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground mt-2">Manage your comprehensive property portfolio</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || properties.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
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
          <Button className="bg-gradient-primary shadow-glow" onClick={handleAddProperty}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
              <p className="text-3xl font-bold text-foreground">{properties.length}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold text-foreground">AED {(totalRevenue / 1000000).toFixed(1)}M</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average Occupancy</p>
              <p className="text-3xl font-bold text-foreground">{averageOccupancy.toFixed(1)}%</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Units</p>
              <p className="text-3xl font-bold text-foreground">{totalUnits}</p>
              <p className="text-sm text-muted-foreground">{occupiedUnits} occupied</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
      {/* Search */}
        <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
            placeholder="Search properties, locations, or addresses..."
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
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="p-12 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading properties...</p>
        </Card>
      )}

      {/* Advanced Filters */}
      {!loading && showFilters && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Property Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {propertyCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Properties Display */}
      {!loading && viewMode === "grid" && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => {
            const PropertyIcon = getPropertyIcon(property.type);
            return (
          <Card key={property.id} className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group">
                {/* Property Image */}
                <div className="h-48 relative overflow-hidden">
                  {property.images && property.images.length > 0 ? (
                    <ImageCarousel images={property.images} alt={property.name} />
                  ) : (
                    <div className="h-full w-full bg-muted flex items-center justify-center">
                      <Building2 className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute bg-black/20"></div>
                  <div className="absolute top-4 left-4">
                    <Badge className={getStatusColor(property.status)}>
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </Badge>
              </div>
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-white/90 text-foreground">
                {property.type}
              </Badge>
            </div>
                  <div className="absolute bottom-4 right-4">
                    <div className="flex items-center gap-1 bg-white/90 rounded-full px-2 py-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs font-medium">{property.rating}</span>
                    </div>
                  </div>
                </div>

            <div className="p-6 space-y-4">
                  {/* Property Info */}
              <div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {property.name}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{property.location}</span>
                </div>
                    <p className="text-xs text-muted-foreground mt-1">{property.category}</p>
              </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                <div>
                      <p className="text-xs text-muted-foreground">Units</p>
                  <p className="text-lg font-semibold text-foreground">{property.units}</p>
                      {/* <p className="text-xs text-success">{property.occupied} occupied</p> */}
                </div>
                {/* <div>
                      <p className="text-xs text-muted-foreground">Occupancy</p>
                      <p className="text-lg font-semibold text-foreground">{property.occupancyRate || 0}%</p>
                      <Progress value={property.occupancyRate || 0} className="h-2 mt-1" />
                </div> */}
              </div>

                  {/* Revenue */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                        <p className="text-lg font-bold text-accent">
                          AED {((property.revenue || property.monthlyRevenue || 0) / 1000).toFixed(0)}K
                        </p>
                        {/* <div className="flex items-center gap-1 mt-1">
                          {(property.revenueChange || 0) > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={cn(
                            "text-xs font-medium",
                            (property.revenueChange || 0) > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {(property.revenueChange || 0) > 0 ? "+" : ""}{(property.revenueChange || 0).toFixed(1)}%
                          </span>
                        </div> */}
                      </div>
                      {/* <div className="text-right">
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className="text-sm font-semibold text-foreground">{property.roi}%</p>
                      </div> */}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
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
                        <DropdownMenuItem>
                          <Building2 className="h-4 w-4 mr-2" />
                          Manage Units
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Property Settings
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
              </Card>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === "list" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-6 font-medium text-muted-foreground">Property</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Location</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Units</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Occupancy</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Rating</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((property) => {
                  const PropertyIcon = getPropertyIcon(property.type);
                  return (
                    <tr key={property.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden">
                            <img 
                              src={property.images && property.images.length > 0 ? property.images[0] : "/placeholder.svg"} 
                              alt={property.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{property.name}</p>
                            <p className="text-sm text-muted-foreground">{property.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <Badge variant="secondary">{property.type}</Badge>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{property.location}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <p className="font-medium">{property.units}</p>
                          <p className="text-sm text-muted-foreground">{property.occupied} occupied</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Progress value={property.occupancyRate || 0} className="h-2" />
                          </div>
                          <span className="text-sm font-medium">{property.occupancyRate || 0}%</span>
                </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <p className="font-medium">AED {((property.revenue || property.monthlyRevenue || 0) / 1000).toFixed(0)}K</p>
                          <div className="flex items-center gap-1">
                            {(property.revenueChange || 0) > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span className={cn(
                              "text-xs",
                              (property.revenueChange || 0) > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {(property.revenueChange || 0) > 0 ? "+" : ""}{(property.revenueChange || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{property.rating}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <Badge className={getStatusColor(property.status)}>
                          {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="p-6">
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
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Property Settings
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
        </Card>
      )}

      {/* Pagination Controls */}
      {!loading && properties.length > 0 && viewMode !== "map" && (
        <Card className="mt-6">
          <div className="p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{((page - 1) * itemsPerPage) + 1}</span> to{" "}
              <span className="font-medium">{Math.min(page * itemsPerPage, totalItems)}</span> of{" "}
              <span className="font-medium">{totalItems}</span> properties
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

      {/* Map View Placeholder */}
      {!loading && viewMode === "map" && (
        <Card className="h-96 flex items-center justify-center">
          <div className="text-center">
            <Map className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Map View</h3>
            <p className="text-muted-foreground mb-4">Interactive map showing property locations</p>
            <Button variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Enable Map View
              </Button>
            </div>
          </Card>
      )}

      {/* Empty State */}
      {!loading && filteredProperties.length === 0 && (
        <Card className="p-12 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Properties Found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search criteria or add a new property.
          </p>
          <Button className="bg-gradient-primary shadow-glow" onClick={handleAddProperty}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Property
          </Button>
        </Card>
      )}

      {/* Property Form Modal */}
      <PropertyForm
        isOpen={showPropertyForm}
        onClose={() => setShowPropertyForm(false)}
        onSubmit={handlePropertySubmit}
        initialData={selectedProperty}
        mode={formMode}
      />

      {/* Property Analytics Modal */}
      {showAnalytics && selectedProperty && (
        <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            {analyticsData ? (
                <PropertyAnalytics 
                    property={analyticsData.property} 
                    revenueData={analyticsData.revenueData}
                    occupancyData={analyticsData.occupancyData}
                    expenseBreakdown={analyticsData.expenseBreakdown}
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
        propertyId={selectedProperty?.id}
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