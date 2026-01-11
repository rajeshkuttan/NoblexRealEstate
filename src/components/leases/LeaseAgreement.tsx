import { useState, useRef } from "react";
import { 
  Download, 
  Printer, 
  Share, 
  Mail, 
  FileText, 
  Calendar, 
  User, 
  Building2, 
  DollarSign, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  Mail as MailIcon,
  CreditCard,
  Banknote,
  Wallet,
  Receipt,
  History,
  RefreshCw,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  Flag,
  Award,
  Star,
  Heart,
  Zap,
  Globe,
  Home,
  Car,
  Wifi,
  Settings,
  Camera,
  FileCheck,
  Edit,
  Eye,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  Stop,
  RotateCcw,
  Save,
  X,
  Check,
  Minus,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Bell,
  Send,
  MessageSquare,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import PDCEditor from "./PDCEditor";

interface LeaseAgreementProps {
  lease: any;
  onClose?: () => void;
}

export default function LeaseAgreement({ lease, onClose }: LeaseAgreementProps) {
  const [activeTab, setActiveTab] = useState("agreement");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPDCEditor, setShowPDCEditor] = useState(false);
  const agreementRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      if (printWindow && agreementRef.current) {
        const printContent = agreementRef.current.innerHTML;
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Lease Agreement - ${lease.leaseNumber}</title>
              <style>
                @page {
                  size: A4;
                  margin: 1in;
                }
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  text-align: center;
                  border-bottom: 2px solid #2563eb;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                }
                .header h1 {
                  color: #2563eb;
                  font-size: 28px;
                  margin: 0;
                }
                .header p {
                  color: #666;
                  margin: 5px 0;
                }
                .section {
                  margin-bottom: 30px;
                }
                .section h2 {
                  color: #2563eb;
                  font-size: 20px;
                  border-bottom: 1px solid #e5e7eb;
                  padding-bottom: 10px;
                  margin-bottom: 15px;
                }
                .section h3 {
                  color: #374151;
                  font-size: 16px;
                  margin: 20px 0 10px 0;
                }
                .info-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 20px;
                  margin-bottom: 20px;
                }
                .info-item {
                  border: 1px solid #e5e7eb;
                  padding: 15px;
                  border-radius: 8px;
                }
                .info-item h4 {
                  color: #2563eb;
                  margin: 0 0 10px 0;
                  font-size: 14px;
                  font-weight: 600;
                }
                .info-item p {
                  margin: 5px 0;
                  font-size: 14px;
                }
                .financial-summary {
                  background: #f8fafc;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 20px 0;
                }
                .financial-item {
                  display: flex;
                  justify-content: space-between;
                  padding: 8px 0;
                  border-bottom: 1px solid #e5e7eb;
                }
                .financial-item:last-child {
                  border-bottom: none;
                  font-weight: bold;
                  font-size: 16px;
                  color: #2563eb;
                }
                .terms-list {
                  list-style: none;
                  padding: 0;
                }
                .terms-list li {
                  padding: 8px 0;
                  border-bottom: 1px solid #f3f4f6;
                }
                .terms-list li:before {
                  content: "•";
                  color: #2563eb;
                  font-weight: bold;
                  margin-right: 10px;
                }
                .signature-section {
                  margin-top: 40px;
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 40px;
                }
                .signature-box {
                  border: 1px solid #e5e7eb;
                  padding: 20px;
                  text-align: center;
                  min-height: 100px;
                }
                .compliance-badges {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 10px;
                  margin: 20px 0;
                }
                .compliance-badge {
                  background: #dcfce7;
                  color: #166534;
                  padding: 5px 10px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: 500;
                }
                .footer {
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 1px solid #e5e7eb;
                  text-align: center;
                  color: #666;
                  font-size: 12px;
                }
                @media print {
                  body { margin: 0; padding: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    } catch (error) {
      console.error("Print error:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      // In a real application, you would use a library like jsPDF or Puppeteer
      // For now, we'll simulate the download
      const element = document.createElement("a");
      const file = new Blob([agreementRef.current?.innerHTML || ""], { type: "text/html" });
      element.href = URL.createObjectURL(file);
      element.download = `lease-agreement-${lease.leaseNumber}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmailAgreement = () => {
    const subject = `Lease Agreement - ${lease.leaseNumber}`;
    const body = `Please find attached the lease agreement for ${lease.property.name} - ${lease.property.unit}.`;
    window.open(`mailto:${lease.tenant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Lease Agreement</h2>
          <p className="text-muted-foreground">{lease.leaseNumber} - {lease.property.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPDCEditor(true)}
            className="no-print"
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Edit PDC
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isPrinting}
            className="no-print"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? "Printing..." : "Print"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="no-print"
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </Button>
          <Button
            variant="outline"
            onClick={handleEmailAgreement}
            className="no-print"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button
            variant="outline"
            onClick={() => navigator.share && navigator.share({
              title: `Lease Agreement - ${lease.leaseNumber}`,
              text: `Lease agreement for ${lease.property.name}`,
              url: window.location.href
            })}
            className="no-print"
          >
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Agreement Content */}
      <div ref={agreementRef} className="bg-white text-black">
        {/* Document Header */}
        <div className="header text-center border-b-2 border-primary pb-6 mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">LEASE AGREEMENT</h1>
          <p className="text-lg text-muted-foreground">United Arab Emirates</p>
          <p className="text-sm text-muted-foreground">Lease Number: {lease.leaseNumber}</p>
          <p className="text-sm text-muted-foreground">Date: {formatDate(lease.leaseDetails.startDate)}</p>
        </div>

        {/* Parties Information */}
        <div className="section mb-8">
          <h2 className="text-xl font-bold text-primary border-b border-gray-200 pb-2 mb-4">PARTIES</h2>
          
          <div className="info-grid grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Landlord Information */}
            <div className="info-item border border-gray-200 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-primary mb-3">LANDLORD</h3>
              <div className="space-y-2">
                <p><strong>Name:</strong> PropManage UAE Properties LLC</p>
                <p><strong>Address:</strong> Business Bay, Dubai, UAE</p>
                <p><strong>License:</strong> DED-123456789</p>
                <p><strong>Phone:</strong> +971 4 123 4567</p>
                <p><strong>Email:</strong> info@propmanage.ae</p>
              </div>
            </div>

            {/* Tenant Information */}
            <div className="info-item border border-gray-200 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-primary mb-3">TENANT</h3>
              <div className="space-y-2">
                <p><strong>Name:</strong> {lease.tenant.name}</p>
                <p><strong>Nationality:</strong> {lease.tenant.nationality}</p>
                <p><strong>Emirates ID:</strong> {lease.tenant.emiratesId}</p>
                <p><strong>Passport:</strong> {lease.tenant.passportNumber}</p>
                <p><strong>Visa Expiry:</strong> {formatDate(lease.tenant.visaExpiry)}</p>
                <p><strong>Phone:</strong> {lease.tenant.phone}</p>
                <p><strong>Email:</strong> {lease.tenant.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Property Information */}
        <div className="section mb-8">
          <h2 className="text-xl font-bold text-primary border-b border-gray-200 pb-2 mb-4">PROPERTY DETAILS</h2>
          
          <div className="info-item border border-gray-200 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-primary mb-2">Property Information</h4>
                <p><strong>Name:</strong> {lease.property.name}</p>
                <p><strong>Unit:</strong> {lease.property.unit}</p>
                <p><strong>Type:</strong> {lease.property.type.charAt(0).toUpperCase() + lease.property.type.slice(1)}</p>
                <p><strong>Area:</strong> {lease.property.area} sq ft</p>
              </div>
              <div>
                <h4 className="font-semibold text-primary mb-2">Property Features</h4>
                <p><strong>Bedrooms:</strong> {lease.property.bedrooms}</p>
                <p><strong>Bathrooms:</strong> {lease.property.bathrooms}</p>
                <p><strong>Parking:</strong> {lease.property.parking} spaces</p>
              </div>
            </div>
            <div className="mt-4">
              <p><strong>Address:</strong> {lease.property.address}</p>
            </div>
          </div>
        </div>

        {/* Lease Terms */}
        <div className="section mb-8">
          <h2 className="text-xl font-bold text-primary border-b border-gray-200 pb-2 mb-4">LEASE TERMS</h2>
          
          <div className="info-grid grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="info-item border border-gray-200 p-4 rounded-lg">
              <h4 className="font-semibold text-primary mb-3">Lease Period</h4>
              <p><strong>Start Date:</strong> {formatDate(lease.leaseDetails.startDate)}</p>
              <p><strong>End Date:</strong> {formatDate(lease.leaseDetails.endDate)}</p>
              <p><strong>Duration:</strong> {lease.leaseDetails.duration} months</p>
              <p><strong>Payment Terms:</strong> {lease.leaseDetails.paymentTerms.charAt(0).toUpperCase() + lease.leaseDetails.paymentTerms.slice(1)}</p>
            </div>

            <div className="info-item border border-gray-200 p-4 rounded-lg">
              <h4 className="font-semibold text-primary mb-3">Payment Details</h4>
              <p><strong>Grace Period:</strong> {lease.leaseDetails.gracePeriod} days</p>
              <p><strong>Late Fee:</strong> {formatCurrency(lease.leaseDetails.lateFee)}</p>
              <p><strong>Termination Notice:</strong> {lease.leaseDetails.terminationNotice} days</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="section mb-8">
          <h2 className="text-xl font-bold text-primary border-b border-gray-200 pb-2 mb-4">FINANCIAL SUMMARY</h2>
          
          <div className="financial-summary bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="financial-item">
              <span>Monthly Rent:</span>
              <span>{formatCurrency(lease.leaseDetails.monthlyRent)}</span>
            </div>
            <div className="financial-item">
              <span>Annual Rent:</span>
              <span>{formatCurrency(lease.leaseDetails.annualRent)}</span>
            </div>
            <div className="financial-item">
              <span>Security Deposit:</span>
              <span>{formatCurrency(lease.leaseDetails.securityDeposit)}</span>
            </div>
            <div className="financial-item">
              <span>Agency Fee:</span>
              <span>{formatCurrency(lease.leaseDetails.agencyFee)}</span>
            </div>
            <div className="financial-item">
              <span>Ejari Fee:</span>
              <span>{formatCurrency(lease.leaseDetails.ejariFee)}</span>
            </div>
            <div className="financial-item">
              <span>DEWA Deposit:</span>
              <span>{formatCurrency(lease.leaseDetails.dewaDeposit)}</span>
            </div>
            <div className="financial-item">
              <span>Municipality Fee:</span>
              <span>{formatCurrency(lease.leaseDetails.municipalityFee)}</span>
            </div>
            <div className="financial-item border-t-2 border-primary font-bold text-lg">
              <span>Total Deposits:</span>
              <span>{formatCurrency(lease.leaseDetails.totalDeposits)}</span>
            </div>
          </div>
        </div>

        {/* Post Dated Cheques (PDC) Section */}
        <div className="section mb-8">
          <h2 className="text-xl font-bold text-primary border-b border-gray-200 pb-2 mb-4">POST DATED CHEQUES (PDC)</h2>
          
          <div className="pdc-section bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                PDC Requirements
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                As per UAE real estate standards, the tenant is required to provide post dated cheques for rent payments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="pdc-details">
                <h4 className="font-semibold text-blue-900 mb-3">PDC Schedule</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Number of PDCs:</span>
                    <span className="font-medium">{lease.pdc?.numberOfCheques || '12'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">PDC Amount per Cheque:</span>
                    <span className="font-medium">{formatCurrency(lease.leaseDetails.monthlyRent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">PDC Frequency:</span>
                    <span className="font-medium">{lease.pdc?.frequency || 'Monthly'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">First PDC Date:</span>
                    <span className="font-medium">{lease.pdc?.firstChequeDate ? formatDate(lease.pdc.firstChequeDate) : formatDate(lease.leaseDetails.startDate)}</span>
                  </div>
                </div>
              </div>

              <div className="pdc-terms">
                <h4 className="font-semibold text-blue-900 mb-3">PDC Terms & Conditions</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>All PDCs must be collected before lease commencement</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>AED 500 penalty for bounced cheques plus bank charges</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>PDCs can be replaced with 7 days notice and valid reason</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Bank charges apply for bounced cheques</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PDC Schedule Table */}
            <div className="mt-6">
              <h4 className="font-semibold text-blue-900 mb-3">PDC Schedule</h4>
              <div className="overflow-x-auto">
                <table className="w-full border border-blue-200 rounded-lg">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-blue-900">Cheque #</th>
                      <th className="text-left p-3 text-sm font-semibold text-blue-900">Amount</th>
                      <th className="text-left p-3 text-sm font-semibold text-blue-900">Date</th>
                      <th className="text-left p-3 text-sm font-semibold text-blue-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: lease.pdc?.numberOfCheques || 12 }, (_, index) => {
                      const chequeDate = new Date(lease.pdc?.firstChequeDate || lease.leaseDetails.startDate);
                      chequeDate.setMonth(chequeDate.getMonth() + index);
                      return (
                        <tr key={index} className="border-t border-blue-200">
                          <td className="p-3 text-sm">#{index + 1}</td>
                          <td className="p-3 text-sm font-medium">{formatCurrency(lease.leaseDetails.monthlyRent)}</td>
                          <td className="p-3 text-sm">{formatDate(chequeDate.toISOString())}</td>
                          <td className="p-3 text-sm">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Special Terms and Conditions */}
        <div className="section mb-8">
          <h2 className="text-xl font-bold text-primary border-b border-gray-200 pb-2 mb-4">TERMS AND CONDITIONS</h2>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-primary mb-2">Renewal Terms</h4>
              <p className="text-sm">{lease.leaseDetails.renewalTerms}</p>
            </div>
            
            {lease.specialTerms && lease.specialTerms.length > 0 && (
              <div>
                <h4 className="font-semibold text-primary mb-2">Special Terms</h4>
                <ul className="terms-list list-none p-0">
                  {lease.specialTerms.map((term: string, index: number) => (
                    <li key={index} className="py-2 border-b border-gray-100">
                      {term}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* UAE Compliance */}
        <div className="section mb-8">
          <h2 className="text-xl font-bold text-primary border-b border-gray-200 pb-2 mb-4">UAE COMPLIANCE</h2>
          
          <div className="compliance-badges flex flex-wrap gap-2 mb-4">
            {lease.compliance.ejariCompliant && (
              <span className="compliance-badge bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                ✓ Ejari Registered
              </span>
            )}
            {lease.compliance.dewaConnected && (
              <span className="compliance-badge bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                ✓ DEWA Connected
              </span>
            )}
            {lease.compliance.municipalityRegistered && (
              <span className="compliance-badge bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                ✓ Municipality Registered
              </span>
            )}
            {lease.compliance.insuranceValid && (
              <span className="compliance-badge bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                ✓ Insurance Valid
              </span>
            )}
            {lease.compliance.fireSafety && (
              <span className="compliance-badge bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                ✓ Fire Safety Certificate
              </span>
            )}
            {lease.compliance.maintenanceUpToDate && (
              <span className="compliance-badge bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                ✓ Maintenance Certificate
              </span>
            )}
          </div>

          {lease.ejariNumber && (
            <div className="info-item border border-gray-200 p-4 rounded-lg">
              <h4 className="font-semibold text-primary mb-2">Ejari Registration</h4>
              <p><strong>Ejari Number:</strong> {lease.ejariNumber}</p>
              <p><strong>Registration Date:</strong> {formatDate(lease.ejariRegistrationDate)}</p>
              <p><strong>Expiry Date:</strong> {formatDate(lease.ejariExpiryDate)}</p>
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="section mb-8">
          <h2 className="text-xl font-bold text-primary border-b border-gray-200 pb-2 mb-4">EMERGENCY CONTACT</h2>
          
          <div className="info-item border border-gray-200 p-4 rounded-lg">
            <p><strong>Name:</strong> {lease.emergencyContact.name}</p>
            <p><strong>Phone:</strong> {lease.emergencyContact.phone}</p>
            <p><strong>Relation:</strong> {lease.emergencyContact.relation}</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="section mb-8">
          <h2 className="text-xl font-bold text-primary border-b border-gray-200 pb-2 mb-4">SIGNATURES</h2>
          
          <div className="signature-section grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="signature-box border border-gray-200 p-6 text-center">
              <h4 className="font-semibold text-primary mb-4">LANDLORD SIGNATURE</h4>
              <div className="border-b border-gray-300 mb-2" style={{ height: "60px" }}></div>
              <p className="text-sm text-gray-600">PropManage UAE Properties LLC</p>
              <p className="text-sm text-gray-600">Date: _______________</p>
            </div>
            
            <div className="signature-box border border-gray-200 p-6 text-center">
              <h4 className="font-semibold text-primary mb-4">TENANT SIGNATURE</h4>
              <div className="border-b border-gray-300 mb-2" style={{ height: "60px" }}></div>
              <p className="text-sm text-gray-600">{lease.tenant.name}</p>
              <p className="text-sm text-gray-600">Date: _______________</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer mt-8 pt-6 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p>This lease agreement is governed by the laws of the United Arab Emirates.</p>
          <p>Generated on {new Date().toLocaleDateString("en-AE")} by PropManage UAE</p>
        </div>
      </div>

      {/* PDC Editor Modal */}
      {showPDCEditor && (
        <PDCEditor
          isOpen={showPDCEditor}
          onClose={() => setShowPDCEditor(false)}
          lease={lease}
          onSave={(pdcData) => {
            console.log("PDC data saved:", pdcData);
            // Here you would typically update the lease data
            setShowPDCEditor(false);
          }}
        />
      )}
    </div>
  );
}