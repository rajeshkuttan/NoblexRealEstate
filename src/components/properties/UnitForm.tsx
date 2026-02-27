import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Home, 
  Building2, 
  Store, 
  Warehouse, 
  Plus, 
  X, 
  Save, 
  Upload, 
  Download, 
  Check, 
  AlertCircle, 
  Info, 
  Clock, 
  Target, 
  Award, 
  Star, 
  Heart, 
  Zap, 
  Globe, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Receipt, 
  History, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Share, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Flag, 
  Bell, 
  Send, 
  MessageSquare, 
  Settings, 
  Camera, 
  FileCheck, 
  Edit, 
  Eye, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  ArrowLeft, 
  Minus,
  Search,
  Filter,
  Grid3X3,
  List,
  BarChart3,
  PieChart,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh,
  User,
  Building,
  Car,
  Wifi,
  Shield,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown
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
  unitType: z.enum(["residential", "commercial", "retail", "office", "warehouse", "industrial"], {
    required_error: "Please select a unit type",
  }),
  
  // Unit Details
  unitDetails: z.object({
    floor: z.number().min(0, "Floor must be 0 or greater"),
    area: z.number().min(1, "Area must be greater than 0"),
    bedrooms: z.number().min(0),
    bathrooms: z.number().min(0),
    parking: z.number().min(0),
    balcony: z.boolean().optional(),
    garden: z.boolean().optional(),
    terrace: z.boolean().optional(),
    storage: z.boolean().optional(),
  }),
  
  // Commercial Details (for commercial units)
  commercialDetails: z.object({
    businessType: z.string().optional(),
    licenseRequired: z.boolean().optional(),
    maxOccupancy: z.number().optional(),
    operatingHours: z.string().optional(),
    signageAllowed: z.boolean().optional(),
    deliveryAccess: z.boolean().optional(),
    customerParking: z.number().optional(),
  }).optional(),
  
  // Financial Information
  financial: z.object({
    monthlyRent: z.number().min(0, "Monthly rent must be 0 or greater"),
    annualRent: z.number().min(0, "Annual rent must be 0 or greater"),
    securityDeposit: z.number().min(0),
    maintenanceFee: z.number().min(0),
    utilities: z.enum(["included", "separate", "tenant_pays"]),
    parkingFee: z.number().min(0),
    serviceCharges: z.number().min(0),
  }),
  
  // Amenities and Features
  amenities: z.array(z.string()).optional(),
  
  // Status and Availability
  status: z.enum(["available", "occupied", "maintenance", "reserved", "unavailable"]),
  availabilityDate: z.string().optional(),
  
  // Additional Information
  description: z.string().optional(),
  notes: z.string().optional(),
  images: z.array(z.string()).optional(),
});

type UnitFormData = z.infer<typeof unitFormSchema>;

interface UnitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UnitFormData) => void;
  initialData?: any;
  mode: "create" | "edit";
  propertyId?: string;
}

const unitTypes = [
  { value: "residential", label: "Residential", icon: Home },
  { value: "commercial", label: "Commercial", icon: Building2 },
  { value: "retail", label: "Retail", icon: Store },
  { value: "office", label: "Office", icon: Building },
  { value: "warehouse", label: "Warehouse", icon: Warehouse },
  { value: "industrial", label: "Industrial", icon: Building2 },
];

const businessTypes = [
  "Restaurant", "Retail Shop", "Office", "Clinic", "Salon", "Gym", "Bank", "Pharmacy", 
  "Supermarket", "Cafe", "Hotel", "Showroom", "Warehouse", "Factory", "Other"
];

const amenitiesOptions = [
  "Air Conditioning", "Heating", "Balcony", "Garden", "Terrace", "Parking", "Storage", 
  "Elevator", "Security", "CCTV", "Intercom", "Fire Safety", "Generator", "Water Tank",
  "Internet Ready", "Cable TV", "Satellite", "Swimming Pool", "Gym", "Playground",
  "Concierge", "Maintenance", "Cleaning", "Laundry", "Pet Friendly", "Furnished",
  "Unfurnished", "Semi-Furnished", "Kitchen", "Dining Area", "Living Room", "Study Room"
];

