import { useState } from "react";
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  Banknote,
  User,
  Phone,
  MessageSquare,
  Camera,
  FileText,
  Download,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Home,
  Building2,
  Zap,
  Droplets,
  Thermometer,
  Shield,
  Settings,
  Hammer,
  Paintbrush
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface MaintenanceHistoryProps {
  tenant: {
    id: number;
    name: string;
    property: string;
    unit: string;
    maintenanceHistory: Array<{
      id: number;
      date: string;
      type: string;
      description: string;
      status: string;
      priority: string;
      cost: number;
      assignedTo?: string;
      completedDate?: string;
      notes?: string;
      images?: string[];
    }>;
  };
}

const maintenanceTypes = [
  { value: "AC Repair", label: "AC Repair", icon: Thermometer },
  { value: "Plumbing", label: "Plumbing", icon: Droplets },
  { value: "Electrical", label: "Electrical", icon: Zap },
  { value: "Elevator", label: "Elevator", icon: Settings },
  { value: "Painting", label: "Painting", icon: Paintbrush },
  { value: "General", label: "General", icon: Wrench },
  { value: "Security", label: "Security", icon: Shield },
  { value: "Internet", label: "Internet", icon: Zap },
  { value: "Other", label: "Other", icon: Wrench },
];

const maintenanceStatuses = ["All", "Completed", "In Progress", "Pending", "Cancelled"];
const priorityLevels = ["Low", "Medium", "High", "Urgent"];

export default function MaintenanceHistory({ tenant }: MaintenanceHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);

  // Ensure maintenanceHistory exists, otherwise use empty array
  const maintenanceHistory = tenant.maintenanceHistory || [];

  const filteredMaintenance = maintenanceHistory.filter((maintenance) => {
    const matchesSearch = 
      maintenance.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      maintenance.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      maintenance.assignedTo?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "All" || maintenance.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesType = selectedType === "All" || maintenance.type === selectedType;
    const matchesPriority = selectedPriority === "All" || maintenance.priority === selectedPriority;
    
    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  const totalCost = maintenanceHistory
    .filter(m => m.status === "Completed")
    .reduce((sum, maintenance) => sum + maintenance.cost, 0);
  
  const pendingCount = maintenanceHistory.filter(m => m.status === "Pending").length;
  const inProgressCount = maintenanceHistory.filter(m => m.status === "In Progress").length;
  const completedCount = maintenanceHistory.filter(m => m.status === "Completed").length;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "cancelled":
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = maintenanceTypes.find(t => t.value === type);
    return typeConfig ? <typeConfig.icon className="h-4 w-4" /> : <Wrench className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Maintenance History</h2>
          <p className="text-muted-foreground">{tenant.name} - {tenant.property} - {tenant.unit}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setShowMaintenanceForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Request
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold text-foreground">AED {totalCost.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search maintenance..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {maintenanceStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                {maintenanceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Priorities</SelectItem>
                {priorityLevels.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance List */}
      <div className="space-y-4">
        {filteredMaintenance.map((maintenance) => (
          <Card key={maintenance.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center">
                    {getTypeIcon(maintenance.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {maintenance.type}
                      </h3>
                      <Badge className={getStatusColor(maintenance.status)}>
                        {getStatusIcon(maintenance.status)}
                        <span className="ml-1">{maintenance.status}</span>
                      </Badge>
                      <Badge className={getPriorityColor(maintenance.priority)}>
                        {maintenance.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{maintenance.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {maintenance.date}
                      </span>
                      {maintenance.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {maintenance.assignedTo}
                        </span>
                      )}
                      {maintenance.completedDate && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Completed: {maintenance.completedDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">
                      AED {maintenance.cost.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Cost</p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedMaintenance(maintenance)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Request
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact Technician
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Request
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredMaintenance.length === 0 && (
        <Card className="p-12 text-center">
          <Wrench className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Maintenance Records</h3>
          <p className="text-muted-foreground mb-6">
            No maintenance records match your current filters.
          </p>
          <Button onClick={() => setShowMaintenanceForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Request
          </Button>
        </Card>
      )}

      {/* Maintenance Details Modal */}
      {selectedMaintenance && (
        <Dialog open={!!selectedMaintenance} onOpenChange={() => setSelectedMaintenance(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Request Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Request ID</p>
                  <p className="font-semibold">#{selectedMaintenance.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="font-semibold">{selectedMaintenance.date}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="font-semibold flex items-center gap-2">
                    {getTypeIcon(selectedMaintenance.type)}
                    {selectedMaintenance.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedMaintenance.status)}>
                    {getStatusIcon(selectedMaintenance.status)}
                    <span className="ml-1">{selectedMaintenance.status}</span>
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  <Badge className={getPriorityColor(selectedMaintenance.priority)}>
                    {selectedMaintenance.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cost</p>
                  <p className="text-xl font-bold text-foreground">AED {selectedMaintenance.cost.toLocaleString()}</p>
                </div>
                {selectedMaintenance.assignedTo && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                    <p className="font-semibold">{selectedMaintenance.assignedTo}</p>
                  </div>
                )}
                {selectedMaintenance.completedDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed Date</p>
                    <p className="font-semibold">{selectedMaintenance.completedDate}</p>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm">{selectedMaintenance.description}</p>
              </div>
              
              {selectedMaintenance.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedMaintenance.notes}</p>
                </div>
              )}

              {selectedMaintenance.images && selectedMaintenance.images.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Images</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selectedMaintenance.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Maintenance ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}