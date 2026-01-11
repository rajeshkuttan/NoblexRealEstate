import { useState } from "react";
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
  Warehouse
} from "lucide-react";
import PropertyForm from "@/components/properties/PropertyForm";
import PropertyAnalytics from "@/components/properties/PropertyAnalytics";
import UnitForm from "@/components/properties/UnitForm";
import UnitDetails from "@/components/properties/UnitDetails";
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

// Enhanced property data with more comprehensive information
const properties = [
  {
    id: 1,
    name: "Marina Heights Tower",
    location: "Dubai Marina",
    address: "Marina Walk, Dubai Marina, Dubai, UAE",
    type: "Residential",
    category: "Luxury Apartment",
    units: 45,
    occupied: 42,
    vacant: 3,
    revenue: 850000,
    revenueChange: 12.5,
    occupancyRate: 93.3,
    status: "active",
    rating: 4.8,
    yearBuilt: 2018,
    floors: 35,
    amenities: ["Pool", "Gym", "Parking", "Concierge", "Security"],
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop&crop=center"
    ],
    lastRenovation: "2022",
    propertyManager: "Ahmed Al-Rashid",
    maintenanceStatus: "excellent",
    leaseExpirations: 3,
    upcomingRenovations: 1,
    marketValue: 12500000,
    roi: 6.8,
    tenantSatisfaction: 4.7,
    energyRating: "A+",
    insuranceExpiry: "2024-12-31",
    ejariStatus: "compliant"
  },
  {
    id: 2,
    name: "Business Bay Commercial Plaza",
    location: "Business Bay",
    address: "Sheikh Zayed Road, Business Bay, Dubai, UAE",
    type: "Commercial",
    category: "Office Building",
    units: 28,
    occupied: 26,
    vacant: 2,
    revenue: 620000,
    revenueChange: 8.2,
    occupancyRate: 92.9,
    status: "active",
    rating: 4.6,
    yearBuilt: 2015,
    floors: 25,
    amenities: ["Parking", "Security", "Elevators", "HVAC", "Meeting Rooms"],
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop&crop=center"
    ],
    lastRenovation: "2021",
    propertyManager: "Sarah Johnson",
    maintenanceStatus: "good",
    leaseExpirations: 5,
    upcomingRenovations: 0,
    marketValue: 18500000,
    roi: 3.4,
    tenantSatisfaction: 4.5,
    energyRating: "A",
    insuranceExpiry: "2024-08-15",
    ejariStatus: "compliant"
  },
  {
    id: 3,
    name: "Palm Jumeirah Residences",
    location: "Palm Jumeirah",
    address: "Palm Jumeirah, Dubai, UAE",
    type: "Residential",
    category: "Villa",
    units: 32,
    occupied: 30,
    vacant: 2,
    revenue: 1200000,
    revenueChange: 15.3,
    occupancyRate: 93.8,
    status: "active",
    rating: 4.9,
    yearBuilt: 2020,
    floors: 2,
    amenities: ["Private Beach", "Pool", "Garden", "Parking", "Security", "Maid Service"],
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=400&h=300&fit=crop&crop=center"
    ],
    lastRenovation: "2023",
    propertyManager: "Fatima Al-Zahra",
    maintenanceStatus: "excellent",
    leaseExpirations: 2,
    upcomingRenovations: 0,
    marketValue: 25000000,
    roi: 4.8,
    tenantSatisfaction: 4.8,
    energyRating: "A+",
    insuranceExpiry: "2025-03-20",
    ejariStatus: "compliant"
  },
  {
    id: 4,
    name: "Downtown Office Complex",
    location: "Downtown Dubai",
    address: "Mohammed Bin Rashid Boulevard, Downtown Dubai, UAE",
    type: "Commercial",
    category: "Mixed Use",
    units: 18,
    occupied: 15,
    vacant: 3,
    revenue: 480000,
    revenueChange: -2.1,
    occupancyRate: 83.3,
    status: "active",
    rating: 4.3,
    yearBuilt: 2017,
    floors: 20,
    amenities: ["Retail", "Office", "Parking", "Security", "Food Court"],
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop&crop=center"
    ],
    lastRenovation: "2020",
    propertyManager: "Omar Hassan",
    maintenanceStatus: "good",
    leaseExpirations: 7,
    upcomingRenovations: 2,
    marketValue: 12000000,
    roi: 4.0,
    tenantSatisfaction: 4.2,
    energyRating: "B+",
    insuranceExpiry: "2024-11-10",
    ejariStatus: "pending"
  },
  {
    id: 5,
    name: "JBR Beachfront Apartments",
    location: "Jumeirah Beach Residence",
    address: "JBR Walk, Jumeirah Beach Residence, Dubai, UAE",
    type: "Residential",
    category: "Beachfront Apartment",
    units: 60,
    occupied: 58,
    vacant: 2,
    revenue: 950000,
    revenueChange: 18.7,
    occupancyRate: 96.7,
    status: "active",
    rating: 4.7,
    yearBuilt: 2019,
    floors: 40,
    amenities: ["Beach Access", "Pool", "Gym", "Parking", "Concierge", "Spa"],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop&crop=center"
    ],
    lastRenovation: "2023",
    propertyManager: "Layla Al-Mansouri",
    maintenanceStatus: "excellent",
    leaseExpirations: 4,
    upcomingRenovations: 0,
    marketValue: 22000000,
    roi: 5.2,
    tenantSatisfaction: 4.6,
    energyRating: "A+",
    insuranceExpiry: "2025-01-15",
    ejariStatus: "compliant"
  },
  {
    id: 6,
    name: "DIFC Financial Center",
    location: "DIFC",
    address: "Dubai International Financial Centre, Dubai, UAE",
    type: "Commercial",
    category: "Grade A Office",
    units: 35,
    occupied: 32,
    vacant: 3,
    revenue: 780000,
    revenueChange: 5.8,
    occupancyRate: 91.4,
    status: "active",
    rating: 4.5,
    yearBuilt: 2016,
    floors: 30,
    amenities: ["Premium Location", "Parking", "Security", "Business Center", "Restaurants"],
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop&crop=center"
    ],
    lastRenovation: "2022",
    propertyManager: "Khalid Al-Sabah",
    maintenanceStatus: "excellent",
    leaseExpirations: 6,
    upcomingRenovations: 1,
    marketValue: 28000000,
    roi: 3.3,
    tenantSatisfaction: 4.4,
    energyRating: "A",
    insuranceExpiry: "2024-09-30",
    ejariStatus: "compliant"
  }
];