export default function UnitForm({ isOpen, onClose, onSubmit, initialData, mode, propertyId }: UnitFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: initialData || {
      unitNumber: "",
      unitType: "residential",
      unitDetails: {
        floor: 0,
        area: 0,
        bedrooms: 0,
        bathrooms: 0,
        parking: 0,
        balcony: false,
        garden: false,
        terrace: false,
        storage: false,
      },
      commercialDetails: {
        businessType: "",
        licenseRequired: false,
        maxOccupancy: 0,
        operatingHours: "",
        signageAllowed: false,
        deliveryAccess: false,
        customerParking: 0,
      },
      financial: {
        monthlyRent: 0,
        annualRent: 0,
        securityDeposit: 0,
        maintenanceFee: 0,
        utilities: "separate",
        parkingFee: 0,
        serviceCharges: 0,
      },
      amenities: [],
      status: "available",
      availabilityDate: "",
      description: "",
      notes: "",
      images: [],
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = form;

  const watchedValues = watch();

  // Calculate derived values
  const calculateDerivedValues = () => {
    const monthlyRent = watchedValues.financial?.monthlyRent || 0;
    const annualRent = monthlyRent * 12;
    const securityDeposit = monthlyRent * 2; // Typically 2 months rent

    setValue("financial.annualRent", annualRent);
    setValue("financial.securityDeposit", securityDeposit);
  };

  const handleAmenityToggle = (amenity: string) => {
    const currentAmenities = selectedAmenities;
    if (currentAmenities.includes(amenity)) {
      setSelectedAmenities(currentAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...currentAmenities, amenity]);
    }
  };

  const onFormSubmit = (data: UnitFormData) => {
    const formData = {
      ...data,
      amenities: selectedAmenities,
    };
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Add New Unit" : "Edit Unit"}
          </DialogTitle>
          <p className="text-muted-foreground">
            {mode === "create" 
              ? "Add a new unit to this property with detailed specifications"
              : "Update the unit details and specifications"
            }
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="commercial">Commercial</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Basic Unit Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="unitNumber">Unit Number *</Label>
                      <Input
                        id="unitNumber"
                        {...register("unitNumber")}
                        placeholder="Unit 101, Shop 1, Office 5A"
                        className={errors.unitNumber ? "border-red-500" : ""}
                      />
                      {errors.unitNumber && (
                        <p className="text-sm text-red-500 mt-1">{errors.unitNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="unitType">Unit Type *</Label>
                      <Select
                        value={watchedValues.unitType}
                        onValueChange={(value) => setValue("unitType", value as any)}
                      >
                        <SelectTrigger className={errors.unitType ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select unit type" />
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
                      {errors.unitType && (
                        <p className="text-sm text-red-500 mt-1">{errors.unitType.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status *</Label>
                      <Select
                        value={watchedValues.status}
                        onValueChange={(value) => setValue("status", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="maintenance">Under Maintenance</SelectItem>
                          <SelectItem value="reserved">Reserved</SelectItem>
                          <SelectItem value="unavailable">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="availabilityDate">Availability Date</Label>
                      <Input
                        id="availabilityDate"
                        type="date"
                        {...register("availabilityDate")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...register("description")}
                      placeholder="Describe the unit features, location, and any special characteristics..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Unit Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Unit Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="floor">Floor *</Label>
                      <Input
                        id="floor"
                        type="number"
                        {...register("unitDetails.floor", { valueAsNumber: true })}
                        placeholder="0"
                        className={errors.unitDetails?.floor ? "border-red-500" : ""}
                      />
                      {errors.unitDetails?.floor && (
                        <p className="text-sm text-red-500 mt-1">{errors.unitDetails.floor.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="area">Area (sq ft) *</Label>
                      <Input
                        id="area"
                        type="number"
                        {...register("unitDetails.area", { valueAsNumber: true })}
                        placeholder="1200"
                        className={errors.unitDetails?.area ? "border-red-500" : ""}
                      />
                      {errors.unitDetails?.area && (
                        <p className="text-sm text-red-500 mt-1">{errors.unitDetails.area.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        {...register("unitDetails.bedrooms", { valueAsNumber: true })}
                        placeholder="2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        {...register("unitDetails.bathrooms", { valueAsNumber: true })}
                        placeholder="2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="parking">Parking Spaces</Label>
                      <Input
                        id="parking"
                        type="number"
                        {...register("unitDetails.parking", { valueAsNumber: true })}
                        placeholder="1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="customerParking">Customer Parking</Label>
                      <Input
                        id="customerParking"
                        type="number"
                        {...register("commercialDetails.customerParking", { valueAsNumber: true })}
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Unit Features</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="balcony"
                          {...register("unitDetails.balcony")}
                        />
                        <Label htmlFor="balcony">Balcony</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="garden"
                          {...register("unitDetails.garden")}
                        />
                        <Label htmlFor="garden">Garden</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="terrace"
                          {...register("unitDetails.terrace")}
                        />
                        <Label htmlFor="terrace">Terrace</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="storage"
                          {...register("unitDetails.storage")}
                        />
                        <Label htmlFor="storage">Storage</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Commercial Details Tab */}
            <TabsContent value="commercial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Commercial Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select
                        value={watchedValues.commercialDetails?.businessType}
                        onValueChange={(value) => setValue("commercialDetails.businessType", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          {businessTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="maxOccupancy">Maximum Occupancy</Label>
                      <Input
                        id="maxOccupancy"
                        type="number"
                        {...register("commercialDetails.maxOccupancy", { valueAsNumber: true })}
                        placeholder="50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="operatingHours">Operating Hours</Label>
                    <Input
                      id="operatingHours"
                      {...register("commercialDetails.operatingHours")}
                      placeholder="9:00 AM - 10:00 PM"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Commercial Features</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="licenseRequired"
                          {...register("commercialDetails.licenseRequired")}
                        />
                        <Label htmlFor="licenseRequired">License Required</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="signageAllowed"
                          {...register("commercialDetails.signageAllowed")}
                        />
                        <Label htmlFor="signageAllowed">Signage Allowed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="deliveryAccess"
                          {...register("commercialDetails.deliveryAccess")}
                        />
                        <Label htmlFor="deliveryAccess">Delivery Access</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Information Tab */}
            <TabsContent value="financial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="monthlyRent">Monthly Rent (AED) *</Label>
                      <Input
                        id="monthlyRent"
                        type="number"
                        {...register("financial.monthlyRent", { valueAsNumber: true })}
                        placeholder="85000"
                        className={errors.financial?.monthlyRent ? "border-red-500" : ""}
                        onChange={(e) => {
                          setValue("financial.monthlyRent", parseInt(e.target.value) || 0);
                          calculateDerivedValues();
                        }}
                      />
                      {errors.financial?.monthlyRent && (
                        <p className="text-sm text-red-500 mt-1">{errors.financial.monthlyRent.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="annualRent">Annual Rent (AED)</Label>
                      <Input
                        id="annualRent"
                        type="number"
                        value={watchedValues.financial?.annualRent || 0}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="securityDeposit">Security Deposit (AED)</Label>
                      <Input
                        id="securityDeposit"
                        type="number"
                        value={watchedValues.financial?.securityDeposit || 0}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div>
                      <Label htmlFor="maintenanceFee">Maintenance Fee (AED)</Label>
                      <Input
                        id="maintenanceFee"
                        type="number"
                        {...register("financial.maintenanceFee", { valueAsNumber: true })}
                        placeholder="500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="utilities">Utilities</Label>
                      <Select
                        value={watchedValues.financial?.utilities}
                        onValueChange={(value) => setValue("financial.utilities", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select utilities arrangement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="included">Included in Rent</SelectItem>
                          <SelectItem value="separate">Separate Billing</SelectItem>
                          <SelectItem value="tenant_pays">Tenant Pays Directly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="parkingFee">Parking Fee (AED)</Label>
                      <Input
                        id="parkingFee"
                        type="number"
                        {...register("financial.parkingFee", { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="serviceCharges">Service Charges (AED)</Label>
                    <Input
                      id="serviceCharges"
                      type="number"
                      {...register("financial.serviceCharges", { valueAsNumber: true })}
                      placeholder="200"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Amenities Tab */}
            <TabsContent value="amenities" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Amenities and Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Select Amenities</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                      {amenitiesOptions.map((amenity, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`amenity-${index}`}
                            checked={selectedAmenities.includes(amenity)}
                            onCheckedChange={() => handleAmenityToggle(amenity)}
                          />
                          <Label htmlFor={`amenity-${index}`} className="text-sm">
                            {amenity}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Any additional information about the unit..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Images
              </Button>
              <Button type="submit" className="bg-gradient-primary shadow-glow">
                <Check className="h-4 w-4 mr-2" />
                {mode === "create" ? "Create Unit" : "Update Unit"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
