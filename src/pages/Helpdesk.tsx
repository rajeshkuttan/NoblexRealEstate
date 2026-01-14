import { useState } from "react";
import { ticketsAPI } from "@/services/api";
import { toast } from "sonner";
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Settings, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Award, 
  Trophy, 
  Medal, 
  Crown, 
  Gem, 
  Sparkles, 
  Zap, 
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
  Wifi, 
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
  Camera, 
  Video, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Music, 
  Headphones, 
  Speaker, 
  Home, 
  Building, 
  Store, 
  Warehouse, 
  Car, 
  FileText, 
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
  MessageSquare, 
  Phone, 
  Mail, 
  MapPin, 
  Eye, 
  Edit, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  Check, 
  Minus, 
  X, 
  Download, 
  Upload, 
  Printer, 
  Send, 
  MessageSquare as MessageSquareIcon, 
  Bell as BellIcon, 
  Phone as PhoneIcon, 
  Mail as MailIcon, 
  MapPin as MapPinIcon, 
  Eye as EyeIcon, 
  Edit as EditIcon, 
  MoreHorizontal as MoreHorizontalIcon, 
  ChevronDown as ChevronDownIcon, 
  ChevronUp as ChevronUpIcon, 
  ArrowRight as ArrowRightIcon, 
  ArrowLeft as ArrowLeftIcon, 
  Play as PlayIcon, 
  Pause as PauseIcon, 
  RotateCcw as RotateCcwIcon, 
  Save as SaveIcon, 
  Check as CheckIcon, 
  Minus as MinusIcon, 
  X as XIcon, 
  Download as DownloadIcon, 
  Upload as UploadIcon, 
  Printer as PrinterIcon, 
  Send as SendIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import MaintenanceTicketForm from "@/components/helpdesk/MaintenanceTicketForm";
import TicketDetails from "@/components/helpdesk/TicketDetails";
import KanbanBoard from "@/components/helpdesk/KanbanBoard";
import MaintenanceAnalytics from "@/components/helpdesk/MaintenanceAnalytics";

