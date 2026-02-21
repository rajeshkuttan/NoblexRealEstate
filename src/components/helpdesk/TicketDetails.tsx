import { useState, useEffect } from "react";
import { 
  Wrench, 
  X, 
  Edit, 
  Copy, 
  Share, 
  Download, 
 
  Send, 
  MessageSquare, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Target, 
  Award, 
  Star, 
  Heart, 
  Zap, 
  Globe, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Receipt, 
  History, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Flag, 
  Bell, 
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
  Eye, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Minus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
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
  FileText, 
  DollarSign, 
  Plus, 
  Check, 
  Info,
  Loader2
} from "lucide-react";
import { ticketsAPI } from "@/services/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TicketDetailsProps {
  ticket: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (ticket: any) => void;
}

export default function TicketDetails({ ticket, isOpen, onClose, onEdit }: TicketDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [showAddNote, setShowAddNote] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [fullTicket, setFullTicket] = useState<any>(ticket);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Use fullTicket instead of currentTicket for rendering
  const currentTicket = fullTicket || ticket;

  // Update local state when prop changes, but also fetch fresh details
  useEffect(() => {
    setFullTicket(ticket);
    const fetchDetails = async () => {
      if (ticket?.id) {
        setIsLoadingDetails(true);
        try {
          // Add a timestamp to bypass cache if needed, or rely on API
          // Use currentTicket.id? No, use prop ticket.id here to be safe
          const response = await ticketsAPI.getById(ticket.id);
          const data = response.data?.data || response.data;
          if (data) {
             setFullTicket(data);
          }
        } catch (error) {
          console.error("Failed to fetch currentTicket details:", error);
        } finally {
          setIsLoadingDetails(false);
        }
      }
    };
    if (isOpen) {
      fetchDetails();
    }
  }, [ticket, isOpen]);

  const handleDownload = async (file: any) => {
    try {
      if (typeof file === 'string') {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        window.open(`${API_URL}/uploads/${file}`, '_blank');
        return;
      }
      
      if (file.id) {
          // Import API dynamically if not available or just use global if possible. 
          // TicketDetails doesn't import documentsAPI yet.
          // Let's assume we need to import it.
          // Actually, let's use the file URL if it's a blob URL (from immediate upload), 
          // or fetch if it's from DB.
          
          if (file.url && file.url.startsWith('blob:')) {
              window.open(file.url, '_blank');
              return;
          }

          // It's a remote file requiring auth
          const { documentsAPI } = await import("@/services/api");
          const response = await documentsAPI.download(file.id);
          
          // Create blob link
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', file.name || 'download'); 
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: try opening the URL directly if it exists, maybe auth isn't needed or cookie base?
      // But we know auth IS needed.
      // toast.error("Failed to download file");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== "completed";
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      setIsSubmittingNote(true);
      // Use the imported ticketsAPI directly
      await ticketsAPI.addNote(currentTicket.id, newNote);
      // toast.success("Note added successfully");
      setNewNote("");
      setShowAddNote(false);
      
      // Refresh currentTicket data to show new note
      const res = await ticketsAPI.getById(currentTicket.id);
      if (onEdit) onEdit(res.data.data || res.data); 

    } catch (error) {
      console.error("Failed to add note:", error);
      // toast.error("Failed to add note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await ticketsAPI.update(currentTicket.id, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      
      // Refresh ticket details
      const response = await ticketsAPI.getById(currentTicket.id);
      const data = response.data?.data || response.data;
      if (data) {
        setFullTicket(data);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await ticketsAPI.update(currentTicket.id, { priority: newPriority });
      toast.success(`Priority updated to ${newPriority}`);
      
      // Refresh ticket details
      const response = await ticketsAPI.getById(currentTicket.id);
      const data = response.data?.data || response.data;
      if (data) {
        setFullTicket(data);
      }
    } catch (error) {
      console.error("Failed to update priority:", error);
      toast.error("Failed to update priority");
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    
    try {
      await ticketsAPI.deleteNote(currentTicket.id, noteId);
      toast.success("Note deleted successfully");
      
      // Refresh ticket details to update notes list
      const response = await ticketsAPI.getById(currentTicket.id);
      const data = response.data?.data || response.data;
      if (data) {
        setFullTicket(data);
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast.error("Failed to delete note");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {currentTicket.title}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {currentTicket.id} • {currentTicket.category}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(currentTicket)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-4 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Notes & Comments</h3>
              <Button onClick={() => setShowAddNote(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>

            {showAddNote && (
              <Card className="mb-4">
                <CardContent className="pt-4">
                  <Textarea
                    placeholder="Type your note here..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="mb-2"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAddNote(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleAddNote} disabled={isSubmittingNote}>
                      {isSubmittingNote ? 'Saving...' : 'Save Note'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
                {currentTicket.notes && currentTicket.notes.length > 0 ? (
                currentTicket.notes.map((note: any) => (
                    <Card key={note.id}>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                            {note.user ? (note.user.name || note.user.username || note.user.email) : 'Unknown User'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                            {new Date(note.created_at || note.createdAt).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {note.isInternal && (
                              <Badge variant="secondary" className="text-[10px]">Internal</Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                    </CardContent>
                    </Card>
                ))
                ) : (
                <div className="text-center py-8 text-muted-foreground">
                    No notes yet. Add one to start the conversation.
                </div>
                )}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ticket History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="w-0.5 h-full bg-border -mb-2" />
                    </div>
                    <div>
                      <p className="font-medium">Ticket Created</p>
                      <p className="text-sm text-muted-foreground">{new Date(currentTicket.createdAt || currentTicket.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {/* Placeholder for real history data */}
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Detailed history tracking coming soon...
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Status and Priority */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Status & Priority
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(currentTicket.status)}>
                            {getStatusIcon(currentTicket.status)}
                            <span className="ml-1 capitalize">{currentTicket.status.replace("_", " ")}</span>
                          </Badge>
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange("in_progress")}>
                            Start Work
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Priority</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getPriorityColor(currentTicket.priority)}>
                            {currentTicket.priority}
                          </Badge>
                          <Button variant="outline" size="sm" onClick={() => handlePriorityChange("high")}>
                            Escalate
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar for In Progress */}
                    {currentTicket.status === "in_progress" && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Progress</span>
                          <span>75%</span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Description */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground">{currentTicket.description}</p>

                  </CardContent>
                </Card>

                {/* Property & Tenant Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Property & Tenant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Property</Label>
                        <div className="mt-1">
                          <p className="font-medium">{currentTicket.property?.name || currentTicket.property?.title || currentTicket.unit?.property?.name || currentTicket.unit?.property?.title || "Unknown Property"}</p>
                          <p className="text-sm text-muted-foreground">{currentTicket.property?.unit || currentTicket.unit?.unitNumber || "-"}</p>
                          <p className="text-sm text-muted-foreground">{currentTicket.property?.address || currentTicket.unit?.property?.location || currentTicket.unit?.property?.address || "-"}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Tenant</Label>
                        <div className="mt-1">
                          <p className="font-medium">{currentTicket.tenant?.englishName || currentTicket.tenant?.name || "Unknown Tenant"}</p>
                          <p className="text-sm text-muted-foreground">{currentTicket.tenant?.primaryPhone || currentTicket.tenant?.phone || "-"}</p>
                          <p className="text-sm text-muted-foreground">{currentTicket.tenant?.email || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Assignee Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Assignee
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{currentTicket.assignedUser?.name || currentTicket.assignedUser?.username || currentTicket.assignee?.name || "Unassigned"}</p>
                        <p className="text-sm text-muted-foreground">{currentTicket.assignedUser?.role || currentTicket.assignee?.role || "-"}</p>
                        <p className="text-sm text-muted-foreground">{currentTicket.assignedUser?.phone || currentTicket.assignee?.phone || "-"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                        <Button variant="outline" size="sm">
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full justify-start" variant="outline">
                      <Clock className="h-4 w-4 mr-2" />
                      Update Status
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <User className="h-4 w-4 mr-2" />
                      Reassign
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Reschedule
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Update Cost
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </CardContent>
                </Card>

                {/* Key Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                      <p className="text-sm">{formatDate(currentTicket.createdAt || currentTicket.created_at)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                      <p className={cn(
                        "text-sm",
                        isOverdue(currentTicket.dueDate || currentTicket.scheduledDate, currentTicket.status) ? "text-red-600 font-medium" : ""
                      )}>
                        {formatDate(currentTicket.dueDate || currentTicket.scheduledDate)}
                        {isOverdue(currentTicket.dueDate || currentTicket.scheduledDate, currentTicket.status) && " (Overdue)"}
                      </p>
                    </div>
                    {currentTicket.completedDate && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Completed</Label>
                        <p className="text-sm">{formatDate(currentTicket.completedDate)}</p>
                      </div>
                    )}
                    {currentTicket.estimatedCost && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Estimated Cost</Label>
                        <p className="text-sm font-medium">{formatCurrency(currentTicket.estimatedCost)}</p>
                      </div>
                    )}
                    {currentTicket.actualCost && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Actual Cost</Label>
                        <p className="text-sm font-medium">{formatCurrency(currentTicket.actualCost)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tags */}
                {currentTicket.tags && currentTicket.tags.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {currentTicket.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Activity History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(currentTicket.history || []).map((activity: any, index: number) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{activity.action}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.user}</p>
                        {activity.description && (
                          <p className="text-sm mt-1">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {

                  let attachmentsList = [];
                  try {
                    if (Array.isArray(ticket.attachments)) {
                      attachmentsList = ticket.attachments;
                    } else if (typeof ticket.attachments === 'string') {
                      let parsed = JSON.parse(ticket.attachments);
                      // Handle double stringification
                      if (typeof parsed === 'string') {
                          try {
                              parsed = JSON.parse(parsed);
                          } catch (e) {
                              // keep as string if second parse fails
                          }
                      }
                      attachmentsList = Array.isArray(parsed) ? parsed : [];
                    }
                  } catch (e) {
                    attachmentsList = [];
                  }
                  
                  // Double safety check
                  if (!Array.isArray(attachmentsList)) {
                      attachmentsList = [];
                  }

                  return attachmentsList && attachmentsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {attachmentsList.map((file: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{file.name || file || "Attachment"}</p>
                            <p className="text-xs text-muted-foreground">{file.type || "File"}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleDownload(file)}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleDownload(file)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No attachments uploaded</p>
                  </div>
                );
              })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
