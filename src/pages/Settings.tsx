import { useState, useEffect } from "react";
import { serviceTemplatesAPI } from "@/services/api";
import type { ServiceTemplate } from "@/types/serviceTemplate";
import ServiceTemplateForm from "@/components/settings/ServiceTemplateForm";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  Building2, 
  Users, 
  Shield, 
  Bell, 
  Globe, 
  Database, 
  Key, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign, 
  FileText, 
  Upload, 
  Download, 
  Save, 
  Edit, 
  Trash2,
  Wrench, 
  Plus, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Lock, 
  Unlock, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Star, 
  Calendar, 
  Clock, 
  Wifi, 
  Server, 
  HardDrive, 
  Cloud, 
  Archive, 
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Sample data for settings
const companyInfo = {
  name: "withu Real Estate Management",
  email: "info@withu.ae",
  phone: "+971 4 123 4567",
  address: "Dubai International Financial Centre, Dubai, UAE",
  website: "https://withu.ae",
  license: "TRN-123456789",
  vatNumber: "100123456789003"
};

const users = [
  {
    id: 1,
    name: "Ahmed Al-Rashid",
    email: "ahmed@withu.ae",
    role: "Admin",
    status: "Active",
    lastLogin: "2024-06-20 10:30",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah@withu.ae",
    role: "Manager",
    status: "Active",
    lastLogin: "2024-06-20 09:15",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: 3,
    name: "Mike Wilson",
    email: "mike@withu.ae",
    role: "Agent",
    status: "Active",
    lastLogin: "2024-06-19 16:45",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: 4,
    name: "Fatima Al-Zahra",
    email: "fatima@withu.ae",
    role: "Finance Manager",
    status: "Active",
    lastLogin: "2024-06-20 08:30",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: 5,
    name: "Omar Hassan",
    email: "omar@withu.ae",
    role: "Finance Executive",
    status: "Active",
    lastLogin: "2024-06-19 14:20",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: 6,
    name: "Aisha Patel",
    email: "aisha@withu.ae",
    role: "Operations Executive",
    status: "Active",
    lastLogin: "2024-06-20 11:15",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: 7,
    name: "Hassan Maintenance",
    email: "hassan@maintenance.ae",
    role: "Maintenance Contractor",
    status: "Active",
    lastLogin: "2024-06-19 09:45",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
  },
  {
    id: 8,
    name: "John Smith",
    email: "john.smith@email.com",
    role: "Tenant",
    status: "Active",
    lastLogin: "2024-06-18 16:30",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face"
  }
];

