import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  FileText,
  User,
  Building2,
  Calendar,
  CreditCard,
  Shield,
  Download,
  Share,
  Printer,
  Edit,
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  Info,
  Receipt,
  Zap,
  Wallet,
  History as HistoryIcon,
  Loader2
} from "lucide-react";
import LeaseAgreement from "./LeaseAgreement";
import { useState, useEffect, useMemo } from "react";
import { leasesAPI } from "@/services/api";
import { useSettings } from "@/contexts/SettingsContext";
import { getAuthorityLabelsForProperty } from "@/lib/emirateAuthorityMap";

interface LeaseDetailsProps {
  lease: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (lease: any) => void;
}

export default function LeaseDetails({
  lease,
  isOpen,
  onClose,
  onEdit,
}: LeaseDetailsProps) {
  const { contractTerminology, emirateAuthorityMap } = useSettings();
  const [showAgreement, setShowAgreement] = useState(false);
  const [displayLease, setDisplayLease] = useState<any>(lease);
  const [isLoading, setIsLoading] = useState(false);

  const leasePropertyForLabels = useMemo(
    () => displayLease?.unit?.property ?? null,
    [displayLease],
  );
  const authorityLabels = useMemo(
    () =>
      getAuthorityLabelsForProperty(leasePropertyForLabels, emirateAuthorityMap, contractTerminology),
    [leasePropertyForLabels, emirateAuthorityMap, contractTerminology],
  );

  // Fetch full lease details on open to ensure services/docs are complete
  useEffect(() => {
    if (isOpen && lease?.id) {
        const fetchFullLease = async () => {
            try {
                // Determine if we need to fetch. 
                // Currently, lease lists often return distinct but incomplete objects.
                // Always fetch fresh data to be safe.
                setIsLoading(true);
                const res = await leasesAPI.getById(String(lease.id), true); // true = include relations
                if (res.data?.data || res.data) {
                    setDisplayLease(res.data?.data || res.data);
                }
            } catch (err) {
                console.error("Failed to fetch full lease details:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFullLease();
    } else {
        setDisplayLease(lease); 
    }
  }, [isOpen, lease]);

  if (!displayLease) return null;

  // Financial Calculations
  const frequencyMap: Record<string, number> = {
    monthly: 12,
    quarterly: 4,
    "semi-annually": 2,
    annually: 1,
  };

  const paymentFrequency = displayLease.paymentFrequency || displayLease.paymentTerms || "monthly";
  const chequesPerYear = frequencyMap[paymentFrequency.toLowerCase()] || 12;
  
  // Calculate Rent Metrics
  const calculateDuration = () => {
    if (displayLease.duration && displayLease.duration > 0) return Number(displayLease.duration);
    
    // Fallback: Calculate from dates
    if (displayLease.startDate && displayLease.endDate) {
      const start = new Date(displayLease.startDate);
      const end = new Date(displayLease.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return months > 0 ? months : 12;
    }
    return 12;
  };

  const duration = calculateDuration();
  const actualChequesCount = Math.ceil(duration / (12 / chequesPerYear));
  const annualRent = Number(displayLease.annualRent) || (Number(displayLease.rentAmount || 0) * (duration > 0 ? (12/duration) : 1) * duration);
  const installmentAmount = annualRent / chequesPerYear;
  
  // Tax Calculations
  const isTaxable = displayLease.isRentalTaxable === true || displayLease.is_rental_taxable === true || displayLease.taxRate > 0;
  const vatRate = 5; 
  const vatAmount = isTaxable ? (annualRent * vatRate / 100) : 0;
  const totalAnnualWithTax = annualRent + vatAmount;

  // Services Parsing
  let services = displayLease.services || [];
  if (typeof services === 'string') {
      try { services = JSON.parse(services); } catch {}
  }
  const servicesTotal = Array.isArray(services) 
      ? services.reduce((acc: number, curr: any) => acc + (Number(curr.amount || curr.price || 0)), 0)
      : 0;
  
  // Use displayLease for values instead of prop 'lease'
  const leaseObj = displayLease;

  // Formatters
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount?: string | number) => {
    const value = Number(amount || 0);
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (showAgreement) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto p-0">
           <div className="p-4 bg-muted/20 border-b flex justify-between items-center sticky top-0 bg-white z-10">
             <Button variant="ghost" onClick={() => setShowAgreement(false)}>
               ← Back to Details
             </Button>
             <h2 className="font-semibold">Lease Agreement Preview</h2>
             <Button variant="ghost" size="icon" onClick={onClose}>×</Button>
           </div>
           <LeaseAgreement lease={lease} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <div className="flex justify-between items-start pr-8">
            {/* Use leaseObj instead of lease for the rest of render */}
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                {leaseObj.leaseNumber}
                <Badge className={statusColor(leaseObj.status)}>
                  {leaseObj.status?.toUpperCase() || "DRAFT"}
                </Badge>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                Created on {formatDate(leaseObj.createdAt || leaseObj.created_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAgreement(true)}>
                <FileText className="h-4 w-4 mr-2" />
                View Agreement
              </Button>
              {onEdit && (
                <Button onClick={() => onEdit(leaseObj)} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Lease
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Main Info Columns */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Property Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Property Name</p>
                  <p className="font-medium">{leaseObj.unit?.property?.title || leaseObj.property?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unit Number</p>
                  <p className="font-medium">{leaseObj.unit?.unitNumber || leaseObj.unit?.unit || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{leaseObj.unit?.type || leaseObj.unit?.property?.type || "Residential"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{leaseObj.unit?.property?.location || "—"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tenant Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-600" />
                  Tenant Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="font-medium">{leaseObj.tenant?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nationality</p>
                  <p className="font-medium">{leaseObj.tenant?.nationality || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Emirates ID</p>
                  <p className="font-medium">{leaseObj.tenant?.emiratesId || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contact</p>
                  <p className="font-medium">{leaseObj.tenant?.phone || "—"}</p>
                  <p className="text-xs text-muted-foreground">{leaseObj.tenant?.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Financial Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  Financial Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Primary Rent Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                   <div className="col-span-1 md:col-span-1">
                     <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Annual Rent</p>
                     <p className="font-bold text-xl text-primary">{formatCurrency(annualRent)}</p>
                   </div>
                   <div className="col-span-1 md:col-span-1">
                     <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Payment Terms</p>
                     <p className="font-medium text-lg capitalize">{paymentFrequency}</p>
                   </div>
                   <div className="col-span-2 md:col-span-2 border-l pl-4 border-dashed border-gray-300">
                     <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Payment / Cheque</p>
                     <div className="flex items-baseline gap-2">
                         <p className="font-bold text-xl text-green-700">{formatCurrency(installmentAmount)}</p>
                         <span className="text-xs text-muted-foreground">x {actualChequesCount} {actualChequesCount === 1 ? 'cheque' : 'cheques'}</span>
                     </div>
                   </div>
                </div>

                {/* Tax Breakdown */}
                <div>
                   <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> Tax Details
                   </h4>
                   <div className="grid grid-cols-3 gap-4 text-sm border-t pt-3">
                      <div>
                          <p className="text-muted-foreground">VAT Status</p>
                          <Badge variant={isTaxable ? "default" : "secondary"}>
                              {isTaxable ? "Standard Rate (5%)" : "Exempt / Zero Rated"}
                          </Badge>
                      </div>
                      <div>
                          <p className="text-muted-foreground">VAT Amount(Monthly)</p>
                          <p className="font-medium">{formatCurrency(vatAmount)}</p>
                      </div>
                      <div>
                          <p className="text-muted-foreground">Total (Inc. VAT)</p>
                          <p className="font-bold">{formatCurrency(totalAnnualWithTax)}</p>
                      </div>
                   </div>
                </div>

                <Separator />
                
                {/* Services Breakdown */}
                {Array.isArray(services) && services.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-600" /> Services
                        </h4>
                        <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-xs text-left">
                                    <tr>
                                        <th className="p-2 font-medium text-muted-foreground">Service</th>
                                        <th className="p-2 font-medium text-muted-foreground">Billing</th>
                                        <th className="p-2 font-medium text-muted-foreground text-right">Amount</th>
                                        <th className="p-2 font-medium text-muted-foreground text-right">Tax (5%)</th>
                                        <th className="p-2 font-medium text-muted-foreground text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map((svc: any, i: number) => {
                                        const amount = Number(svc.amount || svc.price || 0);
                                        const tax = svc.isTaxable ? (amount * 0.05) : 0;
                                        const total = amount + tax;
                                        
                                        return (
                                          <tr key={i} className="border-t">
                                              <td className="p-2 font-medium">{svc.name}</td>
                                              <td className="p-2 text-xs text-muted-foreground scroll-m-20">
                                                  {svc.billingMethod === 'charged_separately' ? 'Charged Separately' : 'Included in Rent'}
                                                  {svc.isTaxable && <Badge variant="outline" className="ml-2 text-[10px] h-4">Taxable</Badge>}
                                              </td>
                                              <td className="p-2 text-right">
                                                  {svc.billingMethod === 'charged_separately' ? formatCurrency(amount) : 'Included'}
                                              </td>
                                              <td className="p-2 text-right text-muted-foreground">
                                                  {svc.billingMethod === 'charged_separately' && svc.isTaxable ? formatCurrency(tax) : '-'}
                                              </td>
                                              <td className="p-2 text-right font-medium">
                                                  {svc.billingMethod === 'charged_separately' ? formatCurrency(total) : '-'}
                                              </td>
                                          </tr>
                                        );
                                    })}
                                    <tr className="border-t bg-muted/20">
                                        <td className="p-2 font-semibold" colSpan={2}>Total Services (Extra)</td>
                                        <td className="p-2 text-right font-bold">
                                            {formatCurrency(services.filter((s:any) => s.billingMethod === 'charged_separately').reduce((a:number, b:any) => a + Number(b.amount||0), 0))}
                                        </td>
                                        <td className="p-2 text-right font-bold text-muted-foreground">
                                           {formatCurrency(services.filter((s:any) => s.billingMethod === 'charged_separately' && s.isTaxable).reduce((a:number, b:any) => a + (Number(b.amount||0) * 0.05), 0))}
                                        </td>
                                        <td className="p-2 text-right font-bold text-blue-700">
                                            {formatCurrency(services.filter((s:any) => s.billingMethod === 'charged_separately').reduce((a:number, b:any) => a + Number(b.amount||0) + (b.isTaxable ? Number(b.amount||0)*0.05 : 0), 0))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                


                {/* PDC Schedule */}
                {leaseObj.pdcSchedule && Array.isArray(leaseObj.pdcSchedule) && leaseObj.pdcSchedule.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                       <HistoryIcon className="h-4 w-4" /> Payment Schedule
                    </h4>
                    <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                           <thead className="bg-muted/50 text-xs text-left sticky top-0">
                               <tr>
                                   <th className="p-2">Due Date</th>
                                   <th className="p-2">Cheque #</th>
                                   <th className="p-2 text-right">Amount</th>
                                   <th className="p-2 text-center">Status</th>
                               </tr>
                           </thead>
                           <tbody>
                               {leaseObj.pdcSchedule.map((pdc: any, i: number) => (
                                   <tr key={i} className="border-t hover:bg-muted/50">
                                       <td className="p-2 text-xs">{formatDate(pdc.dueDate || pdc.date)}</td>
                                       <td className="p-2 text-xs font-mono">{pdc.chequeNumber || 'PDC'}</td>
                                       <td className="p-2 text-right font-medium">{formatCurrency(pdc.amount)}</td>
                                       <td className="p-2 text-center">
                                           <Badge variant="outline" className="text-[10px] h-5">{pdc.status || 'Pending'}</Badge>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                        </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
             <Card>
               <CardHeader className="pb-3">
                 <CardTitle className="text-base font-medium flex items-center gap-2">
                   <Calendar className="h-4 w-4" />
                   Term & Dates
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-3 text-sm">
                 <div>
                   <p className="text-muted-foreground">Start Date</p>
                   <p className="font-medium">{formatDate(leaseObj.startDate)}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground">End Date</p>
                   <p className="font-medium">{formatDate(leaseObj.endDate)}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground">Duration</p>
                   <p className="font-medium">{leaseObj.duration || 12} Months</p>
                 </div>
                 <Separator />
                 <div>
                   <p className="text-muted-foreground">Renewal Terms</p>
                   <p className="font-medium text-xs text-pretty">{leaseObj.renewalTerms || "Standard"}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground">Notice Period</p>
                   <p className="font-medium">{leaseObj.terminationNotice || 60} Days</p>
                 </div>
               </CardContent>
             </Card>

             <Card>
               <CardHeader className="pb-3">
                 <CardTitle className="text-base font-medium flex items-center gap-2">
                   <Shield className="h-4 w-4" />
                   Compliance
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-2 text-sm">
                 {(() => {
                    let complianceData = leaseObj.compliance;
                    if (typeof complianceData === 'string') {
                      try {
                        complianceData = JSON.parse(complianceData);
                      } catch (e) {
                        complianceData = {};
                      }
                    }
                    complianceData = complianceData || {};
                     // Helper to check multiple keys for truthiness
                    const check = (keys: string[]) => keys.some(k => complianceData[k] === true);

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span>{authorityLabels.attestationAuthority} registration</span>
                          {(leaseObj.ejariStatus?.toLowerCase() === 'registered' || check(['ejariCompliant', 'ejariRequired'])) ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>{authorityLabels.electricity} connected</span>
                          {check(['dewaConnected', 'dewaConnection']) ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Municipality Registration</span>
                          {check(['municipalityRegistration', 'municipalityRegistered']) ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Insurance Valid</span>
                          {check(['insuranceValid', 'insuranceRequired']) ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Fire Safety Certificate</span>
                          {check(['fireSafetyCertificate', 'fireSafetyValid']) ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Maintenance Certificate</span>
                          {check(['maintenanceCertificate', 'maintenanceValid']) ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground">-</span>}
                        </div>
                      </>
                    );
                  })()}
              </CardContent>
             </Card>

             <Card>
               <CardHeader className="pb-3">
                 <CardTitle className="text-base font-medium flex items-center gap-2">
                   <FileCheck className="h-4 w-4" />
                   Documents
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-2 text-sm">
                 {(() => {
                    let docs = leaseObj.documents;
                    if (typeof docs === 'string') {
                        try { docs = JSON.parse(docs); } catch { docs = []; }
                    }
                    if (!Array.isArray(docs) || docs.length === 0) {
                        return <p className="text-muted-foreground text-xs">No documents attached.</p>;
                    }
                    return docs.map((doc: string, idx: number) => {
                        const fileName = doc.split('/').pop() || `Document ${idx + 1}`;
                        // Construct full URL using API_URL from env or default
                        const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5002/api").replace('/api', '');
                        const url = doc.startsWith('http') ? doc : `${baseUrl}${doc}`; 
                        
                        return (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/20 rounded hover:bg-muted/40 transition-colors">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                                    <span className="truncate text-xs" title={fileName}>{fileName}</span>
                                </div>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                    <Download className="h-3 w-3" />
                                </a>
                            </div>
                        );
                    });
                 })()}
               </CardContent>
             </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
