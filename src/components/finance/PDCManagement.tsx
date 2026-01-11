import { useState } from "react";
import { 
  FileCheck, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  Printer, 
  Mail, 
  Send, 
  RefreshCw, 
  Filter, 
  Search, 
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
  BarChart3, 
  PieChart, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
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
  User, 
  Building2, 
  DollarSign, 
  FileText, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Receipt, 
  History, 
  Copy, 
  Share, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Flag, 
  Bell, 
  MessageSquare
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PDCManagementProps {
  isOpen: boolean;
  onClose: () => void;
  leaseId?: string;
  tenantId?: string;
}

// Sample PDC data
const pdcData = [
  {
    id: "PDC-001",
    pdcNumber: "PDC-2024-001",
    tenant: "Sarah Ahmed",
    property: "Marina Heights Tower - Unit 305",
    amount: 85000,
    currency: "AED",
    chequeDate: "2024-04-01",
    bankName: "Emirates NBD",
    accountNumber: "****1234",
    status: "received",
    receivedDate: "2024-03-15",
    depositedDate: null,
    clearedDate: null,
    bouncedDate: null,
    notes: "Monthly rent PDC",
    attachments: ["pdc_001.pdf"],
    reminders: []
  },
  {
    id: "PDC-002",
    pdcNumber: "PDC-2024-002",
    tenant: "Mohammed Al Mansoori",
    property: "Business Bay Commercial Plaza - Unit 102",
    amount: 120000,
    currency: "AED",
    chequeDate: "2024-05-01",
    bankName: "ADCB",
    accountNumber: "****5678",
    status: "pending",
    receivedDate: null,
    depositedDate: null,
    clearedDate: null,
    bouncedDate: null,
    notes: "Quarterly rent PDC",
    attachments: [],
    reminders: []
  },
  {
    id: "PDC-003",
    pdcNumber: "PDC-2024-003",
    tenant: "Jennifer Smith",
    property: "Palm Jumeirah Residences - Unit 204",
    amount: 150000,
    currency: "AED",
    chequeDate: "2024-03-01",
    bankName: "FAB",
    accountNumber: "****9012",
    status: "cleared",
    receivedDate: "2024-02-15",
    depositedDate: "2024-02-28",
    clearedDate: "2024-03-05",
    bouncedDate: null,
    notes: "Monthly rent PDC - Cleared successfully",
    attachments: ["pdc_003.pdf", "cleared_receipt_003.pdf"],
    reminders: []
  },
  {
    id: "PDC-004",
    pdcNumber: "PDC-2024-004",
    tenant: "Ahmed Hassan",
    property: "Downtown Office Complex - Unit 801",
    amount: 95000,
    currency: "AED",
    chequeDate: "2024-02-20",
    bankName: "Emirates NBD",
    accountNumber: "****3456",
    status: "bounced",
    receivedDate: "2024-02-10",
    depositedDate: "2024-02-20",
    clearedDate: null,
    bouncedDate: "2024-02-22",
    notes: "Bounced due to insufficient funds - Penalty applied",
    attachments: ["pdc_004.pdf", "bounce_notice_004.pdf"],
    reminders: [
      {
        date: "2024-02-25",
        type: "email",
        message: "PDC bounced - Please provide replacement cheque"
      }
    ]
  }
];

const statusOptions = [
  { value: "all", label: "All PDCs" },
  { value: "received", label: "Received" },
  { value: "pending", label: "Pending" },
  { value: "deposited", label: "Deposited" },
  { value: "cleared", label: "Cleared" },
  { value: "bounced", label: "Bounced" }
];

export default function PDCManagement({ isOpen, onClose, leaseId, tenantId }: PDCManagementProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPDC, setSelectedPDC] = useState<any>(null);
  const [showPDCForm, setShowPDCForm] = useState(false);

  const filteredPDCs = pdcData.filter(pdc => {
    const matchesSearch = 
      pdc.pdcNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pdc.tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pdc.property.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || pdc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "deposited":
        return "bg-purple-100 text-purple-800";
      case "cleared":
        return "bg-green-100 text-green-800";
      case "bounced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "received":
        return <FileCheck className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "deposited":
        return <CheckCircle className="h-4 w-4" />;
      case "cleared":
        return <CheckCircle className="h-4 w-4" />;
      case "bounced":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddPDC = () => {
    setSelectedPDC(null);
    setShowPDCForm(true);
  };

  const handleEditPDC = (pdc: any) => {
    setSelectedPDC(pdc);
    setShowPDCForm(true);
  };

  const handleViewPDC = (pdc: any) => {
    setSelectedPDC(pdc);
    // Show PDC details modal
  };

  const handleDepositPDC = (pdc: any) => {
    console.log("Deposit PDC:", pdc);
    alert(`PDC ${pdc.pdcNumber} marked for deposit`);
  };

  const handleReplacePDC = (pdc: any) => {
    console.log("Replace PDC:", pdc);
    alert(`Replacement requested for PDC ${pdc.pdcNumber}`);
  };

  const totalPDCs = pdcData.length;
  const receivedPDCs = pdcData.filter(pdc => pdc.status === "received").length;
  const pendingPDCs = pdcData.filter(pdc => pdc.status === "pending").length;
  const clearedPDCs = pdcData.filter(pdc => pdc.status === "cleared").length;
  const bouncedPDCs = pdcData.filter(pdc => pdc.status === "bounced").length;
  const totalAmount = pdcData.reduce((sum, pdc) => sum + pdc.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Post Dated Cheques (PDC) Management
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                Manage and track post dated cheques for rent payments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
              <Button className="bg-gradient-primary shadow-glow" onClick={handleAddPDC}>
                <Plus className="h-4 w-4 mr-2" />
                Add PDC
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* PDC Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total PDCs</p>
                    <p className="text-2xl font-bold">{totalPDCs}</p>
                  </div>
                  <FileCheck className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Received</p>
                    <p className="text-2xl font-bold text-blue-600">{receivedPDCs}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{pendingPDCs}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cleared</p>
                    <p className="text-2xl font-bold text-green-600">{clearedPDCs}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Bounced</p>
                    <p className="text-2xl font-bold text-red-600">{bouncedPDCs}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PDCs, tenants, or properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PDC List */}
          <div className="space-y-4">
            {filteredPDCs.map((pdc) => (
              <Card key={pdc.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileCheck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{pdc.pdcNumber}</h3>
                        <p className="text-sm text-muted-foreground">{pdc.tenant}</p>
                        <p className="text-xs text-muted-foreground">{pdc.property}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(pdc.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(pdc.chequeDate).toLocaleDateString("en-AE")}
                        </p>
                      </div>
                      
                      <Badge className={getStatusColor(pdc.status)}>
                        {getStatusIcon(pdc.status)}
                        <span className="ml-1">{pdc.status}</span>
                      </Badge>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewPDC(pdc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditPDC(pdc)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {pdc.status === "received" && (
                          <Button variant="outline" size="sm" onClick={() => handleDepositPDC(pdc)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {pdc.status === "bounced" && (
                          <Button variant="outline" size="sm" onClick={() => handleReplacePDC(pdc)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {pdc.notes && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">{pdc.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredPDCs.length === 0 && (
            <Card className="p-12 text-center">
              <FileCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No PDCs Found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search criteria or add a new PDC.
              </p>
              <Button className="bg-gradient-primary shadow-glow" onClick={handleAddPDC}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First PDC
              </Button>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
