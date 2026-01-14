import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  Desktop, 
  Server, 
  Database, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Disc, 
  Cd, 
  Dvd, 
  Video, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Music, 
  Headphones, 
  Speaker, 
  FileText, 
  DollarSign
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

const ticketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.string().min(1, "Priority is required"),
  category: z.string().min(1, "Category is required"),
  propertyId: z.string().min(1, "Property is required"),
  tenantId: z.string().min(1, "Tenant is required"),
  assigneeId: z.string().min(1, "Assignee is required"),
  dueDate: z.string().min(1, "Due date is required"),
  estimatedCost: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const priorities = [
  { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800" },
];

const categories = [
  { value: "HVAC", label: "HVAC", icon: Cloud },
  { value: "Plumbing", label: "Plumbing", icon: Droplets },
  { value: "Electrical", label: "Electrical", icon: Zap },
  { value: "Elevator", label: "Elevator", icon: ArrowUp },
  { value: "General", label: "General", icon: Wrench },
  { value: "Security", label: "Security", icon: Shield },
  { value: "Cleaning", label: "Cleaning", icon: Sparkles },
];

// Sample data
const properties = [
  { id: "1", name: "Marina Heights Tower", unit: "Unit 305", address: "Marina Walk, Dubai Marina" },
  { id: "2", name: "Business Bay Commercial Plaza", unit: "Unit 102", address: "Sheikh Zayed Road, Business Bay" },
  { id: "3", name: "Palm Jumeirah Residences", unit: "Unit 204", address: "Palm Jumeirah" },
  { id: "4", name: "Downtown Office Complex", unit: "Unit 801", address: "Mohammed Bin Rashid Boulevard" },
];

const tenants = [
  { id: "1", name: "Sarah Ahmed", email: "sarah.ahmed@email.com", phone: "+971 50 123 4567" },
  { id: "2", name: "Mohammed Al Mansoori", email: "m.almansoori@email.com", phone: "+971 55 987 6543" },
  { id: "3", name: "Jennifer Smith", email: "j.smith@email.com", phone: "+971 52 456 7890" },
  { id: "4", name: "Ahmed Hassan", email: "a.hassan@email.com", phone: "+971 54 321 0987" },
];

const assignees = [
  { id: "1", name: "Ahmed Hassan", role: "HVAC Technician", phone: "+971 55 123 4567" },
  { id: "2", name: "Omar Ali", role: "Plumber", phone: "+971 50 987 6543" },
  { id: "3", name: "Hassan Mohammed", role: "Electrician", phone: "+971 54 456 7890" },
  { id: "4", name: "Elevator Service Co.", role: "Elevator Technician", phone: "+971 4 123 4567" },
  { id: "5", name: "Maintenance Team", role: "General Maintenance", phone: "+971 4 987 6543" },
];

export default function MaintenanceTicketForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  mode 
}: MaintenanceTicketFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      category: "",
      propertyId: "",
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
        return JSON.parse(value);
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
        
        const formData = {
          title: initialData.title || "",
          description: initialData.description || "",
          priority: initialData.priority || "medium",
          category: initialData.category || "",
          propertyId: initialData.property?.id || initialData.propertyId || "",
          tenantId: initialData.tenant?.id || initialData.tenantId || "",
          assigneeId: initialData.assignee?.id || initialData.assigneeId || "",
          dueDate: initialData.dueDate || "",
          estimatedCost: initialData.estimatedCost || 0,
          notes: initialData.notes || "",
          tags: parsedTags,
        };

        // Reset form with all values
        reset(formData);

        // Set individual values for critical fields
        Object.keys(formData).forEach((key) => {
          setValue(key as any, formData[key as keyof typeof formData]);
        });

        // Update state
        setTags(parsedTags);
        setAttachments(parsedAttachments);
      }, 150);
    } else if (mode === "create") {
      // Reset form for create mode
      reset({
        title: "",
        description: "",
        priority: "medium",
        category: "",
        propertyId: "",
        tenantId: "",
        assigneeId: "",
        dueDate: "",
        estimatedCost: 0,
        notes: "",
        tags: [],
      });
      setTags([]);
      setAttachments([]);
      setNewTag("");
    }
  }, [isOpen, mode, initialData, reset, setValue]);

  const handleFormSubmit = (data: any) => {
    const ticketData = {
      ...data,
      attachments,
      tags,
      createdDate: new Date().toISOString(),
      status: "open",
    };
    onSubmit(ticketData);
    reset();
    setAttachments([]);
    setTags([]);
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
      const newAttachments = Array.from(files).map(file => file.name);
      setAttachments([...attachments, ...newAttachments]);
    }
  };

  const getPriorityColor = (priority: string) => {
    const priorityObj = priorities.find(p => p.value === priority);
    return priorityObj?.color || "bg-gray-100 text-gray-800";
  };

  const getCategoryIcon = (category: string) => {
    const categoryObj = categories.find(c => c.value === category);
    return categoryObj?.icon || Wrench;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
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

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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
                      <Select value={watchedValues.category} onValueChange={(value) => setValue("category", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => {
                            const IconComponent = category.icon;
                            return (
                              <SelectItem key={category.value} value={category.value}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  {category.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
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
                      <Select value={watchedValues.priority} onValueChange={(value) => setValue("priority", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              <div className="flex items-center gap-2">
                                <Badge className={priority.color}>
                                  {priority.label}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.priority && (
                        <p className="text-sm text-red-600 mt-1">{errors.priority.message}</p>
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
                      <Select value={watchedValues.propertyId} onValueChange={(value) => setValue("propertyId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              <div>
                                <p className="font-medium">{property.name}</p>
                                <p className="text-sm text-muted-foreground">{property.unit}</p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.propertyId && (
                        <p className="text-sm text-red-600 mt-1">{errors.propertyId.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="tenantId">Tenant *</Label>
                      <Select value={watchedValues.tenantId} onValueChange={(value) => setValue("tenantId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tenant" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              <div>
                                <p className="font-medium">{tenant.name}</p>
                                <p className="text-sm text-muted-foreground">{tenant.phone}</p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.tenantId && (
                        <p className="text-sm text-red-600 mt-1">{errors.tenantId.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="assigneeId">Assignee *</Label>
                    <Select value={watchedValues.assigneeId} onValueChange={(value) => setValue("assigneeId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignees.map((assignee) => (
                          <SelectItem key={assignee.id} value={assignee.id}>
                            <div>
                              <p className="font-medium">{assignee.name}</p>
                              <p className="text-sm text-muted-foreground">{assignee.role}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                  {attachments.length > 0 && (
                    <div>
                      <Label>Uploaded Files</Label>
                      <div className="space-y-2 mt-2">
                        {attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{attachment}</span>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
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

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" className="bg-gradient-primary shadow-glow">
                <Save className="h-4 w-4 mr-2" />
                {mode === "create" ? "Create Ticket" : "Update Ticket"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
