import { useState } from "react";
import { 
  Plus, 
  MoreHorizontal, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Star, 
  Clock, 
  Calendar,
  MessageSquare,
  Target,
  TrendingUp,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  XCircle,
  Building2,
  FileText,
  BarChart3,
  GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import LeadForm from "./LeadForm";
import LeadDetails from "./LeadDetails";
import WhatsAppIntegration from "./WhatsAppIntegration";
import LeadScoring from "./LeadScoring";

interface LeadKanbanProps {
  leads: any[];
  onLeadUpdate: (leadId: number, updates: any) => void;
  onLeadDelete: (leadId: number) => void;
}

// Lead pipeline stages for UAE real estate
const pipelineStages = [
  {
    id: "new",
    title: "New Leads",
    description: "Fresh inquiries and prospects",
    color: "bg-blue-50 border-blue-200",
    textColor: "text-blue-800",
    icon: User,
    limit: 20
  },
  {
    id: "contacted",
    title: "Contacted",
    description: "Initial contact made",
    color: "bg-yellow-50 border-yellow-200",
    textColor: "text-yellow-800",
    icon: Phone,
    limit: 15
  },
  {
    id: "qualified",
    title: "Qualified",
    description: "Requirements confirmed",
    color: "bg-orange-50 border-orange-200",
    textColor: "text-orange-800",
    icon: Target,
    limit: 12
  },
  {
    id: "viewing",
    title: "Property Viewing",
    description: "Scheduled or completed",
    color: "bg-purple-50 border-purple-200",
    textColor: "text-purple-800",
    icon: Building2,
    limit: 10
  },
  {
    id: "negotiation",
    title: "Negotiation",
    description: "Price and terms discussion",
    color: "bg-indigo-50 border-indigo-200",
    textColor: "text-indigo-800",
    icon: DollarSign,
    limit: 8
  },
  {
    id: "proposal",
    title: "Proposal Sent",
    description: "Formal offer submitted",
    color: "bg-green-50 border-green-200",
    textColor: "text-green-800",
    icon: FileText,
    limit: 6
  },
  {
    id: "closed_won",
    title: "Closed Won",
    description: "Deal completed",
    color: "bg-emerald-50 border-emerald-200",
    textColor: "text-emerald-800",
    icon: CheckCircle,
    limit: 5
  },
  {
    id: "closed_lost",
    title: "Closed Lost",
    description: "Deal lost",
    color: "bg-red-50 border-red-200",
    textColor: "text-red-800",
    icon: XCircle,
    limit: 5
  }
];

export default function LeadKanban({ leads, onLeadUpdate, onLeadDelete }: LeadKanbanProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showLeadScoring, setShowLeadScoring] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [draggedLead, setDraggedLead] = useState<any>(null);

  // Filter leads based on search and filters
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = selectedStage === "all" || lead.status === selectedStage;
    const matchesAgent = selectedAgent === "all" || lead.assignedTo === selectedAgent;
    
    return matchesSearch && matchesStage && matchesAgent;
  });

  // Enhanced status to stage mapping
  const statusToStage: { [key: string]: string } = {
    "cold": "new",
    "warm": "contacted", 
    "hot": "qualified",
    "viewing": "viewing",
    "negotiation": "negotiation",
    "proposal": "proposal",
    "converted": "closed_won",
    "lost": "closed_lost"
  };

  const stageToStatus: { [key: string]: string } = {
    "new": "cold",
    "contacted": "warm",
    "qualified": "hot",
    "viewing": "viewing",
    "negotiation": "negotiation",
    "proposal": "proposal",
    "closed_won": "converted",
    "closed_lost": "lost"
  };

  // Group leads by pipeline stage
  const leadsByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage.id] = filteredLeads.filter(lead => {
      return statusToStage[lead.status] === stage.id;
    });
    return acc;
  }, {} as { [key: string]: any[] });

  const handleDragStart = (e: React.DragEvent, lead: any) => {
    e.stopPropagation();
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", lead.id.toString());
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedLead(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedLead) {
      const newStatus = stageToStatus[targetStage];
      if (newStatus && newStatus !== draggedLead.status) {
        onLeadUpdate(draggedLead.id, { status: newStatus });
      }
    }
    setDraggedLead(null);
  };

  const handleMoveToNextStage = (lead: any) => {
    const currentStageId = statusToStage[lead.status];
    const currentIndex = pipelineStages.findIndex(s => s.id === currentStageId);
    
    if (currentIndex < pipelineStages.length - 2) { // Exclude closed_lost as next stage
      const nextStage = pipelineStages[currentIndex + 1];
      const nextStatus = stageToStatus[nextStage.id];
      if (nextStatus) {
        onLeadUpdate(lead.id, { status: nextStatus });
      }
    }
  };

  const handleChangeStage = (lead: any, newStageId: string) => {
    const newStatus = stageToStatus[newStageId];
    if (newStatus && newStatus !== lead.status) {
      onLeadUpdate(lead.id, { status: newStatus });
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

  const handleWhatsApp = (lead: any) => {
    setSelectedLead(lead);
    setShowWhatsApp(true);
  };

  const handleLeadScoring = (lead: any) => {
    setSelectedLead(lead);
    setShowLeadScoring(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot": return "bg-red-100 text-red-800 border-red-200";
      case "warm": return "bg-orange-100 text-orange-800 border-orange-200";
      case "cold": return "bg-blue-100 text-blue-800 border-blue-200";
      case "converted": return "bg-green-100 text-green-800 border-green-200";
      case "lost": return "bg-gray-100 text-gray-800 border-gray-200";
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

  const getStageStats = () => {
    const total = leads.length;
    const won = leads.filter(l => l.status === "converted").length;
    const lost = leads.filter(l => l.status === "lost").length;
    const active = total - won - lost;
    const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
    
    return { total, won, lost, active, conversionRate };
  };

  const stats = getStageStats();

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lead Pipeline</h1>
          <p className="text-muted-foreground mt-1">Visual lead management with drag & drop</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowLeadForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-withu flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Leads</p>
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won Deals</p>
                <p className="text-2xl font-bold text-green-600">{stats.won}</p>
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
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-600">{stats.conversionRate}%</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {pipelineStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                  <SelectItem value="Mike Wilson">Mike Wilson</SelectItem>
                  <SelectItem value="Ahmed Hassan">Ahmed Hassan</SelectItem>
                  <SelectItem value="Fatima Al Mansoori">Fatima Al Mansoori</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-6">
        {pipelineStages.map((stage) => {
          const stageLeads = leadsByStage[stage.id] || [];
          const isOverLimit = stageLeads.length > stage.limit;
          const isDropTarget = draggedLead && statusToStage[draggedLead.status] !== stage.id;
          
          return (
            <div
              key={stage.id}
              className={cn(
                "flex-shrink-0 w-80 transition-all",
                isDropTarget && "ring-2 ring-primary ring-opacity-50"
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <Card className={cn("h-full", stage.color, isOverLimit && "border-red-300")}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <stage.icon className={cn("h-5 w-5", stage.textColor)} />
                      <CardTitle className={cn("text-lg", stage.textColor)}>
                        {stage.title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={stage.textColor}>
                        {stageLeads.length}
                      </Badge>
                      {isOverLimit && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stage.description}
                  </p>
                </CardHeader>
                
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px] px-4">
                    <div className="space-y-3 pb-4">
                      {stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow relative group"
                        >
                          <div className="space-y-3 p-4">
                            {/* Lead Header with Drag Handle */}
                            <div className="flex items-start gap-2">
                              {/* Drag Handle */}
                              <div
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, lead)}
                                onDragEnd={handleDragEnd}
                                className="cursor-grab active:cursor-grabbing pt-1 opacity-30 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                title="Drag to move"
                              >
                                <GripVertical className="h-5 w-5 text-muted-foreground hover:text-primary" />
                              </div>
                              
                              <div className="flex items-start justify-between flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-gradient-withu flex items-center justify-center">
                                    <User className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">{lead.name}</h4>
                                    <p className="text-xs text-muted-foreground">{lead.company}</p>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewLead(lead)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditLead(lead)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Lead
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleWhatsApp(lead)}>
                                      <MessageSquare className="h-4 w-4 mr-2" />
                                      WhatsApp
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleLeadScoring(lead)}>
                                      <Star className="h-4 w-4 mr-2" />
                                      Update Score
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => onLeadDelete(lead.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Lead
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {/* Lead Info */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{lead.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{lead.preferredLocation}</span>
                              </div>
                            </div>

                            {/* Budget and Score */}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Budget</p>
                                <p className="font-semibold text-sm">AED {lead.budget.toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span className="text-sm font-semibold">{lead.leadScore}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Score</p>
                              </div>
                            </div>

                            {/* Status and Priority */}
                            <div className="flex items-center justify-between">
                              <Badge className={getStatusColor(lead.status)}>
                                {lead.status}
                              </Badge>
                              <Badge className={getPriorityColor(lead.priority)}>
                                {lead.priority}
                              </Badge>
                            </div>

                            {/* Stage Change Selector */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">Change Stage:</label>
                              <Select 
                                value={statusToStage[lead.status]} 
                                onValueChange={(newStageId) => handleChangeStage(lead, newStageId)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {pipelineStages.map((stage) => (
                                    <SelectItem key={stage.id} value={stage.id}>
                                      {stage.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Actions */}
                            {statusToStage[lead.status] !== "closed_won" && statusToStage[lead.status] !== "closed_lost" && (
                              <Button 
                                size="sm" 
                                className="w-full bg-gradient-withu text-white"
                                onClick={() => handleMoveToNextStage(lead)}
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Move to Next Stage
                              </Button>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleViewLead(lead)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleWhatsApp(lead)}
                                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                WhatsApp
                              </Button>
                            </div>

                            {/* Timeline */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Last contact: {new Date(lead.lastContact).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <LeadForm
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        onSubmit={(data) => {
          console.log("Lead submitted:", data);
          setShowLeadForm(false);
        }}
        initialData={selectedLead}
        mode={selectedLead ? "edit" : "create"}
      />

      <LeadDetails
        lead={selectedLead}
        isOpen={showLeadDetails}
        onClose={() => setShowLeadDetails(false)}
        onEdit={handleEditLead}
        onDelete={(lead) => onLeadDelete(lead.id)}
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
    </div>
  );
}

