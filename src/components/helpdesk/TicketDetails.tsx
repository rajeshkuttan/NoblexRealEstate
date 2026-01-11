import { useState } from "react";
import { 
  Wrench, 
  X, 
  Edit, 
  Copy, 
  Share, 
  Download, 
  Print, 
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
  DollarSign, 
  Plus, 
  Check, 
  Info
} from "lucide-react";
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

  const handleAddNote = () => {
    if (newNote.trim()) {
      // Here you would typically add the note to the ticket
      console.log("Adding note:", newNote);
      setNewNote("");
      setShowAddNote(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    console.log("Changing status to:", newStatus);
  };

  const handlePriorityChange = (newPriority: string) => {
    console.log("Changing priority to:", newPriority);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {ticket.title}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {ticket.id} • {ticket.category}
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
              <Button variant="outline" size="sm" onClick={() => onEdit(ticket)}>
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
                          <Badge className={getStatusColor(ticket.status)}>
                            {getStatusIcon(ticket.status)}
                            <span className="ml-1 capitalize">{ticket.status.replace("_", " ")}</span>
                          </Badge>
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange("in_progress")}>
                            Start Work
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Priority</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Button variant="outline" size="sm" onClick={() => handlePriorityChange("high")}>
                            Escalate
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar for In Progress */}
                    {ticket.status === "in_progress" && (
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
                    <p className="text-foreground">{ticket.description}</p>
                    {ticket.notes && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Additional Notes:</p>
                        <p className="text-sm text-muted-foreground">{ticket.notes}</p>
                      </div>
                    )}
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
                          <p className="font-medium">{ticket.property.name}</p>
                          <p className="text-sm text-muted-foreground">{ticket.property.unit}</p>
                          <p className="text-sm text-muted-foreground">{ticket.property.address}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Tenant</Label>
                        <div className="mt-1">
                          <p className="font-medium">{ticket.tenant.name}</p>
                          <p className="text-sm text-muted-foreground">{ticket.tenant.phone}</p>
                          <p className="text-sm text-muted-foreground">{ticket.tenant.email}</p>
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
                        <p className="font-medium">{ticket.assignee.name}</p>
                        <p className="text-sm text-muted-foreground">{ticket.assignee.role}</p>
                        <p className="text-sm text-muted-foreground">{ticket.assignee.phone}</p>
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
                      <p className="text-sm">{formatDate(ticket.createdDate)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                      <p className={cn(
                        "text-sm",
                        isOverdue(ticket.dueDate, ticket.status) ? "text-red-600 font-medium" : ""
                      )}>
                        {formatDate(ticket.dueDate)}
                        {isOverdue(ticket.dueDate, ticket.status) && " (Overdue)"}
                      </p>
                    </div>
                    {ticket.completedDate && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Completed</Label>
                        <p className="text-sm">{formatDate(ticket.completedDate)}</p>
                      </div>
                    )}
                    {ticket.estimatedCost && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Estimated Cost</Label>
                        <p className="text-sm font-medium">{formatCurrency(ticket.estimatedCost)}</p>
                      </div>
                    )}
                    {ticket.actualCost && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Actual Cost</Label>
                        <p className="text-sm font-medium">{formatCurrency(ticket.actualCost)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tags */}
                {ticket.tags && ticket.tags.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {ticket.tags.map((tag: string, index: number) => (
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
                  {ticket.history.map((activity: any, index: number) => (
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
                {ticket.attachments && ticket.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ticket.attachments.map((attachment: string, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{attachment}</p>
                            <p className="text-xs text-muted-foreground">PDF Document</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Notes & Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showAddNote ? (
                  <div className="space-y-3">
                    <Label htmlFor="newNote">Add Note</Label>
                    <Textarea
                      id="newNote"
                      placeholder="Add a note or comment..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <Button onClick={handleAddNote}>
                        <Check className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddNote(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setShowAddNote(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                )}

                <Separator />

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">System Note</p>
                      <p className="text-sm text-muted-foreground">{formatDate(ticket.createdDate)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ticket created and assigned to {ticket.assignee.name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
