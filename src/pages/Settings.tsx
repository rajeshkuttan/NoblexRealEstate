import { useState, useEffect } from "react";
import { serviceTemplatesAPI, usersAPI, companySettingsAPI, documentNumberingAPI } from "@/services/api";
import { useSettings } from "@/contexts/SettingsContext";
import type { ServiceTemplate } from "@/types/serviceTemplate";
import ServiceTemplateForm from "@/components/settings/ServiceTemplateForm";
import DocumentNumberingForm from "@/components/settings/DocumentNumberingForm";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
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
  Banknote, 
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import UserForm from "@/components/settings/UserForm";

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
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const { contractTerminology, refreshSettings, setContractTerminology } = useSettings();
  const [tempTerminology, setTempTerminology] = useState(contractTerminology);

  useEffect(() => {
    setTempTerminology(contractTerminology);
  }, [contractTerminology]);

  // Document Numbering state
  const [documentNumberings, setDocumentNumberings] = useState<any[]>([]);
  const [loadingDocNumberings, setLoadingDocNumberings] = useState(false);
  const [showDocNumForm, setShowDocNumForm] = useState(false);
  const [selectedDocNum, setSelectedDocNum] = useState<any>(null);

  const fetchDocumentNumberings = async () => {
    setLoadingDocNumberings(true);
    try {
      const response = await documentNumberingAPI.getAll(undefined, true);
      setDocumentNumberings(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching document numberings:", error);
      toast.error("Failed to load document numberings");
    } finally {
      setLoadingDocNumberings(false);
    }
  };

  useEffect(() => {
    if (activeTab === "document-numbering") {
      fetchDocumentNumberings();
    }
  }, [activeTab]);

  const handleAddDocNum = () => {
    setSelectedDocNum(null);
    setShowDocNumForm(true);
  };

  const handleEditDocNum = (docNum: any) => {
    setSelectedDocNum(docNum);
    setShowDocNumForm(true);
  };

  // User Settings state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [userFormMode, setUserFormMode] = useState<"create" | "edit">("create");
  const [selectedUserIds, setSelectedUserIds] = useState<any[]>([]);
  const { confirm, isOpen: isConfirmOpen, options: confirmOptions, onConfirm, onCancel } = useConfirm();

  const toggleUserSelection = (userId: any) => {
      setSelectedUserIds(prev => 
          prev.includes(userId) 
              ? prev.filter(id => id !== userId) 
              : [...prev, userId]
      );
  };

  const handleBulkDelete = async () => {
      const confirmed = await confirm({
        title: "Bulk Delete Users",
        description: `Are you sure you want to delete ${selectedUserIds.length} users? This will deactivate their accounts.`,
        variant: "destructive",
        confirmText: "Delete Users",
        cancelText: "Cancel"
      });
      
      if (!confirmed) return;
      
      try {
          // Process deletions sequentially to avoid overwhelming the server 
          // (or implement a bulk delete API endpoint for better performance)
          for (const id of selectedUserIds) {
              await usersAPI.delete(id);
          }
          
          toast.success("Selected users deactivated successfully");
          // Update local state immediately
          setUsers(prev => prev.map(u => selectedUserIds.includes(u.id) ? { ...u, isActive: false } : u));
          setSelectedUserIds([]);
      } catch (error) {
          console.error("Error deleting users:", error);
          toast.error("Failed to delete some users");
          // Refresh to ensure consistent state
          fetchUsers();
      }
  };
  
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

  const handleSaveSettings = async (section: string) => {
    try {
      if (section === "uae") {
        await companySettingsAPI.updateSettings({ contractTerminology: tempTerminology });
        setContractTerminology(tempTerminology);
        await refreshSettings();
        toast.success("UAE Settings saved successfully");
      } else {
        console.log(`Saving ${section} settings - not yet fully implemented for this section`);
        toast.info(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved (simulator)`);
      }
    } catch (error) {
      console.error(`Error saving ${section} settings:`, error);
      toast.error(`Failed to save ${section} settings`);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await usersAPI.getAll(undefined, true);
      setUsers(response.data?.data?.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  const handleAddUser = () => {
    setSelectedUser(null);
    setUserFormMode("create");
    setShowUserDialog(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setUserFormMode("edit");
    setShowUserDialog(true);
  };

  const handleDeleteUser = async (user: any) => {
    const confirmed = await confirm({
      title: "Deactivate User",
      description: `Are you sure you want to deactivate ${user.name}? They will no longer be able to log in.`,
      variant: "destructive",
      confirmText: "Deactivate",
      cancelText: "Cancel"
    });

    if (confirmed) {
        try {
            await usersAPI.delete(user.id);
            toast.success("User deactivated successfully");
            // Update local state immediately
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: false } : u));
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Failed to delete user");
        }
    }
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

    const confirmed = await confirm({
      title: "Delete Template",
      description: `Are you sure you want to delete "${template.name}"? This cannot be undone.`,
      variant: "destructive",
      confirmText: "Delete",
      cancelText: "Cancel"
    });

    if (!confirmed) {
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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="uae">UAE Settings</TabsTrigger>
          <TabsTrigger value="document-numbering">Doc Numbering</TabsTrigger>
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
                    <Banknote className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-800">Finance Manager</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Financial operations, invoicing, payments, PDC management</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4 text-emerald-600" />
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
                <div className="flex items-center gap-2">
                    {selectedUserIds.length > 0 && (
                        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected ({selectedUserIds.length})
                        </Button>
                    )}
                    <Button onClick={handleAddUser}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center py-2 px-4 border rounded-lg bg-muted/50 mb-2">
                    <Checkbox 
                        checked={users.filter(u => u.isActive && u.id !== currentUser?.id).length > 0 && selectedUserIds.length === users.filter(u => u.isActive && u.id !== currentUser?.id).length}
                        onCheckedChange={(checked) => {
                            if (checked) {
                                setSelectedUserIds(users.filter(u => u.isActive && u.id !== currentUser?.id).map(u => u.id));
                            } else {
                                setSelectedUserIds([]);
                            }
                        }}
                        className="mr-4"
                    />
                    <span className="text-sm font-medium">Select All</span>
                </div>
                {users.filter(u => u.isActive)
                  .sort((a, b) => {
                      if (a.id === currentUser?.id) return -1;
                      if (b.id === currentUser?.id) return 1;
                      return 0;
                  })
                  .map((user) => (
                  <div 
                    key={user.id} 
                    className={cn(
                      "flex items-center justify-between p-4 border rounded-lg",
                      currentUser?.id === user.id && "bg-blue-50 border-blue-200 ring-1 ring-blue-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {currentUser?.id !== user.id && (
                          <Checkbox 
                              checked={selectedUserIds.includes(user.id)}
                              onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                      )}
                      {currentUser?.id === user.id && <div className="w-4 h-4 mr-0" />} {/* Spacer for alignment */}
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant="outline"
                        className={
                          user.role === "admin" ? "bg-red-100 text-red-800 border-red-200" :
                          user.role === "manager" ? "bg-blue-100 text-blue-800 border-blue-200" :
                          user.role === "finance_manager" ? "bg-green-100 text-green-800 border-green-200" :
                          user.role === "finance_executive" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                          user.role === "operations_executive" ? "bg-purple-100 text-purple-800 border-purple-200" :
                          user.role === "maintenance_contractor" ? "bg-orange-100 text-orange-800 border-orange-200" :
                          user.role === "tenant" ? "bg-gray-100 text-gray-800 border-gray-200" :
                          ""
                        }
                      >
                        {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ') : 'N/A'}
                      </Badge>
                      <Badge variant="default">
                        Active
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {currentUser?.id !== user.id && (
                          <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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

              <div>
                <Label htmlFor="terminology">Contract Terminology</Label>
                <Select value={tempTerminology} onValueChange={setTempTerminology}>
                  <SelectTrigger id="terminology">
                    <SelectValue placeholder="Select terminology" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ejari">Ejari (Dubai)</SelectItem>
                    <SelectItem value="Tawteeq">Tawteeq (Abu Dhabi)</SelectItem>
                    <SelectItem value="Tasdeeq">Tasdeeq (Sharjah)</SelectItem>
                    <SelectItem value="Tanzeem">Tanzeem (Ajman)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This term will be used consistently for lease contracts across the application.
                </p>
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

        {/* Document Numbering */}
        <TabsContent value="document-numbering" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Document Numbering
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage numbering sequences down to the document level
                  </p>
                </div>
                <Button onClick={handleAddDocNum}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Numbering
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDocNumberings ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading configurations...</p>
                  </div>
                </div>
              ) : documentNumberings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                  <p className="text-lg font-medium">No document numbering configured</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first configuration to establish standard numbering
                  </p>
                  <Button onClick={handleAddDocNum}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Configuration
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Document</th>
                        <th className="text-left p-3 font-semibold">Format</th>
                        <th className="text-left p-3 font-semibold">Current Value</th>
                        <th className="text-left p-3 font-semibold">Yearwise</th>
                        <th className="text-left p-3 font-semibold">Status</th>
                        <th className="text-right p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentNumberings.map((docNum) => (
                        <tr key={docNum.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{docNum.documentName}</td>
                          <td className="p-3">
                            <span className="text-muted-foreground font-mono text-xs">
                              {docNum.prefix ? `${docNum.prefix}-` : ''}
                              {docNum.yearwiseSerial ? `${docNum.year}-` : ''}
                              XXXX
                              {docNum.suffix ? `-${docNum.suffix}` : ''}
                            </span>
                          </td>
                          <td className="p-3 font-mono">{docNum.currentNumber}</td>
                          <td className="p-3">
                            {docNum.yearwiseSerial ? (
                              <Badge variant="outline">Yes ({docNum.year})</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">No</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            {docNum.isActive ? (
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
                                onClick={() => handleEditDocNum(docNum)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
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
      </Tabs>

      {/* User Modal */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {userFormMode === "edit" ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription>
              {userFormMode === "edit" ? "Update user information and permissions" : "Create a new user account with appropriate role and permissions"}
            </DialogDescription>
          </DialogHeader>
          <UserForm 
            key={selectedUser?.id || 'new'}
            user={selectedUser} 
            mode={userFormMode} 
            onSuccess={() => {
              setShowUserDialog(false);
              fetchUsers();
            }}
            onCancel={() => setShowUserDialog(false)}
          />
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

      {/* Document Numbering Form */}
      <DocumentNumberingForm
        open={showDocNumForm}
        onOpenChange={setShowDocNumForm}
        config={selectedDocNum}
        onSuccess={fetchDocumentNumberings}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={onCancel}
        onConfirm={onConfirm}
        title={confirmOptions?.title || "Confirm Action"}
        description={confirmOptions?.description || "Are you sure you want to proceed?"}
        confirmText={confirmOptions?.confirmText}
        cancelText={confirmOptions?.cancelText}
        variant={confirmOptions?.variant}
      />
    </div>
  );
}