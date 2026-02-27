import { useState } from "react";
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
  Banknote, 
  FileText, 
  Phone, 
  MapPin, 
  CreditCard, 
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
  Car
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PaymentDetailsProps {
  payment: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (payment: any) => void;
  onDelete: (payment: any) => void;
  onPrint: (payment: any) => void;
  onDownload: (payment: any) => void;
  onRefund: (payment: any) => void;
}

export default function PaymentDetails({
  payment,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onPrint,
  onDownload,
  onRefund
}: PaymentDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "refunded":
        return <RotateCcw className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "Bank Transfer":
        return <Building2 className="h-4 w-4" />;
      case "Cheque":
        return <FileText className="h-4 w-4" />;
      case "Cash":
        return <Banknote className="h-4 w-4" />;
      case "Credit Card":
        return <CreditCard className="h-4 w-4" />;
      case "Online Payment":
        return <Wifi className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Payment Details
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {payment.paymentNumber} • {payment.tenant}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(payment.status)}>
                {getStatusIcon(payment.status)}
                <span className="ml-1">{payment.status}</span>
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
            <Button variant="outline" size="sm" onClick={() => onPrint(payment)}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDownload(payment)}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(payment)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Payment
            </Button>
            <Button variant="outline" size="sm" onClick={() => onRefund(payment)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Process Refund
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(payment)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Payment Details</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Payment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Payment Number</span>
                      <span className="font-medium">{payment.paymentNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Payment Date</span>
                      <span className="font-medium">
                        {new Date(payment.paymentDate).toLocaleDateString("en-AE")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(payment.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Currency</span>
                      <span className="font-medium">{payment.currency}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge className={getStatusColor(payment.status)}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-1">{payment.status}</span>
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getPaymentMethodIcon(payment.paymentMethod)}
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Method</span>
                      <span className="font-medium">{payment.paymentMethod}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Reference</span>
                      <span className="font-mono text-sm">{payment.paymentReference}</span>
                    </div>
                    {payment.bankDetails && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Bank</span>
                          <span className="font-medium">{payment.bankDetails.bankName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Account</span>
                          <span className="font-mono text-sm">{payment.bankDetails.accountNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Transaction ID</span>
                          <span className="font-mono text-sm">{payment.bankDetails.transactionId}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Processed By</span>
                      <span className="font-medium">{payment.processedBy}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tenant & Invoice Info */}
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
                      <p className="font-medium">{payment.tenant}</p>
                      <p className="text-sm text-muted-foreground">Tenant Name</p>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm text-muted-foreground">Invoice ID</p>
                      <p className="font-medium">{payment.invoiceId}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Payment Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="font-medium">{payment.notes || "No notes available"}</p>
                    </div>
                    {payment.attachments && payment.attachments.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-sm text-muted-foreground">Attachments</p>
                        <div className="space-y-1">
                          {payment.attachments.map((attachment: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{attachment}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Payment Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Payment Amount</p>
                        <p className="text-sm text-muted-foreground">Full payment received</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">{payment.currency}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Payment Method</span>
                        <span className="font-medium">{payment.paymentMethod}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Reference Number</span>
                        <span className="font-mono text-sm">{payment.paymentReference}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Payment Date</span>
                        <span className="font-medium">
                          {new Date(payment.paymentDate).toLocaleString("en-AE")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge className={getStatusColor(payment.status)}>
                          {getStatusIcon(payment.status)}
                          <span className="ml-1">{payment.status}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bank Details */}
              {payment.bankDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle>Bank Transaction Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Bank Name</p>
                        <p className="font-medium">{payment.bankDetails.bankName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Account Number</p>
                        <p className="font-mono text-sm">{payment.bankDetails.accountNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Transaction ID</p>
                        <p className="font-mono text-sm">{payment.bankDetails.transactionId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Processed By</p>
                        <p className="font-medium">{payment.processedBy}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Payment Received</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.paymentDate).toLocaleString("en-AE")} via {payment.paymentMethod}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Payment Processed</p>
                        <p className="text-sm text-muted-foreground">
                          Processed by {payment.processedBy}
                        </p>
                      </div>
                    </div>
                    
                    {payment.attachments && payment.attachments.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium">Attachments</p>
                        {payment.attachments.map((attachment: string, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{attachment}</p>
                              <p className="text-sm text-muted-foreground">Payment receipt</p>
                            </div>
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
