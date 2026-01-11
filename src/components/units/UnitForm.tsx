import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Home, 
  Building2, 
  MapPin, 
  Square, 
  Bed, 
  Bath, 
  Car, 
  Wifi, 
  Shield, 
  CheckCircle, 
  Upload, 
  X, 
  Plus,
  Save,
  Building,
  Store,
  Warehouse,
  Key,
  Star,
  DollarSign,
  Calendar,
  FileText,
  Camera,
  Video,
  Share2,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Unit form validation schema
const unitFormSchema = z.object({
  // Basic Information
  unitNumber: z.string().min(1, "Unit number is required"),
  propertyId: z.string().min(1, "Property is required"),
  type: z.enum(["Apartment", "Villa", "Office", "Retail", "Warehouse"]),
  category: z.string().min(1, "Category is required"),
  
  // Physical Details
  area: z.number().min(0, "Area must be positive"),
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  parking: z.number().min(0),
  floor: z.number().min(0),
  balcony: z.boolean(),
  furnished: z.enum(["Furnished", "Semi-Furnished", "Unfurnished"]),
  
  // Financial Details
  monthlyRent: z.number().min(0, "Monthly rent must be positive"),
  deposit: z.number().min(0, "Deposit must be positive"),
  marketValue: z.number().min(0, "Market value must be positive"),
  
  // Additional Information
  orientation: z.string().optional(),
  energyRating: z.string().optional(),
  lastRenovation: z.string().optional(),
  specialNotes: z.string().optional(),
  
  // Amenities and Features
  amenities: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  
  // Documents and Media
  documents: z.array(z.string()).optional(),
  virtualTour: z.boolean(),
  floorPlan: z.boolean(),
  petFriendly: z.boolean(),
  smokingAllowed: z.boolean(),
});

type UnitFormData = z.infer<typeof unitFormSchema>;

interface UnitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UnitFormData) => void;
  initialData?: Partial<UnitFormData>;
  mode: "create" | "edit";
}

const unitTypes = [
  { value: "Apartment", label: "Apartment", icon: Home },
  { value: "Villa", label: "Villa", icon: Building },
  { value: "Office", label: "Office", icon: Building2 },
  { value: "Retail", label: "Retail", icon: Store },
  { value: "Warehouse", label: "Warehouse", icon: Warehouse },
];

const unitCategories = [
  "Studio", "1BR", "2BR", "3BR", "4BR", "5BR+", 
  "Executive Suite", "4BR Villa", "5BR Villa", "6BR Villa",
  "Retail Space", "Office Space", "Warehouse Space"
];

const properties = [
  { id: 1, name: "Marina Heights Tower", location: "Dubai Marina" },
  { id: 2, name: "Business Bay Commercial Plaza", location: "Business Bay" },
  { id: 3, name: "Palm Jumeirah Residences", location: "Palm Jumeirah" },
  { id: 4, name: "JBR Beachfront Apartments", location: "Jumeirah Beach Residence" },
  { id: 5, name: "Downtown Office Complex", location: "Downtown Dubai" },
  { id: 6, name: "DIFC Financial Center", location: "DIFC" },
];

const orientations = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];

const energyRatings = ["A+", "A", "B+", "B", "C+", "C", "D", "E"];

const amenityOptions = [
  "Sea View", "City View", "Balcony", "Garden", "Pool Access", "Gym Access", 
  "Parking", "Concierge", "Security", "Beach Access", "Private Beach", 
  "Maid's Room", "Study", "Business Center", "Meeting Rooms", "Reception"
];

const featureOptions = [
  "Air Conditioning", "High-Speed Internet", "Cable TV", "Dishwasher", 
  "Washing Machine", "Dryer", "Microwave", "Oven", "Refrigerator", 
  "Phone Lines", "Video Conferencing", "Kitchenette", "Built-in Wardrobes",
  "Central Heating", "Fireplace", "Jacuzzi", "Sauna"
];

const documentTypes = [
  "Lease Agreement", "Ejari Certificate", "Insurance Policy", "Trade License",
  "Floor Plan", "Photos", "Videos", "Virtual Tour", "Inspection Report",
  "Maintenance Record", "Energy Certificate", "Fire Safety Certificate"
];

