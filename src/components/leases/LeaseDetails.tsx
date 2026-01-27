import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Info
} from "lucide-react";
import LeaseAgreement from "./LeaseAgreement";
import { useState } from "react";

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
  const [showAgreement, setShowAgreement] = useState(false);

  if (!lease) return null;

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start pr-8">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                {lease.leaseNumber}
                <Badge className={statusColor(lease.status)}>
                  {lease.status?.toUpperCase() || "DRAFT"}
                </Badge>
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                Created on {formatDate(lease.createdAt || lease.created_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAgreement(true)}>
                <FileText className="h-4 w-4 mr-2" />
                View Agreement
              </Button>
              {onEdit && (
                <Button onClick={() => onEdit(lease)} size="sm">
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
                  <p className="font-medium">{lease.unit?.property?.title || lease.property?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unit Number</p>
                  <p className="font-medium">{lease.unit?.unitNumber || lease.unit?.unit || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{lease.unit?.type || lease.unit?.property?.type || "Residential"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{lease.unit?.property?.location || "—"}</p>
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
                  <p className="font-medium">{lease.tenant?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nationality</p>
                  <p className="font-medium">{lease.tenant?.nationality || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Emirates ID</p>
                  <p className="font-medium">{lease.tenant?.emiratesId || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contact</p>
                  <p className="font-medium">{lease.tenant?.phone || "—"}</p>
                  <p className="text-xs text-muted-foreground">{lease.tenant?.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Financial Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  Financial Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                   <div>
                     <p className="text-muted-foreground">Annual Rent</p>
                     <p className="font-bold text-lg">{formatCurrency(lease.annualRent || (lease.rentAmount * 12))}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Monthly Rent</p>
                     <p className="font-medium">{formatCurrency(lease.rentAmount)}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Security Deposit</p>
                     <p className="font-medium">{formatCurrency(lease.depositAmount)}</p>
                   </div>
                </div>

                <Separator />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                   <div>
                      <p className="text-muted-foreground">Agency Fee</p>
                      <p>{formatCurrency(lease.agencyFee)}</p>
                   </div>
                   <div>
                      <p className="text-muted-foreground">Ejari Fee</p>
                      <p>{formatCurrency(lease.ejariFee)}</p>
                   </div>
                   <div>
                      <p className="text-muted-foreground">DEWA Deposit</p>
                      <p>{formatCurrency(lease.dewaDeposit)}</p>
                   </div>
                   <div>
                      <p className="text-muted-foreground">Total Deposits</p>
                      <p className="font-semibold">{formatCurrency(lease.totalDeposits)}</p>
                   </div>
                </div>

                {lease.pdcSchedule && Array.isArray(lease.pdcSchedule) && lease.pdcSchedule.length > 0 && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-md">
                    <p className="font-medium text-sm mb-2">PDC Schedule ({lease.pdcSchedule.length} Cheques)</p>
                    <div className="space-y-1">
                      {lease.pdcSchedule.slice(0, 3).map((pdc: any, i: number) => (
                         <div key={i} className="flex justify-between text-xs">
                           <span>{formatDate(pdc.dueDate || pdc.date)}</span>
                           <span>{formatCurrency(pdc.amount)}</span>
                         </div>
                      ))}
                      {lease.pdcSchedule.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">+ {lease.pdcSchedule.length - 3} more</p>
                      )}
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
                   <p className="font-medium">{formatDate(lease.startDate)}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground">End Date</p>
                   <p className="font-medium">{formatDate(lease.endDate)}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground">Duration</p>
                   <p className="font-medium">{lease.duration || 12} Months</p>
                 </div>
                 <Separator />
                 <div>
                   <p className="text-muted-foreground">Renewal Terms</p>
                   <p className="font-medium text-xs text-pretty">{lease.renewalTerms || "Standard"}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground">Notice Period</p>
                   <p className="font-medium">{lease.terminationNotice || 60} Days</p>
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
                    let complianceData = lease.compliance;
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
                          <span>Ejari Registered</span>
                          {(lease.ejariStatus?.toLowerCase() === 'registered' || check(['ejariCompliant', 'ejariRequired'])) ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground">-</span>}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>DEWA Connected</span>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
