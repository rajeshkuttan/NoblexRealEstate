import { useState, useEffect } from "react";
import { invoicesAPI } from "@/services/api";
import InvoiceHistoryTab from "./InvoiceHistoryTab";
import { 
  X, 
  Printer, 
  Download, 
  Mail, 
  Send, 
  Copy, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Calendar, 
  User, 
  Building2, 
  DollarSign, 
  FileText, 
  Phone, 
  MapPin, 
  CreditCard, 
  Banknote, 
  Receipt, 
  Shield, 
  Eye, 
  Share2, 
  ExternalLink, 
  Archive, 
  RefreshCw, 
  Settings, 
  HelpCircle, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  Pause, 
  Stop, 
  RotateCcw, 
  Save, 
  Check, 
  Minus, 
  Plus, 
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
  Shield as ShieldIcon, 
  Settings as SettingsIcon, 
  Camera as CameraIcon, 
  FileCheck, 
  Edit as EditIcon, 
  Eye as EyeIcon, 
  MoreHorizontal, 
  ChevronDown as ChevronDownIcon, 
  ChevronUp as ChevronUpIcon, 
  ArrowRight as ArrowRightIcon, 
  ArrowLeft as ArrowLeftIcon, 
  Play as PlayIcon, 
  Pause as PauseIcon, 
  Stop as StopIcon, 
  RotateCcw as RotateCcwIcon, 
  Save as SaveIcon, 
  Check as CheckIcon, 
  Minus as MinusIcon, 
  Plus as PlusIcon, 
  BarChart3 as BarChart3Icon, 
  PieChart as PieChartIcon, 
  Target as TargetIcon, 
  TrendingUp as TrendingUpIcon, 
  TrendingDown as TrendingDownIcon, 
  Activity as ActivityIcon, 
  Award as AwardIcon, 
  Trophy as TrophyIcon, 
  Medal as MedalIcon, 
  Crown as CrownIcon, 
  Gem as GemIcon, 
  Sparkles as SparklesIcon, 
  Zap as ZapIcon, 
  Flame as FlameIcon, 
  Sun as SunIcon, 
  Moon as MoonIcon, 
  Cloud as CloudIcon, 
  CloudRain as CloudRainIcon, 
  CloudSnow as CloudSnowIcon, 
  CloudLightning as CloudLightningIcon, 
  Wind as WindIcon, 
  Droplets as DropletsIcon, 
  Thermometer as ThermometerIcon, 
  Gauge as GaugeIcon, 
  Battery as BatteryIcon, 
  Wifi as WifiIcon, 
  Signal as SignalIcon, 
  Radio as RadioIcon, 
  Tv as TvIcon, 
  Monitor as MonitorIcon, 
  Smartphone as SmartphoneIcon, 
  Tablet as TabletIcon, 
  Laptop as LaptopIcon, 
  Desktop as DesktopIcon, 
  Server as ServerIcon, 
  Database as DatabaseIcon, 
  HardDrive as HardDriveIcon, 
  Cpu as CpuIcon, 
  MemoryStick as MemoryStickIcon, 
  Disc as DiscIcon, 
  Cd as CdIcon, 
  Dvd as DvdIcon, 
  Camera as CameraIcon2, 
  Video as VideoIcon, 
  Mic as MicIcon, 
  MicOff as MicOffIcon, 
  Volume2 as VolumeIcon, 
  VolumeX as VolumeOffIcon, 
  Music as MusicIcon, 
  Headphones as HeadphonesIcon, 
  Speaker as SpeakerIcon, 
  Home as HomeIcon, 
  Building as BuildingIcon, 
  Store as StoreIcon, 
  Warehouse as WarehouseIcon, 
  Car as CarIcon
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";



interface InvoiceDetailsProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (invoice: any) => void;
  onDelete: (invoice: any) => void;
  onPrint: (invoice: any) => void;
  onDownload: (invoice: any) => void;
  onSendReminder: (invoice: any) => void;
  onDuplicate: (invoice: any) => void;
  onRecordPayment: (invoice: any) => void;
}