export default function UnitForm({ isOpen, onClose, onSubmit, initialData, mode }: UnitFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: initialData || {
      unitNumber: "",
      propertyId: "",
      type: "Apartment",
      category: "",
      area: 0,
      bedrooms: 0,
      bathrooms: 0,
      parking: 0,
      floor: 0,
      balcony: false,
      furnished: "Unfurnished",
      monthlyRent: 0,
      deposit: 0,
      marketValue: 0,
      orientation: "",
      energyRating: "",
      lastRenovation: "",
      specialNotes: "",
      amenities: [],
      features: [],
      documents: [],
      virtualTour: false,
      floorPlan: false,
      petFriendly: false,
      smokingAllowed: false,
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;
  const watchedValues = watch();

  const handleAmenityToggle = (amenity: string) => {
    const newAmenities = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter(a => a !== amenity)
      : [...selectedAmenities, amenity];
    setSelectedAmenities(newAmenities);
    setValue("amenities", newAmenities);
  };

  const handleFeatureToggle = (feature: string) => {
    const newFeatures = selectedFeatures.includes(feature)
      ? selectedFeatures.filter(f => f !== feature)
      : [...selectedFeatures, feature];
    setSelectedFeatures(newFeatures);
    setValue("features", newFeatures);
  };

  const handleDocumentToggle = (document: string) => {
    const newDocuments = selectedDocuments.includes(document)
      ? selectedDocuments.filter(d => d !== document)
      : [...selectedDocuments, document];
    setSelectedDocuments(newDocuments);
    setValue("documents", newDocuments);
  };

  const onFormSubmit = (data: UnitFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Add New Unit" : "Edit Unit"}
          </DialogTitle>
          <p className="text-muted-foreground">
            {mode === "create" 
              ? "Add a new unit to your property portfolio"
              : "Update unit details and specifications"
            }
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Unit Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="unitNumber">Unit Number *</Label>
                      <Input
                        id="unitNumber"
                        {...register("unitNumber")}
                        placeholder="e.g., 305, A-101, Villa-01"
                        className={errors.unitNumber ? "border-red-500" : ""}
                      />
                      {errors.unitNumber && (
                        <p className="text-sm text-red-500 mt-1">{errors.unitNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="propertyId">Property *</Label>
                      <Select
                        value={watchedValues.propertyId}
                        onValueChange={(value) => setValue("propertyId", value)}
                      >
                        <SelectTrigger className={errors.propertyId ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name} - {property.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.propertyId && (
                        <p className="text-sm text-red-500 mt-1">{errors.propertyId.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Unit Type *</Label>
                      <Select
                        value={watchedValues.type}
                        onValueChange={(value) => setValue("type", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {unitTypes.map((type) => (
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
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={watchedValues.category}
                        onValueChange={(value) => setValue("category", value)}
                      >
                        <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && (
                        <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="monthlyRent">Monthly Rent (AED) *</Label>
                      <Input
                        id="monthlyRent"
                        type="number"
                        {...register("monthlyRent", { valueAsNumber: true })}
                        placeholder="85000"
                        className={errors.monthlyRent ? "border-red-500" : ""}
                      />
                      {errors.monthlyRent && (
                        <p className="text-sm text-red-500 mt-1">{errors.monthlyRent.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="deposit">Security Deposit (AED) *</Label>
                      <Input
                        id="deposit"
                        type="number"
                        {...register("deposit", { valueAsNumber: true })}
                        placeholder="85000"
                        className={errors.deposit ? "border-red-500" : ""}
                      />
                      {errors.deposit && (
                        <p className="text-sm text-red-500 mt-1">{errors.deposit.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="marketValue">Market Value (AED)</Label>
                      <Input
                        id="marketValue"
                        type="number"
                        {...register("marketValue", { valueAsNumber: true })}
                        placeholder="95000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Physical Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Square className="h-5 w-5" />
                    Physical Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="area">Area (sq ft) *</Label>
                      <Input
                        id="area"
                        type="number"
                        {...register("area", { valueAsNumber: true })}
                        placeholder="1200"
                        className={errors.area ? "border-red-500" : ""}
                      />
                      {errors.area && (
                        <p className="text-sm text-red-500 mt-1">{errors.area.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        {...register("bedrooms", { valueAsNumber: true })}
                        placeholder="2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        {...register("bathrooms", { valueAsNumber: true })}
                        placeholder="2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="parking">Parking Spaces</Label>
                      <Input
                        id="parking"
                        type="number"
                        {...register("parking", { valueAsNumber: true })}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="floor">Floor</Label>
                      <Input
                        id="floor"
                        type="number"
                        {...register("floor", { valueAsNumber: true })}
                        placeholder="15"
                      />
                    </div>

                    <div>
                      <Label htmlFor="orientation">Orientation</Label>
                      <Select
                        value={watchedValues.orientation}
                        onValueChange={(value) => setValue("orientation", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select orientation" />
                        </SelectTrigger>
                        <SelectContent>
                          {orientations.map((orientation) => (
                            <SelectItem key={orientation} value={orientation}>
                              {orientation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="energyRating">Energy Rating</Label>
                      <Select
                        value={watchedValues.energyRating}
                        onValueChange={(value) => setValue("energyRating", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                        <SelectContent>
                          {energyRatings.map((rating) => (
                            <SelectItem key={rating} value={rating}>
                              {rating}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="furnished">Furnishing</Label>
                      <Select
                        value={watchedValues.furnished}
                        onValueChange={(value) => setValue("furnished", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Furnished">Furnished</SelectItem>
                          <SelectItem value="Semi-Furnished">Semi-Furnished</SelectItem>
                          <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="lastRenovation">Last Renovation</Label>
                      <Input
                        id="lastRenovation"
                        {...register("lastRenovation")}
                        placeholder="2023"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="balcony"
                      checked={watchedValues.balcony}
                      onCheckedChange={(checked) => setValue("balcony", checked as boolean)}
                    />
                    <Label htmlFor="balcony">Has Balcony</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Amenities Tab */}
            <TabsContent value="amenities" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Amenities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {amenityOptions.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={`amenity-${amenity}`}
                          checked={selectedAmenities.includes(amenity)}
                          onCheckedChange={() => handleAmenityToggle(amenity)}
                        />
                        <Label htmlFor={`amenity-${amenity}`} className="text-sm">
                          {amenity}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {featureOptions.map((feature) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox
                          id={`feature-${feature}`}
                          checked={selectedFeatures.includes(feature)}
                          onCheckedChange={() => handleFeatureToggle(feature)}
                        />
                        <Label htmlFor={`feature-${feature}`} className="text-sm">
                          {feature}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Additional Information Tab */}
            <TabsContent value="additional" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="specialNotes">Special Notes</Label>
                    <Textarea
                      id="specialNotes"
                      {...register("specialNotes")}
                      placeholder="Any special notes about this unit..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Required Documents</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                      {documentTypes.map((document) => (
                        <div key={document} className="flex items-center space-x-2">
                          <Checkbox
                            id={`doc-${document}`}
                            checked={selectedDocuments.includes(document)}
                            onCheckedChange={() => handleDocumentToggle(document)}
                          />
                          <Label htmlFor={`doc-${document}`} className="text-sm">
                            {document}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="virtualTour"
                        checked={watchedValues.virtualTour}
                        onCheckedChange={(checked) => setValue("virtualTour", checked as boolean)}
                      />
                      <Label htmlFor="virtualTour">Virtual Tour</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="floorPlan"
                        checked={watchedValues.floorPlan}
                        onCheckedChange={(checked) => setValue("floorPlan", checked as boolean)}
                      />
                      <Label htmlFor="floorPlan">Floor Plan</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="petFriendly"
                        checked={watchedValues.petFriendly}
                        onCheckedChange={(checked) => setValue("petFriendly", checked as boolean)}
                      />
                      <Label htmlFor="petFriendly">Pet Friendly</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="smokingAllowed"
                        checked={watchedValues.smokingAllowed}
                        onCheckedChange={(checked) => setValue("smokingAllowed", checked as boolean)}
                      />
                      <Label htmlFor="smokingAllowed">Smoking Allowed</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-withu">
              <Save className="h-4 w-4 mr-2" />
              {mode === "create" ? "Create Unit" : "Update Unit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
