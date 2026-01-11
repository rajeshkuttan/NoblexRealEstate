import { useState } from "react";
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
  DollarSign,
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
import { leadsAPI } from "@/services/api";
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
import { cn } from "@/lib/utils";

// Sample property data for marketing display
const properties = [
  {
    id: 1,
    name: "Marina Heights Tower",
    address: "Marina Walk, Dubai Marina, Dubai, UAE",
    type: "residential",
    category: "apartment",
    price: 85000,
    area: 1200,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop&crop=center"
    ],
    features: ["Sea View", "Balcony", "Gym", "Pool", "Concierge", "Parking"],
    description: "Luxury apartment with stunning marina views, modern amenities, and premium finishes.",
    rating: 4.8,
    reviews: 124,
    available: true,
    furnished: "semi-furnished",
    floor: 15,
    totalFloors: 25,
    yearBuilt: 2020,
    developer: "Emaar Properties",
    amenities: ["Swimming Pool", "Gym", "Concierge", "Security", "Parking", "Balcony"],
    nearby: ["Dubai Marina Mall", "JBR Beach", "Marina Walk", "Metro Station"],
    virtualTour: true,
    videoTour: true,
    floorPlan: true,
    energyRating: "A",
    petFriendly: true,
    smokingAllowed: false,
    leaseTerms: ["1 year", "2 years", "3 years"],
    deposit: 1,
    commission: 5
  },
  {
    id: 2,
    name: "Business Bay Office Space",
    address: "Business Bay, Dubai, UAE",
    type: "commercial",
    category: "office",
    price: 120000,
    area: 2000,
    bedrooms: 0,
    bathrooms: 3,
    parking: 4,
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&h=400&fit=crop&crop=center"
    ],
    features: ["City View", "Modern Design", "High-Speed Internet", "Meeting Rooms", "Reception", "Parking"],
    description: "Premium office space in the heart of Business Bay with modern facilities and excellent connectivity.",
    rating: 4.9,
    reviews: 89,
    available: true,
    furnished: "unfurnished",
    floor: 20,
    totalFloors: 30,
    yearBuilt: 2022,
    developer: "Damac Properties",
    amenities: ["Business Center", "Meeting Rooms", "Reception", "Security", "Parking", "High-Speed Internet"],
    nearby: ["Dubai Mall", "Burj Khalifa", "DIFC", "Metro Station"],
    virtualTour: true,
    videoTour: false,
    floorPlan: true,
    energyRating: "A+",
    petFriendly: false,
    smokingAllowed: false,
    leaseTerms: ["2 years", "3 years", "5 years"],
    deposit: 2,
    commission: 3
  },
  {
    id: 3,
    name: "Downtown Luxury Villa",
    address: "Downtown Dubai, Dubai, UAE",
    type: "residential",
    category: "villa",
    price: 250000,
    area: 3500,
    bedrooms: 4,
    bathrooms: 5,
    parking: 3,
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600&h=400&fit=crop&crop=center"
    ],
    features: ["Private Garden", "Swimming Pool", "Maid's Room", "Study", "Balcony", "Parking"],
    description: "Exclusive villa with private garden, swimming pool, and premium finishes in Downtown Dubai.",
    rating: 4.9,
    reviews: 67,
    available: true,
    furnished: "furnished",
    floor: 1,
    totalFloors: 2,
    yearBuilt: 2021,
    developer: "Emaar Properties",
    amenities: ["Private Garden", "Swimming Pool", "Maid's Room", "Study", "Balcony", "Parking"],
    nearby: ["Burj Khalifa", "Dubai Mall", "Dubai Fountain", "Metro Station"],
    virtualTour: true,
    videoTour: true,
    floorPlan: true,
    energyRating: "A",
    petFriendly: true,
    smokingAllowed: false,
    leaseTerms: ["1 year", "2 years", "3 years"],
    deposit: 1,
    commission: 5
  },
  {
    id: 4,
    name: "JBR Beachfront Apartment",
    address: "Jumeirah Beach Residence, Dubai, UAE",
    type: "residential",
    category: "apartment",
    price: 95000,
    area: 1100,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop&crop=center"
    ],
    features: ["Beach View", "Balcony", "Gym", "Pool", "Beach Access", "Parking"],
    description: "Stunning beachfront apartment with direct beach access and panoramic sea views.",
    rating: 4.7,
    reviews: 98,
    available: true,
    furnished: "furnished",
    floor: 8,
    totalFloors: 20,
    yearBuilt: 2019,
    developer: "Nakheel Properties",
    amenities: ["Beach Access", "Swimming Pool", "Gym", "Concierge", "Parking", "Balcony"],
    nearby: ["JBR Beach", "The Walk", "Dubai Marina", "Metro Station"],
    virtualTour: true,
    videoTour: true,
    floorPlan: true,
    energyRating: "A",
    petFriendly: true,
    smokingAllowed: false,
    leaseTerms: ["1 year", "2 years", "3 years"],
    deposit: 1,
    commission: 5
  },
  {
    id: 5,
    name: "DIFC Premium Office",
    address: "Dubai International Financial Centre, Dubai, UAE",
    type: "commercial",
    category: "office",
    price: 180000,
    area: 2500,
    bedrooms: 0,
    bathrooms: 4,
    parking: 6,
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&h=400&fit=crop&crop=center"
    ],
    features: ["City View", "Modern Design", "High-Speed Internet", "Meeting Rooms", "Reception", "Parking"],
    description: "Premium office space in the heart of DIFC with world-class facilities and excellent connectivity.",
    rating: 4.9,
    reviews: 45,
    available: true,
    furnished: "unfurnished",
    floor: 25,
    totalFloors: 35,
    yearBuilt: 2023,
    developer: "Emaar Properties",
    amenities: ["Business Center", "Meeting Rooms", "Reception", "Security", "Parking", "High-Speed Internet"],
    nearby: ["Dubai Mall", "Burj Khalifa", "Dubai Opera", "Metro Station"],
    virtualTour: true,
    videoTour: false,
    floorPlan: true,
    energyRating: "A+",
    petFriendly: false,
    smokingAllowed: false,
    leaseTerms: ["2 years", "3 years", "5 years"],
    deposit: 2,
    commission: 3
  },
  {
    id: 6,
    name: "Palm Jumeirah Villa",
    address: "Palm Jumeirah, Dubai, UAE",
    type: "residential",
    category: "villa",
    price: 350000,
    area: 4500,
    bedrooms: 5,
    bathrooms: 6,
    parking: 4,
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=600&h=400&fit=crop&crop=center",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600&h=400&fit=crop&crop=center"
    ],
    features: ["Private Beach", "Swimming Pool", "Maid's Room", "Study", "Garden", "Parking"],
    description: "Luxury villa on Palm Jumeirah with private beach access and stunning Arabian Gulf views.",
    rating: 4.9,
    reviews: 23,
    available: true,
    furnished: "furnished",
    floor: 1,
    totalFloors: 2,
    yearBuilt: 2020,
    developer: "Nakheel Properties",
    amenities: ["Private Beach", "Swimming Pool", "Maid's Room", "Study", "Garden", "Parking"],
    nearby: ["Atlantis Hotel", "Palm Jumeirah Beach", "Dubai Marina", "Metro Station"],
    virtualTour: true,
    videoTour: true,
    floorPlan: true,
    energyRating: "A",
    petFriendly: true,
    smokingAllowed: false,
    leaseTerms: ["1 year", "2 years", "3 years"],
    deposit: 1,
    commission: 5
  }
];

