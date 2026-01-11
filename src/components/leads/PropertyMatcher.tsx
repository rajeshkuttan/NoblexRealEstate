import { useState, useEffect } from "react";
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Home, 
  Star, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Building2,
  Car,
  Wifi,
  Shield,
  Users,
  Heart,
  Share2,
  Calendar,
  Phone,
  MessageSquare,
  Eye,
  Filter,
  SortAsc,
  SortDesc
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PropertyMatcherProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
}

// Sample property data for UAE market
const sampleProperties = [
  {
    id: 1,
    title: "Luxury 2BR Apartment in Dubai Marina",
    location: "Dubai Marina",
    emirate: "Dubai",
    community: "Marina Walk",
    type: "apartment",
    bedrooms: 2,
    bathrooms: 2,
    area: 1200,
    price: 120000,
    pricePerSqft: 100,
    furnished: "furnished",
    amenities: ["Gym", "Pool", "Parking", "Concierge", "Sea View"],
    images: ["/api/placeholder/400/300"],
    matchScore: 95,
    availability: "Available",
    moveInDate: "2024-08-01",
    agent: "Sarah Johnson",
    agentPhone: "+971 50 123 4567",
    description: "Stunning 2-bedroom apartment with panoramic sea views in the heart of Dubai Marina. Fully furnished with premium finishes.",
    features: {
      parking: 2,
      balcony: true,
      seaView: true,
      gym: true,
      pool: true,
      security: true
    }
  },
  {
    id: 2,
    title: "Modern 3BR Villa in Arabian Ranches",
    location: "Arabian Ranches",
    emirate: "Dubai",
    community: "Ranches 1",
    type: "villa",
    bedrooms: 3,
    bathrooms: 3,
    area: 2000,
    price: 180000,
    pricePerSqft: 90,
    furnished: "semi_furnished",
    amenities: ["Garden", "Pool", "Parking", "Gym", "Golf Course"],
    images: ["/api/placeholder/400/300"],
    matchScore: 88,
    availability: "Available",
    moveInDate: "2024-09-01",
    agent: "Mike Wilson",
    agentPhone: "+971 50 987 6543",
    description: "Spacious family villa with private garden and pool access. Perfect for families seeking tranquility.",
    features: {
      parking: 3,
      garden: true,
      pool: true,
      golfCourse: true,
      security: true
    }
  },
  {
    id: 3,
    title: "Executive Office Space in DIFC",
    location: "DIFC",
    emirate: "Dubai",
    community: "Financial Center",
    type: "office",
    bedrooms: 0,
    bathrooms: 2,
    area: 1500,
    price: 150000,
    pricePerSqft: 100,
    furnished: "furnished",
    amenities: ["Business Center", "Meeting Rooms", "Parking", "Security", "High-speed Internet"],
    images: ["/api/placeholder/400/300"],
    matchScore: 92,
    availability: "Available",
    moveInDate: "2024-07-15",
    agent: "Ahmed Hassan",
    agentPhone: "+971 50 456 7890",
    description: "Premium office space in the heart of Dubai's financial district. Fully equipped for modern business needs.",
    features: {
      parking: 4,
      businessCenter: true,
      meetingRooms: true,
      highSpeedInternet: true,
      security: true
    }
  }
];

const matchCriteria = {
  budget: { weight: 25, tolerance: 0.2 }, // 20% tolerance
  location: { weight: 20, exact: true },
  bedrooms: { weight: 15, tolerance: 1 },
  area: { weight: 15, tolerance: 0.15 }, // 15% tolerance
  amenities: { weight: 10, partial: true },
  moveInDate: { weight: 10, tolerance: 30 }, // 30 days tolerance
  propertyType: { weight: 5, exact: true }
};

