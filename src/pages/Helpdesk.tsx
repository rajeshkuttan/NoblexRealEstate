import { useState, useEffect } from "react";
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
  Server, 
  Database, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Disc, 
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import MaintenanceTicketForm from "@/components/helpdesk/MaintenanceTicketForm";
import TicketDetails from "@/components/helpdesk/TicketDetails";
import KanbanBoard from "@/components/helpdesk/KanbanBoard";
import MaintenanceAnalytics from "@/components/helpdesk/MaintenanceAnalytics";

const sortOptions = ["Created Date", "Due Date", "Priority", "Status", "Assignee", "Property"];

export default function Helpdesk() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [ticketOptions, setTicketOptions] = useState<any>({ statuses: [], priorities: [], categories: [] });

  const statusOptions = ["All", ...ticketOptions.statuses.map((s: any) => s.label)];
  const priorityOptions = ["All", ...ticketOptions.priorities.map((p: any) => p.label)];
  const categoryOptions = ["All", ...ticketOptions.categories.map((c: any) => c.label)];

  useEffect(() => {
    fetchOptions();
    fetchTickets();
  }, []);

  const fetchOptions = async () => {
    try {
      const response = await ticketsAPI.getOptions();
      if (response.data?.success) {
        setTicketOptions(response.data.data);
      } else if (response.data?.statuses) {
        setTicketOptions(response.data);
      }
    } catch (error) {
      console.error("Error fetching ticket options:", error);
      toast.error("Failed to load ticket options");
    }
  };

  const fetchTickets = async (skipCache = false) => {
    try {
      setLoading(true);
      const response = await ticketsAPI.getAll(undefined, skipCache);
      const data = response.data?.data?.tickets || response.data?.tickets || [];
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to fetch tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets
    .filter((ticket) => {
      const matchesSearch = 
        ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.unit?.property?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.tenant?.englishName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const selectedStatusValue = ticketOptions.statuses.find((s:any) => s.label === selectedStatus)?.value;
      const matchesStatus = selectedStatus === "All" || ticket.status === selectedStatusValue;
      
      const selectedPriorityValue = ticketOptions.priorities.find((p:any) => p.label === selectedPriority)?.value;
      const matchesPriority = selectedPriority === "All" || ticket.priority === selectedPriorityValue;
      
      const selectedCategoryValue = ticketOptions.categories.find((c:any) => c.label === selectedCategory)?.value;
      const matchesCategory = selectedCategory === "All" || ticket.category === selectedCategoryValue;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at).getTime();
      const dateB = new Date(b.createdAt || b.created_at).getTime();
      
      switch (sortBy) {
        case "Due Date":
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "Priority":
          const priorityOrder = { urgent: 5, high: 4, medium: 3, low: 2, critical: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        case "Status":
          return a.status.localeCompare(b.status);
        case "Assignee":
           return (a.assignedUser?.username || "").localeCompare(b.assignedUser?.username || "");
        case "Property":
           return (a.unit?.property?.name || "").localeCompare(b.unit?.property?.name || "");
        default:
          return dateB - dateA;
      }
    });

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === "open").length;
  const inProgressTickets = tickets.filter(t => t.status === "in_progress").length;
  const completedTickets = tickets.filter(t => t.status === "completed" || t.status === "resolved").length;
  const overdueTickets = tickets.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed" && t.status !== "resolved").length;
  
  // Calculate average resolution time dynamically
  const resolvedTickets = tickets.filter(t => (t.status === "resolved" || t.status === "completed") && t.createdAt && t.updatedAt);
  const avgResolutionTime = resolvedTickets.length > 0
    ? (resolvedTickets.reduce((acc, t) => {
        const created = new Date(t.createdAt || t.created_at).getTime();
        const resolved = new Date(t.updatedAt || t.updated_at).getTime();
        return acc + (resolved - created);
      }, 0) / (resolvedTickets.length * 1000 * 60 * 60 * 24)).toFixed(1)
    : 0;

  const getPriorityColor = (priority: string) => {
    const priorityObj = ticketOptions.priorities.find((p:any) => p.value === priority);
    return priorityObj?.color || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusColor = (status: string) => {
    const statusObj = ticketOptions.statuses.find((s:any) => s.value === status);
    return statusObj?.color || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertCircle className="h-4 w-4" />;
      case "in_progress": return <Clock className="h-4 w-4" />;
      case "resolved": 
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "scheduled": return <Calendar className="h-4 w-4" />;
      case "cancelled": return <XCircle className="h-4 w-4" />;
      case "closed": return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleAddTicket = () => {
    setFormMode("create");
    setSelectedTicket(null);
    setShowTicketForm(true);
  };

  const handleCreateWithStatus = (status: string) => {
    setFormMode("create");
    setSelectedTicket({ status }); // Pre-set status in the data passed to form
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

  const handleTicketSubmit = async (data: any) => {
    try {
      if (formMode === "create") {
         await ticketsAPI.create(data);
         toast.success("Ticket created successfully");
      } else {
         await ticketsAPI.update(selectedTicket.id, data);
         
         // Optimistic update: Update state immediately with submitted data
         // This ensures fields like scheduledDate show correct value instantly while we fetch full details
         if (selectedTicket) {
             setSelectedTicket((prev: any) => ({ ...prev, ...data }));
         }

         // Small delay to allow DB to commit changes before reading back
         await new Promise(resolve => setTimeout(resolve, 500));

         // Fetch fresh data including all associations (property, unit, tenant, etc)
         const freshDataResponse = await ticketsAPI.getById(selectedTicket.id, true);
         const updatedTicket = freshDataResponse.data?.data || freshDataResponse.data;
         
         // Update selected ticket to reflect changes immediately in details view
         if (selectedTicket && updatedTicket) {
            setSelectedTicket(updatedTicket);
         }
         
         toast.success("Ticket updated successfully");
      }
      setShowTicketForm(false);
      // Force refresh without cache to update the list view and prevent stale data
      fetchTickets(true);
    } catch (error) {
      console.error("Error saving ticket:", error);
      toast.error("Failed to save ticket");
    }
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
          options={ticketOptions}
          onTicketClick={handleViewTicket}
          onEditTicket={handleEditTicket}
          onStatusChange={() => fetchTickets(true)}
          onCreateTicket={handleCreateWithStatus}
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
                        <p className="font-medium text-foreground">{ticket.property?.name || ticket.unit?.property?.name || "-"}</p>
                        <p className="text-sm text-muted-foreground">{ticket.unit?.unitNumber || "-"}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="font-medium text-foreground">{ticket.tenant?.englishName || ticket.tenant?.name || "-"}</p>
                        <p className="text-sm text-muted-foreground">{ticket.tenant?.primaryPhone || ticket.tenant?.phone || "-"}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="font-medium text-foreground">{ticket.assignedUser?.name || ticket.assignedUser?.username || ticket.assignee?.name || "Unassigned"}</p>
                        <p className="text-sm text-muted-foreground">{ticket.assignedUser?.role || ticket.assignee?.role || "-"}</p>
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
                        <span className="ml-1 capitalize">{(ticketOptions.statuses.find((s:any) => s.value === ticket.status)?.label) || ticket.status.replace("_", " ")}</span>
                      </Badge>
                    </td>
                    <td className="p-6">
                      <div>
                        <p className="text-sm font-medium">{ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString("en-AE") : "-"}</p>
                        <p className="text-sm text-muted-foreground">
                          {ticket.dueDate && new Date(ticket.dueDate) < new Date() && ticket.status !== "completed" ? "Overdue" : "On time"}
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
        options={ticketOptions}
      />

      {/* Ticket Details Modal */}
      {showTicketDetails && selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          isOpen={showTicketDetails}
          onClose={() => setShowTicketDetails(false)}
          onEdit={handleEditTicket}
          onRefresh={() => fetchTickets(true)}
          options={ticketOptions}
        />
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <MaintenanceAnalytics tickets={tickets} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
