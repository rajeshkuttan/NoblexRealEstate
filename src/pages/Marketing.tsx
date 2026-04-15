import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Filter, 
  MapPin, 
  Bed, 
  Bath, 
  Car, 
  Square, 
  Star, 
  Heart, 
  Share2, 
  Phone, 
  Mail, 
  MessageSquare, 
  Building2, 
  Home, 
  Briefcase, 
  ShoppingBag, 
  Wifi, 
  Shield, 
  CheckCircle, 
  ArrowRight, 
  Play, 
  Users, 
  Award, 
  TrendingUp, 
  Banknote,
  Calendar,
  Eye,
  Download,
  Send,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  List
} from "lucide-react";
import { leadsAPI, unitsAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, resolveImageUrl } from "@/lib/utils";


const priceRanges = [
  { label: "Any Price", value: "any" },
  { label: "Under AED 50,000", value: "0-50000" },
  { label: "AED 50,000 - 100,000", value: "50000-100000" },
  { label: "AED 100,000 - 200,000", value: "100000-200000" },
  { label: "AED 200,000+", value: "200000+" }
];

export default function Marketing() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [selectedPriceRange, setSelectedPriceRange] = useState("any");
  const [sortBy, setSortBy] = useState("price");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real properties (units) from API
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoading(true);
        const response = await unitsAPI.getAll({ 
          status: 'available',
          includeImages: 'true'
        });
        
        const units = response.data?.units || [];
        
        // Map backend units to the frontend marketing card format
        const mappedProperties = units.map((unit: any) => ({
          id: unit.id,
          name: `${unit.property?.title || 'Property'} - Unit ${unit.unitNumber}`,
          address: unit.property?.location || 'Dubai, UAE',
          type: (unit.property?.buildingType || 'residential').toLowerCase(),
          category: (unit.type || 'apartment').toLowerCase(),
          price: parseFloat(unit.rentAmount) || 0,
          area: unit.area || 0,
          bedrooms: unit.bedrooms || 0,
          bathrooms: unit.bathrooms || 0,
          parking: unit.parking || 0,
          images: Array.isArray(unit.images) && unit.images.length > 0 
            ? unit.images 
            : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop&crop=center"],
          features: unit.features || ["Modern Design", "Cooling System", "Prime Location"],
          description: unit.description || "Beautiful property with modern amenities and convenient location.",
          rating: 4.5 + (Math.random() * 0.5), // Randomized rating for marketing
          reviews: Math.floor(Math.random() * 100) + 10,
          available: unit.status === 'available',
          furnished: unit.furnished ? "furnished" : "unfurnished",
          floor: unit.floor,
          totalFloors: unit.property?.totalFloors,
          amenities: unit.amenities || ["Security", "Parking", "Water"],
          petFriendly: unit.petFriendly,
          smokingAllowed: unit.smokingAllowed,
          leaseTerms: ["1 year", "2 years"],
          deposit: parseFloat(unit.depositAmount) || 1
        }));
        
        setProperties(mappedProperties);
      } catch (error) {
        console.error("Error fetching properties:", error);
        toast({
          title: "Error",
          description: "Failed to load properties. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, [toast]);

  // Derived filters and types from real data
  const dynamicLocations = useMemo(() => {
    const locs = Array.from(new Set(properties.map(p => p.address.split(',')[0].trim())));
    return ["All Locations", ...locs.sort()];
  }, [properties]);

  const dynamicPropertyTypes = useMemo(() => {
    const types = Array.from(new Set(properties.map(p => p.type)));
    const baseTypes = [
      { value: "all", label: "All Properties", icon: Building2 },
      { value: "residential", label: "Residential", icon: Home },
      { value: "commercial", label: "Commercial", icon: Briefcase },
      { value: "retail", label: "Retail", icon: ShoppingBag }
    ];
    // Filter base types to only show what exists, or just show all if empty
    return baseTypes.filter(t => t.value === "all" || types.includes(t.value));
  }, [properties]);

  // Filter properties
  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         property.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || property.type === selectedType;
    const matchesLocation = selectedLocation === "All Locations" || 
                           property.address.toLowerCase().includes(selectedLocation.toLowerCase());
    
    let matchesPrice = true;
    if (selectedPriceRange !== "any") {
      const [min, max] = selectedPriceRange.split("-").map(Number);
      if (max) {
        matchesPrice = property.price >= min && property.price <= max;
      } else {
        matchesPrice = property.price >= min;
      }
    }
    
    return matchesSearch && matchesType && matchesLocation && matchesPrice;
  }).sort((a, b) => {
    switch (sortBy) {
      case "price": return a.price - b.price;
      case "area": return b.area - a.area;
      case "rating": return b.rating - a.rating;
      case "name": return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  const handleViewProperty = (property: any) => {
    setSelectedProperty(property);
    setShowPropertyDetails(true);
  };

  const handleContactProperty = (property: any) => {
    setSelectedProperty(property);
    setShowContactForm(true);
  };

  const handleToggleFavorite = (propertyId: number) => {
    setFavorites(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleContactSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      
      // Prepare lead data from contact form
      const leadData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: "Walk-in Client", // Default for marketing leads
        source: "Marketing Website",
        status: "cold", // New lead starts as cold
        priority: "medium",
        assignedTo: null, // Removed hardcoded assignment
        propertyType: selectedProperty?.category || "apartment",
        preferredLocation: selectedProperty?.address?.includes(',') 
          ? selectedProperty.address.split(',')[1]?.trim() 
          : selectedProperty?.address || "Dubai",
        budget: selectedProperty?.price || 0,
        requirements: formData.message || `Interested in ${selectedProperty?.name}`,
        leadScore: 50, // Default score
        tags: [selectedProperty?.type || "residential", "website-inquiry"],
        contactMethod: formData.contactMethod || "phone",
        nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        notes: `Property Inquiry: ${selectedProperty?.name}\nProperty ID: ${selectedProperty?.id}\nMessage: ${formData.message || 'No message provided'}`
      };

      // Create lead via API
      await leadsAPI.create(leadData);
      
      toast({
        title: "Success!",
        description: "Your inquiry has been submitted. Our team will contact you soon.",
        variant: "default",
      });
      
      setShowContactForm(false);
      setSelectedProperty(null);
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: "Failed to submit inquiry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-withu text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Find Your Perfect Property in Dubai
            </h1>
            <p className="text-xl mb-8 opacity-90">
              Discover premium residential and commercial properties across Dubai's most sought-after locations
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Search properties, locations, or features..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/90 border-0 text-gray-900"
                    />
                  </div>
                </div>
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Search className="h-5 w-5 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">{properties.length}+</div>
              <div className="text-gray-600">Available Units</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-gray-600">Customer Satisfaction</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">15+</div>
              <div className="text-gray-600">Years Experience</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-gray-600">Customer Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Properties */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <div className="lg:w-1/4">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Property Type</label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicPropertyTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicLocations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Price Range</label>
                    <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priceRanges.map((range) => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price (Low to High)</SelectItem>
                        <SelectItem value="area">Area (Large to Small)</SelectItem>
                        <SelectItem value="rating">Rating (High to Low)</SelectItem>
                        <SelectItem value="name">Name (A to Z)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedType("all");
                      setSelectedLocation("All Locations");
                      setSelectedPriceRange("any");
                      setSortBy("price");
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Properties Grid */}
            <div className="lg:w-3/4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Available Properties</h2>
                  <p className="text-gray-600">{filteredProperties.length} properties found</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Building2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-48 bg-gray-200" />
                      <CardContent className="p-4 space-y-3">
                        <div className="h-6 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="flex gap-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4" />
                          <div className="h-4 bg-gray-200 rounded w-1/4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProperties.map((property) => (
                    <Card key={property.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
                      <div className="relative overflow-hidden">
                        <img
                          src={resolveImageUrl(property.images[0])}
                          alt={property.name}
                          className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500 ease-in-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-4 right-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            onClick={() => handleToggleFavorite(property.id)}
                          >
                            <Heart 
                              className={cn(
                                "h-4 w-4",
                                favorites.includes(property.id) ? "fill-red-500 text-red-500" : ""
                              )} 
                            />
                          </Button>
                          <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-white/90 text-gray-900">
                            {property.available ? "Available" : "Sold"}
                          </Badge>
                        </div>
                      </div>
                      
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {property.name}
                            </h3>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {property.address}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Bed className="h-4 w-4" />
                              <span>{property.bedrooms}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Bath className="h-4 w-4" />
                              <span>{property.bathrooms}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Car className="h-4 w-4" />
                              <span>{property.parking}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Square className="h-4 w-4" />
                              <span>{property.area} sq ft</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="font-semibold">{property.rating.toFixed(1)}</span>
                              <span className="text-sm text-gray-600">({property.reviews})</span>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">
                                AED {property.price.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-600">per month</div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              className="flex-1" 
                              onClick={() => handleViewProperty(property)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleContactProperty(property)}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Contact
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProperties.map((property) => (
                    <Card key={property.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <img
                            src={resolveImageUrl(property.images[0])}
                            alt={property.name}
                            className="w-48 h-32 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-xl font-semibold mb-2">{property.name}</h3>
                                <p className="text-gray-600 mb-2 flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {property.address}
                                </p>
                                <p className="text-sm text-gray-600 mb-3">{property.description}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary mb-2">
                                  AED {property.price.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-600">per month</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                              <div className="flex items-center gap-1">
                                <Bed className="h-4 w-4" />
                                <span>{property.bedrooms} beds</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Bath className="h-4 w-4" />
                                <span>{property.bathrooms} baths</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Car className="h-4 w-4" />
                                <span>{property.parking} parking</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Square className="h-4 w-4" />
                                <span>{property.area} sq ft</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span className="font-semibold">{property.rating.toFixed(1)}</span>
                                <span className="text-sm text-gray-600">({property.reviews} reviews)</span>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => handleToggleFavorite(property.id)}
                                >
                                  <Heart 
                                    className={cn(
                                      "h-4 w-4 mr-2",
                                      favorites.includes(property.id) ? "fill-red-500 text-red-500" : ""
                                    )} 
                                  />
                                  {favorites.includes(property.id) ? "Saved" : "Save"}
                                </Button>
                                <Button onClick={() => handleViewProperty(property)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                                <Button variant="outline" onClick={() => handleContactProperty(property)}>
                                  <Phone className="h-4 w-4 mr-2" />
                                  Contact
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* No Results */}
              {filteredProperties.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No properties found</h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your search criteria or browse all properties.
                    </p>
                    <Button onClick={() => {
                      setSearchQuery("");
                      setSelectedType("all");
                      setSelectedLocation("All Locations");
                      setSelectedPriceRange("any");
                    }}>
                      View All Properties
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Property Details Modal */}
      <Dialog open={showPropertyDetails} onOpenChange={setShowPropertyDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedProperty?.name}
            </DialogTitle>
            <p className="text-muted-foreground">
              {selectedProperty?.address}
            </p>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-6">
              {/* Property Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <img
                  src={resolveImageUrl(selectedProperty.images[0])}
                  alt={selectedProperty.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2">
                  {selectedProperty.images.slice(1, 5).map((image: string, index: number) => (
                    <img
                      key={index}
                      src={resolveImageUrl(image)}
                      alt={`${selectedProperty.name} ${index + 2}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>

              {/* Property Details */}
               {/* Property Details Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                   <div className="bg-white rounded-xl border p-6 shadow-sm">
                     <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                       <Building2 className="h-5 w-5 text-primary" />
                       Key Specifications
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-100">
                         <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Area</span>
                         <span className="text-sm font-bold">{selectedProperty.area} sq ft</span>
                       </div>
                       <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-100">
                         <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Type</span>
                         <span className="text-sm font-bold capitalize">{selectedProperty.type}</span>
                       </div>
                       <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-100">
                         <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Bedrooms</span>
                         <span className="text-sm font-bold">{selectedProperty.bedrooms}</span>
                       </div>
                       <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-100">
                         <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Bathrooms</span>
                         <span className="text-sm font-bold">{selectedProperty.bathrooms}</span>
                       </div>
                       <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-100">
                         <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Parking</span>
                         <span className="text-sm font-bold">{selectedProperty.parking} Spaces</span>
                       </div>
                       <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-100">
                         <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Furnished</span>
                         <span className="text-sm font-bold capitalize">{selectedProperty.furnished}</span>
                       </div>
                     </div>
                   </div>

                   <div className="bg-white rounded-xl border p-6 shadow-sm">
                     <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                       <MessageSquare className="h-5 w-5 text-primary" />
                       Description
                     </h3>
                     <p className="text-gray-600 text-sm leading-relaxed">
                       {selectedProperty.description}
                     </p>
                   </div>
                 </div>

                 <div className="space-y-6">
                   <div className="bg-white rounded-xl border p-6 shadow-sm">
                     <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                       <Shield className="h-5 w-5 text-primary" />
                       Amenities & Facilities
                     </h3>
                     <div className="grid grid-cols-2 gap-3">
                       {selectedProperty.amenities.map((amenity: string, index: number) => (
                         <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 transition-colors">
                           <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                           <span className="text-xs font-medium text-slate-700">{amenity}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                   
                   {/* More details like nearby, virtual tour flags etc can go here */}
                 </div>
               </div>

              {/* Pricing */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Pricing & Terms</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      AED {selectedProperty.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Monthly Rent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {selectedProperty.deposit} month{selectedProperty.deposit > 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-gray-600">Security Deposit</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {selectedProperty.commission}%
                    </div>
                    <div className="text-sm text-gray-600">Commission</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button className="flex-1" onClick={() => handleContactProperty(selectedProperty)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Agent
                </Button>
                <Button variant="outline" className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Viewing
                </Button>
                <Button variant="outline">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Form Modal */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact About Property</DialogTitle>
            <p className="text-muted-foreground">
              Get in touch with our team about {selectedProperty?.name}
            </p>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData);
            handleContactSubmit(data);
          }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Full Name *</label>
                <Input name="name" required placeholder="Your full name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Email *</label>
                <Input name="email" type="email" required placeholder="your@email.com" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Phone *</label>
                <Input name="phone" required placeholder="+971 50 123 4567" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Preferred Contact</label>
                <Select name="contactMethod">
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <textarea
                name="message"
                rows={4}
                className="w-full p-3 border rounded-lg resize-none"
                placeholder="Tell us about your requirements..."
              />
            </div>

            <div className="flex gap-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowContactForm(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-withu" disabled={isSubmitting}>
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
