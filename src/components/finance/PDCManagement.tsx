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
  User, 
  Building2, 
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
  MessageSquare,
  Upload
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
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { chequesAPI, bankAccountsAPI } from "@/services/api";
import { useCompany } from "@/contexts/CompanyContext";
import { getFinancePostingErrorMessage } from "@/lib/financePostingErrors";
import PDCOpeningBalanceImport from "@/components/finance/PDCOpeningBalanceImport";

const statusOptions = [
  { value: "all", label: "All PDCs" },
  { value: "received", label: "Received" },
  { value: "pending", label: "Pending" },
  { value: "deposited", label: "Deposited" },
  { value: "cleared", label: "Cleared" },
  { value: "bounced", label: "Bounced" },
];

const listFilterOptions = [
  { value: "all", label: "All" },
  { value: "undeposited", label: "Undeposited" },
  { value: "opening", label: "Opening balance" },
  { value: "deposited", label: "Deposited" },
];

interface PDCManagementProps {
  isOpen: boolean;
  onClose: () => void;
  leaseId?: string;
  tenantId?: string;
}

export default function PDCManagement({ isOpen, onClose, leaseId, tenantId }: PDCManagementProps) {
  const { activeCompanyId } = useCompany();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listFilter, setListFilter] = useState("all");
  const [selectedPDC, setSelectedPDC] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPDCForm, setShowPDCForm] = useState(false);
  const [showOpeningImport, setShowOpeningImport] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [depositPdc, setDepositPdc] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [depositBankId, setDepositBankId] = useState("");
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split("T")[0]);
  const [depositReference, setDepositReference] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [pdcs, setPdcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        fetchPDCs();
    }
  }, [isOpen, leaseId, tenantId, listFilter]);

  useEffect(() => {
    setBankAccounts([]);
    setDepositBankId("");
  }, [activeCompanyId]);

  const fetchPDCs = async () => {
    try {
        setLoading(true);
        const params: any = { chequeType: "pdc", limit: 500 };
        if (leaseId) params.leaseId = leaseId;
        if (tenantId) params.tenantId = tenantId;
        if (listFilter === "undeposited") params.undepositedOnly = "true";
        if (listFilter === "opening") {
          params.isOpeningBalance = "true";
          params.undepositedOnly = "true";
        }
        if (listFilter === "deposited") params.status = "deposited";

        const response = await chequesAPI.getAll(params);
        setPdcs(response.data?.data?.cheques || response.data || []);
    } catch (error) {
        console.error("Failed to fetch PDCs:", error);
    } finally {
        setLoading(false);
    }
  };

  const filteredPDCs = pdcs.filter(pdc => {
    const matchesSearch = 
      (pdc.pdcNumber || pdc.chequeNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pdc.tenant?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pdc.bankName || "").toLowerCase().includes(searchQuery.toLowerCase());
    
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

  const handleEditPDC = (pdc: any) => {
    setSelectedPDC(pdc);
    setShowPDCForm(true);
  };

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleDateString("en-AE");
    } catch {
      return String(value);
    }
  };

  const handleViewPDC = async (pdc: any) => {
    setSelectedPDC(pdc);
    setShowViewDialog(true);
    if (!pdc?.id) return;
    try {
      const res = await chequesAPI.getById(pdc.id);
      const detail = res.data?.data?.cheque || res.data?.data || res.data;
      if (detail?.id) setSelectedPDC(detail);
    } catch {
      // List row data is enough for display if detail fetch fails
    }
  };

  const openDepositDialog = async (pdc: any) => {
    setDepositPdc(pdc);
    setDepositBankId("");
    setDepositReference("");
    setDepositDate(new Date().toISOString().split("T")[0]);
    setShowDepositDialog(true);
    try {
      const res = await bankAccountsAPI.getAll({ limit: 100 });
      const list = res.data?.data?.bankAccounts || res.data?.data || res.data || [];
      setBankAccounts(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Failed to load bank accounts");
    }
  };

  const handleConfirmDeposit = async () => {
    if (!depositPdc || !depositBankId) {
      toast.error("Select a bank account");
      return;
    }
    try {
      setDepositing(true);
      await chequesAPI.deposit(depositPdc.id, {
        bankAccountId: parseInt(depositBankId, 10),
        depositDate,
        bankReference: depositReference,
      });
      toast.success("PDC deposited — Dr Bank, Cr PDC posted");
      setShowDepositDialog(false);
      setDepositPdc(null);
      fetchPDCs();
    } catch (err: any) {
      toast.error(getFinancePostingErrorMessage(err, "Deposit failed"));
    } finally {
      setDepositing(false);
    }
  };

  const handleReplacePDC = (pdc: any) => {
    console.log("Replace PDC:", pdc);
    toast.success(`Replacement requested for PDC ${pdc.pdcNumber}`);
  };

  const totalPDCs = pdcs.length;
  const receivedPDCs = pdcs.filter(pdc => pdc.status === "received").length;
  const pendingPDCs = pdcs.filter(pdc => pdc.status === "pending").length;
  const clearedPDCs = pdcs.filter(pdc => pdc.status === "cleared").length;
  const bouncedPDCs = pdcs.filter(pdc => pdc.status === "bounced").length;
  const totalAmount = pdcs.reduce((sum, pdc) => sum + Number(pdc.amount || 0), 0);

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
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setShowOpeningImport(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Opening balance
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
            <Select value={listFilter} onValueChange={setListFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {listFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
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
                        <h3 className="font-semibold text-foreground">{pdc.chequeNumber}</h3>
                        <p className="text-sm text-muted-foreground">{pdc.tenant?.name || "Unknown Tenant"}</p>
                        <p className="text-xs text-muted-foreground">{pdc.leaseId ? `Lease #${pdc.leaseId}` : "No Lease Assigned"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(pdc.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(pdc.chequeDate).toLocaleDateString("en-AE")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={getStatusColor(pdc.status)}>
                          {getStatusIcon(pdc.status)}
                          <span className="ml-1">{pdc.status}</span>
                        </Badge>
                        {pdc.isOpeningBalance && (
                          <Badge variant="outline" className="text-xs">
                            Opening
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewPDC(pdc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(pdc.status === "received" || pdc.status === "pending") && (
                          <Button
                            variant="outline"
                            size="sm"
                            title="Deposit (Dr Bank, Cr PDC)"
                            onClick={() => openDepositDialog(pdc)}
                          >
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

          {filteredPDCs.length === 0 && !loading && (
            <Card className="p-12 text-center">
              <FileCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No PDCs Found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting filters or import opening balance PDCs.
              </p>
            </Card>
          )}
        </div>

        <PDCOpeningBalanceImport
          open={showOpeningImport}
          onOpenChange={setShowOpeningImport}
          onImportComplete={fetchPDCs}
        />

        <Dialog
          open={showViewDialog}
          onOpenChange={(open) => {
            setShowViewDialog(open);
            if (!open) setSelectedPDC(null);
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>PDC details</DialogTitle>
            </DialogHeader>
            {selectedPDC && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {selectedPDC.chequeNumber || selectedPDC.pdcNumber || `PDC #${selectedPDC.id}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPDC.tenant?.name || "Unknown tenant"}
                    </p>
                  </div>
                  <Badge className={getStatusColor(selectedPDC.status)}>
                    {getStatusIcon(selectedPDC.status)}
                    <span className="ml-1">{selectedPDC.status}</span>
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-semibold">{formatCurrency(Number(selectedPDC.amount || 0))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cheque date</p>
                    <p className="font-medium">{formatDate(selectedPDC.chequeDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lease</p>
                    <p className="font-medium">
                      {selectedPDC.leaseId ? `#${selectedPDC.leaseId}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Invoice</p>
                    <p className="font-medium">
                      {selectedPDC.invoiceId ? `#${selectedPDC.invoiceId}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bank</p>
                    <p className="font-medium">{selectedPDC.bankName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Branch</p>
                    <p className="font-medium">{selectedPDC.branchName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deposit date</p>
                    <p className="font-medium">{formatDate(selectedPDC.depositDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clearance date</p>
                    <p className="font-medium">{formatDate(selectedPDC.clearanceDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Opening balance</p>
                    <p className="font-medium">{selectedPDC.isOpeningBalance ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bank reference</p>
                    <p className="font-medium">{selectedPDC.bankReference || "—"}</p>
                  </div>
                </div>
                {selectedPDC.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{selectedPDC.notes}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  {(selectedPDC.status === "received" || selectedPDC.status === "pending") && (
                    <Button
                      onClick={() => {
                        setShowViewDialog(false);
                        openDepositDialog(selectedPDC);
                      }}
                    >
                      Deposit
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Deposit PDC</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              Posts Dr Bank and Cr PDC. Cheque: {depositPdc?.chequeNumber} —{" "}
              {depositPdc ? formatCurrency(Number(depositPdc.amount)) : ""}
            </p>
            <div className="space-y-3">
              <div>
                <Label>Bank account</Label>
                <Select value={depositBankId} onValueChange={setDepositBankId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((b: any) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.bankName} — {b.accountNumber}
                        {!b.chartAccountId ? " (no GL link)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deposit date</Label>
                <Input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
              </div>
              <div>
                <Label>Bank reference</Label>
                <Input
                  value={depositReference}
                  onChange={(e) => setDepositReference(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDepositDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmDeposit} disabled={depositing}>
                {depositing ? "Posting..." : "Confirm deposit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