// Sample maintenance tickets data
const maintenanceTickets = [
  {
    id: "MT-2024-001",
    title: "Air Conditioning Repair",
    description: "AC unit not cooling properly in Unit 305",
    priority: "high",
    status: "open",
    category: "HVAC",
    property: {
      id: 1,
      name: "Marina Heights Tower",
      unit: "Unit 305",
      address: "Marina Walk, Dubai Marina, Dubai, UAE"
    },
    tenant: {
      id: 1,
      name: "Sarah Ahmed",
      email: "sarah.ahmed@email.com",
      phone: "+971 50 123 4567"
    },
    assignee: {
      id: 1,
      name: "Ahmed Hassan",
      role: "HVAC Technician",
      phone: "+971 55 123 4567"
    },
    createdDate: "2024-03-15",
    dueDate: "2024-03-20",
    completedDate: null,
    estimatedCost: 500,
    actualCost: null,
    attachments: ["ac_issue_photo.jpg", "maintenance_log.pdf"],
    notes: "Tenant reported AC not cooling below 25°C",
    tags: ["urgent", "hvac", "cooling"],
    history: [
      {
        id: 1,
        action: "Ticket Created",
        user: "Sarah Ahmed",
        timestamp: "2024-03-15T10:30:00Z",
        description: "Tenant reported AC cooling issue"
      },
      {
        id: 2,
        action: "Assigned",
        user: "Property Manager",
        timestamp: "2024-03-15T11:00:00Z",
        description: "Assigned to Ahmed Hassan (HVAC Technician)"
      }
    ]
  },
  {
    id: "MT-2024-002",
    title: "Plumbing Leak",
    description: "Water leak in kitchen sink area",
    priority: "medium",
    status: "in_progress",
    category: "Plumbing",
    property: {
      id: 2,
      name: "Business Bay Commercial Plaza",
      unit: "Unit 102",
      address: "Sheikh Zayed Road, Business Bay, Dubai, UAE"
    },
    tenant: {
      id: 2,
      name: "Mohammed Al Mansoori",
      email: "m.almansoori@email.com",
      phone: "+971 55 987 6543"
    },
    assignee: {
      id: 2,
      name: "Omar Ali",
      role: "Plumber",
      phone: "+971 50 987 6543"
    },
    createdDate: "2024-03-14",
    dueDate: "2024-03-18",
    completedDate: null,
    estimatedCost: 200,
    actualCost: null,
    attachments: ["leak_photo.jpg"],
    notes: "Small leak under kitchen sink, needs immediate attention",
    tags: ["plumbing", "leak", "kitchen"],
    history: [
      {
        id: 1,
        action: "Ticket Created",
        user: "Mohammed Al Mansoori",
        timestamp: "2024-03-14T14:20:00Z",
        description: "Tenant reported water leak in kitchen"
      },
      {
        id: 2,
        action: "Assigned",
        user: "Property Manager",
        timestamp: "2024-03-14T15:00:00Z",
        description: "Assigned to Omar Ali (Plumber)"
      },
      {
        id: 3,
        action: "Work Started",
        user: "Omar Ali",
        timestamp: "2024-03-15T09:00:00Z",
        description: "Technician started working on the leak"
      }
    ]
  },
  {
    id: "MT-2024-003",
    title: "Electrical Outlet Repair",
    description: "Power outlet not working in bedroom",
    priority: "low",
    status: "completed",
    category: "Electrical",
    property: {
      id: 3,
      name: "Palm Jumeirah Residences",
      unit: "Unit 204",
      address: "Palm Jumeirah, Dubai, UAE"
    },
    tenant: {
      id: 3,
      name: "Jennifer Smith",
      email: "j.smith@email.com",
      phone: "+971 52 456 7890"
    },
    assignee: {
      id: 3,
      name: "Hassan Mohammed",
      role: "Electrician",
      phone: "+971 54 456 7890"
    },
    createdDate: "2024-03-10",
    dueDate: "2024-03-15",
    completedDate: "2024-03-12",
    estimatedCost: 150,
    actualCost: 120,
    attachments: ["outlet_photo.jpg", "repair_receipt.pdf"],
    notes: "Outlet wiring was loose, fixed and tested",
    tags: ["electrical", "outlet", "bedroom"],
    history: [
      {
        id: 1,
        action: "Ticket Created",
        user: "Jennifer Smith",
        timestamp: "2024-03-10T16:45:00Z",
        description: "Tenant reported non-working outlet in bedroom"
      },
      {
        id: 2,
        action: "Assigned",
        user: "Property Manager",
        timestamp: "2024-03-10T17:00:00Z",
        description: "Assigned to Hassan Mohammed (Electrician)"
      },
      {
        id: 3,
        action: "Work Started",
        user: "Hassan Mohammed",
        timestamp: "2024-03-11T10:00:00Z",
        description: "Technician started electrical repair"
      },
      {
        id: 4,
        action: "Completed",
        user: "Hassan Mohammed",
        timestamp: "2024-03-12T14:30:00Z",
        description: "Outlet repaired and tested successfully"
      }
    ]
  },
  {
    id: "MT-2024-004",
    title: "Elevator Maintenance",
    description: "Scheduled monthly elevator maintenance",
    priority: "medium",
    status: "scheduled",
    category: "Elevator",
    property: {
      id: 4,
      name: "Downtown Office Complex",
      unit: "Building",
      address: "Mohammed Bin Rashid Boulevard, Downtown Dubai, UAE"
    },
    tenant: {
      id: 4,
      name: "Ahmed Hassan",
      email: "a.hassan@email.com",
      phone: "+971 54 321 0987"
    },
    assignee: {
      id: 4,
      name: "Elevator Service Co.",
      role: "Elevator Technician",
      phone: "+971 4 123 4567"
    },
    createdDate: "2024-03-01",
    dueDate: "2024-03-25",
    completedDate: null,
    estimatedCost: 800,
    actualCost: null,
    attachments: ["elevator_schedule.pdf"],
    notes: "Monthly preventive maintenance for all elevators",
    tags: ["elevator", "maintenance", "scheduled"],
    history: [
      {
        id: 1,
        action: "Ticket Created",
        user: "Property Manager",
        timestamp: "2024-03-01T09:00:00Z",
        description: "Scheduled monthly elevator maintenance"
      },
      {
        id: 2,
        action: "Assigned",
        user: "Property Manager",
        timestamp: "2024-03-01T09:15:00Z",
        description: "Assigned to Elevator Service Co."
      }
    ]
  }
];

const statusOptions = ["All", "Open", "In Progress", "Completed", "Scheduled", "Cancelled"];
const priorityOptions = ["All", "Low", "Medium", "High", "Urgent"];
const categoryOptions = ["All", "HVAC", "Plumbing", "Electrical", "Elevator", "General", "Security", "Cleaning"];
const sortOptions = ["Created Date", "Due Date", "Priority", "Status", "Assignee", "Property"];

