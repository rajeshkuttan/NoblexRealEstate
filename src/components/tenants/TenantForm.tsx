import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Banknote, 
  FileText,
  Upload,
  X,
  Plus,
  Trash2,
  Building2,
  CreditCard,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Home,
  Users,
  Briefcase,
  Heart,
  MessageSquare,
  Star,
  Globe,
  Flag,
  UserCheck,
  UserX,
  Camera,
  Image as ImageIcon,
  Loader2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const tenantFormSchema = z.object({
  // Personal Information
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  emiratesId: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional(),
  visaStatus: z.enum(["resident", "tourist", "visit", "work", "student"]).optional(),
  
  // Professional Information
  occupation: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  salary: z.number().optional().or(z.string().optional()),
  employer: z.string().optional(),
  workAddress: z.string().optional(),
  
  // Emergency Contact
  emergencyName: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
  
  // Address Information
  address: z.string().optional(),
  city: z.string().optional(),
  emirate: z.enum(["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]).optional(),
  postalCode: z.string().optional(),
  
  // Lease Information
  propertyId: z.string().optional(),
  unit: z.string().optional(),
  moveInDate: z.string().optional(),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
  
  // Financial Information
  monthlyRent: z.number().optional(),
  securityDeposit: z.number().optional(),
  paymentMethod: z.enum(["Bank Transfer", "Cheque", "Cash", "Credit Card"]).optional(),
  bankAccount: z.string().optional(),
  
  // Preferences
  preferredLanguage: z.enum(["English", "Arabic", "Hindi", "Urdu", "Other"]).optional(),
  preferredContact: z.enum(["Email", "Phone", "WhatsApp", "SMS"]).optional(),
  specialRequirements: z.string().optional(),
  pets: z.boolean().optional(),
  smoking: z.boolean().optional(),
  visitors: z.enum(["Regular", "Occasional", "Rare", "None"]).optional(),
  
  // Additional Information
  notes: z.string().optional(),
  documents: z.array(z.string()).optional(),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

const nationalities = [
  "UAE", "Indian", "Pakistani", "Bangladeshi", "Filipino", "Egyptian", "Jordanian", 
  "Lebanese", "Syrian", "Sudanese", "Yemeni", "Moroccan", "Tunisian", "Algerian",
  "British", "American", "Canadian", "Australian", "German", "French", "Italian",
  "Spanish", "Dutch", "Swedish", "Norwegian", "Danish", "Finnish", "Russian",
  "Chinese", "Japanese", "Korean", "Thai", "Vietnamese", "Indonesian", "Malaysian",
  "Singaporean", "Sri Lankan", "Nepalese", "Afghan", "Iranian", "Turkish", "Other"
];

const occupations = [
  "Business Owner", "Manager", "Director", "Engineer", "Doctor", "Lawyer", "Accountant",
  "Teacher", "Professor", "Researcher", "Consultant", "Sales Representative",
  "Marketing Manager", "HR Manager", "IT Professional", "Software Developer",
  "Designer", "Architect", "Real Estate Agent", "Banker", "Investment Advisor",
  "Government Employee", "Military", "Police", "Firefighter", "Nurse", "Pharmacist",
  "Dentist", "Veterinarian", "Pilot", "Flight Attendant", "Chef", "Restaurant Manager",
  "Hotel Manager", "Tour Guide", "Translator", "Journalist", "Writer", "Artist",
  "Musician", "Actor", "Sports Professional", "Retired", "Student", "Unemployed", "Other"
];

const properties = [
  { id: "1", name: "Marina Heights Tower", location: "Dubai Marina" },
  { id: "2", name: "Business Bay Commercial Plaza", location: "Business Bay" },
  { id: "3", name: "Palm Jumeirah Residences", location: "Palm Jumeirah" },
  { id: "4", name: "Downtown Office Complex", location: "Downtown Dubai" },
  { id: "5", name: "JBR Beachfront Apartments", location: "Jumeirah Beach Residence" },
  { id: "6", name: "DIFC Financial Center", location: "DIFC" },
];

interface TenantFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TenantFormData) => Promise<void> | void;
  initialData?: Partial<TenantFormData>;
  mode: "create" | "edit";
}

export default function TenantForm({ isOpen, onClose, onSubmit, initialData, mode }: TenantFormProps) {
  const [selectedProperty, setSelectedProperty] = useState(initialData?.propertyId || "");
  const [selectedEmirate, setSelectedEmirate] = useState(initialData?.emirate || "dubai");
  const [profileImage, setProfileImage] = useState<string>(initialData?.documents?.[0] || "");

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProfileImage("");
  };

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      emiratesId: "",
      nationality: "",
      visaStatus: "resident",
      company: "",
      jobTitle: "",
      salary: "",
      employer: "",
      emergencyContact: "",
      emergencyPhone: "",
      address: "",
      city: "",
      emirate: "dubai",
      postalCode: "",
      dateOfBirth: "",
      gender: "Male",
      maritalStatus: "Single",
      occupation: "",
      workAddress: "",
      emergencyName: "",
      emergencyRelation: "",
      propertyId: "",
      unit: "",
      moveInDate: "",
      leaseStart: "",
      leaseEnd: "",
      monthlyRent: 0,
      securityDeposit: 0,
      paymentMethod: "Bank Transfer",
      bankAccount: "",
      preferredLanguage: "English",
      preferredContact: "Email",
      specialRequirements: "",
      pets: false,
      smoking: false,
      visitors: "Occasional",
      notes: "",
      documents: [],
    },
  });

  // Load edit data when modal opens in edit mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && initialData) {
      // Delay for dialog render
      setTimeout(() => {
        const formData = {
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          emiratesId: initialData.emiratesId || "",
          nationality: initialData.nationality || "",
          visaStatus: initialData.visaStatus || "resident",
          company: initialData.company || "",
          jobTitle: initialData.jobTitle || "",
          salary: initialData.salary || "",
          employer: initialData.employer || "",
          emergencyContact: initialData.emergencyContact || "",
          emergencyPhone: initialData.emergencyPhone || "",
          emergencyRelation: initialData.emergencyRelation || "",
          address: initialData.address || "",
          city: initialData.city || "",
          emirate: initialData.emirate || "dubai",
          postalCode: initialData.postalCode || "",
          notes: initialData.notes || "",
          documents: initialData.documents || [],
        };

        // Reset form with all values
        form.reset(formData);
      }, 150);
    } else if (mode === "create") {
      // Reset form for create mode
      form.reset({
        name: "",
        email: "",
        phone: "",
        emiratesId: "",
        nationality: "",
        visaStatus: "resident",
        company: "",
        jobTitle: "",
        salary: "",
        employer: "",
        emergencyContact: "",
        emergencyPhone: "",
        emergencyRelation: "",
        address: "",
        city: "",
        emirate: "dubai",
        postalCode: "",
        notes: "",
        documents: [],
      });
    }
  }, [isOpen, mode, initialData, form]);

  const handleSubmit = async (data: TenantFormData) => {
    // Correctly map emergencyContact to the output data
    const formData = {
      ...data,
      emergencyContact: data.emergencyContact, // Ensure this is sent
      salary: typeof data.salary === 'string' ? parseFloat(data.salary) : data.salary,
      documents: profileImage ? [profileImage] : [],
    };
    await onSubmit(formData as any);
    onClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  console.log("🔍 TenantForm render:", { isOpen, mode, hasInitialData: !!initialData });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen rounded-none m-0 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {mode === "create" ? "Add New Tenant" : "Edit Tenant"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex-1 flex flex-col min-h-0"
        >
          <ScrollArea className="flex-1">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="property">Property</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            {/* Personal Information */}
            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Profile Image */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={profileImage} />
                        <AvatarFallback className="bg-gradient-primary text-white text-lg font-semibold">
                          {profileImage ? getInitials(form.watch("name") || "T") : "T"}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      {profileImage && (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={removeImage}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Profile Photo</p>
                      <p className="text-xs text-muted-foreground">Upload a clear photo of the tenant</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        {...form.register("name")}
                        placeholder="Enter full name"
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder="tenant@example.com"
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        {...form.register("phone")}
                        placeholder="+971 XX XXX XXXX"
                      />
                      {form.formState.errors.phone && (
                        <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emiratesId">Emirates ID</Label>
                      <Input
                        id="emiratesId"
                        {...form.register("emiratesId")}
                        placeholder="784-XXXX-XXXXXXX-X"
                      />
                      {form.formState.errors.emiratesId && (
                        <p className="text-sm text-red-600">{form.formState.errors.emiratesId.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nationality">Nationality *</Label>
                      <Select
                        value={form.watch("nationality")}
                        onValueChange={(value) => form.setValue("nationality", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select nationality" />
                        </SelectTrigger>
                        <SelectContent>
                          {nationalities.map((nationality) => (
                            <SelectItem key={nationality} value={nationality}>
                              {nationality}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.nationality && (
                        <p className="text-sm text-red-600">{form.formState.errors.nationality.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        {...form.register("dateOfBirth")}
                      />
                      {form.formState.errors.dateOfBirth && (
                        <p className="text-sm text-red-600">{form.formState.errors.dateOfBirth.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <Select
                        value={form.watch("gender")}
                        onValueChange={(value) => form.setValue("gender", value as "Male" | "Female" | "Other")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Marital Status *</Label>
                    <Select
                      value={form.watch("maritalStatus")}
                      onValueChange={(value) => form.setValue("maritalStatus", value as "Single" | "Married" | "Divorced" | "Widowed")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Professional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="occupation">Occupation *</Label>
                      <Select
                        value={form.watch("occupation")}
                        onValueChange={(value) => form.setValue("occupation", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select occupation" />
                        </SelectTrigger>
                        <SelectContent>
                          {occupations.map((occupation) => (
                            <SelectItem key={occupation} value={occupation}>
                              {occupation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.occupation && (
                        <p className="text-sm text-red-600">{form.formState.errors.occupation.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        {...form.register("company")}
                        placeholder="Company name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workAddress">Work Address</Label>
                    <Textarea
                      id="workAddress"
                      {...form.register("workAddress")}
                      placeholder="Work address"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">Emergency Contact Name *</Label>
                      <Input
                        id="emergencyContact"
                        {...form.register("emergencyContact")}
                        placeholder="Emergency contact name"
                      />
                      {form.formState.errors.emergencyContact && (
                        <p className="text-sm text-red-600">{form.formState.errors.emergencyContact.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Emergency Contact Phone *</Label>
                      <Input
                        id="emergencyPhone"
                        {...form.register("emergencyPhone")}
                        placeholder="+971 XX XXX XXXX"
                      />
                      {form.formState.errors.emergencyPhone && (
                        <p className="text-sm text-red-600">{form.formState.errors.emergencyPhone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyRelation">Relationship *</Label>
                    <Select
                      value={form.watch("emergencyRelation")}
                      onValueChange={(value) => form.setValue("emergencyRelation", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Friend">Friend</SelectItem>
                        <SelectItem value="Colleague">Colleague</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.emergencyRelation && (
                      <p className="text-sm text-red-600">{form.formState.errors.emergencyRelation.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Property Information */}
            <TabsContent value="property" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Property Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="propertyId">Property *</Label>
                      <Select
                        value={selectedProperty}
                        onValueChange={(value) => {
                          setSelectedProperty(value);
                          form.setValue("propertyId", value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name} - {property.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.propertyId && (
                        <p className="text-sm text-red-600">{form.formState.errors.propertyId.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit Number *</Label>
                      <Input
                        id="unit"
                        {...form.register("unit")}
                        placeholder="e.g., Unit 305, Apt 102"
                      />
                      {form.formState.errors.unit && (
                        <p className="text-sm text-red-600">{form.formState.errors.unit.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="moveInDate">Move-in Date *</Label>
                      <Input
                        id="moveInDate"
                        type="date"
                        {...form.register("moveInDate")}
                      />
                      {form.formState.errors.moveInDate && (
                        <p className="text-sm text-red-600">{form.formState.errors.moveInDate.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leaseStart">Lease Start Date *</Label>
                      <Input
                        id="leaseStart"
                        type="date"
                        {...form.register("leaseStart")}
                      />
                      {form.formState.errors.leaseStart && (
                        <p className="text-sm text-red-600">{form.formState.errors.leaseStart.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leaseEnd">Lease End Date *</Label>
                      <Input
                        id="leaseEnd"
                        type="date"
                        {...form.register("leaseEnd")}
                      />
                      {form.formState.errors.leaseEnd && (
                        <p className="text-sm text-red-600">{form.formState.errors.leaseEnd.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Information */}
            <TabsContent value="financial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthlyRent">Monthly Rent (AED) *</Label>
                      <Input
                        id="monthlyRent"
                        type="number"
                        {...form.register("monthlyRent", { valueAsNumber: true })}
                        placeholder="0"
                        min="0"
                      />
                      {form.formState.errors.monthlyRent && (
                        <p className="text-sm text-red-600">{form.formState.errors.monthlyRent.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="securityDeposit">Security Deposit (AED) *</Label>
                      <Input
                        id="securityDeposit"
                        type="number"
                        {...form.register("securityDeposit", { valueAsNumber: true })}
                        placeholder="0"
                        min="0"
                      />
                      {form.formState.errors.securityDeposit && (
                        <p className="text-sm text-red-600">{form.formState.errors.securityDeposit.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method *</Label>
                      <Select
                        value={form.watch("paymentMethod")}
                        onValueChange={(value) => form.setValue("paymentMethod", value as "Bank Transfer" | "Cheque" | "Cash" | "Credit Card")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bankAccount">Bank Account (Last 4 digits)</Label>
                      <Input
                        id="bankAccount"
                        {...form.register("bankAccount")}
                        placeholder="****1234"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Communication Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="preferredLanguage">Preferred Language *</Label>
                      <Select
                        value={form.watch("preferredLanguage")}
                        onValueChange={(value) => form.setValue("preferredLanguage", value as "English" | "Arabic" | "Hindi" | "Urdu" | "Other")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Arabic">Arabic</SelectItem>
                          <SelectItem value="Hindi">Hindi</SelectItem>
                          <SelectItem value="Urdu">Urdu</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preferredContact">Preferred Contact Method *</Label>
                      <Select
                        value={form.watch("preferredContact")}
                        onValueChange={(value) => form.setValue("preferredContact", value as "Email" | "Phone" | "WhatsApp" | "SMS")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="Phone">Phone</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          <SelectItem value="SMS">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialRequirements">Special Requirements</Label>
                    <Textarea
                      id="specialRequirements"
                      {...form.register("specialRequirements")}
                      placeholder="Any special requirements or accessibility needs..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lifestyle Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pets"
                          checked={form.watch("pets")}
                          onCheckedChange={(checked) => form.setValue("pets", checked as boolean)}
                        />
                        <Label htmlFor="pets">Has Pets</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="smoking"
                          checked={form.watch("smoking")}
                          onCheckedChange={(checked) => form.setValue("smoking", checked as boolean)}
                        />
                        <Label htmlFor="smoking">Smoker</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="visitors">Visitor Frequency</Label>
                      <Select
                        value={form.watch("visitors")}
                        onValueChange={(value) => form.setValue("visitors", value as "Regular" | "Occasional" | "Rare" | "None")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Regular">Regular</SelectItem>
                          <SelectItem value="Occasional">Occasional</SelectItem>
                          <SelectItem value="Rare">Rare</SelectItem>
                          <SelectItem value="None">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      {...form.register("notes")}
                      placeholder="Any additional notes about the tenant..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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
              className="bg-gradient-primary shadow-glow min-w-[130px]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {mode === "create" ? "Add Tenant" : "Update Tenant"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}