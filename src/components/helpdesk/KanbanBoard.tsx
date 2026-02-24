import { useState } from "react";
import { 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Copy, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  User, 
  Building2, 
  Wrench, 
  AlertTriangle, 
  Target, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
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
  Share, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Flag, 
  Bell, 
  MessageSquare, 
  Phone, 
  Mail, 
  MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  tickets: any[];
  options?: any;
  onTicketClick: (ticket: any) => void;
  onEditTicket: (ticket: any) => void;
  onStatusChange?: () => void;
  onCreateTicket?: (status: string) => void;
}

const getStatusIconComponent = (status: string) => {
  switch (status) {
    case "open": return AlertCircle;
    case "in_progress": return Clock;
    case "resolved": 
    case "completed": return CheckCircle;
    case "scheduled": return Calendar;
    case "cancelled": return XCircle;
    case "closed": return CheckCircle;
    default: return Target;
  }
};

import { ticketsAPI } from "@/services/api";
import { toast } from "sonner";

export default function KanbanBoard({ tickets, options, onTicketClick, onEditTicket, onStatusChange, onCreateTicket }: KanbanBoardProps) {
  const [draggedTicket, setDraggedTicket] = useState<any>(null);

  const statusColumns = options?.statuses?.map((s: any) => ({
    id: s.value,
    title: s.label,
    color: s.color?.split(' ')[0].replace('-100', '-500') || "bg-gray-500",
    bgColor: s.color?.split(' ')[0].replace('-100', '-50') || "bg-gray-50",
    textColor: s.color?.split(' ')[1] || "text-gray-800",
    icon: getStatusIconComponent(s.value)
  })) || [];

  const getPriorityColor = (priority: string) => {
    const priorityObj = options?.priorities?.find((p:any) => p.value === priority);
    return priorityObj?.color || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertTriangle className="h-3 w-3" />;
      case "high":
        return <TrendingUp className="h-3 w-3" />;
      case "medium":
        return <Target className="h-3 w-3" />;
      case "low":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Target className="h-3 w-3" />;
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
      month: "short",
      day: "numeric"
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== "completed";
  };

  const handleDragStart = (e: React.DragEvent, ticket: any) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTicket && draggedTicket.status !== newStatus) {
      try {
        await ticketsAPI.updateStatus(draggedTicket.id, newStatus);
        toast.success(`Ticket status updated to ${newStatus.replace('_', ' ')}`);
        if (onStatusChange) onStatusChange();
      } catch (error) {
        console.error("Failed to update status:", error);
        toast.error("Failed to update ticket status");
      }
    }
    setDraggedTicket(null);
  };

  const getTicketsByStatus = (status: string) => {
    return tickets.filter(ticket => ticket.status === status);
  };

  const getColumnStats = (status: string) => {
    const columnTickets = getTicketsByStatus(status);
    const totalCost = columnTickets.reduce((sum, ticket) => sum + (ticket.estimatedCost || 0), 0);
    const overdueCount = columnTickets.filter(ticket => isOverdue(ticket.dueDate, ticket.status)).length;
    
    return {
      count: columnTickets.length,
      totalCost,
      overdueCount
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statusColumns.map((column) => {
        const columnTickets = getTicketsByStatus(column.id);
        const stats = getColumnStats(column.id);
        const IconComponent = column.icon;

        return (
          <div key={column.id} className="space-y-4">
            {/* Column Header */}
            <Card className={cn("border-2", column.bgColor)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-3 w-3 rounded-full", column.color)} />
                    <CardTitle className={cn("text-lg font-semibold", column.textColor)}>
                      {column.title}
                    </CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      {stats.count}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onCreateTicket?.(column.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Column Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    <span>{stats.count} tickets</span>
                  </div>
                  {stats.totalCost > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{formatCurrency(stats.totalCost)}</span>
                    </div>
                  )}
                  {stats.overdueCount > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{stats.overdueCount} overdue</span>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Tickets */}
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {columnTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      isOverdue(ticket.dueDate, ticket.status) && "border-red-200 bg-red-50"
                    )}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.id)}
                    onClick={() => onTicketClick(ticket)}
                  >
                    <CardContent className="p-4">
                      {/* Ticket Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">
                            {ticket.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            {ticket.id} • {ticket.category}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => onTicketClick(ticket)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditTicket(ticket)}>
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

                      {/* Priority Badge */}
                      <div className="mb-3">
                        <Badge className={cn("text-xs", getPriorityColor(ticket.priority))}>
                          {getPriorityIcon(ticket.priority)}
                          <span className="ml-1">{ticket.priority}</span>
                        </Badge>
                      </div>

                      {/* Property & Tenant Info */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-xs">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{ticket.property?.title || ticket.unit?.property?.title || ticket.property?.name || ticket.unit?.property?.name || "Unknown Property"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{ticket.tenant?.englishName || ticket.tenant?.name || "Unknown Tenant"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{ticket.assignedUser?.name || ticket.assignedUser?.username || ticket.assignee?.name || "Unassigned"}</span>
                        </div>
                      </div>

                      {/* Due Date */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Due:</span>
                          <span className={cn(
                            "font-medium",
                            isOverdue(ticket.scheduledDate || ticket.dueDate, ticket.status) ? "text-red-600" : "text-foreground"
                          )}>
                            {formatDate(ticket.scheduledDate || ticket.dueDate)}
                          </span>
                        </div>
                        {isOverdue(ticket.scheduledDate || ticket.dueDate, ticket.status) && (
                          <Badge variant="destructive" className="text-xs">
                            Overdue
                          </Badge>
                        )}
                      </div>

                      {/* Cost */}
                      {ticket.estimatedCost && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Est. Cost:</span>
                          <span className="font-medium">{formatCurrency(ticket.estimatedCost)}</span>
                        </div>
                      )}

                      {/* Progress Bar for In Progress */}
                      {ticket.status === "in_progress" && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="text-muted-foreground">75%</span>
                          </div>
                          <Progress value={75} className="h-2" />
                        </div>
                      )}

                      {/* Tags */}
                      {ticket.tags && ticket.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {ticket.tags.slice(0, 2).map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {ticket.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{ticket.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Empty State */}
                {columnTickets.length === 0 && (
                  <Card className="border-dashed border-2 border-gray-300">
                    <CardContent className="p-8 text-center">
                      <IconComponent className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No {column.title.toLowerCase()} tickets
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
