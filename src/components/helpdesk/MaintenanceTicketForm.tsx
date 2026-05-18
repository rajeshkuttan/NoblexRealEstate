import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usersAPI, propertiesAPI, tenantsAPI, unitsAPI, ticketsAPI } from "@/services/api";
import { toast } from "sonner";
import { 
  Wrench, 
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
  Home, 
  Building, 
  Store, 
  Warehouse, 
  Car, 
  Wifi, 
  Shield, 
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
  ArrowUp,
  Play, 
  Pause, 
  RotateCcw, 
  Minus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Calendar, 
  User, 
  Building2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Trophy, 
  Medal, 
  Crown, 
  Gem, 
  Sparkles, 
  Flame, 
  Sun, 
  Moon, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Wind, 
  Droplets, 
  Thermometer, 
  Gauge, 
  Battery, 
  Signal, 
  Radio, 
  Tv, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Laptop, 
 
  Server, 
  Database, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Disc, 
 
 
  Video, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Music, 
  Headphones, 
  Speaker, 
  FileText
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MaintenanceTicketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  mode: "create" | "edit";
  options?: any;
}

const ticketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  status: z.string().optional(),
  priority: z.string().min(1, "Priority is required"),
  category: z.string().min(1, "Category is required"),
  propertyId: z.string().min(1, "Property is required"),
  unitId: z.string().min(1, "Unit is required"),
  tenantId: z.string().min(1, "Tenant is required"),
  assigneeId: z.string().min(1, "Assignee is required"),
  dueDate: z.string().min(1, "Due date is required"),
  estimatedCost: z.coerce.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const getCategoryIconComponent = (category: string) => {
  switch (category) {
    case "HVAC": return Cloud;
    case "Plumbing": return Droplets;
    case "Electrical": return Zap;
    case "Elevator": return ArrowUp;
    case "Security": return Shield;
    case "Cleaning": return Sparkles;
    default: return Wrench;
  }
};

const normalizeOption = (option: any) => ({
  value: String(option?.value ?? option?.id ?? option ?? ""),
  label: String(option?.label ?? option?.name ?? option?.title ?? option?.value ?? option ?? ""),
  color: option?.color,
});

const renderBadgeOption = (option: { label: string; color?: string }) => (
  <Badge className={option.color || "bg-gray-100 text-gray-800 border-gray-200"}>
    {option.label}
  </Badge>
);

// Sample data
// Hardcoded data removed in favor of API fetching

