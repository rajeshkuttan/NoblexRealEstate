import { useState } from "react";
import { 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Calendar, 
  Mail, 
  Settings, 
  Download, 
  Eye, 
  MoreHorizontal, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Zap, 
  Target, 
  Award, 
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
  CreditCard, 
  Banknote, 
  Wallet, 
  Receipt, 
  History, 
  Copy, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Flag, 
  Bell, 
  MessageSquare, 
  Phone, 
  MapPin, 
  Activity, 
  Check, 
  Minus, 
  X, 
  Upload, 
  Printer, 
  Send,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageSquare as MessageSquareIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  MapPin as MapPinIcon,
  Home as HomeIcon,
  Building2,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  Users,
  AlertCircle as AlertCircleIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  FileText,
  Settings as SettingsIcon,
  Shield,
  Activity as ActivityIcon,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Save,
  RotateCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ScheduledReportsProps {
  reports: any[];
}

export default function ScheduledReports({ reports }: ScheduledReportsProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const statusOptions = ["All", "Active", "Paused", "Completed", "Failed"];
  const frequencyOptions = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"];

  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.frequency.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "All" || report.status === selectedStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const activeReports = reports.filter(r => r.status === "active").length;
  const pausedReports = reports.filter(r => r.status === "paused").length;
  const totalReports = reports.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Play className="h-4 w-4" />;
      case "paused":
        return <Pause className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleCreateReport = () => {
    setShowCreateDialog(true);
  };

  const handleEditReport = (report: any) => {
    setSelectedReport(report);
    setShowEditDialog(true);
  };

  const handleToggleStatus = (report: any) => {
    console.log("Toggling status for:", report.name);
  };

  const handleDeleteReport = (report: any) => {
    console.log("Deleting report:", report.name);
  };

  const handleRunNow = (report: any) => {
    console.log("Running report now:", report.name);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Scheduled Reports</h2>
          <p className="text-muted-foreground">Automated report generation and delivery</p>
        </div>
        <Button className="bg-gradient-primary shadow-glow" onClick={handleCreateReport}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-3xl font-bold text-foreground">{totalReports}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
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
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-3xl font-bold text-foreground">{activeReports}</p>
                <p className="text-sm text-green-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Running
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Play className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paused</p>
                <p className="text-3xl font-bold text-foreground">{pausedReports}</p>
                <p className="text-sm text-yellow-600 flex items-center">
                  <Pause className="h-4 w-4 mr-1" />
                  Inactive
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Pause className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search scheduled reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
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

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{report.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {report.frequency} • Next run: {new Date(report.nextRun).toLocaleDateString("en-AE")}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getStatusColor(report.status)}>
                        {getStatusIcon(report.status)}
                        <span className="ml-1 capitalize">{report.status}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {report.recipients.length} recipients
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleRunNow(report)}>
                    <Play className="h-4 w-4 mr-2" />
                    Run Now
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggleStatus(report)}>
                    {report.status === "active" ? (
                      <Pause className="h-4 w-4 mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {report.status === "active" ? "Pause" : "Resume"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleEditReport(report)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRunNow(report)}>
                        <Play className="h-4 w-4 mr-2" />
                        Run Now
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Test
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteReport(report)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
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
      {filteredReports.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Scheduled Reports</h3>
          <p className="text-muted-foreground mb-6">
            Create your first scheduled report to automate report generation and delivery.
          </p>
          <Button className="bg-gradient-primary shadow-glow" onClick={handleCreateReport}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Your First Report
          </Button>
        </Card>
      )}

      {/* Create Report Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule New Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reportName">Report Name</Label>
                <Input id="reportName" placeholder="Enter report name" />
              </div>
              <div>
                <Label htmlFor="reportType">Report Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial">Financial Report</SelectItem>
                    <SelectItem value="property">Property Report</SelectItem>
                    <SelectItem value="tenant">Tenant Report</SelectItem>
                    <SelectItem value="lease">Lease Report</SelectItem>
                    <SelectItem value="maintenance">Maintenance Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((frequency) => (
                      <SelectItem key={frequency} value={frequency.toLowerCase()}>
                        {frequency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nextRun">Next Run Date</Label>
                <Input id="nextRun" type="date" />
              </div>
            </div>

            <div>
              <Label htmlFor="recipients">Recipients (Email addresses)</Label>
              <Textarea 
                id="recipients" 
                placeholder="Enter email addresses separated by commas"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Enter report description"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button className="bg-gradient-primary shadow-glow">
                <Save className="h-4 w-4 mr-2" />
                Schedule Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Scheduled Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editReportName">Report Name</Label>
                <Input id="editReportName" defaultValue={selectedReport?.name} />
              </div>
              <div>
                <Label htmlFor="editFrequency">Frequency</Label>
                <Select defaultValue={selectedReport?.frequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((frequency) => (
                      <SelectItem key={frequency} value={frequency.toLowerCase()}>
                        {frequency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="editRecipients">Recipients</Label>
              <Textarea 
                id="editRecipients" 
                defaultValue={selectedReport?.recipients.join(", ")}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button className="bg-gradient-primary shadow-glow">
                <Save className="h-4 w-4 mr-2" />
                Update Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
