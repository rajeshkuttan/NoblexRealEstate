import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  User, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Target, 
  Users, 
  FileText, 
  Star, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  Send,
  MessageSquare,
  PhoneCall,
  Video,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import LeadForm from "@/components/leads/LeadForm";
import LeadDetails from "@/components/leads/LeadDetails";
import LeadAnalytics from "@/components/leads/LeadAnalytics";
import WhatsAppIntegration from "@/components/leads/WhatsAppIntegration";
import LeadScoring from "@/components/leads/LeadScoring";
import LeadKanban from "@/components/leads/LeadKanban";
import PropertyMatcher from "@/components/leads/PropertyMatcher";
import ArabicSupport from "@/components/leads/ArabicSupport";
import { leadsAPI } from "@/services/api";

// Lead interface
interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  position?: string;
  emiratesId?: string;
  visaStatus?: string;
  nationality?: string;
  emirate?: string;
  community?: string;
  buildingType?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  budget?: number;
  furnished?: string;
  status: string;
  priority: string;
  source: string;
  leadScore: number;
  assignedTo?: number;
  assignedUser?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  complianceStatus?: string;
  kycStatus?: string;
  antiMoneyLaundering?: boolean;
  requirements?: string;
  notes?: string;
  tags?: string[];
  lastContactDate?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data (will be replaced with API calls)
const mockLeads: Lead[] = [
  {
    id: 1,
    name: "Ahmed Al Rashid",
    email: "ahmed.rashid@email.com",
    phone: "+971 50 123 4567",
    company: "Al Rashid Trading LLC",
    position: "CEO",
    source: "website",
    status: "new",
    priority: "high",
    budget: 150000,
    area: 2000,
    bedrooms: 0,
    bathrooms: 2,
    furnished: "unfurnished",
    emirate: "Dubai",
    community: "Dubai Marina",
    buildingType: "Commercial",
    emiratesId: "784-1234-1234567-1",
    visaStatus: "Resident",
    nationality: "UAE",
    requirements: "Looking for premium office space with parking for 2 vehicles",
    notes: "High priority client",
    leadScore: 85,
    assignedTo: 1,
    assignedUser: {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "+971 50 111 2222"
    },
    complianceStatus: "approved",
    kycStatus: "completed",
    antiMoneyLaundering: true,
    tags: ["Premium", "Commercial", "Dubai Marina"],
    lastContactDate: "2024-06-20",
    nextFollowUp: "2024-06-25",
    createdAt: "2024-06-15",
    updatedAt: "2024-06-20"
  },
  {
    id: 2,
    name: "Jennifer Smith",
    email: "j.smith@email.com",
    phone: "+971 52 987 6543",
    company: "Smith Consulting",
    position: "Director",
    source: "referral",
    status: "contacted",
    priority: "medium",
    budget: 85000,
    area: 1200,
    bedrooms: 2,
    bathrooms: 2,
    furnished: "furnished",
    emirate: "Dubai",
    community: "Business Bay",
    buildingType: "Residential",
    emiratesId: "784-2345-2345678-2",
    visaStatus: "Employment",
    nationality: "UK",
    requirements: "Relocating from UK, needs furnished apartment",
    notes: "Ready to move in September",
    leadScore: 65,
    assignedTo: 2,
    assignedUser: {
      id: 2,
      name: "Mike Wilson",
      email: "mike@example.com",
      phone: "+971 50 222 3333"
    },
    complianceStatus: "pending",
    kycStatus: "in_progress",
    antiMoneyLaundering: false,
    tags: ["Relocation", "Furnished", "Business Bay"],
    lastContactDate: "2024-06-18",
    nextFollowUp: "2024-06-28",
    createdAt: "2024-06-10",
    updatedAt: "2024-06-18"
  },
  {
    id: 3,
    name: "Mohammed Hassan",
    email: "m.hassan@email.com",
    phone: "+971 55 456 7890",
    company: "Hassan Group",
    position: "Managing Director",
    source: "social_media",
    status: "qualified",
    priority: "low",
    budget: 200000,
    area: 3000,
    bedrooms: 0,
    bathrooms: 3,
    furnished: "unfurnished",
    emirate: "Dubai",
    community: "Downtown Dubai",
    buildingType: "Commercial",
    emiratesId: "784-3456-3456789-3",
    visaStatus: "Investor",
    nationality: "UAE",
    requirements: "Expanding business, needs larger office space",
    notes: "Looking for long-term lease",
    leadScore: 45,
    assignedTo: 1,
    assignedUser: {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "+971 50 111 2222"
    },
    complianceStatus: "approved",
    kycStatus: "completed",
    antiMoneyLaundering: true,
    tags: ["Expansion", "Large Space", "Downtown"],
    lastContactDate: "2024-06-12",
    nextFollowUp: "2024-07-05",
    createdAt: "2024-06-05",
    updatedAt: "2024-06-12"
  }
];

