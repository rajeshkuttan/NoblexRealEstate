import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Receipt, 
  User, 
  Building2, 
  Calendar, 
  FileText, 
  Plus, 
  X, 
  Save, 
  Upload, 
  Download, 
  Check, 
  AlertCircle, 
  Info, 
  Clock, 
  Target, 
  Award, 
  Star, 
  Heart, 
  Zap, 
  Globe, 
  Home, 
  Building, 
  Store, 
  Warehouse, 
  Loader2,
  Car, 
  Wifi, 
  Shield, 
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
  RotateCcw, 
  Minus,
  Search,
  Filter,
  Grid3X3,
  List,
  BarChart3,
  PieChart,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Banknote,
  Wallet,
  History,
  RefreshCw,
  Trash2,
  Copy,
  Share,
  ExternalLink,
  Lock,
  Unlock,
  Flag,
  Bell,
  Send,
  MessageSquare,
  Users,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// UAE-compliant invoice form validation schema
const invoiceFormSchema = z.object({
  // Basic Information
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  period: z.string().min(1, "Period is required"),
  
  // Tenant Information
  tenant: z.object({
    id: z.number(),
    name: z.string().min(1, "Tenant name is required"),
    email: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    emiratesId: z.string().optional().or(z.literal('')),
    nationality: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
  }),
  
  // Property Information
  property: z.object({
    id: z.number(),
    name: z.string().min(1, "Property name is required"),
    unit: z.string().min(1, "Unit number is required"),
    address: z.string().min(1, "Property address is required"),
  }),
  
  // Lease Information
  lease: z.object({
    id: z.string().min(1, "Lease ID is required"),
    startDate: z.string().min(1, "Lease start date is required"),
    endDate: z.string().min(1, "Lease end date is required"),
    monthlyRent: z.number().min(0, "Monthly rent must be 0 or greater"),
  }),
  
  // Invoice Details
  invoiceDetails: z.object({
    description: z.string().min(1, "Description is required"),
    subtotal: z.number().min(0, "Subtotal must be 0 or greater"),
    vatRate: z.number().min(0).max(100, "VAT rate must be between 0 and 100"),
    vatAmount: z.number().min(0, "VAT amount must be 0 or greater"),
    total: z.number().min(0, "Total must be 0 or greater"),
    currency: z.string().min(1, "Currency is required"),
    paymentTerms: z.string().min(1, "Payment terms are required"),
    lateFee: z.number().min(0, "Late fee must be 0 or greater"),
    gracePeriod: z.number().min(0, "Grace period must be 0 or greater"),
  }),
  
  // PDC Selection
  selectedPDC: z.array(z.any()).optional(),
  
  // Company Information
  companyInfo: z.object({
    name: z.string().min(1, "Company name is required"),
    license: z.string().min(1, "License number is required"),
    address: z.string().min(1, "Company address is required"),
    phone: z.string().min(1, "Phone number is required"),
    email: z.string().email("Invalid email address"),
    vatNumber: z.string().min(1, "VAT number is required"),
  }),
  
  // Additional Information
  notes: z.string().optional(),
  attachments: z.array(z.union([z.string(), z.object({ url: z.string(), name: z.string(), id: z.number().optional() })])).optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, files?: File[]) => Promise<void> | void;
  initialData?: any;
  mode: "create" | "edit";
}

