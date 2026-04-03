import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Banknote, 
  Users, 
  Star,
  Upload,
  X,
  Plus,
  Trash2,
  Loader2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { usersAPI } from "@/services/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const propertyFormSchema = z.object({
  // Basic Information
  name: z.string().min(1, "Property name is required"),
  location: z.string().min(1, "Location is required"),
  address: z.string().min(1, "Address is required"),
  type: z.enum(["Residential", "Commercial", "Mixed Use"]),
  category: z.string().min(1, "Category is required"),
  
  // Property Details
  yearBuilt: z.number().min(1800).max(new Date().getFullYear()),
  floors: z.number().min(1),
  totalUnits: z.number().min(1),
  unitsPerFloor: z.number().min(1),
  
  // Financial Information
  marketValue: z.number().min(0),
  monthlyRevenue: z.number().min(0),
  maintenanceCost: z.number().min(0),
  insuranceCost: z.number().min(0),
  
  // Property Features
  amenities: z.array(z.string()),
  parkingSpaces: z.number().min(0),
  hasElevator: z.boolean(),
  hasGym: z.boolean(),
  hasPool: z.boolean(),
  hasParking: z.boolean(),
  hasSecurity: z.boolean(),
  hasConcierge: z.boolean(),
  
  // Management
  propertyManager: z.string().min(1, "Property manager is required"),
  salesmanId: z.string().optional(),
  managementCompany: z.string().optional(),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().min(1, "Contact phone is required"),
  
  // Compliance
  compliance: z.array(z.object({
    type: z.string().min(1, "Compliance type is required"),
    vendorName: z.string().optional(),
    purpose: z.string().optional(),
    amount: z.string().optional(),
    issueDate: z.string().min(1, "Issue date is required"),
    expiryDate: z.string().min(1, "Expiry date is required"),
  })).optional(),
  lastInspection: z.string().optional(),
  nextInspection: z.string().optional(),
  
  // Additional Information
  description: z.string().optional(),
  notes: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

const amenityOptions = [
  "Swimming Pool",
  "Fitness Center",
  "Parking",
  "Security",
  "Concierge",
  "Elevator",
  "Garden",
  "Playground",
  "Business Center",
  "Meeting Rooms",
  "Restaurant",
  "Spa",
  "Beach Access",
  "Marina Access",
  "Golf Course",
  "Tennis Court",
  "Squash Court",
  "Cinema",
  "Library",
  "Kids Club",
  "Pet Area",
  "Rooftop Terrace",
  "BBQ Area",
  "Laundry Service",
  "Cleaning Service",
  "Maintenance Service",
  "24/7 Security",
  "CCTV",
  "Access Control",
  "Fire Safety",
  "Air Conditioning",
  "Heating",
  "Internet",
  "Cable TV",
  "Satellite TV",
  "Telephone",
  "Utilities Included",
  "Furnished",
  "Unfurnished",
  "Semi-Furnished"
];

const propertyTypes = [
  { value: "Residential", label: "Residential" },
  { value: "Commercial", label: "Commercial" },
  { value: "Mixed Use", label: "Mixed Use" }
];

const propertyCategories = {
  Residential: [
    "Luxury Apartment",
    "Standard Apartment", 
    "Studio Apartment",
    "Penthouse",
    "Villa",
    "Townhouse",
    "Duplex",
    "Beachfront Apartment",
    "Garden Apartment",
    "Loft"
  ],
  Commercial: [
    "Office Building",
    "Retail Space",
    "Warehouse",
    "Industrial",
    "Grade A Office",
    "Grade B Office",
    "Shopping Mall",
    "Restaurant",
    "Hotel",
    "Medical Center"
  ],
  "Mixed Use": [
    "Residential + Commercial",
    "Office + Retail",
    "Hotel + Residential",
    "Mixed Development"
  ]
};

interface PropertyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PropertyFormData) => Promise<void> | void;
  initialData?: Partial<PropertyFormData>;
  mode: "create" | "edit";
}