const propertyTypes = ["All", "Residential", "Commercial", "Mixed Use"];
const propertyCategories = ["All", "Luxury Apartment", "Villa", "Office Building", "Beachfront Apartment", "Grade A Office", "Mixed Use"];
const statusOptions = ["All", "Active", "Under Maintenance", "Renovation", "Vacant"];
const sortOptions = ["Name", "Revenue", "Occupancy", "Rating", "Year Built", "Market Value"];

export default function Properties() {
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
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

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
          return b.revenue - a.revenue;
        case "Occupancy":
          return b.occupancyRate - a.occupancyRate;
        case "Rating":
          return b.rating - a.rating;
        case "Year Built":
          return b.yearBuilt - a.yearBuilt;
        case "Market Value":
          return b.marketValue - a.marketValue;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const totalRevenue = properties.reduce((sum, property) => sum + property.revenue, 0);
  const averageOccupancy = properties.reduce((sum, property) => sum + property.occupancyRate, 0) / properties.length;
  const totalUnits = properties.reduce((sum, property) => sum + property.units, 0);
  const occupiedUnits = properties.reduce((sum, property) => sum + property.occupied, 0);

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

  const handleEditProperty = (property: any) => {
    setFormMode("edit");
    setSelectedProperty(property);
    setShowPropertyForm(true);
  };

  const handleViewAnalytics = (property: any) => {
    setSelectedProperty(property);
    setShowAnalytics(true);
  };

  const handlePropertySubmit = (data: any) => {
    console.log("Property data:", data);
    // Here you would typically save to your backend
    setShowPropertyForm(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground mt-2">Manage your comprehensive property portfolio</p>
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

      {/* Advanced Filters */}
      {showFilters && (
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
              <Button variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Properties Display */}
      {viewMode === "grid" && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => {
            const PropertyIcon = getPropertyIcon(property.type);
            return (
          <Card key={property.id} className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group">
                {/* Property Image */}
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src={property.images[0]} 
                    alt={property.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20"></div>
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
                      <p className="text-xs text-success">{property.occupied} occupied</p>
                </div>
                <div>
                      <p className="text-xs text-muted-foreground">Occupancy</p>
                      <p className="text-lg font-semibold text-foreground">{property.occupancyRate}%</p>
                      <Progress value={property.occupancyRate} className="h-2 mt-1" />
                </div>
              </div>

                  {/* Revenue */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                        <p className="text-lg font-bold text-accent">AED {(property.revenue / 1000).toFixed(0)}K</p>
                        <div className="flex items-center gap-1 mt-1">
                          {property.revenueChange > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={cn(
                            "text-xs font-medium",
                            property.revenueChange > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {property.revenueChange > 0 ? "+" : ""}{property.revenueChange}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className="text-sm font-semibold text-foreground">{property.roi}%</p>
                      </div>
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
                        <DropdownMenuItem className="text-red-600">
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
      {viewMode === "list" && (
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
                              src={property.images[0]} 
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
                            <Progress value={property.occupancyRate} className="h-2" />
                          </div>
                          <span className="text-sm font-medium">{property.occupancyRate}%</span>
                </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <p className="font-medium">AED {(property.revenue / 1000).toFixed(0)}K</p>
                          <div className="flex items-center gap-1">
                            {property.revenueChange > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span className={cn(
                              "text-xs",
                              property.revenueChange > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {property.revenueChange > 0 ? "+" : ""}{property.revenueChange}%
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
                              <DropdownMenuItem className="text-red-600">
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

      {/* Map View Placeholder */}
      {viewMode === "map" && (
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
      {filteredProperties.length === 0 && (
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
            <PropertyAnalytics property={selectedProperty} />
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
    </div>
  );
}