// Lead statuses will be calculated dynamically based on current leads
const getLeadStatuses = (leads: Lead[]) => [
  { value: "all", label: "All Leads", count: leads.length },
  { value: "new", label: "New Leads", count: leads.filter(l => l.status === "new").length },
  { value: "contacted", label: "Contacted", count: leads.filter(l => l.status === "contacted").length },
  { value: "qualified", label: "Qualified", count: leads.filter(l => l.status === "qualified").length },
  { value: "viewing", label: "Viewing", count: leads.filter(l => l.status === "viewing").length },
  { value: "negotiation", label: "Negotiation", count: leads.filter(l => l.status === "negotiation").length },
  { value: "proposal", label: "Proposal", count: leads.filter(l => l.status === "proposal").length },
  { value: "closed_won", label: "Closed Won", count: leads.filter(l => l.status === "closed_won").length },
  { value: "closed_lost", label: "Closed Lost", count: leads.filter(l => l.status === "closed_lost").length }
];

const leadSources = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "social_media", label: "Social Media" },
  { value: "walk_in", label: "Walk In" },
  { value: "advertisement", label: "Advertisement" },
  { value: "other", label: "Other" }
];

const priorities = ["high", "medium", "low"];

// Helper function to format source for display
const formatSource = (source: string) => {
  return source
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function Leads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "kanban">("grid");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showLeadAnalytics, setShowLeadAnalytics] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showLeadScoring, setShowLeadScoring] = useState(false);
  const [showPropertyMatcher, setShowPropertyMatcher] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leads from API
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const response = await leadsAPI.getAll({
          page: 1,
          limit: 100,
          search: searchQuery,
          status: selectedStatus !== 'all' ? selectedStatus : '',
          priority: selectedPriority !== 'all' ? selectedPriority : '',
          source: selectedSource !== 'all' ? selectedSource : '',
          sortBy,
          sortOrder
        });
        
        if (response.data.success) {
          setLeads(response.data.data.leads || response.data.data);
        } else {
          setError('Failed to fetch leads');
          // Fallback to mock data
          setLeads(mockLeads);
        }
      } catch (err) {
        console.error('Error fetching leads:', err);
        setError('Failed to fetch leads');
        // Fallback to mock data
        setLeads(mockLeads);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [searchQuery, selectedStatus, selectedPriority, selectedSource, sortBy, sortOrder]);

  // Get lead statuses dynamically
  const leadStatuses = getLeadStatuses(leads);

  // Filter and sort leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (lead.company && lead.company.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === "all" || lead.status === selectedStatus;
    const matchesSource = selectedSource === "all" || lead.source === selectedSource;
    const matchesPriority = selectedPriority === "all" || lead.priority === selectedPriority;
    
    return matchesSearch && matchesStatus && matchesSource && matchesPriority;
  }).sort((a, b) => {
    // Map sortBy field to Lead interface field
    const fieldMap: Record<string, keyof Lead> = {
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'name': 'name',
      'lead_score': 'leadScore',
      'priority': 'priority',
      'status': 'status'
    };
    
    const fieldName = fieldMap[sortBy] || 'createdAt';
    const aValue = a[fieldName];
    const bValue = b[fieldName];
    
    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800 border-blue-200";
      case "contacted": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "qualified": return "bg-green-100 text-green-800 border-green-200";
      case "viewing": return "bg-purple-100 text-purple-800 border-purple-200";
      case "negotiation": return "bg-orange-100 text-orange-800 border-orange-200";
      case "proposal": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "closed_won": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "closed_lost": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewLead = (lead: any) => {
    setSelectedLead(lead);
    setShowLeadDetails(true);
  };

  const handleEditLead = (lead: any) => {
    setSelectedLead(lead);
    setShowLeadForm(true);
  };

  const handleAddLead = () => {
    setSelectedLead(null);
    setShowLeadForm(true);
  };

  const handleLeadSubmit = async (leadData: any) => {
    try {
      if (selectedLead) {
        // Update existing lead
        const response = await leadsAPI.update(selectedLead.id, leadData);
        if (response.data.success) {
          setLeads(leads.map(lead => lead.id === selectedLead.id ? response.data.data.lead : lead));
        }
      } else {
        // Create new lead
        const response = await leadsAPI.create(leadData);
        if (response.data.success) {
          setLeads([response.data.data.lead, ...leads]);
        }
      }
      setShowLeadForm(false);
      setSelectedLead(null);
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  };

  const handleViewAnalytics = () => {
    setShowLeadAnalytics(true);
  };

  const handleWhatsApp = (lead: any) => {
    setSelectedLead(lead);
    setShowWhatsApp(true);
  };

  const handleLeadScoring = (lead: any) => {
    setSelectedLead(lead);
    setShowLeadScoring(true);
  };

  const handlePropertyMatcher = (lead: any) => {
    setSelectedLead(lead);
    setShowPropertyMatcher(true);
  };

  const handleLeadUpdate = (leadId: number, updates: any) => {
    console.log("Lead updated:", leadId, updates);
    // In a real app, this would update the lead in the database
  };

  const handleLeadDelete = (leadId: number) => {
    console.log("Lead deleted:", leadId);
    // In a real app, this would delete the lead from the database
  };

  return (
    <ArabicSupport currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lead Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track your sales pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleViewAnalytics}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={handleAddLead} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-withu flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600">+12% this month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
                <p className="text-2xl font-bold text-red-600">
                  {leads.filter(l => l.status === "hot").length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <Target className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">High priority prospects</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-600">24%</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600">+3% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Lead Score</p>
                <p className="text-2xl font-bold">
                  {leads.length > 0 ? Math.round(leads.reduce((sum, lead) => sum + lead.leadScore, 0) / leads.length) : 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">Quality score out of 100</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {leadStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label} ({status.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {leadSources.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="updated_at">Updated Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="lead_score">Lead Score</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>

              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Building2 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                  className="rounded-l-none"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Loading leads...</h3>
            <p className="text-muted-foreground">Please wait while we fetch your leads</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error loading leads</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Leads Display */}
      {!loading && !error && viewMode === "kanban" ? (
        <LeadKanban
          leads={filteredLeads}
          onLeadUpdate={handleLeadUpdate}
          onLeadDelete={handleLeadDelete}
        />
      ) : !loading && !error && viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-withu flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{lead.name}</h3>
                      <p className="text-sm text-muted-foreground">{lead.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.community || lead.emirate || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-semibold">AED {lead.budget?.toLocaleString() || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lead Score</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">{lead.leadScore}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge className={getPriorityColor(lead.priority)}>
                    {lead.priority} priority
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Last contact: {lead.lastContactDate ? new Date(lead.lastContactDate).toLocaleDateString() : 'Never'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewLead(lead)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditLead(lead)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleWhatsApp(lead)}
                    className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    WhatsApp
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleLeadScoring(lead)}
                    className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Score
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePropertyMatcher(lead)}
                    className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Match
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4 font-medium">Lead</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Source</th>
                    <th className="text-left p-4 font-medium">Budget</th>
                    <th className="text-left p-4 font-medium">Score</th>
                    <th className="text-left p-4 font-medium">Last Contact</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-withu flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-muted-foreground">{lead.company}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{formatSource(lead.source)}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium">AED {lead.budget?.toLocaleString() || 'N/A'}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{lead.leadScore}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{lead.lastContactDate ? new Date(lead.lastContactDate).toLocaleDateString() : 'N/A'}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewLead(lead)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditLead(lead)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {filteredLeads.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leads found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or add a new lead.
            </p>
            <Button onClick={handleAddLead} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <LeadForm
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        onSubmit={handleLeadSubmit}
        initialData={selectedLead}
        mode={selectedLead ? "edit" : "create"}
      />

      <LeadDetails
        lead={selectedLead}
        isOpen={showLeadDetails}
        onClose={() => setShowLeadDetails(false)}
        onEdit={handleEditLead}
        onDelete={(lead) => console.log("Delete lead:", lead)}
      />

      <LeadAnalytics
        isOpen={showLeadAnalytics}
        onClose={() => setShowLeadAnalytics(false)}
        leads={leads}
      />

      <WhatsAppIntegration
        lead={selectedLead}
        isOpen={showWhatsApp}
        onClose={() => setShowWhatsApp(false)}
      />

      <LeadScoring
        lead={selectedLead}
        isOpen={showLeadScoring}
        onClose={() => setShowLeadScoring(false)}
      />

      <PropertyMatcher
        lead={selectedLead}
        isOpen={showPropertyMatcher}
        onClose={() => setShowPropertyMatcher(false)}
      />
      </div>
    </ArabicSupport>
  );
}
