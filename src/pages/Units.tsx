import { useState } from "react";
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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Comprehensive unit data with detailed information
const units = [
  {
    id: 1,
    unitNumber: "305",
    propertyId: 1,
    propertyName: "Marina Heights Tower",
    propertyLocation: "Dubai Marina",
    type: "Apartment",
    category: "2BR",
    area: 1200,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    balcony: true,
    furnished: "Semi-Furnished",
    monthlyRent: 85000,
    deposit: 85000,
    status: "Occupied",
    tenantId: 1,
    tenantName: "Sarah Ahmed",
    tenantPhone: "+971 50 123 4567",
    tenantEmail: "sarah.ahmed@email.com",
    leaseStartDate: "2024-01-01",
    leaseEndDate: "2024-12-31",
    leaseDuration: 12,
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop&crop=center"
    ],
    amenities: ["Sea View", "Balcony", "Gym Access", "Pool Access", "Parking", "Concierge"],
    features: ["Air Conditioning", "High-Speed Internet", "Cable TV", "Dishwasher", "Washing Machine"],
    floor: 15,
    orientation: "South",
    energyRating: "A",
    lastRenovation: "2022",
    maintenanceStatus: "Excellent",
    rentHistory: [
      { date: "2024-01-01", amount: 85000, status: "Paid" },
      { date: "2023-12-01", amount: 82000, status: "Paid" },
      { date: "2023-11-01", amount: 82000, status: "Paid" }
    ],
    maintenanceRequests: 2,
    lastMaintenance: "2024-06-15",
    nextInspection: "2024-09-01",
    marketValue: 95000,
    roi: 8.5,
    tenantSatisfaction: 4.8,
    availabilityDate: null,
    specialNotes: "Corner unit with panoramic sea views",
    documents: ["Lease Agreement", "Ejari Certificate", "Insurance Policy"],
    virtualTour: true,
    floorPlan: true,
    petFriendly: true,
    smokingAllowed: false
  },
  {
    id: 2,
    unitNumber: "306",
    propertyId: 1,
    propertyName: "Marina Heights Tower",
    propertyLocation: "Dubai Marina",
    type: "Apartment",
    category: "2BR",
    area: 1100,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    balcony: true,
    furnished: "Unfurnished",
    monthlyRent: 80000,
    deposit: 80000,
    status: "Available",
    tenantId: null,
    tenantName: null,
    tenantPhone: null,
    tenantEmail: null,
    leaseStartDate: null,
    leaseEndDate: null,
    leaseDuration: null,
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop&crop=center"
    ],
    amenities: ["Sea View", "Balcony", "Gym Access", "Pool Access", "Parking", "Concierge"],
    features: ["Air Conditioning", "High-Speed Internet", "Cable TV"],
    floor: 15,
    orientation: "North",
    energyRating: "A",
    lastRenovation: "2023",
    maintenanceStatus: "Excellent",
    rentHistory: [],
    maintenanceRequests: 0,
    lastMaintenance: "2024-05-20",
    nextInspection: "2024-08-01",
    marketValue: 90000,
    roi: 0,
    tenantSatisfaction: null,
    availabilityDate: "2024-08-01",
    specialNotes: "Recently renovated with modern finishes",
    documents: ["Ejari Certificate", "Insurance Policy"],
    virtualTour: true,
    floorPlan: true,
    petFriendly: true,
    smokingAllowed: false
  },
  {
    id: 3,
    unitNumber: "405",
    propertyId: 1,
    propertyName: "Marina Heights Tower",
    propertyLocation: "Dubai Marina",
    type: "Apartment",
    category: "3BR",
    area: 1300,
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    balcony: true,
    furnished: "Furnished",
    monthlyRent: 95000,
    deposit: 95000,
    status: "Occupied",
    tenantId: 2,
    tenantName: "Ahmed Hassan",
    tenantPhone: "+971 55 987 6543",
    tenantEmail: "ahmed.hassan@email.com",
    leaseStartDate: "2024-03-01",
    leaseEndDate: "2025-02-28",
    leaseDuration: 12,
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop&crop=center"
    ],
    amenities: ["Sea View", "Balcony", "Gym Access", "Pool Access", "Parking", "Concierge"],
    features: ["Air Conditioning", "High-Speed Internet", "Cable TV", "Dishwasher", "Washing Machine", "Microwave"],
    floor: 16,
    orientation: "South-East",
    energyRating: "A+",
    lastRenovation: "2024",
    maintenanceStatus: "Excellent",
    rentHistory: [
      { date: "2024-06-01", amount: 95000, status: "Paid" },
      { date: "2024-05-01", amount: 95000, status: "Paid" },
      { date: "2024-04-01", amount: 95000, status: "Paid" }
    ],
    maintenanceRequests: 1,
    lastMaintenance: "2024-07-10",
    nextInspection: "2024-10-01",
    marketValue: 100000,
    roi: 9.0,
    tenantSatisfaction: 4.9,
    availabilityDate: null,
    specialNotes: "Premium unit with upgraded kitchen and bathrooms",
    documents: ["Lease Agreement", "Ejari Certificate", "Insurance Policy"],
    virtualTour: true,
    floorPlan: true,
    petFriendly: true,
    smokingAllowed: false
  },
  {
    id: 4,
    unitNumber: "Office-201",
    propertyId: 2,
    propertyName: "Business Bay Commercial Plaza",
    propertyLocation: "Business Bay",
    type: "Office",
    category: "Executive Suite",
    area: 2000,
    bedrooms: 0,
    bathrooms: 3,
    parking: 4,
    balcony: false,
    furnished: "Unfurnished",
    monthlyRent: 120000,
    deposit: 240000,
    status: "Occupied",
    tenantId: 3,
    tenantName: "Tech Solutions LLC",
    tenantPhone: "+971 4 123 4567",
    tenantEmail: "info@techsolutions.ae",
    leaseStartDate: "2024-01-01",
    leaseEndDate: "2025-12-31",
    leaseDuration: 24,
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop&crop=center"
    ],
    amenities: ["City View", "Meeting Rooms", "Reception", "Parking", "Security", "Business Center"],
    features: ["Air Conditioning", "High-Speed Internet", "Phone Lines", "Video Conferencing", "Kitchenette"],
    floor: 20,
    orientation: "North",
    energyRating: "A",
    lastRenovation: "2023",
    maintenanceStatus: "Good",
    rentHistory: [
      { date: "2024-06-01", amount: 120000, status: "Paid" },
      { date: "2024-05-01", amount: 120000, status: "Paid" },
      { date: "2024-04-01", amount: 120000, status: "Paid" }
    ],
    maintenanceRequests: 3,
    lastMaintenance: "2024-06-20",
    nextInspection: "2024-09-15",
    marketValue: 130000,
    roi: 7.5,
    tenantSatisfaction: 4.6,
    availabilityDate: null,
    specialNotes: "Corner office with panoramic city views",
    documents: ["Lease Agreement", "Trade License", "Insurance Policy"],
    virtualTour: true,
    floorPlan: true,
    petFriendly: false,
    smokingAllowed: false
  },
  {
    id: 5,
    unitNumber: "Villa-01",
    propertyId: 3,
    propertyName: "Palm Jumeirah Residences",
    propertyLocation: "Palm Jumeirah",
    type: "Villa",
    category: "4BR Villa",
    area: 3500,
    bedrooms: 4,
    bathrooms: 5,
    parking: 3,
    balcony: true,
    furnished: "Furnished",
    monthlyRent: 250000,
    deposit: 250000,
    status: "Occupied",
    tenantId: 4,
    tenantName: "Johnson Family",
    tenantPhone: "+971 50 555 1234",
    tenantEmail: "johnson.family@email.com",
    leaseStartDate: "2024-02-01",
    leaseEndDate: "2025-01-31",
    leaseDuration: 12,
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=400&h=300&fit=crop&crop=center"
    ],
    amenities: ["Private Beach", "Swimming Pool", "Garden", "Maid's Room", "Parking", "Security"],
    features: ["Air Conditioning", "High-Speed Internet", "Cable TV", "Dishwasher", "Washing Machine", "Dryer", "Microwave", "Oven"],
    floor: 1,
    orientation: "South",
    energyRating: "A+",
    lastRenovation: "2024",
    maintenanceStatus: "Excellent",
    rentHistory: [
      { date: "2024-06-01", amount: 250000, status: "Paid" },
      { date: "2024-05-01", amount: 250000, status: "Paid" },
      { date: "2024-04-01", amount: 250000, status: "Paid" }
    ],
    maintenanceRequests: 1,
    lastMaintenance: "2024-07-05",
    nextInspection: "2024-10-15",
    marketValue: 280000,
    roi: 8.0,
    tenantSatisfaction: 4.9,
    availabilityDate: null,
    specialNotes: "Luxury villa with private beach access",
    documents: ["Lease Agreement", "Ejari Certificate", "Insurance Policy"],
    virtualTour: true,
    floorPlan: true,
    petFriendly: true,
    smokingAllowed: false
  },
  {
    id: 6,
    unitNumber: "Apt-502",
    propertyId: 4,
    propertyName: "JBR Beachfront Apartments",
    propertyLocation: "Jumeirah Beach Residence",
    type: "Apartment",
    category: "2BR",
    area: 1100,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    balcony: true,
    furnished: "Semi-Furnished",
    monthlyRent: 95000,
    deposit: 95000,
    status: "Available",
    tenantId: null,
    tenantName: null,
    tenantPhone: null,
    tenantEmail: null,
    leaseStartDate: null,
    leaseEndDate: null,
    leaseDuration: null,
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&crop=center"
    ],
    amenities: ["Beach Access", "Pool", "Gym", "Parking", "Concierge", "Spa"],
    features: ["Air Conditioning", "High-Speed Internet", "Cable TV", "Dishwasher"],
    floor: 8,
    orientation: "West",
    energyRating: "A",
    lastRenovation: "2023",
    maintenanceStatus: "Excellent",
    rentHistory: [],
    maintenanceRequests: 0,
    lastMaintenance: "2024-06-01",
    nextInspection: "2024-09-01",
    marketValue: 100000,
    roi: 0,
    tenantSatisfaction: null,
    availabilityDate: "2024-08-15",
    specialNotes: "Beachfront apartment with stunning sea views",
    documents: ["Ejari Certificate", "Insurance Policy"],
    virtualTour: true,
    floorPlan: true,
    petFriendly: true,
    smokingAllowed: false
  }
];

