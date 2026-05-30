import { useState, useEffect, useMemo } from "react";
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
import { ticketsAPI, usersAPI } from "@/services/api";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/use-confirm";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { useAuth } from "@/contexts/AuthContext";

interface TicketDetailsProps {
  ticket: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (ticket: any) => void;
  onRefresh?: () => void;
  options?: any;
}

const normalizeOption = (option: any) => ({
  value: String(option?.value ?? option?.id ?? option ?? ""),
  label: String(option?.label ?? option?.name ?? option?.title ?? option?.value ?? option ?? ""),
  color: option?.color,
});

export default function TicketDetails({ ticket, isOpen, onClose, onEdit, onRefresh, options }: TicketDetailsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const normalizedStatuses = (options?.statuses || []).map(normalizeOption);
  const normalizedPriorities = (options?.priorities || []).map(normalizeOption);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [showAddNote, setShowAddNote] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [fullTicket, setFullTicket] = useState<any>(ticket);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [quickAction, setQuickAction] = useState<null | "status" | "reassign" | "reschedule" | "cost">(null);
  const [quickActionValue, setQuickActionValue] = useState("");
  const [isSavingQuickAction, setIsSavingQuickAction] = useState(false);
  const { confirm, isOpen: isConfirmOpen, options: confirmOptions, onConfirm, onCancel } = useConfirm();

  // Use fullTicket instead of currentTicket for rendering
  const currentTicket = fullTicket || ticket;
  const attachmentList = useMemo(() => {
    try {
      if (Array.isArray(currentTicket?.attachments)) return currentTicket.attachments;
      if (typeof currentTicket?.attachments === "string") {
        let parsed = JSON.parse(currentTicket.attachments);
        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error("Failed to parse ticket attachments:", error);
    }
    return [];
  }, [currentTicket?.attachments]);
  const assigneePhone =
    currentTicket?.assignedUser?.mobile ||
    currentTicket?.assignedUser?.phone ||
    currentTicket?.assignee?.mobile ||
    currentTicket?.assignee?.phone ||
    "";
  const timelineEvents = useMemo(() => {
    const events: Array<{ id: string; title: string; description?: string; timestamp: string }> = [];
    const createdAt = currentTicket?.createdAt || currentTicket?.created_at;
    const updatedAt = currentTicket?.updatedAt || currentTicket?.updated_at;
    if (createdAt) {
      events.push({
        id: "created",
        title: "Ticket created",
        description: `Ticket ${currentTicket.ticketNumber || currentTicket.id} was created for ${currentTicket.title}.`,
        timestamp: createdAt,
      });
    }
    if (currentTicket?.property?.name || currentTicket?.property?.title || currentTicket?.unit?.property?.name || currentTicket?.unit?.property?.title) {
      events.push({
        id: "property",
        title: "Property assigned",
        description: currentTicket.property?.name || currentTicket.property?.title || currentTicket.unit?.property?.name || currentTicket.unit?.property?.title,
        timestamp: createdAt || updatedAt,
      });
    }
    if (currentTicket?.unit?.unitNumber) {
      events.push({
        id: "unit",
        title: "Unit linked",
        description: `Unit ${currentTicket.unit.unitNumber}`,
        timestamp: createdAt || updatedAt,
      });
    }
    if (currentTicket?.tenant?.englishName || currentTicket?.tenant?.name) {
      events.push({
        id: "tenant",
        title: "Tenant linked",
        description: currentTicket.tenant?.englishName || currentTicket.tenant?.name,
        timestamp: createdAt || updatedAt,
      });
    }
    if (currentTicket?.assignedUser?.name || currentTicket?.assignedUser?.username) {
      events.push({
        id: "assignee",
        title: "Assigned to staff",
        description: currentTicket.assignedUser?.name || currentTicket.assignedUser?.username,
        timestamp: createdAt || updatedAt,
      });
    }
    if (currentTicket?.scheduledDate || currentTicket?.dueDate) {
      const targetDate = currentTicket.scheduledDate || currentTicket.dueDate;
      events.push({
        id: "scheduled",
        title: "Scheduled / due date set",
        description: `Target date ${new Date(targetDate).toLocaleDateString("en-AE")}`,
        timestamp: targetDate,
      });
    }
    if (attachmentList.length > 0) {
      events.push({
        id: "attachments",
        title: "Attachments added",
        description: `${attachmentList.length} attachment${attachmentList.length > 1 ? "s" : ""} linked to this ticket.`,
        timestamp: updatedAt || createdAt,
      });
    }
    (currentTicket?.notes || []).forEach((note: any) => {
      events.push({
        id: `note-${note.id}`,
        title: note.isInternal ? "Internal note added" : "Note added",
        description: note.note,
        timestamp: note.created_at || note.createdAt,
      });
    });
    if (currentTicket?.completedDate) {
      events.push({
        id: "completed",
        title: "Ticket completed",
        description: currentTicket.resolution || "Ticket marked as completed.",
        timestamp: currentTicket.completedDate,
      });
    } else if (["resolved", "closed", "completed"].includes(currentTicket?.status)) {
      events.push({
        id: "closed",
        title: `Ticket ${currentTicket.status}`,
        description: currentTicket.resolution || "Ticket was brought to a closed state.",
        timestamp: updatedAt || createdAt,
      });
    }
    if (updatedAt && updatedAt !== createdAt) {
      events.push({
        id: "updated",
        title: "Ticket updated",
        description: `Current status: ${currentTicket.status?.replace("_", " ") || "updated"}`,
        timestamp: updatedAt,
      });
    }
    return events
      .filter((event) => event.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [attachmentList, currentTicket]);

  // Update local state when prop changes, but also fetch fresh details
  useEffect(() => {
    setFullTicket(ticket);
    const fetchDetails = async () => {
      if (ticket?.id) {
        setIsLoadingDetails(true);
        try {
          // Add a timestamp to bypass cache if needed, or rely on API
          // Use currentTicket.id? No, use prop ticket.id here to be safe
          // Pass true to skip cache and get fresh details after a likely mutation or when opening
          const response = await ticketsAPI.getById(ticket.id, true);
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

  useEffect(() => {
    const fetchAssignees = async () => {
      try {
        const response = await usersAPI.getAll();
        const users = response.data?.data?.users || response.data?.users || [];
        setAssignees(Array.isArray(users) ? users : []);
      } catch (error) {
        console.error("Failed to load assignees:", error);
        setAssignees([]);
      }
    };

    if (isOpen) {
      fetchAssignees();
    }
  }, [isOpen]);

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
    const priorityObj = options?.priorities?.find((p:any) => p.value === priority);
    return priorityObj?.color || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusColor = (status: string) => {
    const statusObj = options?.statuses?.find((s:any) => s.value === status);
    return statusObj?.color || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertCircle className="h-4 w-4" />;
      case "in_progress": return <Clock className="h-4 w-4" />;
      case "resolved": 
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "scheduled": return <Calendar className="h-4 w-4" />;
      case "closed": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
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
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (!dueDate) return false;
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
      
      // Refresh currentTicket data to show new note - skip cache!
      const res = await ticketsAPI.getById(currentTicket.id, true);
      const updatedTicket = res.data.data || res.data;
      if (updatedTicket) {
        setFullTicket(updatedTicket);
      }
      if (onRefresh) onRefresh();

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
      const response = await ticketsAPI.getById(currentTicket.id, true);
      const data = response.data?.data || response.data;
      if (data) {
        setFullTicket(data);
      }
      if (onRefresh) onRefresh();
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
      const response = await ticketsAPI.getById(currentTicket.id, true);
      const data = response.data?.data || response.data;
      if (data) {
        setFullTicket(data);
      }
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to update priority:", error);
      toast.error("Failed to update priority");
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    const confirmed = await confirm({
      title: "Delete Note",
      description: "Are you sure you want to delete this note? This action cannot be undone.",
      variant: "destructive",
      confirmText: "Delete",
      cancelText: "Cancel"
    });

    if (!confirmed) return;
    
    try {
      await ticketsAPI.deleteNote(currentTicket.id, noteId);
      toast.success("Note deleted successfully");
      
      // Refresh ticket details to update notes list - skip cache!
      const response = await ticketsAPI.getById(currentTicket.id, true);
      const data = response.data?.data || response.data;
      if (data) {
        setFullTicket(data);
      }
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast.error("Failed to delete note");
    }
  };

  const refreshCurrentTicket = async () => {
    const response = await ticketsAPI.getById(currentTicket.id, true);
    const data = response.data?.data || response.data;
    if (data) {
      setFullTicket(data);
      if (onRefresh) onRefresh();
    }
    return data;
  };

  const handleMessageAssignee = () => {
    const normalizedPhone = String(assigneePhone || "").replace(/\D/g, "");
    if (!normalizedPhone) {
      toast.error("No assignee mobile number available");
      return;
    }
    window.open(`https://web.whatsapp.com/send?phone=${normalizedPhone}`, "_blank", "noopener,noreferrer");
  };

  const handleOpenCallDialog = () => {
    if (!assigneePhone) {
      toast.error("No assignee mobile number available");
      return;
    }
    setShowCallDialog(true);
  };

  const openQuickAction = (action: "status" | "reassign" | "reschedule" | "cost") => {
    setQuickAction(action);
    if (action === "status") setQuickActionValue(currentTicket.status || "open");
    if (action === "reassign") setQuickActionValue(String(currentTicket.assignedTo || currentTicket.assignedUser?.id || ""));
    if (action === "reschedule") setQuickActionValue(String(currentTicket.scheduledDate || currentTicket.dueDate || "").slice(0, 10));
    if (action === "cost") setQuickActionValue(String(currentTicket.estimatedCost || ""));
  };

  const handleSaveQuickAction = async () => {
    if (!quickAction) return;
    try {
      setIsSavingQuickAction(true);
      if (quickAction === "status") {
        await ticketsAPI.update(currentTicket.id, { status: quickActionValue });
      }
      if (quickAction === "reassign") {
        await ticketsAPI.update(currentTicket.id, { assignedTo: quickActionValue || null });
      }
      if (quickAction === "reschedule") {
        await ticketsAPI.update(currentTicket.id, { scheduledDate: quickActionValue });
      }
      if (quickAction === "cost") {
        await ticketsAPI.update(currentTicket.id, { estimatedCost: Number(quickActionValue || 0) });
      }
      await refreshCurrentTicket();
      toast.success("Ticket updated successfully");
      setQuickAction(null);
    } catch (error) {
      console.error("Quick action failed:", error);
      toast.error("Failed to update ticket");
    } finally {
      setIsSavingQuickAction(false);
    }
  };

  const handleDuplicateTicket = async () => {
    try {
      const payload = {
        title: `${currentTicket.title} (Copy)`,
        description: currentTicket.description,
        priority: currentTicket.priority,
        category: currentTicket.category,
        propertyId: currentTicket.propertyId || currentTicket.property?.id || currentTicket.unit?.propertyId || currentTicket.unit?.property?.id || null,
        unitId: currentTicket.unitId || currentTicket.unit?.id || null,
        tenantId: currentTicket.tenantId || currentTicket.tenant?.id || null,
        assignedTo: currentTicket.assignedTo || currentTicket.assignedUser?.id || null,
        vendorId: currentTicket.vendorId || currentTicket.vendor?.id || null,
        scheduledDate: currentTicket.scheduledDate || currentTicket.dueDate || null,
        estimatedCost: currentTicket.estimatedCost || 0,
        actualCost: currentTicket.actualCost || null,
        contactPhone: currentTicket.contactPhone || currentTicket.tenant?.primaryPhone || currentTicket.tenant?.phone || null,
        contactEmail: currentTicket.contactEmail || currentTicket.tenant?.email || null,
        reportedBy: String(user?.id || currentTicket.reportedBy || currentTicket.assignedTo || ""),
        status: "open",
        attachments: attachmentList,
      };
      if (!payload.reportedBy) {
        toast.error("Unable to duplicate ticket because no reporter is available");
        return;
      }
      await ticketsAPI.create(payload);
      toast.success("Ticket duplicated successfully");
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to duplicate ticket:", error);
      toast.error("Failed to duplicate ticket");
    }
  };

  const handleShareTicket = async () => {
    const shareText = [
      `Ticket: ${currentTicket.ticketNumber || currentTicket.id}`,
      `Title: ${currentTicket.title}`,
      `Status: ${currentTicket.status}`,
      `Property: ${currentTicket.property?.name || currentTicket.property?.title || currentTicket.unit?.property?.name || currentTicket.unit?.property?.title || "-"}`,
      `Due: ${currentTicket.scheduledDate || currentTicket.dueDate ? formatDate(currentTicket.scheduledDate || currentTicket.dueDate) : "-"}`,
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: currentTicket.title, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success("Ticket summary copied to clipboard");
      }
    } catch (error) {
      console.error("Failed to share ticket:", error);
      toast.error("Failed to share ticket");
    }
  };

  const handleExportTicket = () => {
    const exportText = [
      `Ticket Number: ${currentTicket.ticketNumber || currentTicket.id}`,
      `Title: ${currentTicket.title}`,
      `Description: ${currentTicket.description}`,
      `Status: ${currentTicket.status}`,
      `Priority: ${currentTicket.priority}`,
      `Category: ${currentTicket.category}`,
      `Property: ${currentTicket.property?.name || currentTicket.property?.title || currentTicket.unit?.property?.name || currentTicket.unit?.property?.title || "-"}`,
      `Unit: ${currentTicket.unit?.unitNumber || "-"}`,
      `Tenant: ${currentTicket.tenant?.englishName || currentTicket.tenant?.name || "-"}`,
      `Assignee: ${currentTicket.assignedUser?.name || currentTicket.assignedUser?.username || "-"}`,
      `Due Date: ${currentTicket.scheduledDate || currentTicket.dueDate || "-"}`,
      `Estimated Cost: ${currentTicket.estimatedCost || 0}`,
    ].join("\n");

    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentTicket.ticketNumber || `ticket-${currentTicket.id}`}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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
              <Button variant="outline" size="sm" onClick={handleDuplicateTicket}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareTicket}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportTicket}>
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
                            <span className="ml-1 capitalize">{options?.statuses?.find((s:any) => s.value === currentTicket.status)?.label || currentTicket.status.replace("_", " ")}</span>
                          </Badge>
                          <div className="w-[140px]">
                            <SearchableSelect
                              value={currentTicket.status}
                              onValueChange={handleStatusChange}
                              placeholder="Update Status"
                              searchPlaceholder="Search statuses..."
                              emptyMessage="No status found"
                              className="h-8 text-xs"
                              options={normalizedStatuses}
                              renderSelectedOption={(option) => (
                                <Badge className={normalizedStatuses.find((item: any) => item.value === option.value)?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
                                  {option.label}
                                </Badge>
                              )}
                              renderOption={(option) => (
                                <Badge className={normalizedStatuses.find((item: any) => item.value === option.value)?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
                                  {option.label}
                                </Badge>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Priority</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getPriorityColor(currentTicket.priority)}>
                            {options?.priorities?.find((p:any) => p.value === currentTicket.priority)?.label || currentTicket.priority}
                          </Badge>
                          <div className="w-[140px]">
                            <SearchableSelect
                              value={currentTicket.priority}
                              onValueChange={handlePriorityChange}
                              placeholder="Update Priority"
                              searchPlaceholder="Search priorities..."
                              emptyMessage="No priority found"
                              className="h-8 text-xs"
                              options={normalizedPriorities}
                              renderSelectedOption={(option) => (
                                <Badge className={normalizedPriorities.find((item: any) => item.value === option.value)?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
                                  {option.label}
                                </Badge>
                              )}
                              renderOption={(option) => (
                                <Badge className={normalizedPriorities.find((item: any) => item.value === option.value)?.color || "bg-gray-100 text-gray-800 border-gray-200"}>
                                  {option.label}
                                </Badge>
                              )}
                            />
                          </div>
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
                        <Button variant="outline" size="sm" onClick={handleMessageAssignee}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleOpenCallDialog}>
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
                    <Button className="w-full justify-start" variant="outline" onClick={() => openQuickAction("status")}>
                      <Clock className="h-4 w-4 mr-2" />
                      Update Status
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => openQuickAction("reassign")}>
                      <User className="h-4 w-4 mr-2" />
                      Reassign
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => openQuickAction("reschedule")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Reschedule
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => openQuickAction("cost")}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Update Cost
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => {
                      setActiveTab("notes");
                      setShowAddNote(true);
                    }}>
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
                  {timelineEvents.length > 0 ? timelineEvents.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                        {activity.description && (
                          <p className="text-sm mt-1">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No activity has been recorded for this ticket yet.
                    </div>
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
                  <FileText className="h-5 w-5" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {

                  return attachmentList && attachmentList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {attachmentList.map((file: any, index: number) => (
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
      <Dialog open={!!quickAction} onOpenChange={(open) => !open && setQuickAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quickAction === "status" && "Update Status"}
              {quickAction === "reassign" && "Reassign Ticket"}
              {quickAction === "reschedule" && "Reschedule Ticket"}
              {quickAction === "cost" && "Update Estimated Cost"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {quickAction === "status" && (
              <SearchableSelect
                value={quickActionValue}
                onValueChange={setQuickActionValue}
                placeholder="Select status"
                searchPlaceholder="Search statuses..."
                emptyMessage="No status found"
                options={normalizedStatuses}
              />
            )}
            {quickAction === "reassign" && (
              <SearchableSelect
                value={quickActionValue}
                onValueChange={setQuickActionValue}
                placeholder="Select assignee"
                searchPlaceholder="Search assignees..."
                emptyMessage="No assignee found"
                options={assignees.map((assignee) => ({
                  value: String(assignee.id || assignee._id),
                  label: assignee.name || assignee.username || "Unknown User",
                  description: assignee.mobile || assignee.phone || assignee.role || "",
                }))}
              />
            )}
            {quickAction === "reschedule" && (
              <Input type="date" value={quickActionValue} onChange={(e) => setQuickActionValue(e.target.value)} />
            )}
            {quickAction === "cost" && (
              <Input type="number" min="0" value={quickActionValue} onChange={(e) => setQuickActionValue(e.target.value)} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setQuickAction(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveQuickAction} disabled={isSavingQuickAction}>
                {isSavingQuickAction ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Call Assignee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Calling service is not available at the moment.</p>
            <div>
              <Label>Assigned employee mobile number</Label>
              <p className="mt-1 font-medium">{assigneePhone || "-"}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowCallDialog(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog 
        isOpen={isConfirmOpen}
        onClose={onCancel}
        onConfirm={onConfirm}
        title={confirmOptions?.title || ""}
        description={confirmOptions?.description || ""}
        confirmText={confirmOptions?.confirmText}
        cancelText={confirmOptions?.cancelText}
        variant={confirmOptions?.variant}
      />
    </Dialog>
  );
}