const systemSettings = {
  notifications: {
    email: true,
    sms: false,
    push: true,
    leaseExpiry: true,
    paymentReminders: true,
    maintenanceAlerts: true
  },
  security: {
    twoFactor: true,
    sessionTimeout: 30,
    passwordPolicy: "Strong",
    loginAttempts: 5
  },
  integrations: {
    ejari: true,
    dubaiLand: false,
    rera: true,
    bankIntegration: false
  }
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
  // Service Templates state
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ServiceTemplate | null>(null);
  const [templateMode, setTemplateMode] = useState<"create" | "edit">("create");

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleSaveSettings = (section: string) => {
    console.log(`Saving ${section} settings`);
    // Implement save logic here
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = (user: any) => {
    console.log("Delete user:", user);
  };

  const handleBackup = () => {
    setShowBackupModal(true);
  };

  // Fetch templates when templates tab is active
  useEffect(() => {
    if (activeTab === "templates") {
      fetchTemplates();
    }
  }, [activeTab]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await serviceTemplatesAPI.getAll({ activeOnly: 'false' });
      setTemplates(response.data?.data?.templates || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load service templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleAddTemplate = () => {
    setSelectedTemplate(null);
    setTemplateMode("create");
    setShowTemplateForm(true);
  };

  const handleEditTemplate = (template: ServiceTemplate) => {
    setSelectedTemplate(template);
    setTemplateMode("edit");
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (template: ServiceTemplate) => {
    if (template.isSystem) {
      toast.error("System templates cannot be deleted");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await serviceTemplatesAPI.delete(template.id, false);
      toast.success(`Template "${template.name}" deactivated successfully`);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleTemplateSubmit = async (data: any) => {
    try {
      if (templateMode === "create") {
        await serviceTemplatesAPI.create(data);
        toast.success("Service template created successfully");
      } else if (selectedTemplate) {
        await serviceTemplatesAPI.update(selectedTemplate.id, data);
        toast.success("Service template updated successfully");
      }
      setShowTemplateForm(false);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(`Failed to ${templateMode === "create" ? "create" : "update"} template`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your application preferences and configurations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleBackup}>
            <Archive className="h-4 w-4 mr-2" />
            Backup
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" />
            Save All
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="uae">UAE Settings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" defaultValue={companyInfo.name} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={companyInfo.email} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" defaultValue={companyInfo.phone} />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" defaultValue={companyInfo.website} />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" defaultValue={companyInfo.address} rows={3} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="license">Trade License</Label>
                  <Input id="license" defaultValue={companyInfo.license} />
                </div>
                <div>
                  <Label htmlFor="vat">VAT Number</Label>
                  <Input id="vat" defaultValue={companyInfo.vatNumber} />
                </div>
              </div>

              <Button onClick={() => handleSaveSettings("company")} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Company Information
              </Button>
            </CardContent>
          </Card>

          {/* Branding Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Branding & Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logo">Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select defaultValue="light">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" defaultValue="#1e3a8a" className="w-12 h-10" />
                    <Input defaultValue="#1e3a8a" className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" defaultValue="#059669" className="w-12 h-10" />
                    <Input defaultValue="#059669" className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" defaultValue="#3b82f6" className="w-12 h-10" />
                    <Input defaultValue="#3b82f6" className="flex-1" />
                  </div>
                </div>
              </div>

              <Button onClick={() => handleSaveSettings("branding")} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Branding Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Templates Management */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Service Templates
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage reusable service templates for leases and units
                  </p>
                </div>
                <Button onClick={handleAddTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading templates...</p>
                  </div>
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                  <p className="text-lg font-medium">No service templates found</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first template to get started
                  </p>
                  <Button onClick={handleAddTemplate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Name</th>
                        <th className="text-left p-3 font-semibold">Default Amount</th>
                        <th className="text-left p-3 font-semibold">Taxable</th>
                        <th className="text-left p-3 font-semibold">Billing Method</th>
                        <th className="text-left p-3 font-semibold">Category</th>
                        <th className="text-left p-3 font-semibold">Account</th>
                        <th className="text-left p-3 font-semibold">Status</th>
                        <th className="text-right p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((template) => (
                        <tr key={template.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {template.name}
                              {template.isSystem && (
                                <Badge variant="secondary" className="text-xs">System</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {Number(template.defaultAmount) > 0 
                              ? `AED ${Number(template.defaultAmount).toFixed(2)}`
                              : 'Variable'}
                          </td>
                          <td className="p-3">
                            {template.isTaxable ? (
                              <Badge variant="default" className="bg-blue-100 text-blue-800">Yes</Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">
                              {template.billingMethod === 'included_in_rental' 
                                ? 'Included' 
                                : 'Separate'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary">{template.category || 'N/A'}</Badge>
                          </td>
                          <td className="p-3">
                            {template.account ? (
                              <span className="text-sm">
                                {template.account.accountCode} - {template.account.accountName}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not linked</span>
                            )}
                          </td>
                          <td className="p-3">
                            {template.isActive ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600">Inactive</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {!template.isSystem && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteTemplate(template)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          {/* Role Permissions Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Permissions Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-red-800">Admin</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Full system access, user management, all settings</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-800">Manager</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Property management, tenant oversight, reporting</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-800">Finance Manager</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Financial operations, invoicing, payments, PDC management</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-800">Finance Executive</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Invoice creation, payment processing, financial reports</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-purple-800">Operations Executive</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Property operations, maintenance coordination, tenant services</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="h-4 w-4 text-orange-600" />
                    <span className="font-semibold text-orange-800">Maintenance Contractor</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Maintenance tickets, work orders, status updates</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="font-semibold text-gray-800">Tenant</span>
                  </div>
                  <p className="text-sm text-muted-foreground">View lease details, payment history, maintenance requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <Button onClick={handleAddUser}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-10 w-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={
                          user.role === "Admin" ? "default" :
                          user.role === "Manager" ? "default" :
                          user.role === "Finance Manager" ? "default" :
                          user.role === "Finance Executive" ? "secondary" :
                          user.role === "Operations Executive" ? "secondary" :
                          user.role === "Maintenance Contractor" ? "outline" :
                          user.role === "Tenant" ? "outline" :
                          "secondary"
                        }
                        className={
                          user.role === "Admin" ? "bg-red-100 text-red-800 border-red-200" :
                          user.role === "Manager" ? "bg-blue-100 text-blue-800 border-blue-200" :
                          user.role === "Finance Manager" ? "bg-green-100 text-green-800 border-green-200" :
                          user.role === "Finance Executive" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                          user.role === "Operations Executive" ? "bg-purple-100 text-purple-800 border-purple-200" :
                          user.role === "Maintenance Contractor" ? "bg-orange-100 text-orange-800 border-orange-200" :
                          user.role === "Tenant" ? "bg-gray-100 text-gray-800 border-gray-200" :
                          ""
                        }
                      >
                        {user.role}
                      </Badge>
                      <Badge variant={user.status === "Active" ? "default" : "secondary"}>
                        {user.status}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch defaultChecked={systemSettings.notifications.email} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                  </div>
                  <Switch defaultChecked={systemSettings.notifications.sms} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                  </div>
                  <Switch defaultChecked={systemSettings.notifications.push} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Lease Expiry Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified before lease expiry</p>
                  </div>
                  <Switch defaultChecked={systemSettings.notifications.leaseExpiry} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Payment Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send automatic payment reminders</p>
                  </div>
                  <Switch defaultChecked={systemSettings.notifications.paymentReminders} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified about maintenance requests</p>
                  </div>
                  <Switch defaultChecked={systemSettings.notifications.maintenanceAlerts} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                System Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ejari Integration</Label>
                    <p className="text-sm text-muted-foreground">Connect with Dubai Land Department</p>
                  </div>
                  <Switch defaultChecked={systemSettings.integrations.ejari} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>RERA Integration</Label>
                    <p className="text-sm text-muted-foreground">Connect with RERA systems</p>
                  </div>
                  <Switch defaultChecked={systemSettings.integrations.rera} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bank Integration</Label>
                    <p className="text-sm text-muted-foreground">Connect with banking systems</p>
                  </div>
                  <Switch defaultChecked={systemSettings.integrations.bankIntegration} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UAE Settings */}
        <TabsContent value="uae" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                UAE Compliance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vatRate">VAT Rate (%)</Label>
                  <Input id="vatRate" type="number" defaultValue="5" />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select defaultValue="AED">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ejariFee">Ejari Registration Fee</Label>
                  <Input id="ejariFee" type="number" defaultValue="220" />
                </div>
                <div>
                  <Label htmlFor="dewaDeposit">DEWA Deposit</Label>
                  <Input id="dewaDeposit" type="number" defaultValue="2000" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Ejari Registration</Label>
                    <p className="text-sm text-muted-foreground">Automatically register leases with Ejari</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>VAT Calculation</Label>
                    <p className="text-sm text-muted-foreground">Include VAT in all calculations</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Button onClick={() => handleSaveSettings("uae")} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save UAE Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                  </div>
                  <Switch defaultChecked={systemSettings.security.twoFactor} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Timeout (minutes)</Label>
                    <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                  </div>
                  <Input type="number" defaultValue={systemSettings.security.sessionTimeout} className="w-20" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Password Policy</Label>
                    <p className="text-sm text-muted-foreground">Enforce strong passwords</p>
                  </div>
                  <Select defaultValue={systemSettings.security.passwordPolicy}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weak">Weak</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Strong">Strong</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Login Attempts Limit</Label>
                    <p className="text-sm text-muted-foreground">Max failed login attempts</p>
                  </div>
                  <Input type="number" defaultValue={systemSettings.security.loginAttempts} className="w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup & Maintenance */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup & Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Automatic Backups</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Daily Backup</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Weekly Backup</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Monthly Backup</Label>
                      <Switch />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Storage Usage</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Database</span>
                      <span>2.3 GB</span>
                    </div>
                    <Progress value={65} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span>Files</span>
                      <span>1.8 GB</span>
                    </div>
                    <Progress value={45} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span>Backups</span>
                      <span>5.2 GB</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleBackup}>
                  <Archive className="h-4 w-4 mr-2" />
                  Create Backup
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Backup
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Restore Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser ? "Update user information and permissions" : "Create a new user account with appropriate role and permissions"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userName">Full Name</Label>
                <Input id="userName" defaultValue={selectedUser?.name || ""} />
              </div>
              <div>
                <Label htmlFor="userEmail">Email</Label>
                <Input id="userEmail" type="email" defaultValue={selectedUser?.email || ""} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userRole">Role</Label>
                <Select defaultValue={selectedUser?.role || "Agent"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Agent">Agent</SelectItem>
                    <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                    <SelectItem value="Finance Executive">Finance Executive</SelectItem>
                    <SelectItem value="Operations Executive">Operations Executive</SelectItem>
                    <SelectItem value="Maintenance Contractor">Maintenance Contractor</SelectItem>
                    <SelectItem value="Tenant">Tenant</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="userStatus">Status</Label>
                <Select defaultValue={selectedUser?.status || "Active"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {selectedUser ? "Update User" : "Create User"}
              </Button>
              <Button variant="outline" onClick={() => setShowUserModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Modal */}
      <Dialog open={showBackupModal} onOpenChange={setShowBackupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create System Backup</DialogTitle>
            <DialogDescription>
              Create a backup of your system data. Choose the backup type and select which data to include.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Backup Type</Label>
              <Select defaultValue="full">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Backup</SelectItem>
                  <SelectItem value="database">Database Only</SelectItem>
                  <SelectItem value="files">Files Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Include Data</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="properties" defaultChecked />
                  <Label htmlFor="properties">Properties & Units</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="tenants" defaultChecked />
                  <Label htmlFor="tenants">Tenants & Leases</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="finance" defaultChecked />
                  <Label htmlFor="finance">Financial Data</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="documents" defaultChecked />
                  <Label htmlFor="documents">Documents & Files</Label>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1">
                <Archive className="h-4 w-4 mr-2" />
                Create Backup
              </Button>
              <Button variant="outline" onClick={() => setShowBackupModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Template Form */}
      <ServiceTemplateForm
        isOpen={showTemplateForm}
        onClose={() => setShowTemplateForm(false)}
        onSubmit={handleTemplateSubmit}
        initialData={selectedTemplate}
        mode={templateMode}
      />
    </div>
  );
}