const unitTypes = ["All", "Apartment", "Villa", "Office", "Retail", "Warehouse"];
const unitCategories = ["All", "1BR", "2BR", "3BR", "4BR", "Studio", "Executive Suite", "4BR Villa"];
const statusOptions = ["All", "Available", "Occupied", "Under Maintenance", "Renovation"];
const sortOptions = ["Unit Number", "Rent", "Area", "Status", "Property", "Last Updated"];

export default function Units() {
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
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

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

  const handleViewUnit = (unit: any) => {
    setSelectedUnit(unit);
    setShowUnitDetails(true);
  };

  const handleEditUnit = (unit: any) => {
    setSelectedUnit(unit);
    setShowUnitForm(true);
  };

  const handleAddUnit = () => {
    setSelectedUnit(null);
    setShowUnitForm(true);
  };

  const handleUnitSubmit = (data: any) => {
    console.log("Unit data:", data);
    setShowUnitForm(false);
  };

  const handleViewAnalytics = () => {
    setShowUnitAnalytics(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Units</h1>
          <p className="text-muted-foreground mt-2">Manage individual units across all properties</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
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

      {/* Units Display */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit) => {
            const TypeIcon = getTypeIcon(unit.type);
            return (
              <Card key={unit.id} className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group">
                {/* Unit Image */}
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src={unit.images[0]} 
                    alt={`${unit.propertyName} - ${unit.unitNumber}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute top-4 left-4">
                    <Badge className={getStatusColor(unit.status)}>
                      {unit.status}
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-white/90 text-foreground">
                      {unit.type}
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 right-4">
                    <div className="flex items-center gap-1 bg-white/90 rounded-full px-2 py-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs font-medium">{unit.tenantSatisfaction || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Unit Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {unit.propertyName} - {unit.unitNumber}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{unit.propertyLocation}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{unit.category} • {unit.area} sq ft</p>
                  </div>

                  {/* Unit Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Bedrooms</p>
                      <p className="text-lg font-semibold text-foreground">{unit.bedrooms}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bathrooms</p>
                      <p className="text-lg font-semibold text-foreground">{unit.bathrooms}</p>
                    </div>
                  </div>

                  {/* Rent */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Rent</p>
                        <p className="text-lg font-bold text-accent">AED {unit.monthlyRent.toLocaleString()}</p>
                        {unit.status === "Occupied" && (
                          <p className="text-xs text-green-600">Occupied by {unit.tenantName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className="text-sm font-semibold text-foreground">{unit.roi}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewUnit(unit)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditUnit(unit)}>
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
                        <DropdownMenuItem className="text-red-600">
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
      {viewMode === "list" && (
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
                    <tr key={unit.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden">
                            <img 
                              src={unit.images[0]} 
                              alt={`${unit.propertyName} - ${unit.unitNumber}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{unit.unitNumber}</p>
                            <p className="text-sm text-muted-foreground">{unit.category}</p>
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
                          <p className="text-sm text-muted-foreground">{unit.propertyLocation}</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <p className="font-medium">{unit.area} sq ft</p>
                          <p className="text-sm text-muted-foreground">{unit.bedrooms}BR • {unit.bathrooms}BA</p>
                        </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <p className="font-medium">AED {unit.monthlyRent.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">ROI: {unit.roi}%</p>
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
                            <p className="text-sm text-muted-foreground">{unit.tenantPhone}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Available</span>
                        )}
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewUnit(unit)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditUnit(unit)}>
                            <Edit className="h-4 w-4" />
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
                              <DropdownMenuItem className="text-red-600">
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

      {/* Modals */}
      <UnitForm
        isOpen={showUnitForm}
        onClose={() => setShowUnitForm(false)}
        onSubmit={handleUnitSubmit}
        initialData={selectedUnit}
        mode={selectedUnit ? "edit" : "create"}
      />

      <UnitDetails
        unit={selectedUnit}
        isOpen={showUnitDetails}
        onClose={() => setShowUnitDetails(false)}
        onEdit={handleEditUnit}
        onDelete={(unit) => console.log("Delete unit:", unit)}
      />

      <UnitAnalytics
        isOpen={showUnitAnalytics}
        onClose={() => setShowUnitAnalytics(false)}
        units={units}
      />
    </div>
  );
}