export default function InvoiceDetails({
  invoice,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onPrint,
  onDownload,
  onSendReminder,
  onDuplicate,
  onRecordPayment
}: InvoiceDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // safely access property details
  const property = invoice?.lease?.unit?.property || invoice?.property || { name: 'N/A', unit: 'N/A', address: 'N/A' };
  
  // safely access PDCs - backend returns 'cheques', frontend mock might use 'selectedPDC'
  const pdcs = invoice?.cheques || invoice?.selectedPDC || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "cancelled":
        return <X className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Invoice Details
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {invoice.invoiceNumber} • {invoice.tenant.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(invoice.status)}>
                {getStatusIcon(invoice.status)}
                <span className="ml-1">{invoice.status}</span>
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
            <Button variant="outline" size="sm" onClick={() => onPrint(invoice)}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDownload(invoice)}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSendReminder(invoice)}>
              <Send className="h-4 w-4 mr-2" />
              Send Reminder
            </Button>
            <Button variant="outline" size="sm" onClick={() => onRecordPayment(invoice)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDuplicate(invoice)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(invoice)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(invoice)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Invoice Details</TabsTrigger>
              <TabsTrigger value="pdc">PDC Details</TabsTrigger>
              <TabsTrigger value="tenant">Tenant Info</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Invoice Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Invoice Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Invoice Number</span>
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Issue Date</span>
                      <span className="font-medium">
                        {new Date(invoice.invoiceDetails.issueDate).toLocaleDateString("en-AE")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Due Date</span>
                      <span className="font-medium">
                        {new Date(invoice.invoiceDetails.dueDate).toLocaleDateString("en-AE")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Period</span>
                      <span className="font-medium">{invoice.invoiceDetails.period}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(invoice.invoiceDetails.subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">VAT (5%)</span>
                      <span className="font-medium">{formatCurrency(invoice.invoiceDetails.vatAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total Amount</span>
                      <span className="text-primary">{formatCurrency(invoice.invoiceDetails.total)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge className={getStatusColor(invoice.status)}>
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1">{invoice.status}</span>
                      </Badge>
                    </div>
                    {invoice.paidDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Paid Date</span>
                        <span className="font-medium">
                          {new Date(invoice.paidDate).toLocaleDateString("en-AE")}
                        </span>
                      </div>
                    )}
                    {invoice.paymentMethod && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Payment Method</span>
                        <span className="font-medium">{invoice.paymentMethod}</span>
                      </div>
                    )}
                    {invoice.paymentReference && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Reference</span>
                        <span className="font-mono text-sm">{invoice.paymentReference}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Payment Terms</span>
                      <span className="font-medium">{invoice.invoiceDetails.paymentTerms}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Grace Period</span>
                      <span className="font-medium">{invoice.invoiceDetails.gracePeriod} days</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tenant & Property Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Tenant Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">{invoice.tenant.name}</p>
                      <p className="text-sm text-muted-foreground">{invoice.tenant.email}</p>
                      <p className="text-sm text-muted-foreground">{invoice.tenant.phone}</p>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm text-muted-foreground">Emirates ID</p>
                      <p className="font-medium">{invoice.tenant.emiratesId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nationality</p>
                      <p className="font-medium">{invoice.tenant.nationality}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="text-sm text-muted-foreground">{property.unit || invoice.lease?.unit?.unitNumber}</p>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm text-muted-foreground">Lease Period</p>
                      <p className="font-medium">
                        {new Date(invoice.lease.startDate).toLocaleDateString("en-AE")} - {new Date(invoice.lease.endDate).toLocaleDateString("en-AE")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Rent</p>
                      <p className="font-medium">{formatCurrency(Number(invoice.lease.monthlyRent) || 0)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* PDC Information */}
              {pdcs && pdcs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Selected Post Dated Cheques (PDC)
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      This invoice is linked to the following PDCs
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pdcs.map((pdc: any, index: number) => (
                        <div key={pdc.id || index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <FileCheck className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{pdc.chequeNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                Due: {pdc.chequeDate ? new Date(pdc.chequeDate).toLocaleDateString("en-AE") : (pdc.dueDate ? new Date(pdc.dueDate).toLocaleDateString("en-AE") : 'N/A')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatCurrency(Number(pdc.amount) || 0)}</p>
                            <Badge className="bg-blue-100 text-blue-800">
                              {pdc.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <span className="font-semibold text-primary/80">Total PDC Amount:</span>
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(pdcs.reduce((sum: number, pdc: any) => sum + (Number(pdc.amount) || 0), 0))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Invoice Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.invoiceDetails.description}</p>
                        <p className="text-sm text-muted-foreground">Period: {invoice.invoiceDetails.period}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.invoiceDetails.subtotal)}</p>
                        <p className="text-sm text-muted-foreground">Subtotal</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{formatCurrency(invoice.invoiceDetails.subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">VAT ({invoice.invoiceDetails.vatRate}%)</span>
                        <span className="font-medium">{formatCurrency(invoice.invoiceDetails.vatAmount)}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(invoice.invoiceDetails.total)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{invoice.companyInfo.name}</p>
                    <p className="text-sm text-muted-foreground">{invoice.companyInfo.address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">License</p>
                      <p className="font-medium">{invoice.companyInfo.license}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">VAT Number</p>
                      <p className="font-medium">{invoice.companyInfo.vatNumber}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{invoice.companyInfo.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{invoice.companyInfo.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PDC Details Tab */}
            <TabsContent value="pdc" className="space-y-6">
              {pdcs && pdcs.length > 0 ? (
                <div className="space-y-6">
                  {/* PDC Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5" />
                        PDC Summary
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Post Dated Cheques linked to this invoice
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{pdcs.length}</p>
                          <p className="text-sm text-muted-foreground">Total PDCs</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(pdcs.reduce((sum: number, pdc: any) => sum + (Number(pdc.amount) || 0), 0))}
                          </p>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-600">
                            {pdcs.filter((pdc: any) => pdc.status === 'pending').length}
                          </p>
                          <p className="text-sm text-muted-foreground">Pending</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Individual PDC Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Individual PDC Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {pdcs.map((pdc: any, index: number) => (
                          <div key={pdc.id || index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <FileCheck className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-lg">{pdc.chequeNumber}</p>
                                  <p className="text-sm text-muted-foreground">PDC #{index + 1}</p>
                                </div>
                              </div>
                              <Badge className={`${
                                pdc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                pdc.status === 'cleared' ? 'bg-green-100 text-green-800' :
                                pdc.status === 'bounced' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {pdc.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Amount</p>
                                <p className="font-bold text-xl">{formatCurrency(Number(pdc.amount) || 0)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Due Date</p>
                                <p className="font-medium">{new Date(pdc.dueDate).toLocaleDateString("en-AE")}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Bank Name</p>
                                <p className="font-medium">{pdc.bankName || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Account Number</p>
                                <p className="font-mono text-sm">{pdc.accountNumber || 'N/A'}</p>
                              </div>
                            </div>
                            
                            {pdc.notes && (
                              <div className="mt-4 pt-4 border-t">
                                <p className="text-sm text-muted-foreground">Notes</p>
                                <p className="text-sm">{pdc.notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* PDC Terms */}
                  <Card>
                    <CardHeader>
                      <CardTitle>PDC Terms & Conditions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>All PDCs must be presented on or after the due date</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>Bounced cheques will incur a penalty fee as per UAE law</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>Early presentation of PDCs is not permitted</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>Replacement of lost/stolen PDCs requires 7 days notice</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No PDCs Selected</h3>
                    <p className="text-muted-foreground">
                      This invoice is not linked to any Post Dated Cheques
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tenant Tab */}
            <TabsContent value="tenant" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tenant Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{invoice.tenant.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{invoice.tenant.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{invoice.tenant.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nationality</p>
                      <p className="font-medium">{invoice.tenant.nationality}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Emirates ID</p>
                      <p className="font-medium">{invoice.tenant.emiratesId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{invoice.tenant.address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Invoice Created</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(invoice.createdDate).toLocaleString("en-AE")} by {invoice.createdBy}
                        </p>
                      </div>
                    </div>
                    
                    {invoice.paidDate && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Payment Received</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(invoice.paidDate).toLocaleString("en-AE")} via {invoice.paymentMethod}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {invoice.reminders && invoice.reminders.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium">Reminders Sent</p>
                        {invoice.reminders.map((reminder: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Send className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Reminder Sent</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(reminder.date).toLocaleString("en-AE")} via {reminder.type}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              {reminder.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