export default function MaintenanceTicketForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  mode,
  options
}: MaintenanceTicketFormProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("basic");
  // Store existing attachments (strings) and new files (File objects) separately or together
  // Let's store them as: existingAttachments: string[] and newAttachments: File[]
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]); 
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const normalizedCategories = (options?.categories || []).map(normalizeOption);
  const normalizedPriorities = (options?.priorities || []).map(normalizeOption);
  const normalizedStatuses = (options?.statuses || []).map(normalizeOption);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propsRes, tenantsRes, usersRes] = await Promise.all([
          propertiesAPI.getAll(),
          tenantsAPI.getAll(),
          usersAPI.getAll()
        ]);
        
        // propertiesAPI.getAll returns { data: { properties: [...] } }
        setProperties(propsRes.data?.properties || []);
        // Tenants API returns { success: true, data: { tenants: [...] } }
        const tenantsData = tenantsRes.data?.data?.tenants || tenantsRes.data?.tenants || [];
        setTenants(Array.isArray(tenantsData) ? tenantsData : []);

        // Users API returns { success: true, data: { users: [...] } }
        const usersData = usersRes.data?.data?.users || usersRes.data?.users || [];
        setAssignees(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error("Error fetching form data:", error);
        toast.error("Failed to load form data");
      }
    };
    
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "open",
      priority: "medium",
      category: "",

      propertyId: "",
      unitId: "",
      tenantId: "",
      assigneeId: "",
      dueDate: "",
      estimatedCost: 0,
      notes: "",
      tags: [],
    }
  });

  const watchedValues = watch();

  // Helper function to parse JSON arrays
  const parseJSON = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        let parsed = JSON.parse(value);
        if (typeof parsed === 'string') {
           try { parsed = JSON.parse(parsed); } catch {}
        }
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Load edit data when modal opens in edit mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && initialData) {
      // Delay for dialog render
      setTimeout(() => {
        // Parse JSON fields
        const parsedTags = parseJSON(initialData.tags);
        const parsedAttachments = parseJSON(initialData.attachments);
        
        // Helper to safely format date
        const formatDateForInput = (dateString: any) => {
          if (!dateString) return "";
          try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "";
            return date.toISOString().split('T')[0];
          } catch (e) {
            console.error("Error formatting date:", e);
            return "";
          }
        };

        const formData = {
          title: initialData.title || "",
          description: initialData.description || "",
          priority: initialData.priority || "medium",
          status: initialData.status || "open",
          category: initialData.category || "",
          propertyId: initialData.unit?.property?.id ? String(initialData.unit.property.id) : (initialData.propertyId || ""),
          unitId: initialData.unit?.id ? String(initialData.unit.id) : (initialData.unitId || ""),
          tenantId: initialData.tenant?.id ? String(initialData.tenant.id) : (initialData.tenantId || ""),
          assigneeId: initialData.assignedTo ? String(initialData.assignedTo) : (initialData.assigneeId || ""),
          dueDate: formatDateForInput(initialData.dueDate || initialData.scheduledDate),
          estimatedCost: Number(initialData.estimatedCost) || 0,
          notes: "", // Reset notes to empty string as we handle them via separate tab
          tags: parsedTags,
        };
        
        console.log("📝 Initializing form with data:", formData);

        // Reset form with all values
        reset(formData);

        // Set individual values for critical fields
        Object.keys(formData).forEach((key) => {
          setValue(key as any, formData[key as keyof typeof formData]);
        });

        // Update state
        setTags(parsedTags);
        // For existing attachments, they are strings (filenames) or objects? 
        // Debug data says: "attachments": "[\"file1.pdf\", ...]"
        // So parsedAttachments is ["file1.pdf", ...]
        setExistingAttachments(parsedAttachments);
        setNewFiles([]);
      }, 150);
    } else if (mode === "create") {
      // Reset form for create mode
      reset({
        title: "",
        description: "",
        status: initialData?.status || "open",
        priority: "medium",
        category: "",
        propertyId: "",
        unitId: "",
        tenantId: "",
        assigneeId: "",
        dueDate: "",
        estimatedCost: Number(initialData?.estimatedCost) || 0,
        notes: initialData?.notes || "",
        tags: [],
      });
      setTags([]);
      setExistingAttachments([]);
      setNewFiles([]);
      setNewTag("");
    }
  }, [isOpen, mode, initialData, reset, setValue]);

  // Fetch units when property changes
  useEffect(() => {
    const fetchUnits = async () => {
      if (watchedValues.propertyId) {
        try {
          const response = await unitsAPI.getByProperty(Number(watchedValues.propertyId));
          // Access the nested response structure correctly
          const unitsData = response.data?.data?.units || response.data?.units || [];
          setUnits(Array.isArray(unitsData) ? unitsData : []);
          
          // Clear unit selection if it doesn't belong to the new property
          // Only clear if the user manually changed property, OR if we are sure the unit is invalid
          // For now, let's be less aggressive about clearing to avoid issues during edit validation
          if (watchedValues.unitId && unitsData.length > 0) {
             const unitExists = unitsData.some((u: any) => String(u.id) === watchedValues.unitId);
             if (!unitExists) {
                console.warn("Selected unit not found in property units list. Clearing selection.", {
                  selected: watchedValues.unitId,
                  available: unitsData.map((u: any) => u.id)
                });
                // setValue("unitId", ""); // Disable auto-clearing for debugging
             }
          }
        } catch (error) {
          console.error("Error fetching units:", error);
          setUnits([]);
        }
      } else {
        setUnits([]);
      }
    };
    fetchUnits();
  }, [watchedValues.propertyId, setValue]);

  const handleFormSubmit = async (data: any) => {
    if (!user?.id) {
       toast.error("You must be logged in to create a ticket");
       return;
    }

    try {
      // 1. Prepare initial ticket data
      // For create mode, we can't link documents yet. We'll do it after creation.
      // For attachments field, we keep existing ones AND placeholders for new ones?
      // Actually, let's just save the ticket first.
      
      const ticketPayload = {
        ...data,
        // We will update attachments after upload, but for now invoke with existing
        attachments: existingAttachments, 
        tags,
        createdDate: new Date().toISOString(),
        status: data.status || "open",
        assignedTo: data.assigneeId, 
        scheduledDate: data.dueDate,
        unitId: data.unitId,
        reportedBy: user.id,
      };

      delete ticketPayload.assigneeId;
      delete ticketPayload.dueDate;
      
      // 2. Submit Ticket (Create or Update)
      // We need to hijack the onSubmit prop or call API directly?
      // The parent component handles onSubmit. 
      // If we want to upload files LINKED to the ticket, we need the ID.
      // If 'onSubmit' is just a wrapper around api.create, we can't intercept easily unless we change the prop type to return the result.
      // Let's assume we can call the API directly here if we want strictly to handle uploads, 
      // OR we change the flow.
      // OPTION: We upload 'unlinked' documents first? No, we need entityId.
      // OPTION: We assume the parent passes a callback that returns the new ticket?
      // The current 'onSubmit' returns void.
      
      // Let's modify this component to call API directly? 
      // Or better: Upload files first with a temporary Entity ID? No.
      
      // BEST APPROACH:
      // Change `onSubmit` to return the created/updated ticket (Promise<any>).
      // But I can't change the parent logic easily without seeing it.
      // The `Helpdesk.tsx` code:
      /*
         const handleTicketSubmit = async (data: any) => {
            if (selectedTicket) { ... await ticketsAPI.update ... }
            else { ... await ticketsAPI.create ... }
            ...
         }
      */
      
      // I will handle the submission logic INSIDE this form for the file uploads, 
      // but I need the ticket ID.
      // I will assume `onSubmit` handles the ticket save. 
      // Limitation: I can't upload files for a NEW ticket because I don't have the ID.
      
      // WORKAROUND:
      // I will implement a "Pending Uploads" queue in `Helpdesk.tsx`? Too complex.
      // I will change `MaintenanceTicketForm` to handle the API call itself?
      // Yes, importing `ticketsAPI` is already done.
      
      // BUT `onSubmit` prop exists. 
      // Let's change `onSubmit` to just refresh the list/close modal, and do the saving HERE.
      // This is a refactor.
      
      // Let's try to pass the data to `onSubmit` and hope it returns the ticket? 
      // `Helpdesk.tsx` implementation needs to change to return the response.
      
      // Let's just do the API call here.
      
      let ticketId;
      if (mode === "create") {
         const res = await ticketsAPI.create(ticketPayload);
         ticketId = res.data?.data?.id || res.data?.id;
      } else {
         ticketId = initialData.id;
         await ticketsAPI.update(ticketId, ticketPayload);
      }
      
      if (ticketId && newFiles.length > 0) {
         toast.info("Uploading attachments...");
         const uploadedDocs = [];
         
         // Import documentsAPI (it's in api.ts, need to import it)
         const { documentsAPI } = await import("@/services/api");

         for (const file of newFiles) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("entityType", "ticket");
            formData.append("entityId", String(ticketId));
            formData.append("documentType", "attachment");
            formData.append("fileName", file.name);
            
            try {
               const docRes = await documentsAPI.upload(formData);
               const doc = docRes.data?.data;
               uploadedDocs.push({
                  name: doc.fileName,
                  // Construct URL using ID
                  url: `${import.meta.env.VITE_API_URL || 'http://localhost:5004/api'}/documents/${doc.id}/download`,
                  id: doc.id
               });
            } catch (err) {
               console.error("Failed to upload file:", file.name, err);
               toast.error(`Failed to upload ${file.name}`);
            }
         }
         
         // Update ticket with new attachments list combined with old
         // Old: ["file.pdf"] -> convert to object?
         // New: [{name, url, id}]
         // We should normalize existing attachments.
         // If existing is ["file.pdf"], keep it.
         // We might end up with mixed types in the JSON array: ["file.pdf", {name: "new.pdf", ...}]
         // The TicketDetails parser should handle this (it handles objects?)
         // TicketDetails: `file.name || file` -> works for both.
         // `getFileUrl`: `if (file.url) return file.url`. Works.
         
         const allAttachments = [...existingAttachments, ...uploadedDocs];
         await ticketsAPI.update(ticketId, { attachments: allAttachments });
         
         // Update payload for parent component to reflect new attachments immediately
         ticketPayload.attachments = allAttachments;
      }
      
      toast.success(mode === "create" ? "Ticket created successfully" : "Ticket updated successfully");
      onClose();
      onSubmit(ticketPayload); // Trigger refresh in parent with updated attachments
      
    } catch (error) {
       console.error("Error submitting ticket:", error);
       toast.error("Failed to save ticket");
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form validation errors:", errors);
    // Open the tab containing the error
    if (errors.propertyId || errors.unitId || errors.tenantId || errors.assigneeId) {
      setActiveTab("assignments");
    } else if (errors.title || errors.description || errors.priority || errors.category || errors.dueDate) {
      setActiveTab("basic");
    }

    toast.error("Please fill in all required fields", {
       description: Object.keys(errors).map(key => `${key}: ${errors[key].message}`).join(", ")
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFileObjects = Array.from(files);
      setNewFiles([...newFiles, ...newFileObjects]);
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles(newFiles.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index: number) => {
     setExistingAttachments(existingAttachments.filter((_, i) => i !== index));
  };

  const getPriorityColor = (priority: string) => {
    const priorityObj = options?.priorities?.find((p:any) => p.value === priority);
    return priorityObj?.color || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getCategoryIcon = (category: string) => {
    return getCategoryIconComponent(category);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen rounded-none m-0 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {mode === "create" ? "Create Maintenance Ticket" : "Edit Maintenance Ticket"}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {mode === "create" ? "Create a new maintenance request" : "Update maintenance ticket details"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <form id="maintenance-ticket-form" onSubmit={handleSubmit(handleFormSubmit, onInvalid)} className="space-y-6 max-w-5xl mx-auto pb-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Ticket Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="Brief description of the issue"
                        {...register("title")}
                      />
                      {errors.title && (
                        <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <SearchableSelect
                        value={watchedValues.category || ""}
                        onValueChange={(value) => setValue("category", value)}
                        placeholder="Select category"
                        searchPlaceholder="Search categories..."
                        emptyMessage="No category found"
                        options={normalizedCategories}
                        renderSelectedOption={(option) => {
                          const IconComponent = getCategoryIconComponent(option.value);
                          return (
                            <span className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 shrink-0" />
                              <span>{option.label}</span>
                            </span>
                          );
                        }}
                        renderOption={(option) => {
                          const IconComponent = getCategoryIconComponent(option.value);
                          return (
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 shrink-0" />
                              <span>{option.label}</span>
                            </div>
                          );
                        }}
                      />
                      {errors.category && (
                        <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed description of the maintenance issue..."
                      rows={4}
                      {...register("description")}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority *</Label>
                      <SearchableSelect
                        value={watchedValues.priority || ""}
                        onValueChange={(value) => setValue("priority", value)}
                        placeholder="Select priority"
                        searchPlaceholder="Search priorities..."
                        emptyMessage="No priority found"
                        options={normalizedPriorities}
                        renderSelectedOption={(option) =>
                          renderBadgeOption({
                            label: option.label,
                            color: normalizedPriorities.find((item) => item.value === option.value)?.color,
                          })
                        }
                        renderOption={(option) =>
                          renderBadgeOption({
                            label: option.label,
                            color: normalizedPriorities.find((item) => item.value === option.value)?.color,
                          })
                        }
                      />
                      {errors.priority && (
                        <p className="text-sm text-red-600 mt-1">{errors.priority.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <SearchableSelect
                        value={watchedValues.status || ""}
                        onValueChange={(value) => setValue("status", value)}
                        placeholder="Select status"
                        searchPlaceholder="Search statuses..."
                        emptyMessage="No status found"
                        options={normalizedStatuses}
                        renderSelectedOption={(option) =>
                          renderBadgeOption({
                            label: option.label,
                            color: normalizedStatuses.find((item) => item.value === option.value)?.color,
                          })
                        }
                        renderOption={(option) =>
                          renderBadgeOption({
                            label: option.label,
                            color: normalizedStatuses.find((item) => item.value === option.value)?.color,
                          })
                        }
                      />
                      {errors.status && (
                        <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="dueDate">Due Date *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        {...register("dueDate")}
                      />
                      {errors.dueDate && (
                        <p className="text-sm text-red-600 mt-1">{errors.dueDate.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Additional Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="estimatedCost">Estimated Cost (AED)</Label>
                    <Input
                      id="estimatedCost"
                      type="number"
                      placeholder="0"
                      {...register("estimatedCost", { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes or special instructions..."
                      rows={3}
                      {...register("notes")}
                    />
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        placeholder="Add a tag"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                      />
                      <Button type="button" variant="outline" onClick={handleAddTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Property & Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="propertyId">Property *</Label>
                      <SearchableSelect
                        value={watchedValues.propertyId || ""}
                        onValueChange={(value) => setValue("propertyId", value)}
                        placeholder="Select property"
                        searchPlaceholder="Search properties..."
                        emptyMessage="No property found"
                        options={properties.map((property) => ({
                          value: String(property.id || property._id),
                          label: property.name || property.title,
                        }))}
                      />
                      {errors.propertyId && (
                        <p className="text-sm text-red-600 mt-1">{errors.propertyId.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="tenantId">Tenant *</Label>
                      <SearchableSelect
                        value={watchedValues.tenantId || ""}
                        onValueChange={(value) => setValue("tenantId", value)}
                        placeholder="Select tenant"
                        searchPlaceholder="Search tenants..."
                        emptyMessage="No tenant found"
                        options={tenants.map((tenant) => ({
                          value: String(tenant.id || tenant._id),
                          label: tenant.englishName || tenant.name || "Unknown Tenant",
                          description: tenant.primaryPhone || tenant.phone,
                        }))}
                      />
                      {errors.tenantId && (
                        <p className="text-sm text-red-600 mt-1">{errors.tenantId.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Unit Selection - Only show if property is selected */}
                  {watchedValues.propertyId && (
                    <div className="mt-4">
                      <Label htmlFor="unitId">Unit *</Label>
                      <SearchableSelect
                        value={watchedValues.unitId || ""}
                        onValueChange={(value) => setValue("unitId", value)}
                        placeholder="Select unit"
                        searchPlaceholder="Search units..."
                        emptyMessage="No unit found"
                        options={units.map((unit) => ({
                          value: String(unit.id || unit._id),
                          label: unit.unitNumber,
                          description: unit.status ? `(${unit.status})` : undefined,
                        }))}
                      />
                      {errors.unitId && (
                        <p className="text-sm text-red-600 mt-1">{errors.unitId.message}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="assigneeId">Assignee *</Label>
                    <SearchableSelect
                      value={watchedValues.assigneeId || ""}
                      onValueChange={(value) => setValue("assigneeId", value)}
                      placeholder="Select assignee"
                      searchPlaceholder="Search assignees..."
                      emptyMessage="No assignee found"
                      options={assignees.map((assignee) => ({
                        value: String(assignee.id || assignee._id),
                        label: assignee.name || assignee.username || "Unknown User",
                        description: assignee.role || "No Role",
                      }))}
                    />
                    {errors.assigneeId && (
                      <p className="text-sm text-red-600 mt-1">{errors.assigneeId.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attachments Tab */}
            <TabsContent value="attachments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fileUpload">Upload Files</Label>
                    <Input
                      id="fileUpload"
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="mb-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      Upload photos, documents, or other files related to this maintenance request
                    </p>
                  </div>

                  {(existingAttachments.length > 0 || newFiles.length > 0) && (
                    <div>
                      <Label>Uploaded Files</Label>
                      <div className="space-y-2 mt-2">
                        {existingAttachments.map((attachment, index) => (
                          <div key={`existing-${index}`} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{typeof attachment === 'string' ? attachment : attachment.name}</span>
                              <Badge variant="secondary" className="text-xs">Existing</Badge>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeExistingAttachment(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {newFiles.map((file, index) => (
                          <div key={`new-${index}`} className="flex items-center justify-between p-2 border rounded-lg bg-blue-50">
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{file.name}</span>
                              <Badge className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">New</Badge>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeNewFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end items-center gap-3">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="maintenance-ticket-form" className="bg-gradient-primary shadow-glow">
            {mode === "create" ? "Create Ticket" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
