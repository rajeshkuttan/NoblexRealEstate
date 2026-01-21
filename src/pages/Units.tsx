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
  Bed,
  Bath,
  Car,
  Square,
  Wifi,
  Shield,
  Key,
  User,
  Phone,
  Mail,
  FileText,
  Camera,
  Video,
  Share2,
  Heart,
  Bookmark
} from "lucide-react";
import UnitForm from "@/components/units/UnitForm";
import UnitDetails from "@/components/units/UnitDetails";
import UnitAnalytics from "@/components/units/UnitAnalytics";
import { unitsAPI, servicesAPI, propertiesAPI, leasesAPI } from "@/services/api";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
const unitCategories = ["All", "1BR", "2BR", "3BR", "4BR", "Studio", "Executive Suite", "4BR Villa"];
const statusOptions = ["All", "Available", "Occupied", "Under Maintenance", "Renovation"];
const sortOptions = ["Unit Number", "Rent", "Area", "Status", "Property", "Last Updated"];

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

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={cn("relative w-full h-full overflow-hidden group", className)}>
      <img
        src={images[currentIndex]}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedProperty, setSelectedProperty] = useState("All");
  const [sortBy, setSortBy] = useState("Unit Number");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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
  

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUnits();
  }, [currentPage, itemsPerPage]);

  const fetchUnits = async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (forceRefresh) {
        setUnits([]); // Clear UI to show reload
      }
      
      const params: any = { 
        page: currentPage, 
        limit: itemsPerPage 
      };
      
      if (forceRefresh) {
        params._t = Date.now();
      }

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
      
      const mapBackendTypeToFrontend = (type: string): string => {
        const typeLower = (type || '').toLowerCase();
        
        if (typeLower === 'studio') return 'Studio';
        if (typeLower === 'apartment') return 'Apartment';
        if (typeLower === 'penthouse') return 'Penthouse';
        if (typeLower === 'villa') return 'Villa';
        if (typeLower === 'townhouse') return 'Townhouse';
        if (typeLower === 'duplex') return 'Duplex';
        
        return 'Apartment'; 
      };

      const mapBackendFurnishedToFrontend = (furnished: boolean): string => {
        return furnished ? 'Furnished' : 'Unfurnished';
      };
      
      if (Array.isArray(unitsData)) {
        unitsData = unitsData.map(unit => {
          let images = unit.images;
          if (typeof images === 'string') {
            try {
              images = JSON.parse(images);
            } catch (e) {
              images = [];
            }
          }
          if (!Array.isArray(images)) {
            images = [];
          }
          
          return {
            ...unit,
            type: mapBackendTypeToFrontend(unit.type),  
            furnished: mapBackendFurnishedToFrontend(unit.furnished),  
            propertyName: unit.property?.title || unit.propertyName || "N/A",
            tenantName: unit.leases?.[0]?.tenant?.name || unit.tenantName || null, 
            monthlyRent: unit.rentAmount || unit.monthlyRent || 0,
            deposit: unit.depositAmount || unit.deposit || 0,
            images: images,
          };
        });
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

  // Filter and sort units
  const filteredUnits = units.filter(unit => {
    const matchesSearch = unit.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         unit.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (unit.tenantName && unit.tenantName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === "All" || unit.type === selectedType;
    const matchesCategory = selectedCategory === "All" || unit.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || unit.status === selectedStatus;
    const matchesProperty = selectedProperty === "All" || unit.propertyName === selectedProperty;
    
    return matchesSearch && matchesType && matchesCategory && matchesStatus && matchesProperty;
  }).sort((a, b) => {
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
  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === "Occupied").length;
  const availableUnits = units.filter(u => u.status === "Available").length;
  const totalRevenue = units.filter(u => u.status === "Occupied").reduce((sum, unit) => sum + unit.monthlyRent, 0);
  const averageRent = totalRevenue / occupiedUnits || 0;
  const occupancyRate = (occupiedUnits / totalUnits) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Occupied": return "bg-green-100 text-green-800 border-green-200";
      case "Available": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Under Maintenance": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Renovation": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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
        description: data.specialNotes || data.description || '',
        images: data.images || [],  
        floorPlan: data.floorPlan ? 'yes' : '', 
        orientation: data.orientation || '',  
        energyRating: data.energyRating || '',  
        lastRenovation: data.lastRenovation || '',  
        balcony: Boolean(data.balcony),
        parking: Boolean(data.parking) || parseInt(data.parking) || 0, 
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
            const existingServices = await servicesAPI.getByEntity('unit', unitId);
            const servicesToDelete = existingServices.data?.data?.services || [];
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
      fetchUnits();
    } catch (error: any) {
      console.error("Error saving unit:", error);
      toast.error(error.response?.data?.message || `Failed to ${formMode === "create" ? "create" : "update"} unit`);
    }
  };

  const confirmDeleteUnit = (unit: Unit) => {
    setUnitToDelete(unit);
    setShowDeleteDialog(true);
  };



  const handleViewAnalytics = () => {
    setShowUnitAnalytics(true);
  };

  // Export units to Excel
  const handleExport = () => {
    try {
      const exportData = units.map(unit => ({
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

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Units");
      XLSX.writeFile(wb, `units_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Units exported successfully");
    } catch (error) {
      console.error("Error exporting units:", error);
      toast.error("Failed to export units");
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

        let successCount = 0;
        let failCount = 0;

        // Process and validate imported data
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
        console.log("🛠️ Starting processing of", jsonData.length, "rows");

        // Log keys of the first row to ensure they match expectations
        if (jsonData.length > 0) {
            console.log("🔑 Row 1 Keys:", Object.keys(jsonData[0] as object));
        }

        // Use standard for loop to avoid iterator weirdness and better debugging
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as any;
          console.log(`Processing row ${i+1}:`, JSON.stringify(row));

          const propertyName = row['Property']?.toString().trim();
          // Use fuzzy matching or direct lookup
          let propertyId = propertyMap.get(propertyName?.toLowerCase());

          // Debug property lookup
          if (propertyName && !propertyId) {
             console.log(`⚠️ Property check: '${propertyName?.toLowerCase()}' not found in map of ${propertyMap.size} properties.`);
          }

          if (!propertyName || !propertyId) {
            const msg = `Line ${i+1}: Property '${propertyName}' not found in system. Please check the name.`;
            // Show toast immediately for the first few errors to alert the user
            if (failCount < 3) {
                 toast.warning(msg, { autoClose: 5000 });
            }
            console.warn(msg);
            errors.push(msg);
            failCount++;
            continue; 
          }

          // Map furnished status
          const furnishedStr = row['Furnished']?.toString().toLowerCase() || '';
          const isFurnished = furnishedStr === 'furnished' || furnishedStr === 'yes' || furnishedStr === 'true';

          const mappedType = mapTypeToBackend(row['Type']?.toString());

          const unitData = {
            unitNumber: row['Unit Number']?.toString() || `U-${Date.now()}-${i}`, // Fallback if missing
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
          
          // Log the payload before sending
          console.log(`➡️ Creating unit ${unitData.unitNumber} with payload:`, unitData);
          if (!unitData.propertyId) {
             console.error("❌ CRITICAL: Property ID is missing or invalid:", unitData.propertyId);
          }

          try {
            const start = Date.now();
            await unitsAPI.create(unitData);
            console.log(`✅ Created unit ${unitData.unitNumber} in ${Date.now() - start}ms`);
            successCount++;
          } catch (err: any) {
            console.error(`❌ FAILURE Creating unit ${unitData.unitNumber}:`, err);
            const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
            const msg = `Failed to create unit ${unitData.unitNumber}: ${errorMsg}`;
            errors.push(msg);
            failCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} units`);
        }
        
        if (failCount > 0) {
          console.error("Import errors:", errors);
          toast.error(`Failed to import ${failCount} units. See console.`);
          
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
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadClick = (e: React.MouseEvent) => {
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
    if (!window.confirm("Are you sure you want to delete this unit?")) return;

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
    setSortBy("Unit Number");
    toast.success("Filters cleared");
  };

  console.log("🏢 Units Component Rendered", units);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Units</h1>
          <p className="text-muted-foreground mt-2">Manage individual units across all properties</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || units.length === 0}>
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
              <DropdownMenuItem onSelect={handleUploadClick}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Excel File
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
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAddUnit}>
            <Plus className="h-4 w-4 mr-2" />
            Add Unit
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Units</p>
              <p className="text-3xl font-bold text-foreground">{totalUnits}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Home className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Occupied Units</p>
              <p className="text-3xl font-bold text-green-600">{occupiedUnits}</p>
              <p className="text-sm text-muted-foreground">{occupancyRate.toFixed(1)}% occupancy</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Available Units</p>
              <p className="text-3xl font-bold text-blue-600">{availableUnits}</p>
              <p className="text-sm text-muted-foreground">Ready to rent</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
              <p className="text-3xl font-bold text-foreground">AED {(totalRevenue / 1000).toFixed(0)}K</p>
              <p className="text-sm text-muted-foreground">Avg: AED {averageRent.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
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
            placeholder="Search units, properties, or tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {unitTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {unitCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          </Button>

          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="p-12 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading units...</p>
        </Card>
      )}

      {/* Units Display */}
      {!loading && viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => {
            const TypeIcon = getTypeIcon(unit.type);
            return (
              <Card
                key={unit.id}
                className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group"
              >
                {/* Unit Image */}
                <div className="h-48 relative overflow-hidden">
                  <ImageCarousel
                    images={unit.images || []}
                    alt={`${unit.propertyName || "Property"} - ${unit.unitNumber}`}
                  />
                  {/* Keep your existing badges/overlay exactly as they were */}
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute top-4 left-4">
                    <Badge className={getStatusColor(unit.status)}>
                      {unit.status}
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge
                      variant="secondary"
                      className="bg-white/90 text-foreground"
                    >
                      {unit.type}
                    </Badge>
                  </div>
                  {/* Add this optional counter if you want */}
                  {unit.images?.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full z-10">
                      {unit.images.length} photos
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  {/* Unit Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {unit.property.title} - {unit.unitNumber}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{unit.property.location}</span>
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
                          Monthly Rent
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
                  <th className="text-left p-6 font-medium text-muted-foreground">Unit</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Property</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Area</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Rent</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Tenant</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => {
                  const TypeIcon = getTypeIcon(unit.type);
                  return (
                    <tr
                      key={unit.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-24 rounded overflow-hidden relative group">
                            <ImageCarousel
                              images={unit.images || []}
                              alt={`${unit.propertyName || "Property"} - ${unit.unitNumber}`}
                              className="h-full"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {unit.unitNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {unit.category || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{unit.type}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <p className="font-medium">{unit.propertyName}</p>
                          <p className="text-sm text-muted-foreground">
                            {unit.propertyLocation}
                          </p>
                        </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <p className="font-medium">{unit.area} sq ft</p>
                          <p className="text-sm text-muted-foreground">
                            {unit.bedrooms}BR • {unit.bathrooms}BA
                          </p>
                        </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <p className="font-medium">
                            AED {unit.monthlyRent.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ROI: {unit.roi}%
                          </p>
                        </div>
                      </td>
                      <td className="p-6">
                        <Badge className={getStatusColor(unit.status)}>
                          {unit.status}
                        </Badge>
                      </td>
                      <td className="p-6">
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
                      <td className="p-6">
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
        </Card>
      )}

      {/* No Results */}
      {filteredUnits.length === 0 && (
        <Card>
          <div className="p-12 text-center">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No units found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or add a new unit.
            </p>
            <Button onClick={handleAddUnit} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {filteredUnits.length > 0 && totalPages > 1 && (
        <Card className="mt-6">
          <div className="p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{" "}
              <span className="font-medium">{totalItems}</span> units
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1); // Reset to first page when changing items per page
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

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {/* First page */}
                  {currentPage > 2 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                        1
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Ellipsis before */}
                  {currentPage > 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {/* Previous page */}
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(currentPage - 1)} className="cursor-pointer">
                        {currentPage - 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Current page */}
                  <PaginationItem>
                    <PaginationLink isActive className="cursor-default">
                      {currentPage}
                    </PaginationLink>
                  </PaginationItem>
                  
                  {/* Next page */}
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(currentPage + 1)} className="cursor-pointer">
                        {currentPage + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Ellipsis after */}
                  {currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  {/* Last page */}
                  {currentPage < totalPages - 1 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </Card>
      )}

      {/* Modals */}
      <UnitForm
        key={selectedUnit?.id || 'new'}
        isOpen={showUnitForm}
        onClose={() => setShowUnitForm(false)}
        onSubmit={handleUnitSubmit}
        initialData={selectedUnit}
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
        units={units}
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
              onClick={handleDeleteUnit}
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