export default function PropertyMatcher({ lead, isOpen, onClose }: PropertyMatcherProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("matchScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);

  // Calculate match score for each property
  const calculateMatchScore = (property: any, lead: any) => {
    if (!lead || !lead.budget) return 0;
    
    let totalScore = 0;
    let maxScore = 0;

    // Budget match
    const budgetDiff = Math.abs(property.price - lead.budget) / lead.budget;
    const budgetScore = budgetDiff <= matchCriteria.budget.tolerance ? 
      matchCriteria.budget.weight * (1 - budgetDiff) : 0;
    totalScore += budgetScore;
    maxScore += matchCriteria.budget.weight;

    // Location match
    const leadLocation = lead.community || lead.emirate || '';
    const locationScore = (leadLocation && property.location.toLowerCase().includes(leadLocation.toLowerCase())) ? 
      matchCriteria.location.weight : 0;
    totalScore += locationScore;
    maxScore += matchCriteria.location.weight;

    // Bedrooms match
    const bedroomDiff = Math.abs(property.bedrooms - (lead.bedrooms || 0));
    const bedroomScore = bedroomDiff <= matchCriteria.bedrooms.tolerance ? 
      matchCriteria.bedrooms.weight * (1 - bedroomDiff / 3) : 0;
    totalScore += bedroomScore;
    maxScore += matchCriteria.bedrooms.weight;

    // Area match
    const areaDiff = lead.area ? Math.abs(property.area - lead.area) / lead.area : 1;
    const areaScore = areaDiff <= matchCriteria.area.tolerance ? 
      matchCriteria.area.weight * (1 - areaDiff) : 0;
    totalScore += areaScore;
    maxScore += matchCriteria.area.weight;

    // Property type match
    const typeScore = (lead.buildingType && property.type === lead.buildingType) ? 
      matchCriteria.propertyType.weight : 0;
    totalScore += typeScore;
    maxScore += matchCriteria.propertyType.weight;

    // Amenities match (partial)
    // Convert requirements string to array by splitting on common delimiters
    const leadRequirementsStr = lead.requirements || '';
    const leadRequirements = leadRequirementsStr ? 
      leadRequirementsStr.split(/[,;]+/).map((req: string) => req.trim()).filter(Boolean) : [];
    const propertyAmenities = property.amenities || [];
    const matchingAmenities = leadRequirements.filter((req: string) => 
      propertyAmenities.some((amenity: string) => 
        amenity.toLowerCase().includes(req.toLowerCase())
      )
    ).length;
    const amenitiesScore = leadRequirements.length > 0 ? 
      (matchingAmenities / leadRequirements.length) * matchCriteria.amenities.weight : 0;
    totalScore += amenitiesScore;
    maxScore += matchCriteria.amenities.weight;

    return Math.round((totalScore / maxScore) * 100);
  };

  // Filter and sort properties
  const filteredProperties = sampleProperties
    .filter(property => {
      const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          property.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .map(property => ({
      ...property,
      matchScore: calculateMatchScore(property, lead)
    }))
    .sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a];
      const bValue = b[sortBy as keyof typeof b];
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleFavorite = (propertyId: number) => {
    setFavorites(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleViewProperty = (property: any) => {
    setSelectedProperty(property);
    setShowPropertyDetails(true);
  };

  const getMatchColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50";
    if (score >= 75) return "text-blue-600 bg-blue-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case "apartment": return <Building2 className="h-4 w-4" />;
      case "villa": return <Home className="h-4 w-4" />;
      case "office": return <Building2 className="h-4 w-4" />;
      default: return <Home className="h-4 w-4" />;
    }
  };

  if (!lead) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Property Matching Engine
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No lead selected</h3>
            <p className="text-muted-foreground">
              Please select a lead to view property matches.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Search className="h-6 w-6 text-blue-600" />
                Property Matching Engine
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                AI-powered property recommendations for {lead.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {filteredProperties.length} matches found
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Requirements Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lead Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Budget: AED {lead.budget?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.community || lead.emirate || 'Any Location'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.bedrooms} BR, {lead.area} sq ft</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Next Follow-up: {lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : 'Not scheduled'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search properties by title, location, or amenities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matchScore">Match Score</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="area">Area</SelectItem>
                      <SelectItem value="bedrooms">Bedrooms</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Matches */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getPropertyTypeIcon(property.type)}
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-1">{property.title}</h3>
                        <p className="text-xs text-muted-foreground">{property.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", getMatchColor(property.matchScore))}>
                        {property.matchScore}% match
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFavorite(property.id)}
                      >
                        <Heart className={cn("h-4 w-4", favorites.includes(property.id) ? "fill-red-500 text-red-500" : "")} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Property Image Placeholder */}
                  <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                    <Home className="h-8 w-8 text-muted-foreground" />
                  </div>

                  {/* Property Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span className="font-semibold">AED {property.price.toLocaleString()}/year</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Area</span>
                      <span className="text-sm">{property.area} sq ft</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <span className="text-sm capitalize">{property.type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Furnished</span>
                      <span className="text-sm capitalize">{property.furnished.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amenities</p>
                    <div className="flex flex-wrap gap-1">
                      {property.amenities.slice(0, 3).map((amenity: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {property.amenities.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{property.amenities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewProperty(property)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* No Results */}
          {filteredProperties.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No properties found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search criteria or contact us for personalized recommendations.
                </p>
                <Button variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Agent
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Property Details Modal */}
        {selectedProperty && (
          <Dialog open={showPropertyDetails} onOpenChange={setShowPropertyDetails}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {selectedProperty.title}
                </DialogTitle>
                <p className="text-muted-foreground">
                  {selectedProperty.location} • {selectedProperty.community}
                </p>
              </DialogHeader>

              <div className="space-y-6">
                {/* Property Image */}
                <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                  <Home className="h-16 w-16 text-muted-foreground" />
                </div>

                {/* Property Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Pricing & Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Annual Rent</span>
                        <span className="font-semibold">AED {selectedProperty.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Price per sq ft</span>
                        <span>AED {selectedProperty.pricePerSqft}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Area</span>
                        <span>{selectedProperty.area} sq ft</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Bedrooms</span>
                        <span>{selectedProperty.bedrooms}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Bathrooms</span>
                        <span>{selectedProperty.bathrooms}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Furnished</span>
                        <span className="capitalize">{selectedProperty.furnished.replace('_', ' ')}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Amenities & Features
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedProperty.amenities.map((amenity: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Description */}
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedProperty.description}</p>
                  </CardContent>
                </Card>

                {/* Agent Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Contact Agent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{selectedProperty.agent}</p>
                        <p className="text-sm text-muted-foreground">{selectedProperty.agentPhone}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Viewing
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Property
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