const currencies = [
  { value: "AED", label: "UAE Dirham (AED)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
];

const vatRates = [
  { value: 0, label: "0% - Zero Rated" },
  { value: 5, label: "5% - Standard Rate" },
  { value: 20, label: "20% - Special Rate" },
];

const paymentTerms = [
  "Net 15 days",
  "Net 30 days",
  "Net 45 days",
  "Net 60 days",
  "Due on receipt",
  "Cash on delivery",
  "Prepaid",
];

import { tenantsAPI, leasesAPI, chequesAPI, companySettingsAPI } from "@/services/api";

export default function InvoiceForm({ isOpen, onClose, onSubmit, initialData, mode }: InvoiceFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [selectedPDC, setSelectedPDC] = useState<any[]>([]);
  const [availablePDC, setAvailablePDC] = useState<any[]>([]);
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPDC, setIsLoadingPDC] = useState(false);
  const [isRefreshingLeases, setIsRefreshingLeases] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: initialData || {
      invoiceNumber: "",
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: "",
      period: "",
      tenant: {
        id: 0,
        name: "",
        email: "",
        phone: "",
        emiratesId: "",
        nationality: "",
        address: "",
      },
      property: {
        id: 0,
        name: "",
        unit: "",
        address: "",
      },
      lease: {
        id: "",
        startDate: "",
        endDate: "",
        monthlyRent: 0,
      },
      invoiceDetails: {
        description: "",
        subtotal: 0,
        vatRate: 5,
        vatAmount: 0,
        total: 0,
        currency: "AED",
        paymentTerms: "Net 30 days",
        lateFee: 0,
        gracePeriod: 5,
      },
      companyInfo: {
        name: "PropManage UAE Properties LLC",
        license: "DED-123456789",
        address: "Business Bay, Dubai, UAE",
        phone: "+971 4 123 4567",
        email: "info@propmanage.ae",
        vatNumber: "100123456789123",
      },
      notes: "",
      attachments: [],
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = form;
  
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const tenantsRes = await tenantsAPI.getAll().catch((err) => {
          return null;
        });
        const companyRes = await companySettingsAPI.getSettings().catch((err) => {
          return null;
        });
        
        // Handle tenants
        if (tenantsRes) {
          const tenantsData = tenantsRes.data?.data?.tenants || tenantsRes.data?.tenants || tenantsRes.data || [];
          setTenantsList(Array.isArray(tenantsData) ? tenantsData : []);
        }

        // Handle Single Company Data Auto-fill
        if (companyRes) {
          const companyData = companyRes.data?.data || companyRes.data;
          if (companyData) {
               setValue("companyInfo.name", companyData.companyName || "");
               setValue("companyInfo.license", companyData.tradeLicense || "");
               setValue("companyInfo.address", companyData.address || "");
               setValue("companyInfo.phone", companyData.phone || "");
               setValue("companyInfo.email", companyData.email || "");
               setValue("companyInfo.vatNumber", companyData.vatNumber || "");
          }
        }

      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen, setValue]);

  const watchedValues = watch();

  // Helper function to parse JSON arrays
  const parseJSON = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Load edit data when modal opens in edit mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && initialData) {
      setTimeout(() => {
        const parsedAttachments = parseJSON(initialData.attachments);
        // Helper to get items object (handle string or object)
        const parsedItems = typeof initialData.items === 'string' 
            ? JSON.parse(initialData.items) 
            : (initialData.items || {});
        
        setSelectedFiles([]); // Reset new uploads on edit load

        form.reset({
          ...initialData,
          issueDate: initialData.invoiceDate ? new Date(initialData.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
          period: initialData.period || parsedItems.period || '',
          companyInfo: parsedItems.companyInfo || initialData.companyInfo || {
            name: "PropManage UAE Properties LLC",
            license: "DED-123456789",
            address: "Business Bay, Dubai, UAE",
            phone: "+971 4 123 4567",
            email: "accounts@propmanage.ae",
            vatNumber: "TRN-123456789",
            logo: "",
            signatory: "Authorized Signatory"
          },
          invoiceDetails: {
            description: initialData.description || "",
            subtotal: parseFloat(initialData.subtotal) || 0,
            vatRate: parseFloat(initialData.taxRate) || 5, // Map taxRate -> vatRate
            vatAmount: parseFloat(initialData.taxAmount) || 0, // Map taxAmount -> vatAmount
            total: parseFloat(initialData.totalAmount) || 0, // Map totalAmount -> total
            currency: initialData.currency || "AED",
            paymentTerms: initialData.paymentTerms || "Net 30 days",
            lateFee: parseFloat(initialData.lateFee) || 0,
            gracePeriod: parseFloat(initialData.gracePeriod) || 0,
          },
          attachments: parsedAttachments,
        });

        // Update state
        if (initialData.tenant) setSelectedTenant(initialData.tenant);
        if (initialData.property) setSelectedProperty(initialData.property); 
        if (initialData.lease) {
            handleLeaseChange(String(initialData.lease.id), String(initialData.id), initialData.lease); 
        }
      }, 150);
    } else if (mode === "create") {
      form.reset({
        invoiceNumber: "",
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: "",
        period: "",
        tenant: {
            id: 0,
            name: "",
            email: "",
            phone: "",
            emiratesId: "",
            nationality: "",
            address: "",
          },
          property: {
            id: 0,
            name: "",
            unit: "",
            address: "",
          },
          lease: {
            id: "",
            startDate: "",
            endDate: "",
            monthlyRent: 0,
          },
        invoiceDetails: {
          description: "",
          subtotal: 0,
          vatRate: 5,
          vatAmount: 0,
          total: 0,
          currency: "AED",
          paymentTerms: "Net 30 days",
          lateFee: 0,
          gracePeriod: 5,
        },
        companyInfo: {
          name: "PropManage UAE Properties LLC",
          license: "DED-123456789",
          address: "Business Bay, Dubai, UAE",
          phone: "+971 4 123 4567",
          email: "info@propmanage.ae",
          vatNumber: "100123456789123",
        },
        notes: "",
        attachments: [],
      });
      setSelectedTenant(null);
      setSelectedProperty(null);
      setSelectedLease(null);
      setSelectedPDC([]);
      setAvailablePDC([]);
      setSelectedFiles([]);
    }
  }, [isOpen, mode, initialData, form]);

  // Calculate derived values
  const calculateDerivedValues = () => {
    const subtotal = watchedValues.invoiceDetails?.subtotal || 0;
    const vatRate = watchedValues.invoiceDetails?.vatRate || 0;
    const vatAmount = (subtotal * vatRate) / 100;
    const total = subtotal + vatAmount;

    setValue("invoiceDetails.vatAmount", vatAmount);
    setValue("invoiceDetails.total", total);
  };

  // Auto-fill invoice details when PDCs are selected
  useEffect(() => {
    if (selectedPDC.length > 0) {
      const totalPDCAmount = selectedPDC.reduce((sum, pdc) => sum + (Number(pdc.amount) || 0), 0);
      const vatRate = 5; // UAE VAT rate
      const vatAmount = (totalPDCAmount * vatRate) / 100;
      const totalAmount = totalPDCAmount + vatAmount;
      
      const pdcDescription = selectedPDC.map(pdc => {
         if (pdc.chequeNumber === 'Pending' || !pdc.chequeNumber) {
            return `PDC ${new Date(pdc.chequeDate || pdc.dueDate ||  new Date()).toLocaleDateString()}`;
         }
         return pdc.chequeNumber;
      }).join(", ");

      // Update form values
      setValue("invoiceDetails.subtotal", totalPDCAmount);
      setValue("invoiceDetails.vatRate", vatRate);
      setValue("invoiceDetails.vatAmount", vatAmount);
      setValue("invoiceDetails.total", totalAmount);
      setValue("invoiceDetails.description", `Rent payment for ${selectedProperty?.name || 'Property'} - ${selectedProperty?.unit || 'Unit'} (PDC: ${pdcDescription})`);
      setValue("invoiceDetails.currency", "AED");
      setValue("invoiceDetails.paymentTerms", "Due on receipt");
      setValue("invoiceDetails.lateFee", 0);
      setValue("invoiceDetails.gracePeriod", 0);
    }
  }, [selectedPDC, setValue, selectedProperty]);

  const [tenantLeases, setTenantLeases] = useState<any[]>([]);

  const fetchTenantLeases = async (tenantId: number, silent = false) => {
    if (!silent) setIsRefreshingLeases(true);
    try {
      const leasesResponse = await leasesAPI.getAll({ tenantId });
      const leasesData = leasesResponse.data?.data?.leases || leasesResponse.data || [];
      
      const filteredLeases = Array.isArray(leasesData) 
        ? [...leasesData].sort((a, b) => {
            // Strictly sort by ID descending (newest first)
            const idA = String(a.id);
            const idB = String(b.id);
            
            // Try numeric sort for integer IDs
            const numA = parseInt(idA);
            const numB = parseInt(idB);
            
            if (!isNaN(numA) && !isNaN(numB)) {
                return numB - numA;
            }
            
            // Fallback to alphanumeric comparison
            return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
          }) 
        : [];
      setTenantLeases(filteredLeases);
      
      if (!silent) {
        if (filteredLeases.length === 0) {
          toast.info("No leases found for this tenant.");
        } else {
          toast.success(`Updated leases list (${filteredLeases.length} found)`);
        }
      }

      // If we only have one active lease and none selected, auto-select it
      const activeLeases = filteredLeases.filter(l => l.status?.toLowerCase() === 'active');
      if (activeLeases.length === 1 && !selectedLease) {
        await handleLeaseChange(String(activeLeases[0].id));
      }
    } catch (error) {
      console.error("Error fetching lease details:", error);
      if (!silent) toast.error("Failed to fetch leases.");
    } finally {
      if (!silent) setIsRefreshingLeases(false);
    }
  };

  // Auto-refresh leases when switching to tenant tab
  useEffect(() => {
    if (activeTab === "tenant" && selectedTenant?.id) {
      fetchTenantLeases(selectedTenant.id, true);
    }
  }, [activeTab, selectedTenant]);

  const handleLeaseChange = async (leaseId: string, currentInvoiceId?: any, leaseObject?: any) => {
    let activeLease = leaseObject;

    setIsLoadingPDC(true); // START LOADING

    // CLEAR STATE IMMEDIATELY to prevent stale data
    setAvailablePDC([]);
    setSelectedPDC([]);
    
    if (!activeLease) {
        activeLease = tenantLeases.find(l => String(l.id) === String(leaseId));
    }
    
    if (activeLease && (!activeLease.services || !Array.isArray(activeLease.services))) {
         try {
            const fullLeaseRes = await leasesAPI.getById(leaseId, true); 
            const fullLease = fullLeaseRes.data?.data || fullLeaseRes.data;
            if (fullLease) {
                activeLease = { ...activeLease, ...fullLease };
            }
         } catch (err) {
            console.error("Error fetching full lease details:", err);
         }
    }

    if (!activeLease) {
        console.warn("handleLeaseChange: Lease not found", leaseId);
        return;
    }

    const monthlyRent = activeLease.rentAmount ? parseFloat(activeLease.rentAmount) : 0;
            
    // Format lease object for UI display
    const formattedLease = {
        ...activeLease,
        monthlyRent: monthlyRent
    };

    setSelectedLease(formattedLease);
    setValue("lease", {
        id: String(activeLease.id),
        startDate: activeLease.startDate,
        endDate: activeLease.endDate,
        monthlyRent: monthlyRent
    });

    // Auto-fill invoice number from lease
    const leaseIdOrNumber = activeLease.leaseNumber || String(activeLease.id);
    if (leaseIdOrNumber) {
        setValue("invoiceNumber", leaseIdOrNumber);
    }

    // Set property/unit details
    const property = activeLease.unit?.property;
    const unit = activeLease.unit;

    if (property || unit) {
        const propData = {
            id: property?.id || 0,
            name: property?.title || "Unknown Property",
            unit: unit?.unitNumber || "Unknown Unit",
            address: property?.location || "Unknown Address"
        };
        setSelectedProperty(propData);
        setValue("property", propData);
    }
    
    try {
        let masterList: any[] = [];
        let dbCheques: any[] = [];
        if (activeLease.pdcSchedule) {
            if (typeof activeLease.pdcSchedule === 'string') {
                try {
                    masterList = JSON.parse(activeLease.pdcSchedule);
                } catch (e) {
                    console.error("Error parsing pdcSchedule:", e);
                    masterList = [];
                }
            } else if (Array.isArray(activeLease.pdcSchedule)) {
                 masterList = activeLease.pdcSchedule;
            }
        }

        const params = { 
            leaseId: activeLease.id,
            limit: 100,
            _t: new Date().getTime() 
        };

        const pdcResponse = await chequesAPI.getAll(params);
        dbCheques = pdcResponse.data?.data?.cheques || pdcResponse.data || [];

        let rentPDCs = [];
        let cdqPDCs = [];
        let preSelectedPDCs: any[] = [];
        const usedChequeIds = new Set<string>();
        
        if (masterList.length > 0) {
            rentPDCs = masterList.map((scheduledItem, index) => {
                const sNum = String(scheduledItem.chequeNumber).trim().toLowerCase();
                const rawAmount = scheduledItem.amount || scheduledItem.chequeAmount || scheduledItem.value || 0;
                const sAmt = parseFloat(rawAmount) || 0;
                const sDate = new Date(scheduledItem.dueDate || scheduledItem.date || scheduledItem.chequeDate).toISOString().split('T')[0];
                const match = dbCheques.find(c => {
                    const cNum = String(c.chequeNumber).trim().toLowerCase();
                    if (sNum !== 'pending' && sNum !== '' && sNum !== '0' && cNum === sNum) return true;
                    const cAmt = parseFloat(c.amount);
                    const cDate = new Date(c.chequeDate).toISOString().split('T')[0];
                    return (Math.abs(cAmt - sAmt) < 1 && cDate === sDate);
                });

                if (match) {
                    usedChequeIds.add(String(match.id));
                    
                    let effectiveInvoiceId = match.invoiceId;
                    if (currentInvoiceId && String(match.invoiceId) === String(currentInvoiceId)) {
                        effectiveInvoiceId = null; // Unlock for this invoice
                    } else if (effectiveInvoiceId) {
                         // It is locked by another invoice
                    }
                    
                    const finalAmount = parseFloat(match.amount) > 0 ? parseFloat(match.amount) : sAmt;

                    const pdcObj = {
                        ...scheduledItem, 
                        // Enhanced with DB data:
                        amount: finalAmount, 
                        id: match.id,     
                        invoiceId: effectiveInvoiceId, 
                        invoice: match.invoice, 
                        chequeType: match.chequeType || 'pdc',
                        status: match.status,
                        isRent: true
                    };

                    if (currentInvoiceId && String(match.invoiceId) === String(currentInvoiceId)) {
                        preSelectedPDCs.push(pdcObj);
                    }

                    return pdcObj;
                } else {
                    // Item in Schedule but NOT in DB (or not synced yet)
                    // Still show it so user knows it exists in plan
                    return {
                        ...scheduledItem,
                        chequeNumber: scheduledItem.chequeNumber || scheduledItem.cheque_number || scheduledItem.chequeNo || `PDC-${new Date(sDate).getMonth() + 1}`,
                        amount: sAmt, 
                        id: `temp-rent-${index}-${Date.now()}`, 
                        invoiceId: null,
                        status: 'pending_db_sync',
                        valDate: sDate, 
                        chequeDate: sDate,
                        dueDate: sDate, 
                        isRent: true,
                        chequeType: 'pdc' 
                    };
                }
            });

        } else {
             rentPDCs = dbCheques.filter(c => !String(c.chequeNumber).startsWith('CDQ')).map(c => {
                 let effectiveInvoiceId = c.invoiceId;
                 if (currentInvoiceId && String(c.invoiceId) === String(currentInvoiceId)) {
                     effectiveInvoiceId = null; 
                     preSelectedPDCs.push(c);
                 }
                 usedChequeIds.add(String(c.id));
                 return { ...c, invoiceId: effectiveInvoiceId, isRent: true };
             });
        }

        let serviceBasedCDQs = [];
        const separateServices = activeLease.services?.filter((s:any) => s.billingMethod === 'charged_separately') || [];

         if (separateServices.length > 0) {
              serviceBasedCDQs = separateServices.map((service: any, index: number) => {
                  const serviceIdx = index + 1;
                  const expectedChequeNum = `CDQ-${String(serviceIdx).padStart(2, '0')}`;
                  const rawAmount = parseFloat(service.amount || service.price || service.value || 0);
                 
                 const match = dbCheques.find(c => {
                      const cNum = String(c.chequeNumber).toUpperCase();
                      const cAmt = parseFloat(c.amount);
                      
                      if (cNum === expectedChequeNum) return true;
                      
                      if (cNum.startsWith('CDQ') && Math.abs(cAmt - rawAmount) < 5) return true; 
                      
                      return false;
                 });

                 if (match && !usedChequeIds.has(String(match.id))) {
                      usedChequeIds.add(String(match.id));
                      
                      let effectiveInvoiceId = match.invoiceId;
                      if (currentInvoiceId && String(match.invoiceId) === String(currentInvoiceId)) {
                          effectiveInvoiceId = null;
                      }

                     const pdcObj = {
                         ...match,
                         chequeNumber: match.chequeNumber,
                         amount: parseFloat(match.amount), // Use DB amount (includes tax)
                         dueDate: match.chequeDate,
                         invoiceId: effectiveInvoiceId,
                         chequeType: match.chequeType || 'current',
                         isExtra: true,
                         serviceName: service.name // Add service name
                      };
                      
                      if (currentInvoiceId && String(match.invoiceId) === String(currentInvoiceId)) {
                         preSelectedPDCs.push(pdcObj);
                      }
                      
                      return pdcObj;
                 } else {
                      // Virtual CDQ Item (Not in DB yet, or unmatched)
                      // Calculate approximate total with tax (5%)
                      const taxRate = activeLease.taxRate || 5;
                      const taxAmount = service.isTaxable ? (rawAmount * taxRate / 100) : 0;
                      const totalAmt = rawAmount + taxAmount;
                      
                      return {
                          chequeNumber: expectedChequeNum,
                          dueDate: new Date(activeLease.startDate), // Due at start
                          status: 'pending_db_sync',
                          chequeType: 'current',
                          bankName: 'Service Charge',
                          isExtra: true,
                          // No ID means it won't be selectable for existing invoice matching logic 
                          // UNLESS we handle "create new" logic. 
                          // But for now, visibility is key.
                          // Generate a unique temp ID for selection to work
                          id: `temp-cdq-${serviceIdx}-${Date.now()}`,
                          // Ensure amount is parsed correctly (check multiple fields)
                          amount: totalAmt > 0 ? totalAmt : (rawAmount > 0 ? rawAmount : 0),
                          valDate: new Date(activeLease.startDate), // required for some logic
                          invoice: null,
                          isRent: false,
                          serviceName: service.name // Add service name
                      };
                 }
             });
        }
        
        // Find any ORPHANED CDQ checks in DB that didn't match services (e.g. manually added)
        const orphanCDQs = dbCheques.filter(c => 
             String(c.chequeNumber).toUpperCase().startsWith('CDQ') && 
             !usedChequeIds.has(String(c.id))
        );

        const cdqPDCsFinal = [...serviceBasedCDQs, ...orphanCDQs.map(c => {
             let effectiveInvoiceId = c.invoiceId;
             if (currentInvoiceId && String(c.invoiceId) === String(currentInvoiceId)) {
                 effectiveInvoiceId = null; 
                 preSelectedPDCs.push(c);
             }
             return {
                 ...c,
                 chequeNumber: c.chequeNumber,
                 amount: parseFloat(c.amount),
                 dueDate: c.chequeDate,
                 invoiceId: effectiveInvoiceId,
                 chequeType: c.chequeType || 'current',
                 isExtra: true
             };
        })];
        
        cdqPDCs = cdqPDCsFinal;

        const allPDCs = [...rentPDCs, ...cdqPDCs];
        setAvailablePDC(allPDCs);

        if (currentInvoiceId && preSelectedPDCs.length > 0) {
            setSelectedPDC(preSelectedPDCs);
            setValue('selectedPDC', preSelectedPDCs);
        }

    } catch (error) {
        console.error("Error fetching PDCs:", error);
    } finally {
        setIsLoadingPDC(false);
    }
  };

  const formatPDCDisplay = (pdc: any) => {
    const num = String(pdc.chequeNumber).trim();
    const isZero = num === '0' || (!isNaN(Number(num)) && Number(num) === 0);
    
    if (!num || isZero || num.toLowerCase() === 'pending' || num.toLowerCase() === 'null' || num === 'undefined') {
        const date = new Date(pdc.chequeDate || pdc.dueDate).toLocaleDateString("en-AE");
        return <span className="italic text-muted-foreground">PDC Due: {date}</span>;
    }
    return pdc.chequeNumber;
  };

  const handleTenantSelect = async (tenant: any) => {
    setSelectedTenant(tenant);
    setValue("tenant", {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        emiratesId: tenant.emiratesId,
        nationality: tenant.nationality,
        address: tenant.address || "N/A"
    });
    
    // Reset related fields
    setSelectedLease(null);
    setSelectedProperty(null);
    setAvailablePDC([]);
    setSelectedPDC([]);
    setTenantLeases([]); 

    await fetchTenantLeases(tenant.id);
  };

  const handlePropertySelect = (property: any) => {
    setSelectedProperty(property);
    setValue("property", property);
  };

  const onFormSubmit = async (data: InvoiceFormData) => {
    
    if (!selectedTenant?.id || !selectedLease?.id) {
        toast.error("Please select a valid Tenant and Lease.");
        return;
    }

    const invoicePayload = {
      invoiceNumber: data.invoiceNumber || `INV-${Date.now()}`,
      invoiceDate: data.issueDate ? new Date(data.issueDate).toISOString() : new Date().toISOString(),
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : new Date().toISOString(),
      period: data.period,
      leaseId: selectedLease.id, 
      tenantId: selectedTenant.id, 
      description: data.invoiceDetails?.description || `Invoice for ${data.period}`,
      subtotal: Number(data.invoiceDetails?.subtotal || 0),
      taxRate: Number(data.invoiceDetails?.vatRate || 5),
      taxAmount: Number(data.invoiceDetails?.vatAmount || 0),
      totalAmount: Number(data.invoiceDetails?.total || 0),
      status: 'sent',
         items: {
          itemDescription: data.invoiceDetails?.description,
          period: data.period,
          companyInfo: data.companyInfo 
       },
      selectedPDC: selectedPDC.map((pdc: any) => {
         const pdcIdStr = String(pdc.id || '');
         if (pdcIdStr.startsWith('temp-cdq-') || pdcIdStr.startsWith('temp-rent-')) {
             return pdc;
         }
         return pdc.id || pdc;
      }),
      notes: data.notes,
      attachments: JSON.stringify(data.attachments || [])
    };
    await onSubmit(invoicePayload, selectedFiles);
  };

  const onInvalid = (errors: any) => {
    
    const fieldToTab: Record<string, string> = {
      invoiceNumber: "basic",
      issueDate: "basic",
      dueDate: "basic",
      period: "basic",
      tenant: "tenant",
      lease: "tenant", 
      property: "tenant", 
      invoiceDetails: "details",
      selectedPDC: "pdc",
      companyInfo: "company"
    };

    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField && fieldToTab[firstErrorField]) {
      setActiveTab(fieldToTab[firstErrorField]);
      toast.error(`Please fix validation errors in the ${fieldToTab[firstErrorField]} tab.`);
    } else if (firstErrorField) {
       const parentField = firstErrorField.split('.')[0];
       if (fieldToTab[parentField]) {
         setActiveTab(fieldToTab[parentField]);
         toast.error(`Please fix validation errors in the ${fieldToTab[parentField]} tab.`);
       }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen rounded-none m-0 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Create New Invoice" : "Edit Invoice"}
          </DialogTitle>
          <p className="text-muted-foreground">
            {mode === "create" 
              ? "Create a new invoice following UAE VAT compliance standards"
              : "Update the invoice details"
            }
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onFormSubmit, onInvalid)} className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="tenant">Tenant</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="pdc">PDC Selection</TabsTrigger>

              <TabsTrigger value="company">Company</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Invoice Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                      <Input
                        id="invoiceNumber"
                        {...register("invoiceNumber")}
                        placeholder="INV-2024-001"
                        className={errors.invoiceNumber ? "border-red-500" : ""}
                        disabled={mode === "edit" || !!selectedLease}
                      />
                      {errors.invoiceNumber && (
                        <p className="text-sm text-red-500 mt-1">{errors.invoiceNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="period">Period *</Label>
                      <Input
                        id="period"
                        {...register("period")}
                        placeholder="March 2024"
                        className={errors.period ? "border-red-500" : ""}
                      />
                      {errors.period && (
                        <p className="text-sm text-red-500 mt-1">{errors.period.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="issueDate">Issue Date *</Label>
                      <Input
                        id="issueDate"
                        type="date"
                        {...register("issueDate")}
                        className={errors.issueDate ? "border-red-500" : ""}
                      />
                      {errors.issueDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.issueDate.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="dueDate">Due Date *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        {...register("dueDate")}
                        className={errors.dueDate ? "border-red-500" : ""}
                      />
                      {errors.dueDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.dueDate.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Auto-filled from PDC selection) *</Label>
                    <Textarea
                      id="description"
                      {...register("invoiceDetails.description")}
                      placeholder="Monthly Rent - March 2024"
                      rows={2}
                      className={errors.invoiceDetails?.description ? "border-red-500" : ""}
                    />
                    {errors.invoiceDetails?.description && (
                      <p className="text-sm text-red-500 mt-1">{errors.invoiceDetails.description.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tenant Information Tab */}
            <TabsContent value="tenant" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Tenant Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tenantsList.map((tenant) => (
                      <div
                        key={tenant.id}
                        className={cn(
                          "p-4 border rounded-lg transition-all duration-200",
                          selectedTenant?.id === tenant.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50",
                          mode === "edit" ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        )}
                        onClick={() => mode !== "edit" && handleTenantSelect(tenant)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{tenant.name}</p>
                            <p className="text-sm text-muted-foreground">{tenant.nationality}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>{tenant.email}</p>
                          <p>{tenant.phone}</p>
                          <p className="text-xs">{tenant.emiratesId}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedTenant && (
                    <div className="space-y-4">


                      {/* Lease Selection - Always show if tenant selected */}
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">Select Lease</h4>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-2 text-xs hover:bg-primary/10 hover:text-primary transition-colors" 
                            onClick={() => fetchTenantLeases(selectedTenant.id)}
                            disabled={isRefreshingLeases}
                          >
                            <RefreshCw className={cn("h-3 w-3", isRefreshingLeases && "animate-spin")} />
                            {isRefreshingLeases ? "Refreshing..." : "Refresh Leases"}
                          </Button>
                        </div>
                        
                        <SearchableSelect
                          value={selectedLease?.id ? String(selectedLease.id) : ""}
                          onValueChange={handleLeaseChange}
                          placeholder={isRefreshingLeases ? "Fetching latest leases..." : "Select a lease to invoice..."}
                          searchPlaceholder="Search leases..."
                          emptyMessage={isRefreshingLeases ? "Loading..." : "No active leases found. Try refreshing."}
                          options={tenantLeases
                            .filter((lease) => ["active"].includes(lease.status?.toLowerCase()))
                            .map((lease) => {
                              const leaseNum = lease.leaseNumber || lease.id;
                              const start = lease.startDate ? new Date(lease.startDate).toLocaleDateString() : 'N/A';
                              const end = lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'N/A';
                              return {
                                value: String(lease.id),
                                label: `Lease #${leaseNum} (${start} - ${end}) - ${lease.status}`,
                              };
                            })}
                        />
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold mb-2">Selected Tenant</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-medium">{selectedTenant.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{selectedTenant.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{selectedTenant.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Emirates ID</p>
                            <p className="font-medium">{selectedTenant.emiratesId}</p>
                          </div>
                        </div>
                      </div>

                      {selectedProperty && (
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Property Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Property Name</p>
                              <p className="font-medium">{selectedProperty.name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Unit Number</p>
                              <p className="font-medium">{selectedProperty.unit}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-sm text-muted-foreground">Address</p>
                              <p className="font-medium">{selectedProperty.address}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedLease && (
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Lease Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Lease ID</p>
                              <p className="font-medium">{selectedLease.id}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Start Date</p>
                              <p className="font-medium">{new Date(selectedLease.startDate).toLocaleDateString("en-AE")}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">End Date</p>
                              <p className="font-medium">{new Date(selectedLease.endDate).toLocaleDateString("en-AE")}</p>
                            </div>
                            <div className="md:col-span-3">
                              <p className="text-sm text-muted-foreground">Monthly Rent</p>
                              <p className="font-medium text-lg">{formatCurrency(selectedLease.monthlyRent)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoice Details Tab */}
            <TabsContent value="details" className="space-y-6">
              {/* PDC Selection Summary */}
              {selectedPDC.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileCheck className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">PDC Auto-Fill Active</h4>
                    </div>
                    <p className="text-sm text-blue-800 mb-3">
                      The following details have been automatically filled based on your PDC selection:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">Selected PDCs:</span>
                        <p className="text-blue-900">
                            {selectedPDC.map(pdc => {
                                if (pdc.chequeNumber === 'Pending' || !pdc.chequeNumber) {
                                    return `PDC ${new Date(pdc.chequeDate || pdc.dueDate || new Date()).toLocaleDateString()}`;
                                }
                                return pdc.chequeNumber;
                            }).join(", ")}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Total PDC Amount:</span>
                        <p className="text-blue-900 font-bold">{formatCurrency(selectedPDC.reduce((sum, pdc) => sum + (Number(pdc.amount) || 0), 0))}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Auto-calculated VAT:</span>
                        <p className="text-blue-900 font-bold">{formatCurrency((selectedPDC.reduce((sum, pdc) => sum + (Number(pdc.amount) || 0), 0) * 5) / 100)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subtotal">Subtotal (AED) *</Label>
                      <Input
                        id="subtotal"
                        type="number"
                        {...register("invoiceDetails.subtotal", { valueAsNumber: true })}
                        placeholder="85000"
                        className={errors.invoiceDetails?.subtotal ? "border-red-500" : ""}
                        onChange={(e) => {
                          setValue("invoiceDetails.subtotal", parseInt(e.target.value) || 0);
                          calculateDerivedValues();
                        }}
                      />
                      {errors.invoiceDetails?.subtotal && (
                        <p className="text-sm text-red-500 mt-1">{errors.invoiceDetails.subtotal.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="vatRate">VAT Rate (%) *</Label>
                      <Select
                        value={watchedValues.invoiceDetails?.vatRate?.toString()}
                        onValueChange={(value) => {
                          setValue("invoiceDetails.vatRate", parseInt(value));
                          calculateDerivedValues();
                        }}
                      >
                        <SelectTrigger className={errors.invoiceDetails?.vatRate ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select VAT rate" />
                        </SelectTrigger>
                        <SelectContent>
                          {vatRates.map((rate) => (
                            <SelectItem key={rate.value} value={rate.value.toString()}>
                              {rate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.invoiceDetails?.vatRate && (
                        <p className="text-sm text-red-500 mt-1">{errors.invoiceDetails.vatRate.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vatAmount">VAT Amount (AED)</Label>
                      <Input
                        id="vatAmount"
                        type="number"
                        value={watchedValues.invoiceDetails?.vatAmount || 0}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div>
                      <Label htmlFor="total">Total Amount (AED)</Label>
                      <Input
                        id="total"
                        type="number"
                        value={watchedValues.invoiceDetails?.total || 0}
                        disabled
                        className="bg-muted font-bold text-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency *</Label>
                      <Select
                        value={watchedValues.invoiceDetails?.currency}
                        onValueChange={(value) => setValue("invoiceDetails.currency", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms *</Label>
                      <Select
                        value={watchedValues.invoiceDetails?.paymentTerms}
                        onValueChange={(value) => setValue("invoiceDetails.paymentTerms", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTerms.map((term) => (
                            <SelectItem key={term} value={term}>
                              {term}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lateFee">Late Fee (AED)</Label>
                      <Input
                        id="lateFee"
                        type="number"
                        {...register("invoiceDetails.lateFee", { valueAsNumber: true })}
                        placeholder="500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
                      <Input
                        id="gracePeriod"
                        type="number"
                        {...register("invoiceDetails.gracePeriod", { valueAsNumber: true })}
                        placeholder="5"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PDC Selection Tab */}
            <TabsContent value="pdc" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    PDC Selection
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select Post Dated Cheques to claim in this invoice
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedLease ? (
                    <div className="space-y-6">
                      {/* Available PDCs Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold flex items-center gap-2">
                             <FileCheck className="h-4 w-4 text-green-600" />
                             Available PDCs
                          </h3>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {availablePDC.filter(p => !p.invoiceId).length} Available
                          </Badge>
                        </div>
                        
                        {isLoadingPDC ? (
                          <div className="flex flex-col items-center justify-center p-8 border rounded-lg border-dashed bg-muted/5">
                              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                              <p className="text-sm text-muted-foreground">Loading PDCs...</p>
                          </div>
                        ) : availablePDC.filter(p => !p.invoiceId).length > 0 ? (
                          <div className="space-y-3">
                            {availablePDC.filter(p => !p.invoiceId).map((pdc) => (
                              <div key={pdc.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    id={`pdc-${pdc.id}`}
                                    checked={selectedPDC.some(p => p.id === pdc.id)}
                                    onChange={(e) => {
                                      const newSelection = e.target.checked
                                        ? [...selectedPDC, pdc]
                                        : selectedPDC.filter(p => p.id !== pdc.id);
                                      setSelectedPDC(newSelection);
                                      setValue('selectedPDC', newSelection, { shouldValidate: true });
                                    }}
                                    className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                                  />
                                  <div>
                                    <Label htmlFor={`pdc-${pdc.id}`} className="font-medium cursor-pointer">
                                      {formatPDCDisplay(pdc)} {pdc.bankName ? <span className="text-xs text-muted-foreground">({pdc.bankName}{pdc.serviceName ? ` - ${pdc.serviceName}` : ''})</span> : ''}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                      Due: {new Date(pdc.chequeDate || pdc.dueDate).toLocaleDateString("en-AE")} • {formatCurrency(Number(pdc.amount))}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline">{pdc.chequeType}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic p-4 text-center border rounded-lg border-dashed">
                            No available PDCs found for this lease.
                          </p>
                        )}
                      </div>

                      {/* Previously Invoiced PDCs Section */}
                      {availablePDC.filter(p => p.invoiceId).length > 0 && (
                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-muted-foreground flex items-center gap-2">
                               <FileText className="h-4 w-4" />
                               Already Invoiced
                            </h3>
                            <Badge variant="outline" className="text-muted-foreground">
                               {availablePDC.filter(p => p.invoiceId).length} Linked
                            </Badge>
                          </div>
                          
                          <div className="space-y-3 opacity-60">
                            {availablePDC.filter(p => p.invoiceId).map((pdc) => (
                              <div key={pdc.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    disabled
                                    checked={false}
                                    className="h-4 w-4 text-muted-foreground rounded border-gray-300 bg-gray-100"
                                  />
                                  <div>
                                    <p className="font-medium text-muted-foreground">
                                      {formatPDCDisplay(pdc)} <span className="text-xs"> {formatCurrency(Number(pdc.amount))}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Linked directly to Invoice #{pdc.invoice?.invoiceNumber || pdc.invoiceId}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">Used</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Please select a tenant and lease first</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Company Information Tab */}
            <TabsContent value="company" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        {...register("companyInfo.name")}
                        placeholder="Company Name"
                        readOnly
                        className="bg-muted"
                      />
                      {errors.companyInfo?.name && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyInfo.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="license">License Number *</Label>
                      <Input
                        id="license"
                        {...register("companyInfo.license")}
                        placeholder="DED-123456789"
                        readOnly
                        className={`bg-muted ${errors.companyInfo?.license ? "border-red-500" : ""}`}
                      />
                      {errors.companyInfo?.license && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyInfo.license.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="companyAddress">Company Address *</Label>
                    <Textarea
                      id="companyAddress"
                      {...register("companyInfo.address")}
                      placeholder="Business Bay, Dubai, UAE"
                      rows={2}
                      readOnly
                      className={`bg-muted ${errors.companyInfo?.address ? "border-red-500" : ""}`}
                    />
                    {errors.companyInfo?.address && (
                      <p className="text-sm text-red-500 mt-1">{errors.companyInfo.address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyPhone">Phone Number *</Label>
                      <Input
                        id="companyPhone"
                        {...register("companyInfo.phone")}
                        placeholder="+971 4 123 4567"
                        readOnly
                        className={`bg-muted ${errors.companyInfo?.phone ? "border-red-500" : ""}`}
                      />
                      {errors.companyInfo?.phone && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyInfo.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="companyEmail">Email Address *</Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        {...register("companyInfo.email")}
                        placeholder="info@propmanage.ae"
                        readOnly
                        className={`bg-muted ${errors.companyInfo?.email ? "border-red-500" : ""}`}
                      />
                      {errors.companyInfo?.email && (
                        <p className="text-sm text-red-500 mt-1">{errors.companyInfo.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="vatNumber">VAT Registration Number *</Label>
                    <Input
                      id="vatNumber"
                      {...register("companyInfo.vatNumber")}
                      placeholder="100123456789123"
                      readOnly
                      className={`bg-muted ${errors.companyInfo?.vatNumber ? "border-red-500" : ""}`}
                    />
                    {errors.companyInfo?.vatNumber && (
                      <p className="text-sm text-red-500 mt-1">{errors.companyInfo.vatNumber.message}</p>
                    )}
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">UAE VAT Compliance</p>
                        <p className="text-sm text-blue-700 mt-1">
                          This invoice will be generated with proper UAE VAT compliance. 
                          Ensure all company details are accurate for legal compliance.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            
            <div className="flex flex-col items-end gap-2 w-full">
                 {/* Existing Attachments (From Server) */}
                 {watchedValues.attachments && watchedValues.attachments.length > 0 && (
                    <div className="mb-2 w-full max-w-sm">
                        <Label className="text-xs mb-1 block text-muted-foreground">Existing Documents</Label>
                        <div className="space-y-1">
                        {watchedValues.attachments.map((doc: any, index: number) => {
                             const isObject = typeof doc === 'object' && doc !== null;
                             const docUrl = isObject ? doc.url : doc;
                             const fileName = isObject ? (doc.name || `Document ${index + 1}`) : (doc.split('/').pop() || `Document ${index + 1}`);
                             return (
                                <div key={`existing-${index}`} className="flex items-center justify-between p-2 border rounded bg-blue-50/50 text-xs">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileCheck className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                        <span className="truncate">{fileName}</span>
                                    </div>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => {
                                            const current = form.getValues("attachments") || [];
                                            form.setValue("attachments", current.filter((_, i) => i !== index), { shouldDirty: true });
                                        }} 
                                        className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-500"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                             );
                        })}
                        </div>
                    </div>
                 )}

                 {/* Selected Files Preview (New Uploads) */}
                 {selectedFiles.length > 0 && (
                    <div className="mb-2 w-full max-w-sm">
                        <Label className="text-xs mb-1 block text-muted-foreground">New Uploads</Label>
                        <div className="space-y-1">
                        {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded bg-green-50/50 text-xs">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Upload className="h-3 w-3 text-green-600 flex-shrink-0" />
                                    <span className="truncate">{file.name}</span>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-500">
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                        </div>
                    </div>
                 )}

                <div className="flex items-center gap-2">
                  {/* Hidden Input */}
                  <input
                        type="file"
                        ref={fileInputRef}
                        id="invoice-upload-input"
                        style={{ 
                          position: 'absolute', 
                          width: '1px', 
                          height: '1px', 
                          padding: 0, 
                          margin: '-1px', 
                          overflow: 'hidden', 
                          clip: 'rect(0, 0, 0, 0)', 
                          whiteSpace: 'nowrap', 
                          borderWidth: 0,
                          opacity: 0.1 
                        }}
                        multiple
                        onChange={handleFileSelect}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />

                  <label 
                    htmlFor="invoice-upload-input" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Form Actions (Fixed Footer) */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0 bg-background">
          <Button type="button" variant="outline" onClick={onClose} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="outline" disabled={form.formState.isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button type="submit" className="bg-gradient-primary shadow-glow" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {mode === "create" ? "Create Invoice" : "Update Invoice"}
              </>
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
  );
}