const propertyTypes = [
  { value: "all", label: "All Properties", icon: Building2 },
  { value: "residential", label: "Residential", icon: Home },
  { value: "commercial", label: "Commercial", icon: Briefcase },
  { value: "retail", label: "Retail", icon: ShoppingBag }
];

const locations = [
  "All Locations", "Dubai Marina", "Business Bay", "Downtown Dubai", "Jumeirah", 
  "Palm Jumeirah", "DIFC", "JBR", "Sheikh Zayed Road", "Al Barsha", "JLT"
];

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
        assignedTo: "Sarah Johnson", // Default assignment, can be changed later
        propertyType: selectedProperty?.category || "apartment",
        preferredLocation: selectedProperty?.address?.split(',')[1]?.trim() || "Dubai",
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
              <div className="text-4xl font-bold text-primary mb-2">6+</div>
              <div className="text-gray-600">Featured Properties</div>
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
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
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

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProperties.map((property) => (
                    <Card key={property.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
                      <div className="relative">
                        <img
                          src={property.images[0]}
                          alt={property.name}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
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
                              <span className="font-semibold">{property.rating}</span>
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
                            src={property.images[0]}
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
                                <span className="font-semibold">{property.rating}</span>
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
                  src={selectedProperty.images[0]}
                  alt={selectedProperty.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2">
                  {selectedProperty.images.slice(1, 5).map((image: string, index: number) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${selectedProperty.name} ${index + 2}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Property Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{selectedProperty.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Area:</span>
                      <span className="font-medium">{selectedProperty.area} sq ft</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bedrooms:</span>
                      <span className="font-medium">{selectedProperty.bedrooms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bathrooms:</span>
                      <span className="font-medium">{selectedProperty.bathrooms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Parking:</span>
                      <span className="font-medium">{selectedProperty.parking} spaces</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Furnished:</span>
                      <span className="font-medium capitalize">{selectedProperty.furnished}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Amenities</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProperty.amenities.map((amenity: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{amenity}</span>
                      </div>
                    ))}
                  </div>
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
