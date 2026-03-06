import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Banknote, 
  Calendar, 
  FileText, 
  Star, 
  Target, 
  Users, 
  MessageSquare, 
  Upload, 
  X, 
  Plus,
  Save,
  Building,
  Home,
  Briefcase,
  Car,
  Wifi,
  Shield,
  CheckCircle
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

// Lead form validation schema with UAE-specific fields
const leadFormSchema = z.object({
  // Basic Information
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  company: z.string().optional(),
  position: z.string().optional(),
  
  // UAE-Specific Information
  emiratesId: z.string().min(15, "Emirates ID must be at least 15 characters").max(20, "Emirates ID must be at most 20 characters"),
  visaStatus: z.enum(["resident", "tourist", "investor", "student", "other"]).optional(),
  nationality: z.string().optional(),
  tradeLicense: z.string().optional(),
  companyType: z.enum(["llc", "freezone", "branch", "representative", "other"]).optional(),
  bankName: z.string().optional(),
  salaryCertificate: z.boolean().optional(),
  
  // Lead Details
  source: z.string().min(1, "Lead source is required"),
  status: z.enum(["new", "contacted", "qualified", "viewing", "negotiation", "proposal", "closed_won", "closed_lost"]),
  priority: z.enum(["high", "medium", "low"]),
  budget: z.number().min(0, "Budget must be positive"),
  
  // Property Preferences
  preferredLocation: z.string().min(1, "Preferred location is required"),
  propertyType: z.enum(["residential", "commercial", "industrial", "retail", "warehouse", "land"]),
  area: z.number().min(0),
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  parking: z.number().min(0),
  moveInDate: z.string().min(1, "Move-in date is required"),
  
  // UAE Property Specifics
  emirate: z.enum(["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]),
  community: z.string().optional(),
  buildingType: z.enum(["apartment", "villa", "townhouse", "penthouse", "duplex", "studio", "office", "retail", "warehouse"]),
  furnished: z.enum(["furnished", "semi_furnished", "unfurnished"]).optional(),
  
  // Additional Information
  notes: z.string().optional(),
  assignedTo: z.string().min(1, "Assigned to is required"),
  leadScore: z.number().min(0).max(100),
  conversionProbability: z.number().min(0).max(100),
  
  // Requirements
  requirements: z.array(z.string()).optional(),
  documents: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  
  // UAE Compliance
  complianceStatus: z.enum(["pending", "verified", "rejected", "under_review"]).optional(),
  kycStatus: z.enum(["pending", "completed", "failed"]).optional(),
  antiMoneyLaundering: z.boolean().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => void;
  initialData?: Partial<LeadFormData>;
  mode: "create" | "edit";
}

const leadSources = [
  "Website", "Referral", "Social Media", "Cold Call", "Email Campaign", 
  "Trade Show", "Advertisement", "Google Ads", "Facebook", "LinkedIn",
  "YouTube", "Instagram", "Twitter", "WhatsApp", "Other"
];

const propertyTypes = [
  { value: "residential", label: "Residential", icon: Home },
  { value: "commercial", label: "Commercial", icon: Building },
  { value: "industrial", label: "Industrial", icon: Briefcase },
  { value: "retail", label: "Retail", icon: Building2 },
];

// UAE Emirates and Major Locations
const emirates = [
  { value: "dubai", label: "Dubai", emoji: "🏙️" },
  { value: "abu_dhabi", label: "Abu Dhabi", emoji: "🏛️" },
  { value: "sharjah", label: "Sharjah", emoji: "🏛️" },
  { value: "ajman", label: "Ajman", emoji: "🏖️" },
  { value: "ras_al_khaimah", label: "Ras Al Khaimah", emoji: "🏔️" },
  { value: "fujairah", label: "Fujairah", emoji: "🏖️" },
  { value: "umm_al_quwain", label: "Umm Al Quwain", emoji: "🏖️" }
];

const dubaiLocations = [
  "Dubai Marina", "Business Bay", "Downtown Dubai", "Jumeirah", "Palm Jumeirah",
  "DIFC", "JBR", "Sheikh Zayed Road", "Al Barsha", "JLT", "Dubai Hills", 
  "Arabian Ranches", "Motor City", "Sports City", "Dubai Silicon Oasis",
  "International City", "Discovery Gardens", "Jumeirah Village Circle",
  "Dubai Investment Park", "Dubai South", "Dubai Creek Harbour"
];

const abuDhabiLocations = [
  "Corniche", "Al Reem Island", "Yas Island", "Saadiyat Island", "Al Raha",
  "Khalifa City", "Al Ain", "Masdar City", "Al Maryah Island", "Al Zahiyah"
];

const sharjahLocations = [
  "Al Majaz", "Al Qasba", "Al Khan", "Al Nahda", "Al Taawun", "Al Rolla"
];

const locations = [
  ...dubaiLocations,
  ...abuDhabiLocations,
  ...sharjahLocations
].sort((a, b) => a.localeCompare(b)).concat("Other");

const teamMembers = [
  "Sarah Johnson", "Mike Wilson", "Ahmed Hassan", "Fatima Al Mansoori", 
  "David Smith", "Lisa Chen", "Omar Al Rashid"
].sort((a, b) => a.localeCompare(b));

const requirementOptions = [
  "Furnished", "Unfurnished", "Parking", "Gym", "Pool", "Balcony", 
  "Garden", "Security", "Concierge", "High-speed Internet", "Pet-friendly",
  "Wheelchair Accessible", "Business Center", "Meeting Rooms", "Storage"
];

// UAE-specific document requirements
const documentTypes = [
  "Emirates ID", "Passport", "Visa Copy", "Employment Letter", "Salary Certificate",
  "Bank Statement (3 months)", "Trade License", "Memorandum of Association",
  "Financial Statement", "Insurance Certificate", "NOC from Sponsor",
  "Family Book (for UAE Nationals)", "Marriage Certificate", "Birth Certificate",
  "Tenancy Contract (Previous)", "Utility Bills", "Other"
];

const tagOptions = [
  "Premium", "Budget", "Urgent", "Relocation", "Expansion", "Investment",
  "First-time Buyer", "Repeat Customer", "VIP", "Corporate", "Individual"
];

export default function LeadForm({ isOpen, onClose, onSubmit, initialData, mode }: LeadFormProps) {
  /* eslint-disable react-hooks/exhaustive-deps */
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      emiratesId: "",
      visaStatus: "resident",
      nationality: "",
      tradeLicense: "",
      companyType: "llc",
      bankName: "",
      salaryCertificate: false,
      source: "",
      status: "new",
      priority: "medium",
      budget: 0,
      preferredLocation: "",
      propertyType: "residential",
      area: 0,
      bedrooms: 0,
      bathrooms: 0,
      parking: 0,
      moveInDate: "",
      emirate: "dubai",
      community: "",
      buildingType: "apartment",
      furnished: "unfurnished",
      notes: "",
      assignedTo: "",
      leadScore: 50,
      conversionProbability: 50,
      requirements: [],
      documents: [],
      tags: [],
      complianceStatus: "pending",
      kycStatus: "pending",
      antiMoneyLaundering: false,
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = form;
  const watchedValues = watch();

  // Helper function to parse JSON arrays
  const parseJSON = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    if (isOpen) {
        if (mode === "edit" && initialData) {
            const parsedRequirements = parseJSON(initialData.requirements);
            const parsedDocuments = parseJSON(initialData.documents);
            const parsedTags = parseJSON(initialData.tags);

            const formatDate = (dateString?: string) => {
                if (!dateString) return "";
                try {
                    return new Date(dateString).toISOString().split('T')[0];
                } catch (e) {
                    return "";
                }
            };

            const formData: any = {
                name: initialData.name || "",
                email: initialData.email || "",
                phone: initialData.phone || "",
                company: initialData.company || "",
                position: initialData.position || "",
                emiratesId: initialData.emiratesId || "",
                visaStatus: initialData.visaStatus || "resident",
                nationality: initialData.nationality || "",
                tradeLicense: initialData.tradeLicense || "",
                companyType: initialData.companyType || "llc",
                bankName: initialData.bankName || "",
                salaryCertificate: !!initialData.salaryCertificate,
                source: initialData.source || "",
                status: initialData.status || "new",
                priority: initialData.priority || "medium",
                budget: Number(initialData.budget) || 0,
                preferredLocation: initialData.preferredLocation || initialData.community || "",
                propertyType: initialData.propertyType || "residential",
                area: Number(initialData.area) || 0,
                bedrooms: Number(initialData.bedrooms) || 0,
                bathrooms: Number(initialData.bathrooms) || 0,
                parking: Number(initialData.parking) || 0,
                moveInDate: formatDate(initialData.moveInDate),
                emirate: initialData.emirate || "dubai",
                community: initialData.community || "",
                buildingType: initialData.buildingType || "apartment",
                furnished: initialData.furnished || "unfurnished",
                notes: initialData.notes || "",
                assignedTo: initialData.assignedTo ? String(initialData.assignedTo) : "", // Convert number to string for input
                leadScore: Number(initialData.leadScore) || 50,
                conversionProbability: Number(initialData.conversionProbability) || 50,
                requirements: parsedRequirements,
                documents: parsedDocuments,
                tags: parsedTags,
                complianceStatus: initialData.complianceStatus || "pending",
                kycStatus: initialData.kycStatus || "pending",
                antiMoneyLaundering: !!initialData.antiMoneyLaundering,
            };

            reset(formData);
            setSelectedRequirements(parsedRequirements);
            setSelectedDocuments(parsedDocuments);
            setSelectedTags(parsedTags);
        } else {
             reset({
                name: "",
                email: "",
                phone: "",
                company: "",
                position: "",
                emiratesId: "",
                visaStatus: "resident",
                nationality: "",
                tradeLicense: "",
                companyType: "llc",
                bankName: "",
                salaryCertificate: false,
                source: "",
                status: "new",
                priority: "medium",
                budget: 0,
                preferredLocation: "",
                propertyType: "residential",
                area: 0,
                bedrooms: 0,
                bathrooms: 0,
                parking: 0,
                moveInDate: "",
                emirate: "dubai",
                community: "",
                buildingType: "apartment",
                furnished: "unfurnished",
                notes: "",
                assignedTo: "",
                leadScore: 50,
                conversionProbability: 50,
                requirements: [],
                documents: [],
                tags: [],
                complianceStatus: "pending",
                kycStatus: "pending",
                antiMoneyLaundering: false,
            });
            setSelectedRequirements([]);
            setSelectedDocuments([]);
            setSelectedTags([]);
            setCustomTag("");
        }
    }
  }, [isOpen, mode, initialData, reset]);

  const handleRequirementToggle = (requirement: string) => {
    const newRequirements = selectedRequirements.includes(requirement)
      ? selectedRequirements.filter(r => r !== requirement)
      : [...selectedRequirements, requirement];
    setSelectedRequirements(newRequirements);
    setValue("requirements", newRequirements);
  };

  const handleDocumentToggle = (document: string) => {
    const newDocuments = selectedDocuments.includes(document)
      ? selectedDocuments.filter(d => d !== document)
      : [...selectedDocuments, document];
    setSelectedDocuments(newDocuments);
    setValue("documents", newDocuments);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    setValue("tags", newTags);
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      const newTags = [...selectedTags, customTag.trim()];
      setSelectedTags(newTags);
      setValue("tags", newTags);
      setCustomTag("");
    }
  };

  const onFormSubmit = (data: LeadFormData) => {
    const formattedData = {
        ...data,
        community: data.preferredLocation || data.community,
        assignedTo: data.assignedTo ? Number(data.assignedTo) : null as any
    };
    onSubmit(formattedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen rounded-none m-0 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Add New Lead" : "Edit Lead"}
          </DialogTitle>
          <p className="text-muted-foreground">
            {mode === "create" 
              ? "Capture comprehensive lead information for better conversion tracking"
              : "Update lead details and preferences"
            }
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit, (errors) => {
          toast.error("Please check the form for errors", {
            description: Object.values(errors).map((e: any) => e.message).join(", ")
          });
        })} className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="uae">UAE Details</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="assignment">Assignment</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        {...register("name")}
                        placeholder="Enter lead's full name"
                        className={errors.name ? "border-red-500" : ""}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        placeholder="lead@email.com"
                        className={errors.email ? "border-red-500" : ""}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        {...register("phone")}
                        placeholder="+971 50 123 4567"
                        className={errors.phone ? "border-red-500" : ""}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        {...register("company")}
                        placeholder="Company name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      {...register("position")}
                      placeholder="Job title or position"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Lead Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="source">Lead Source *</Label>
                      <Select
                        value={watchedValues.source}
                        onValueChange={(value) => setValue("source", value)}
                      >
                        <SelectTrigger className={errors.source ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {leadSources.map((source) => (
                            <SelectItem key={source} value={source}>
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.source && (
                        <p className="text-sm text-red-500 mt-1">{errors.source.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={watchedValues.status}
                        onValueChange={(value) => setValue("status", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New Lead</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="viewing">Viewing</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="proposal">Proposal</SelectItem>
                          <SelectItem value="closed_won">Closed Won</SelectItem>
                          <SelectItem value="closed_lost">Closed Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={watchedValues.priority}
                        onValueChange={(value) => setValue("priority", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="budget">Budget (AED) *</Label>
                      <Input
                        id="budget"
                        type="number"
                        {...register("budget", { valueAsNumber: true })}
                        placeholder="150000"
                        className={errors.budget ? "border-red-500" : ""}
                      />
                      {errors.budget && (
                        <p className="text-sm text-red-500 mt-1">{errors.budget.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="moveInDate">Move-in Date *</Label>
                      <Input
                        id="moveInDate"
                        type="date"
                        {...register("moveInDate")}
                        className={errors.moveInDate ? "border-red-500" : ""}
                      />
                      {errors.moveInDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.moveInDate.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* UAE Details Tab */}
            <TabsContent value="uae" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    UAE Identity & Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emiratesId">Emirates ID *</Label>
                      <Input
                        id="emiratesId"
                        {...register("emiratesId")}
                        placeholder="784-1234-5678901-2"
                        className={errors.emiratesId ? "border-red-500" : ""}
                      />
                      {errors.emiratesId && (
                        <p className="text-sm text-red-500 mt-1">{errors.emiratesId.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="nationality">Nationality</Label>
                      <Select
                        value={watchedValues.nationality}
                        onValueChange={(value) => setValue("nationality", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select nationality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="american">American</SelectItem>
                          <SelectItem value="australian">Australian</SelectItem>
                          <SelectItem value="bangladeshi">Bangladeshi</SelectItem>
                          <SelectItem value="british">British</SelectItem>
                          <SelectItem value="canadian">Canadian</SelectItem>
                          <SelectItem value="egyptian">Egyptian</SelectItem>
                          <SelectItem value="filipino">Filipino</SelectItem>
                          <SelectItem value="indian">Indian</SelectItem>
                          <SelectItem value="pakistani">Pakistani</SelectItem>
                          <SelectItem value="uae">UAE National</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="visaStatus">Visa Status</Label>
                      <Select
                        value={watchedValues.visaStatus}
                        onValueChange={(value) => setValue("visaStatus", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select visa status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resident">Resident</SelectItem>
                          <SelectItem value="tourist">Tourist</SelectItem>
                          <SelectItem value="investor">Investor</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="emirate">Preferred Emirate</Label>
                      <Select
                        value={watchedValues.emirate}
                        onValueChange={(value) => setValue("emirate", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select emirate" />
                        </SelectTrigger>
                        <SelectContent>
                          {emirates.map((emirate) => (
                            <SelectItem key={emirate.value} value={emirate.value}>
                              <div className="flex items-center gap-2">
                                <span>{emirate.emoji}</span>
                                {emirate.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tradeLicense">Trade License Number</Label>
                      <Input
                        id="tradeLicense"
                        {...register("tradeLicense")}
                        placeholder="12345678901234"
                      />
                    </div>

                    <div>
                      <Label htmlFor="companyType">Company Type</Label>
                      <Select
                        value={watchedValues.companyType}
                        onValueChange={(value) => setValue("companyType", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="llc">LLC</SelectItem>
                          <SelectItem value="freezone">Freezone</SelectItem>
                          <SelectItem value="branch">Branch Office</SelectItem>
                          <SelectItem value="representative">Representative Office</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Select
                        value={watchedValues.bankName}
                        onValueChange={(value) => setValue("bankName", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="emirates_nbd">Emirates NBD</SelectItem>
                          <SelectItem value="adcb">ADCB</SelectItem>
                          <SelectItem value="adib">ADIB</SelectItem>
                          <SelectItem value="fgb">FGB</SelectItem>
                          <SelectItem value="mashreq">Mashreq Bank</SelectItem>
                          <SelectItem value="rak_bank">RAK Bank</SelectItem>
                          <SelectItem value="cbd">CBD</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="salaryCertificate"
                        checked={watchedValues.salaryCertificate}
                        onCheckedChange={(checked) => setValue("salaryCertificate", checked as boolean)}
                      />
                      <Label htmlFor="salaryCertificate">Salary Certificate Available</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Compliance Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="complianceStatus">Compliance Status</Label>
                      <Select
                        value={watchedValues.complianceStatus}
                        onValueChange={(value) => setValue("complianceStatus", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="kycStatus">KYC Status</Label>
                      <Select
                        value={watchedValues.kycStatus}
                        onValueChange={(value) => setValue("kycStatus", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select KYC status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="antiMoneyLaundering"
                      checked={watchedValues.antiMoneyLaundering}
                      onCheckedChange={(checked) => setValue("antiMoneyLaundering", checked as boolean)}
                    />
                    <Label htmlFor="antiMoneyLaundering">Anti-Money Laundering Check Completed</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Property Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Property Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="preferredLocation">Preferred Location *</Label>
                      <Select
                        value={watchedValues.preferredLocation}
                        onValueChange={(value) => setValue("preferredLocation", value)}
                      >
                        <SelectTrigger className={errors.preferredLocation ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.preferredLocation && (
                        <p className="text-sm text-red-500 mt-1">{errors.preferredLocation.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="propertyType">Property Type</Label>
                      <Select
                        value={watchedValues.propertyType}
                        onValueChange={(value) => setValue("propertyType", value as any)}
                      >
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buildingType">Building Type</Label>
                      <Select
                        value={watchedValues.buildingType}
                        onValueChange={(value) => setValue("buildingType", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select building type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="villa">Villa</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="penthouse">Penthouse</SelectItem>
                          <SelectItem value="duplex">Duplex</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="furnished">Furnishing Status</Label>
                      <Select
                        value={watchedValues.furnished}
                        onValueChange={(value) => setValue("furnished", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select furnishing" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="furnished">Furnished</SelectItem>
                          <SelectItem value="semi_furnished">Semi-Furnished</SelectItem>
                          <SelectItem value="unfurnished">Unfurnished</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="area">Area (sq ft)</Label>
                      <Input
                        id="area"
                        type="number"
                        {...register("area", { valueAsNumber: true })}
                        placeholder="1200"
                      />
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Requirements Tab */}
            <TabsContent value="requirements" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Property Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {requirementOptions.map((requirement) => (
                      <div key={requirement} className="flex items-center space-x-2">
                        <Checkbox
                          id={`req-${requirement}`}
                          checked={selectedRequirements.includes(requirement)}
                          onCheckedChange={() => handleRequirementToggle(requirement)}
                        />
                        <Label htmlFor={`req-${requirement}`} className="text-sm">
                          {requirement}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Required Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assignment Tab */}
            <TabsContent value="assignment" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Lead Assignment & Scoring
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="assignedTo">Assigned Agent (User ID)</Label>
                      <Input
                        id="assignedTo"
                        {...register("assignedTo")}
                        placeholder="Enter Agent User ID (e.g., 1)"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use User ID (1 = Admin). Future update: Select from User list.
                      </p>
                      {errors.assignedTo && (
                        <p className="text-sm text-red-500 mt-1">{errors.assignedTo.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="leadScore">Lead Score (0-100)</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="leadScore"
                          type="number"
                          min="0"
                          max="100"
                          {...register("leadScore", { valueAsNumber: true })}
                        />
                        <div className="flex items-center gap-1 font-bold text-lg">
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          {watchedValues.leadScore}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="conversionProbability">Conversion Probability (0-100%)</Label>
                    <Input
                      id="conversionProbability"
                      type="number"
                      min="0"
                      max="100"
                      {...register("conversionProbability", { valueAsNumber: true })}
                      placeholder="65"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Additional Information Tab */}
            <TabsContent value="additional" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Additional notes about the lead..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleTagToggle(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add custom tag"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                      />
                      <Button type="button" variant="outline" onClick={addCustomTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tagOptions.map((tag) => (
                        <Button
                          key={tag}
                          type="button"
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

            </div>
          </ScrollArea>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="">
              <Save className="h-4 w-4 mr-2" />
              {mode === "create" ? "Create Lead" : "Update Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