export default function PropertyForm({ isOpen, onClose, onSubmit, initialData, mode }: PropertyFormProps) {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(initialData?.amenities || []);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState(initialData?.type || "Residential");
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [loadingSalesmen, setLoadingSalesmen] = useState(false);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      location: initialData?.location || "",
      address: initialData?.address || "",
      type: initialData?.type || "Residential",
      category: initialData?.category || "",
      yearBuilt: initialData?.yearBuilt || new Date().getFullYear(),
      floors: initialData?.floors || 1,
      totalUnits: initialData?.totalUnits || 1,
      unitsPerFloor: initialData?.unitsPerFloor || 1,
      marketValue: initialData?.marketValue || 0,
      monthlyRevenue: initialData?.monthlyRevenue || 0,
      maintenanceCost: initialData?.maintenanceCost || 0,
      insuranceCost: initialData?.insuranceCost || 0,
      amenities: initialData?.amenities || [],
      parkingSpaces: initialData?.parkingSpaces || 0,
      hasElevator: initialData?.hasElevator || false,
      hasGym: initialData?.hasGym || false,
      hasPool: initialData?.hasPool || false,
      hasParking: initialData?.hasParking || false,
      hasSecurity: initialData?.hasSecurity || false,
      hasConcierge: initialData?.hasConcierge || false,
      propertyManager: initialData?.propertyManager || "",
      salesmanId: initialData?.salesmanId?.toString() || "",
      managementCompany: initialData?.managementCompany || "",
      contactEmail: initialData?.contactEmail || "",
      contactPhone: initialData?.contactPhone || "",
      compliance: initialData?.compliance || [],
      lastInspection: initialData?.lastInspection || "",
      nextInspection: initialData?.nextInspection || "",
      description: initialData?.description || "",
      notes: initialData?.notes || "",
    },
  });

  const compliance = form.watch("compliance") || [];

  const addComplianceRecord = () => {
    const current = form.getValues("compliance") || [];
    form.setValue("compliance", [
      ...current,
      { type: "", issueDate: "", expiryDate: "", vendorName: "", purpose: "", amount: "" }
    ]);
  };

  const removeComplianceRecord = (index: number) => {
    const current = form.getValues("compliance") || [];
    form.setValue("compliance", current.filter((_, i) => i !== index));
  };

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };
  useEffect(() => { 
    if (!isOpen) {
      return;
    }
    
    if (initialData && mode === "edit") {
      setTimeout(() => {
      let amenitiesArray: string[] = [];
      if (typeof initialData.amenities === 'string') {
        try {
          amenitiesArray = JSON.parse(initialData.amenities);
        } catch (e) {
          amenitiesArray = [];
        }
      } else if (Array.isArray(initialData.amenities)) {
        amenitiesArray = initialData.amenities;
      }

      // Parse images if it's a JSON string
      let imagesArray: string[] = [];
      if (typeof (initialData as any).images === 'string') {
        try {
          imagesArray = JSON.parse((initialData as any).images);
        } catch (e) {
          imagesArray = [];
        }
      } else if (Array.isArray((initialData as any).images)) {
        imagesArray = (initialData as any).images;
      }

      // Parse features if it's a JSON string
      let featuresObj: any = {};
      const rawFeatures = (initialData as any).features;
      if (typeof rawFeatures === 'string') {
        try {
          featuresObj = JSON.parse(rawFeatures);
        } catch (e) {
          console.error("Failed to parse features:", e);
          featuresObj = {};
        }
      } else if (typeof rawFeatures === 'object' && rawFeatures !== null) {
        featuresObj = rawFeatures;
      }

      // Parse compliance if it's a JSON string
      let complianceArray: any[] = [];
      const rawCompliance = (initialData as any).compliance;
      if (typeof rawCompliance === 'string') {
        try {
          complianceArray = JSON.parse(rawCompliance);
        } catch (e) {
          console.error("Failed to parse compliance:", e);
          complianceArray = [];
        }
      } else if (Array.isArray(rawCompliance)) {
        complianceArray = rawCompliance;
      }

      let propertyType = "Residential";
      let propertyCategory = "";
      const backendType = ((initialData as any).buildingType || '').toLowerCase();
      
      if (backendType) {
        if (backendType === 'studio') {
          propertyType = "Residential";
          propertyCategory = "Studio Apartment";
        } else if (backendType === 'apartment') {
          propertyType = "Residential";
          propertyCategory = "Luxury Apartment";
        } else if (backendType === 'penthouse') {
          propertyType = "Residential";
          propertyCategory = "Penthouse";
        } else if (backendType === 'villa') {
          propertyType = "Residential";
          propertyCategory = "Villa";
        } else if (backendType === 'townhouse') {
          propertyType = "Residential";
          propertyCategory = "Townhouse";
        } else if (backendType === 'duplex') {
          propertyType = "Residential";
          propertyCategory = "Duplex";
        }
        // Commercial types
        else if (backendType === 'office') {
          propertyType = "Commercial";
          propertyCategory = "Office Building";
        } else if (backendType === 'retail') {
          propertyType = "Commercial";
          propertyCategory = "Retail Space";
        } else if (backendType === 'warehouse') {
          propertyType = "Commercial";
          propertyCategory = "Warehouse";
        }
        // Default fallback
        else {
          propertyType = "Residential";
          propertyCategory = "Luxury Apartment";
        }
      }
      
      const mappedData = {
        // Basic Information - map 'title' from backend to 'name' for form
        name: (initialData as any).title || initialData.name || "",
        location: initialData.location || (initialData as any).emirate || "",
        address: (initialData as any).community || initialData.address || initialData.location || "",
        type: propertyType as "Residential" | "Commercial" | "Mixed Use",
        category: propertyCategory || "Apartment",
        
        // Property Details - use defaults if not in backend
        yearBuilt: Number(initialData.yearBuilt) || new Date().getFullYear(),
        floors: Number(initialData.floors) || 1,
        totalUnits: Number((initialData as any).units || (initialData as any).totalUnits) || 0,
        unitsPerFloor: Number((initialData as any).unitsPerFloor) || 0,
        
        // Financial Information - price from backend
        marketValue: Number(initialData.marketValue) || 0,
        monthlyRevenue: Number((initialData as any).price || initialData.monthlyRevenue) || 0,
        maintenanceCost: Number((initialData as any).maintenanceCost) || 0,
        insuranceCost: Number((initialData as any).insuranceCost) || 0,

        
        // Property Features - check both direct and nested features object
        amenities: amenitiesArray,
        parkingSpaces: Number((initialData as any).parkingSpaces) || 0,
        hasElevator: Boolean(featuresObj?.hasElevator ?? (initialData as any).hasElevator ?? false),
        hasGym: Boolean(featuresObj?.hasGym ?? (initialData as any).hasGym ?? false),
        hasPool: Boolean(featuresObj?.hasPool ?? (initialData as any).hasPool ?? false),
        hasParking: Boolean(featuresObj?.hasParking ?? (initialData as any).hasParking ?? false),
        hasSecurity: Boolean(featuresObj?.hasSecurity ?? (initialData as any).hasSecurity ?? false),
        hasConcierge: Boolean(featuresObj?.hasConcierge ?? (initialData as any).hasConcierge ?? false),
        
        // Management - use defaults if not in backend -- FIX: Remove hardcoded values
        propertyManager: initialData.propertyManager || (initialData as any).agent?.name || "",
        salesmanId: (initialData as any).salesmanId?.toString() || (initialData as any).salesman_id?.toString() || (initialData as any).agentId?.toString() || "",
        managementCompany: (initialData as any).managementCompany || "",
        contactEmail: initialData.contactEmail || (initialData as any).agent?.email || "",
        contactPhone: initialData.contactPhone || (initialData as any).agent?.phone || "",
        
        // Compliance - use defaults if not in backend
        compliance: complianceArray,
        lastInspection: (initialData as any).lastInspection || "",
        nextInspection: (initialData as any).nextInspection || "",
        
        // Additional Information
        description: (initialData as any).description || "",
        notes: (initialData as any).notes || "",
      };

      form.reset(mappedData);
      Object.entries(mappedData).forEach(([key, value]) => {
        form.setValue(key as any, value, { shouldValidate: false, shouldDirty: false });
      });
      
      setSelectedAmenities(amenitiesArray);
      setUploadedImages(imagesArray);
      setSelectedType(propertyType as any);
      }, 100);
    } else if (!initialData && mode === "create") {
      form.reset({
        name: "",
        location: "",
        address: "",
        type: "Residential",
        category: "",
        yearBuilt: new Date().getFullYear(),
        floors: 1,
        totalUnits: 1,
        unitsPerFloor: 1,
        marketValue: 0,
        monthlyRevenue: 0,
        maintenanceCost: 0,
        insuranceCost: 0,
        amenities: [],
        parkingSpaces: 0,
        hasElevator: false,
        hasGym: false,
        hasPool: false,
        hasParking: false,
        hasSecurity: false,
        hasConcierge: false,
        propertyManager: "",
        managementCompany: "",
        contactEmail: "",
        contactPhone: "",
        compliance: [],
        lastInspection: "",
        nextInspection: "",
        description: "",
        notes: "",
      });
      setSelectedAmenities([]);
      setUploadedImages([]);
      setSelectedType("Residential");
    }
  }, [initialData, mode, isOpen]);

  useEffect(() => {
    const fetchSalesmen = async () => {
      try {
        setLoadingSalesmen(true);
        const response = await usersAPI.getAll({});
        // The API might return data in different structures, but based on the api.ts view:
        const users = response.data?.data?.users || response.data?.users || response.data || [];
        const rawUsers = Array.isArray(users) ? users : [];
        const filteredSalesmen = rawUsers.filter(u => u.role === 'agent' || u.role === 'manager');
        setSalesmen(filteredSalesmen);
      } catch (error) {
        console.error("Failed to fetch salesmen:", error);
      } finally {
        setLoadingSalesmen(false);
      }
    };

    if (isOpen) {
      fetchSalesmen();
    }
  }, [isOpen]);

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
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (data: PropertyFormData) => {
    const formData = {
      ...data,
      amenities: selectedAmenities,
      images: uploadedImages,
    };
    await onSubmit(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen rounded-none m-0 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {mode === "create" ? "Add New Property" : "Edit Property"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit, (errors) => {
            toast.error("Please fill in all required fields", {
              description: Object.keys(errors).join(", "),
            });
          })}
          className="flex-1 flex flex-col min-h-0"
          key={(initialData as any)?.id || "new"}
        >
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="details">Property Details</TabsTrigger>
                  <TabsTrigger value="financial">Financial</TabsTrigger>
                  <TabsTrigger value="management">Management</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                </TabsList>

                {/* Basic Information */}
                <TabsContent value="basic" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Property Name *</Label>
                          <Input
                            id="name"
                            {...form.register("name")}
                            placeholder="Enter property name"
                          />
                          {form.formState.errors.name && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.name.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="location">Location *</Label>
                          <Input
                            id="location"
                            {...form.register("location")}
                            placeholder="e.g., Dubai Marina"
                          />
                          {form.formState.errors.location && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.location.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Full Address *</Label>
                        <Textarea
                          id="address"
                          {...form.register("address")}
                          placeholder="Enter complete address"
                          rows={2}
                        />
                        {form.formState.errors.address && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.address.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="type">Property Type *</Label>
                          <Select
                            value={selectedType}
                            onValueChange={(value) => {
                              setSelectedType(value as any);
                              form.setValue(
                                "type",
                                value as
                                  | "Residential"
                                  | "Commercial"
                                  | "Mixed Use",
                              );
                              form.setValue("category", ""); // Reset category when type changes
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {propertyTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Category *</Label>
                          <Select
                            value={form.watch("category")}
                            onValueChange={(value) =>
                              form.setValue("category", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {propertyCategories[
                                selectedType as keyof typeof propertyCategories
                              ]?.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {form.formState.errors.category && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.category.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          {...form.register("description")}
                          placeholder="Describe the property..."
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Property Details */}
                <TabsContent value="details" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Property Specifications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="yearBuilt">Year Built *</Label>
                          <Input
                            id="yearBuilt"
                            type="number"
                            {...form.register("yearBuilt", {
                              valueAsNumber: true,
                            })}
                            min="1800"
                            max={new Date().getFullYear()}
                          />
                          {form.formState.errors.yearBuilt && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.yearBuilt.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="floors">Number of Floors *</Label>
                          <Input
                            id="floors"
                            type="number"
                            {...form.register("floors", {
                              valueAsNumber: true,
                            })}
                            min="1"
                          />
                          {form.formState.errors.floors && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.floors.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="totalUnits">Total Units *</Label>
                          <Input
                            id="totalUnits"
                            type="number"
                            {...form.register("totalUnits", {
                              valueAsNumber: true,
                            })}
                            min="1"
                          />
                          {form.formState.errors.totalUnits && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.totalUnits.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="unitsPerFloor">Units per Floor</Label>
                        <Input
                          id="unitsPerFloor"
                          type="number"
                          {...form.register("unitsPerFloor", {
                            valueAsNumber: true,
                          })}
                          min="1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="parkingSpaces">Parking Spaces</Label>
                        <Input
                          id="parkingSpaces"
                          type="number"
                          {...form.register("parkingSpaces", {
                            valueAsNumber: true,
                          })}
                          min="0"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Property Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasElevator"
                            checked={form.watch("hasElevator")}
                            onCheckedChange={(checked) =>
                              form.setValue("hasElevator", checked as boolean)
                            }
                          />
                          <Label htmlFor="hasElevator">Elevator</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasGym"
                            checked={form.watch("hasGym")}
                            onCheckedChange={(checked) =>
                              form.setValue("hasGym", checked as boolean)
                            }
                          />
                          <Label htmlFor="hasGym">Gym</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasPool"
                            checked={form.watch("hasPool")}
                            onCheckedChange={(checked) =>
                              form.setValue("hasPool", checked as boolean)
                            }
                          />
                          <Label htmlFor="hasPool">Swimming Pool</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasParking"
                            checked={form.watch("hasParking")}
                            onCheckedChange={(checked) =>
                              form.setValue("hasParking", checked as boolean)
                            }
                          />
                          <Label htmlFor="hasParking">Parking</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasSecurity"
                            checked={form.watch("hasSecurity")}
                            onCheckedChange={(checked) =>
                              form.setValue("hasSecurity", checked as boolean)
                            }
                          />
                          <Label htmlFor="hasSecurity">Security</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasConcierge"
                            checked={form.watch("hasConcierge")}
                            onCheckedChange={(checked) =>
                              form.setValue("hasConcierge", checked as boolean)
                            }
                          />
                          <Label htmlFor="hasConcierge">Concierge</Label>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Amenities</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                          {amenityOptions.map((amenity) => (
                            <div
                              key={amenity}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={amenity}
                                checked={selectedAmenities.includes(amenity)}
                                onCheckedChange={() =>
                                  handleAmenityToggle(amenity)
                                }
                              />
                              <Label htmlFor={amenity} className="text-sm">
                                {amenity}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {selectedAmenities.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedAmenities.map((amenity) => (
                              <Badge
                                key={amenity}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {amenity}
                                <X
                                  className="h-3 w-3 cursor-pointer"
                                  onClick={() => handleAmenityToggle(amenity)}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Property Images</CardTitle>
                        {uploadedImages.length > 0 && (
                          <Badge variant="secondary">
                            {uploadedImages.length}{" "}
                            {uploadedImages.length === 1 ? "Image" : "Images"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Upload property images (JPG, PNG, max 10MB each)
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
                                alt={`Property ${index + 1}`}
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

                {/* Financial Information */}
                <TabsContent value="financial" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="marketValue">
                            Market Value (AED)
                          </Label>
                          <Controller
                            control={form.control}
                            name="marketValue"
                            render={({ field }) => (
                              <Input
                                id="marketValue"
                                type="text"
                                placeholder="0"
                                value={(field.value !== undefined && field.value !== null && String(field.value) !== "") ? Number(field.value).toLocaleString() : ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/,/g, "");
                                  if (/^\d*\.?\d*$/.test(val) || val === "") {
                                    field.onChange(val === "" ? 0 : Number(val));
                                  }
                                }}
                              />
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="monthlyRevenue">
                            Monthly Revenue (AED)
                          </Label>
                          <Controller
                            control={form.control}
                            name="monthlyRevenue"
                            render={({ field }) => (
                              <Input
                                id="monthlyRevenue"
                                type="text"
                                placeholder="0"
                                value={(field.value !== undefined && field.value !== null && String(field.value) !== "") ? Number(field.value).toLocaleString() : ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/,/g, "");
                                  if (/^\d*\.?\d*$/.test(val) || val === "") {
                                    field.onChange(val === "" ? 0 : Number(val));
                                  }
                                }}
                              />
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="maintenanceCost">
                            Monthly Maintenance Cost (AED)
                          </Label>
                          <Controller
                            control={form.control}
                            name="maintenanceCost"
                            render={({ field }) => (
                              <Input
                                id="maintenanceCost"
                                type="text"
                                placeholder="0"
                                value={(field.value !== undefined && field.value !== null && String(field.value) !== "") ? Number(field.value).toLocaleString() : ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/,/g, "");
                                  if (/^\d*\.?\d*$/.test(val) || val === "") {
                                    field.onChange(val === "" ? 0 : Number(val));
                                  }
                                }}
                              />
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="insuranceCost">
                            Annual Insurance Cost (AED)
                          </Label>
                          <Controller
                            control={form.control}
                            name="insuranceCost"
                            render={({ field }) => (
                              <Input
                                id="insuranceCost"
                                type="text"
                                placeholder="0"
                                value={(field.value !== undefined && field.value !== null && String(field.value) !== "") ? Number(field.value).toLocaleString() : ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/,/g, "");
                                  if (/^\d*\.?\d*$/.test(val) || val === "") {
                                    field.onChange(val === "" ? 0 : Number(val));
                                  }
                                }}
                              />
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Management Information */}
                <TabsContent value="management" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Management Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="propertyManager">
                            Property Manager *
                          </Label>
                          <Input
                            id="propertyManager"
                            {...form.register("propertyManager")}
                            placeholder="Enter property manager name"
                          />
                          {form.formState.errors.propertyManager && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.propertyManager.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="managementCompany">
                            Management Company
                          </Label>
                          <Input
                            id="managementCompany"
                            {...form.register("managementCompany")}
                            placeholder="Enter management company"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="salesmanId">Salesman</Label>
                          <SearchableSelect
                            value={form.watch("salesmanId")}
                            onValueChange={(value) => form.setValue("salesmanId", value)}
                            options={salesmen.map((salesman) => ({
                              value: salesman.id.toString(),
                              label: salesman.name,
                              description: salesman.role.charAt(0).toUpperCase() + salesman.role.slice(1)
                            }))}
                            placeholder={loadingSalesmen ? "Loading..." : "Select salesman"}
                            searchPlaceholder="Search agents & managers..."
                            emptyMessage="No agents or managers found"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contactEmail">Contact Email *</Label>
                          <Input
                            id="contactEmail"
                            type="email"
                            {...form.register("contactEmail")}
                            placeholder="manager@example.com"
                          />
                          {form.formState.errors.contactEmail && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.contactEmail.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="contactPhone">Contact Phone *</Label>
                          <Input
                            id="contactPhone"
                            {...form.register("contactPhone")}
                            placeholder="+971 XX XXX XXXX"
                          />
                          {form.formState.errors.contactPhone && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.contactPhone.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Compliance Information */}
                <TabsContent value="compliance" className="space-y-6">
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Inspection Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="lastInspection">Last Inspection Date</Label>
                          <Input
                            id="lastInspection"
                            type="date"
                            {...form.register("lastInspection")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nextInspection">Next Inspection Date</Label>
                          <Input
                            id="nextInspection"
                            type="date"
                            {...form.register("nextInspection")}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                      <CardTitle className="text-lg">
                        Compliance & Sub-contractor
                      </CardTitle>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addComplianceRecord}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Compliance
                      </Button>
                    </div>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {compliance.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">
                            No compliance records added yet.
                          </div>
                        ) : (
                          compliance.map((record, index) => (
                            <div
                              key={index}
                              className="p-6 space-y-4 relative group"
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-4 right-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeComplianceRecord(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Compliance Type *</Label>
                                  <Select
                                    value={record.type}
                                    onValueChange={(value) => {
                                      const current = [...compliance];
                                      current[index].type = value;
                                      form.setValue("compliance", current);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Fire Safety">
                                        Fire Safety
                                      </SelectItem>
                                      <SelectItem value="Elevator Inspection">
                                        Elevator Inspection
                                      </SelectItem>
                                      <SelectItem value="DCD Approval">
                                        DCD Approval
                                      </SelectItem>
                                      <SelectItem value="Health & Safety">
                                        Health & Safety
                                      </SelectItem>
                                      <SelectItem value="Building Insurance">
                                        Building Insurance
                                      </SelectItem>
                                      <SelectItem value="Trade License">
                                        Trade License
                                      </SelectItem>
                                      <SelectItem value="Sub-contractor">
                                        Sub-contractor
                                      </SelectItem>
                                      <SelectItem value="Other">
                                        Other
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {record.type === "Sub-contractor" && (
                                  <>
                                    <div className="space-y-2">
                                      <Label>Vendor Name</Label>
                                      <Input
                                        placeholder="Enter vendor name"
                                        value={record.vendorName || ""}
                                        onChange={(e) => {
                                          const current = [...compliance];
                                          current[index].vendorName = e.target.value;
                                          form.setValue("compliance", current);
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Purpose</Label>
                                      <Input
                                        placeholder="Enter purpose"
                                        value={record.purpose || ""}
                                        onChange={(e) => {
                                          const current = [...compliance];
                                          current[index].purpose = e.target.value;
                                          form.setValue("compliance", current);
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Amount</Label>
                                      <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={record.amount || ""}
                                        onChange={(e) => {
                                          const current = [...compliance];
                                          current[index].amount = e.target.value;
                                          form.setValue("compliance", current);
                                        }}
                                      />
                                    </div>
                                  </>
                                )}

                                <div className="space-y-2">
                                  <Label>Issue Date *</Label>
                                  <Input
                                    type="date"
                                    value={record.issueDate}
                                    onChange={(e) => {
                                      const current = [...compliance];
                                      current[index].issueDate = e.target.value;
                                      form.setValue("compliance", current);
                                    }}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Expiry Date *</Label>
                                  <Input
                                    type="date"
                                    value={record.expiryDate}
                                    onChange={(e) => {
                                      const current = [...compliance];
                                      current[index].expiryDate =
                                        e.target.value;
                                      form.setValue("compliance", current);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    placeholder="Any additional notes or comments..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 px-6 py-4 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary shadow-glow min-w-[150px]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {mode === "create" ? "Create Property" : "Update Property"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}