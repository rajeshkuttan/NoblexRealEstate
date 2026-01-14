import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { propertiesAPI } from "@/services/api";
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
  Settings,
  AlertCircle
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
  type: z.enum(["Apartment", "Villa"]),  // Units are residential only (maps to: apartment, villa, townhouse, studio, penthouse, duplex)
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
];

const unitCategories = [
  "Studio", "1BR", "2BR", "3BR", "4BR", "5BR+", 
  "Penthouse", "Duplex", "Townhouse",
  "Executive Suite", "3BR Villa", "4BR Villa", "5BR Villa", "6BR Villa"
];

// Properties will be loaded dynamically (keeping this as fallback)
const defaultProperties = [
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
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Reset to basic tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("basic");
    }
  }, [isOpen]);

  // Fetch properties from database when form opens
  useEffect(() => {
    const fetchProperties = async () => {
      if (!isOpen) return;
      
      setLoadingProperties(true);
      try {
        console.log("🔵 Fetching properties for unit form...");
        const response = await propertiesAPI.getAll();
        console.log("🔵 Properties response:", response);
        
        // Handle different API response formats
        let fetchedProperties = 
          response.data?.data?.properties ||  // Nested format
          response.data?.properties ||         // Direct properties
          response.data?.rows ||               // Paginated format
          response.data?.data ||               // Direct data
          response.data ||                     // Direct array
          [];
        
        console.log("🔵 Extracted properties:", fetchedProperties);
        
        // Ensure fetchedProperties is an array
        if (!Array.isArray(fetchedProperties)) {
          console.warn("⚠️ fetchedProperties is not an array:", fetchedProperties);
          fetchedProperties = [];
        }
        
        // Map properties to dropdown format
        const mappedProperties = fetchedProperties.map((property: any) => ({
          id: property.id,
          name: property.title || property.name || "",
          location: property.location || property.emirate || property.community || ""
        }));
        
        setProperties(mappedProperties);
        console.log("✅ Fetched properties for dropdown:", mappedProperties.length, mappedProperties);
      } catch (error: any) {
        console.error("❌ Failed to fetch properties:", error);
        toast.error("Failed to load properties. Please refresh the page.");
      } finally {
        setLoadingProperties(false);
      }
    };

    fetchProperties();
  }, [isOpen]);

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

  // Load initial data when editing
  useEffect(() => {
    console.log("🔄 UnitForm useEffect triggered");
    console.log("📝 Mode:", mode);
    console.log("📦 Initial Data:", initialData);
    console.log("🚪 Is Open:", isOpen);

    if (isOpen && mode === "edit" && initialData) {
      console.log("✅ Loading unit data into form...");
      
      // If unit has a property, ensure it's in the properties list
      if (initialData.property && initialData.propertyId) {
        const propertyExists = properties.find(p => p.id === initialData.propertyId);
        if (!propertyExists) {
          console.log("➕ Adding property from unit data to dropdown:", initialData.property);
          setProperties(prev => [...prev, {
            id: initialData.propertyId,
            name: initialData.property.title || initialData.property.name,
            location: initialData.property.location || initialData.property.emirate
          }]);
        }
      }
      
      // Small delay to ensure dialog is fully rendered
      setTimeout(() => {
        console.log("⏱️ Starting form reset after timeout...");
      
      // Parse arrays if they're JSON strings
      let amenities = initialData.amenities || [];
      let features = initialData.features || [];
      let documents = initialData.documents || [];
      
      if (typeof amenities === 'string') {
        try {
          amenities = JSON.parse(amenities);
        } catch (e) {
          amenities = [];
        }
      }
      
      if (typeof features === 'string') {
        try {
          features = JSON.parse(features);
        } catch (e) {
          features = [];
        }
      }
      
      if (typeof documents === 'string') {
        try {
          documents = JSON.parse(documents);
        } catch (e) {
          documents = [];
        }
      }

      // Helper function to map backend type enum to frontend form values
      // Backend enum: 'apartment', 'villa', 'townhouse', 'studio', 'penthouse', 'duplex'
      // Frontend form: "Apartment", "Villa", "Townhouse", "Studio", "Penthouse", "Duplex"
      const mapBackendTypeToFrontendForm = (type: string): string => {
        const typeLower = (type || '').toLowerCase();
        
        if (typeLower === 'studio') return 'Apartment';  // Studio is categorized as Apartment type
        if (typeLower === 'apartment') return 'Apartment';
        if (typeLower === 'penthouse') return 'Apartment';  // Penthouse is also Apartment type
        if (typeLower === 'villa') return 'Villa';
        if (typeLower === 'townhouse') return 'Villa';  // Townhouse under Villa
        if (typeLower === 'duplex') return 'Apartment';  // Duplex under Apartment
        
        return 'Apartment';
      };
      
      // Helper function to map backend furnished boolean to frontend form enum
      // Backend: furnished is BOOLEAN (true/false)
      // Frontend: "Furnished", "Semi-Furnished", "Unfurnished"
      const mapBackendFurnishedToFrontendForm = (furnished: any): string => {
        if (typeof furnished === 'boolean') {
          return furnished ? 'Furnished' : 'Unfurnished';
        }
        // If it's already a string, return as is
        if (typeof furnished === 'string') {
          return furnished;
        }
        return 'Unfurnished';
      };
      
      // Prepare form data with backend to frontend field mapping
      const formData: any = {
        unitNumber: initialData.unitNumber || initialData.unit_number || "",
        propertyId: String(initialData.propertyId || initialData.property_id || ""),
        type: mapBackendTypeToFrontendForm(initialData.type),  // Map backend enum to frontend
        category: initialData.category || "",
        area: Number(initialData.area || 0),
        bedrooms: Number(initialData.bedrooms || 0),
        bathrooms: Number(initialData.bathrooms || 0),
        parking: Number(initialData.parking || 0),
        floor: Number(initialData.floor || 0),
        balcony: Boolean(initialData.balcony),
        furnished: mapBackendFurnishedToFrontendForm(initialData.furnished),  // Map boolean to string enum
        monthlyRent: Number(initialData.monthlyRent || initialData.rentAmount || initialData.rent_amount || 0),
        deposit: Number(initialData.deposit || initialData.depositAmount || initialData.deposit_amount || 0),
        marketValue: Number(initialData.marketValue || initialData.market_value || 0),
        orientation: initialData.orientation || "",
        energyRating: initialData.energyRating || initialData.energy_rating || "",
        lastRenovation: initialData.lastRenovation || initialData.last_renovation || "",
        specialNotes: initialData.specialNotes || initialData.special_notes || initialData.notes || "",
        amenities: amenities,
        features: features,
        documents: documents,
        virtualTour: Boolean(initialData.virtualTour || initialData.virtual_tour),
        floorPlan: Boolean(initialData.floorPlan || initialData.floor_plan),
        petFriendly: Boolean(initialData.petFriendly || initialData.pet_friendly),
        smokingAllowed: Boolean(initialData.smokingAllowed || initialData.smoking_allowed),
      };

      console.log("📋 Mapped Form Data:", formData);

      // Reset form with new data
      form.reset(formData);

      // Also set individual field values to ensure they're populated
      Object.keys(formData).forEach(key => {
        setValue(key as any, formData[key]);
      });

      // Parse images - handle JSON string or array
      let images: string[] = [];
      if (initialData.images) {
        if (typeof initialData.images === 'string') {
          try {
            images = JSON.parse(initialData.images);
          } catch (e) {
            console.warn("Failed to parse images:", e);
          }
        } else if (Array.isArray(initialData.images)) {
          images = initialData.images;
        }
      }

      // Update state arrays
      setSelectedAmenities(amenities);
      setSelectedFeatures(features);
      setSelectedDocuments(documents);
      setUploadedImages(images);

      console.log("✅ Form reset complete!");
      console.log("📊 Selected Amenities:", amenities);
      console.log("🔧 Selected Features:", features);
      console.log("📄 Selected Documents:", documents);
      console.log("📸 Uploaded Images:", images);
      console.log("📝 Form values after reset:", form.getValues());
      }, 150); // 150ms delay to ensure dialog is rendered
    } else if (isOpen && mode === "create") {
      console.log("🆕 Creating new unit - resetting form to defaults");
      // Reset to defaults for create mode
      form.reset({
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
      });
      setSelectedAmenities([]);
      setSelectedFeatures([]);
      setSelectedDocuments([]);
      setUploadedImages([]);
    }
  }, [isOpen, mode, initialData]);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // Convert files to base64 for permanent storage
      const fileArray = Array.from(files);
      const base64Images = await Promise.all(
        fileArray.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      setUploadedImages(prev => [...prev, ...base64Images]);
      console.log(`📸 Converted ${base64Images.length} image(s) to base64. Total: ${uploadedImages.length + base64Images.length}`);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    console.log(`🗑️ Removed image at index ${index}`);
  };

  const handleDocumentToggle = (document: string) => {
    const newDocuments = selectedDocuments.includes(document)
      ? selectedDocuments.filter(d => d !== document)
      : [...selectedDocuments, document];
    setSelectedDocuments(newDocuments);
    setValue("documents", newDocuments);
  };

  const onFormSubmit = (data: UnitFormData) => {
    // Include uploaded images with the form data
    const formDataWithImages = {
      ...data,
      images: uploadedImages
    };
    console.log("📤 Submitting unit with images:", uploadedImages.length);
    onSubmit(formDataWithImages);
  };

  // Enhanced validation with tab navigation
  const validateAndNavigate = () => {
    const errors = form.formState.errors;
    
    // Check which tab has errors
    const basicFields = ['unitNumber', 'propertyId', 'type', 'category'];
    const detailsFields = ['area', 'bedrooms', 'bathrooms', 'parking', 'floor', 'furnished'];
    const financialFields = ['monthlyRent', 'deposit', 'marketValue'];
    
    const hasBasicErrors = basicFields.some(field => errors[field as keyof typeof errors]);
    const hasDetailsErrors = detailsFields.some(field => errors[field as keyof typeof errors]);
    const hasFinancialErrors = financialFields.some(field => errors[field as keyof typeof errors]);
    
    if (hasBasicErrors) {
      setActiveTab('basic');
      toast.error("Please fill in all required fields in Basic Info tab");
      return false;
    } else if (hasDetailsErrors) {
      setActiveTab('details');
      toast.error("Please fill in all required fields in Details tab");
      return false;
    } else if (hasFinancialErrors) {
      setActiveTab('details');
      toast.error("Please fill in all required financial fields");
      return false;
    }
    
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
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

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="basic" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic" className="relative">
                Basic Info
                {(errors.unitNumber || errors.propertyId || errors.type || errors.category) && (
                  <AlertCircle className="h-3 w-3 text-red-500 absolute -top-1 -right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="details" className="relative">
                Details
                {(errors.area || errors.bedrooms || errors.bathrooms || errors.monthlyRent || errors.deposit) && (
                  <AlertCircle className="h-3 w-3 text-red-500 absolute -top-1 -right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
              <TabsTrigger value="images">
                Images
                {uploadedImages.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{uploadedImages.length}</Badge>
                )}
              </TabsTrigger>
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
                          <SelectValue placeholder={loadingProperties ? "Loading properties..." : "Select property"} />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingProperties ? (
                            <div className="p-4 text-center text-muted-foreground">
                              Loading properties...
                            </div>
                          ) : properties.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                              No properties found. Please add a property first.
                            </div>
                          ) : (
                            properties.map((property) => (
                              <SelectItem key={property.id} value={property.id.toString()}>
                                {property.name} - {property.location}
                              </SelectItem>
                            ))
                          )}
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

            {/* Images Tab */}
            <TabsContent value="images" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Unit Images
                    </CardTitle>
                    {uploadedImages.length > 0 && (
                      <Badge variant="secondary">{uploadedImages.length} {uploadedImages.length === 1 ? 'Image' : 'Images'}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload unit images (JPG, PNG, max 10MB each)
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="max-w-xs mx-auto"
                    />
                  </div>

                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Unit ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
          </div>

          {/* Form Actions - Fixed at bottom */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4 flex-shrink-0 bg-background">
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
