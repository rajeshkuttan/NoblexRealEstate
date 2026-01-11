import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PDCEditorProps {
  isOpen: boolean;
  onClose: () => void;
  lease: any;
  onSave: (pdcData: any) => void;
}

const pdcSchema = z.object({
  numberOfCheques: z.number().min(1, "Number of cheques is required"),
  amountPerCheque: z.number().min(1, "Amount per cheque is required"),
  frequency: z.string().min(1, "Frequency is required"),
  firstChequeDate: z.string().min(1, "First cheque date is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().optional(),
  notes: z.string().optional(),
});

export default function PDCEditor({ isOpen, onClose, lease, onSave }: PDCEditorProps) {
  const [activeTab, setActiveTab] = useState("setup");
  const [pdcList, setPdcList] = useState<any[]>([]);
  const [selectedPDC, setSelectedPDC] = useState<any>(null);
  const [showAddPDC, setShowAddPDC] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm({
    resolver: zodResolver(pdcSchema),
    defaultValues: {
      numberOfCheques: lease?.pdc?.numberOfCheques || 12,
      amountPerCheque: lease?.leaseDetails?.monthlyRent || 0,
      frequency: lease?.pdc?.frequency || "monthly",
      firstChequeDate: lease?.pdc?.firstChequeDate || lease?.leaseDetails?.startDate || "",
      bankName: lease?.pdc?.bankName || "",
      accountNumber: lease?.pdc?.accountNumber || "",
      notes: lease?.pdc?.notes || "",
    }
  });

  const watchedValues = watch();

  const generatePDCSchedule = () => {
    const { numberOfCheques, amountPerCheque, frequency, firstChequeDate } = watchedValues;
    const pdcs = [];
    const startDate = new Date(firstChequeDate);
    
    for (let i = 0; i < numberOfCheques; i++) {
      const chequeDate = new Date(startDate);
      
      switch (frequency) {
        case "monthly":
          chequeDate.setMonth(chequeDate.getMonth() + i);
          break;
        case "quarterly":
          chequeDate.setMonth(chequeDate.getMonth() + (i * 3));
          break;
        case "semi-annually":
          chequeDate.setMonth(chequeDate.getMonth() + (i * 6));
          break;
        case "annually":
          chequeDate.setFullYear(chequeDate.getFullYear() + i);
          break;
      }
      
      pdcs.push({
        id: `PDC-${i + 1}`,
        chequeNumber: i + 1,
        amount: amountPerCheque,
        date: chequeDate.toISOString().split('T')[0],
        status: "pending",
        bankName: watchedValues.bankName,
        accountNumber: watchedValues.accountNumber,
        notes: watchedValues.notes,
      });
    }
    
    setPdcList(pdcs);
  };

  const handleAddPDC = () => {
    setSelectedPDC(null);
    setShowAddPDC(true);
  };

  const handleEditPDC = (pdc: any) => {
    setSelectedPDC(pdc);
    setShowAddPDC(true);
  };

  const handleDeletePDC = (pdcId: string) => {
    setPdcList(pdcList.filter(pdc => pdc.id !== pdcId));
  };

  const handleSavePDC = (pdcData: any) => {
    if (selectedPDC) {
      // Edit existing PDC
      setPdcList(pdcList.map(pdc => pdc.id === selectedPDC.id ? { ...pdc, ...pdcData } : pdc));
    } else {
      // Add new PDC
      const newPDC = {
        id: `PDC-${Date.now()}`,
        ...pdcData,
        status: "pending"
      };
      setPdcList([...pdcList, newPDC]);
    }
    setShowAddPDC(false);
    setSelectedPDC(null);
  };

  const handleSaveAll = () => {
    const pdcData = {
      ...watchedValues,
      pdcList: pdcList,
      totalAmount: pdcList.reduce((sum, pdc) => sum + pdc.amount, 0),
    };
    onSave(pdcData);
    onClose();
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
                {lease?.leaseNumber} - {lease?.property?.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={generatePDCSchedule}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Schedule
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddPDC}>
                <Plus className="h-4 w-4 mr-2" />
                Add PDC
              </Button>
              <Button className="bg-gradient-primary shadow-glow" onClick={handleSaveAll}>
                <Save className="h-4 w-4 mr-2" />
                Save All
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* PDC Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                PDC Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="numberOfCheques">Number of PDCs</Label>
                  <Input
                    id="numberOfCheques"
                    type="number"
                    {...register("numberOfCheques", { valueAsNumber: true })}
                    placeholder="12"
                  />
                  {errors.numberOfCheques && (
                    <p className="text-sm text-red-600 mt-1">{errors.numberOfCheques.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="amountPerCheque">Amount per Cheque</Label>
                  <Input
                    id="amountPerCheque"
                    type="number"
                    {...register("amountPerCheque", { valueAsNumber: true })}
                    placeholder="85000"
                  />
                  {errors.amountPerCheque && (
                    <p className="text-sm text-red-600 mt-1">{errors.amountPerCheque.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={watchedValues.frequency} onValueChange={(value) => setValue("frequency", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="firstChequeDate">First PDC Date</Label>
                  <Input
                    id="firstChequeDate"
                    type="date"
                    {...register("firstChequeDate")}
                  />
                  {errors.firstChequeDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.firstChequeDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    {...register("bankName")}
                    placeholder="Emirates NBD"
                  />
                  {errors.bankName && (
                    <p className="text-sm text-red-600 mt-1">{errors.bankName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    {...register("accountNumber")}
                    placeholder="****1234"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Additional PDC notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* PDC Schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  PDC Schedule ({pdcList.length} cheques)
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Total: {formatCurrency(pdcList.reduce((sum, pdc) => sum + pdc.amount, 0))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pdcList.length === 0 ? (
                <div className="text-center py-8">
                  <FileCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No PDCs Generated</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure the PDC settings above and click "Generate Schedule" to create PDCs.
                  </p>
                  <Button onClick={generatePDCSchedule}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate PDC Schedule
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pdcList.map((pdc) => (
                    <div key={pdc.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileCheck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Cheque #{pdc.chequeNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(pdc.date)} • {pdc.bankName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(pdc.amount)}</p>
                          <Badge className={getStatusColor(pdc.status)}>
                            {getStatusIcon(pdc.status)}
                            <span className="ml-1">{pdc.status}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditPDC(pdc)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeletePDC(pdc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PDC Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                PDC Terms & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">PDC Collection</p>
                    <p className="text-sm text-muted-foreground">
                      All PDCs must be collected before lease commencement
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Bounce Policy</p>
                    <p className="text-sm text-muted-foreground">
                      AED 500 penalty for bounced cheques plus bank charges
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Replacement Policy</p>
                    <p className="text-sm text-muted-foreground">
                      PDCs can be replaced with 7 days notice and valid reason
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