export default function Helpdesk() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Created Date");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  const filteredTickets = maintenanceTickets
    .filter((ticket) => {
      const matchesSearch = 
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.tenant.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = selectedStatus === "All" || ticket.status === selectedStatus.toLowerCase().replace(" ", "_");
      const matchesPriority = selectedPriority === "All" || ticket.priority === selectedPriority.toLowerCase();
      const matchesCategory = selectedCategory === "All" || ticket.category === selectedCategory;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "Due Date":
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "Priority":
          const priorityOrder = { urgent: 5, high: 4, medium: 3, low: 2, critical: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        case "Status":
          return a.status.localeCompare(b.status);
        case "Assignee":
          return a.assignee.name.localeCompare(b.assignee.name);
        case "Property":
          return a.property.name.localeCompare(b.property.name);
        default:
          return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
      }
    });

  const totalTickets = maintenanceTickets.length;
  const openTickets = maintenanceTickets.filter(t => t.status === "open").length;
  const inProgressTickets = maintenanceTickets.filter(t => t.status === "in_progress").length;
  const completedTickets = maintenanceTickets.filter(t => t.status === "completed").length;
  const overdueTickets = maintenanceTickets.filter(t => new Date(t.dueDate) < new Date() && t.status !== "completed").length;
  const avgResolutionTime = 2.5; // days
  const totalCost = maintenanceTickets.filter(t => t.actualCost).reduce((sum, t) => sum + (t.actualCost || 0), 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "scheduled":
        return <Calendar className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleAddTicket = () => {
    setFormMode("create");
    setSelectedTicket(null);
    setShowTicketForm(true);
  };

  const handleEditTicket = async (ticket: any) => {
    try {
      // Fetch full ticket data from API
      const response = await ticketsAPI.getById(ticket.id);
      const ticketData = response.data?.data || response.data;
      
      console.log("✅ Loaded ticket for edit:", ticketData);
      
      setSelectedTicket(ticketData);
      setFormMode("edit");
      setShowTicketForm(true);
    } catch (error: any) {
      console.error("❌ Error loading ticket:", error);
      toast.error("Failed to load ticket details");
    }
  };

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setShowTicketDetails(true);
  };

  const handleTicketSubmit = (data: any) => {
    console.log("Ticket data:", data);
    setShowTicketForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Maintenance Helpdesk</h1>
          <p className="text-muted-foreground mt-2">Advanced maintenance ticket management with Kanban board</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-gradient-primary shadow-glow" onClick={handleAddTicket}>
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Maintenance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                <p className="text-3xl font-bold text-foreground">{totalTickets}</p>
                <p className="text-sm text-muted-foreground">All time</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
                <p className="text-3xl font-bold text-foreground">{openTickets}</p>
                <p className="text-sm text-muted-foreground">Need attention</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-foreground">{inProgressTickets}</p>
                <p className="text-sm text-muted-foreground">Being worked on</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-foreground">{completedTickets}</p>
                <p className="text-sm text-muted-foreground">This month</p>
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
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold text-foreground">{overdueTickets}</p>
                <p className="text-sm text-muted-foreground">Need immediate attention</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                <p className="text-3xl font-bold text-foreground">{avgResolutionTime}d</p>
                <p className="text-sm text-muted-foreground">Average time</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets, properties, or tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-primary text-primary-foreground")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  Sort by {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Priority</label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content */}
      {viewMode === "kanban" ? (
        <KanbanBoard 
          tickets={filteredTickets}
          onTicketClick={handleViewTicket}
          onEditTicket={handleEditTicket}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-6 font-medium text-muted-foreground">Ticket</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Property</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Tenant</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Assignee</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Priority</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Due Date</th>
                  <th className="text-left p-6 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="p-6">
                      <div>
                        <p className="font-medium text-foreground">{ticket.title}</p>
                        <p className="text-sm text-muted-foreground">{ticket.id}</p>
                        <p className="text-xs text-muted-foreground">{ticket.category}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="font-medium text-foreground">{ticket.property.name}</p>
                        <p className="text-sm text-muted-foreground">{ticket.property.unit}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="font-medium text-foreground">{ticket.tenant.name}</p>
                        <p className="text-sm text-muted-foreground">{ticket.tenant.phone}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="font-medium text-foreground">{ticket.assignee.name}</p>
                        <p className="text-sm text-muted-foreground">{ticket.assignee.role}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </td>
                    <td className="p-6">
                      <Badge className={getStatusColor(ticket.status)}>
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1">{ticket.status}</span>
                      </Badge>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="text-sm font-medium">{new Date(ticket.dueDate).toLocaleDateString("en-AE")}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(ticket.dueDate) < new Date() && ticket.status !== "completed" ? "Overdue" : "On time"}
                        </p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewTicket(ticket)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditTicket(ticket)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleViewTicket(ticket)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTicket(ticket)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Ticket
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {filteredTickets.length === 0 && (
        <Card className="p-12 text-center">
          <Wrench className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Tickets Found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search criteria or create a new maintenance ticket.
          </p>
          <Button className="bg-gradient-primary shadow-glow" onClick={handleAddTicket}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Ticket
          </Button>
        </Card>
      )}

      {/* Ticket Form Modal */}
      <MaintenanceTicketForm
        isOpen={showTicketForm}
        onClose={() => setShowTicketForm(false)}
        onSubmit={handleTicketSubmit}
        initialData={selectedTicket}
        mode={formMode}
      />

      {/* Ticket Details Modal */}
      {showTicketDetails && selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          isOpen={showTicketDetails}
          onClose={() => setShowTicketDetails(false)}
          onEdit={handleEditTicket}
        />
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <MaintenanceAnalytics tickets={maintenanceTickets} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
