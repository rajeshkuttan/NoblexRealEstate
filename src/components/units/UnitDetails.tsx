import { useState, useEffect } from "react";
import { toast } from "sonner";
import { documentsAPI, leasesAPI } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";  
import { 
  Home, 
  Building2, 
  MapPin, 
  Square, 
  Bed, 
  Bath, 
  Car, 
  Star, 
  DollarSign, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  Eye, 
  Camera, 
  Video, 
  Share2, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Key, 
  Wifi, 
  Shield, 
  Heart, 
  Bookmark,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Settings,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
  Loader2
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { unitsAPI } from "@/services/api";

interface UnitDetailsProps {
  unit: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (unit: any) => void;
  onDelete: (unit: any) => void;
}

export default function UnitDetails({ unit: initialUnit, isOpen, onClose, onEdit, onDelete }: UnitDetailsProps) {
  // Derived state to allow seamless upgrade to full data
  // We initialize state with initialUnit, but we'll also have a robust merged 'unit' variable later
  const [activeTab, setActiveTab] = useState("overview");
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showVirtualTour, setShowVirtualTour] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isDocumentUploadOpen, setIsDocumentUploadOpen] = useState(false);
  const [loadingLeases, setLoadingLeases] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(initialUnit?.images || []);
  const [virtualTourUrl, setVirtualTourUrl] = useState(initialUnit?.virtualTourUrl || "");
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [fullUnit, setFullUnit] = useState<any>(initialUnit);



  // Derived unit object for display - prefers full fetched data, falls back to initial prop
  const unit = fullUnit ? { ...initialUnit, ...fullUnit } : initialUnit;

  // Fetch full unit details on mount
  useEffect(() => {
    const fetchFullDetails = async () => {
      if (!initialUnit?.id) return;
      try {
        console.log("Fetching full details for unit ID:", initialUnit.id);
        const response = await unitsAPI.getById(Number(initialUnit.id));
        console.log("Full unit response:", response);

        // Handle various response structures
        const backendUnit = response.data?.data?.unit || 
                           response.data?.data || 
                           response.data?.unit || 
                           response.data || 
                           {};
        
        console.log("Parsed backend unit:", backendUnit);

        
        // Helper for furnished
        const mapBackendFurnishedToFrontend = (furnished: boolean): string => {
            return furnished ? 'Furnished' : 'Unfurnished';
        };

        // Map backend snake_case to frontend camelCase
        let images = backendUnit.images;
        if (typeof images === 'string') {
            try { images = JSON.parse(images); } catch (e) { images = []; }
        }
        if (!Array.isArray(images)) images = [];

        const mappedUnit = {
            ...backendUnit,
            
            // Explicit mapping
            type: backendUnit.type || initialUnit.type,
            status: backendUnit.status ? backendUnit.status.charAt(0).toUpperCase() + backendUnit.status.slice(1).toLowerCase() : initialUnit.status,
            furnished: typeof backendUnit.furnished === 'boolean' ? mapBackendFurnishedToFrontend(backendUnit.furnished) : initialUnit.furnished,
            
            propertyName: backendUnit.property?.title || backendUnit.propertyName || initialUnit.propertyName || "N/A",
            propertyLocation: backendUnit.property?.location || backendUnit.location || initialUnit.location || initialUnit.propertyLocation || "N/A",
            
            tenantName: backendUnit.leases?.[0]?.tenant?.name || backendUnit.tenantName || backendUnit.tenant_name || null,
            tenantEmail: backendUnit.leases?.[0]?.tenant?.email || backendUnit.tenantEmail || backendUnit.tenant_email || null,
            tenantPhone: backendUnit.leases?.[0]?.tenant?.phone || backendUnit.tenantPhone || backendUnit.tenant_phone || null,

            monthlyRent: backendUnit.rentAmount || backendUnit.monthlyRent || backendUnit.monthly_rent || backendUnit.rent_amount || 0,
            deposit: backendUnit.depositAmount || backendUnit.deposit || backendUnit.deposit_amount || 0,
            marketValue: backendUnit.marketValue || backendUnit.market_value || 0,

            roi: backendUnit.roi || 0,
            orientation: backendUnit.orientation || "N/A",
            energyRating: backendUnit.energyRating || backendUnit.energy_rating || "N/A",

            maintenanceStatus: backendUnit.maintenanceStatus || backendUnit.maintenance_status || "N/A",
            lastMaintenance: backendUnit.lastMaintenance || backendUnit.last_maintenance || null,
            nextInspection: backendUnit.nextInspection || backendUnit.next_inspection || null,
            maintenanceRequests: backendUnit.maintenanceRequests || backendUnit.maintenance_requests || 0,
            
            leaseDuration: backendUnit.leaseDuration || backendUnit.lease_duration || null,
            leaseStartDate: backendUnit.leaseStartDate || backendUnit.lease_start_date || backendUnit.lease_start || null,
            leaseEndDate: backendUnit.leaseEndDate || backendUnit.lease_end_date || backendUnit.lease_end || null,
            
            virtualTourUrl: backendUnit.virtualTourUrl || backendUnit.virtual_tour_url || "",
            
            images: images
        };


        
        console.log("Mapped full unit:", mappedUnit);
        setFullUnit(mappedUnit);
      } catch (error) {
        console.error("Failed to fetch full unit details:", error);
      }
    };

    fetchFullDetails();
  }, [initialUnit?.id]);

  // Fetch documents when tab becomes active
  const fetchDocuments = async () => {
      if (!initialUnit?.id) return;
      
      setLoadingDocuments(true);
      try {
        const response = await documentsAPI.getByEntity('unit', Number(initialUnit.id), true);
        console.log("Documents fetched:", response);
        const docs = response.data?.data || response.data || [];
        setDocuments(Array.isArray(docs) ? docs : []);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        toast.error("Failed to load documents");
      } finally {
        setLoadingDocuments(false);
      }
  };

  // Watch for tab changes
  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    }
  }, [activeTab, initialUnit?.id]);

  const fetchLeases = async () => {
      if (!initialUnit?.id) return;
      setLoadingLeases(true);
      console.log("Fetching leases for unit:", initialUnit.id);
      try {
          const response = await leasesAPI.getByUnit(Number(initialUnit.id));
          console.log("Leases fetch response:", response);
          // Handle various response structures
          const leasesData = response.data?.data?.leases || response.data?.data || response.data || [];
          console.log("Parsed leases data:", leasesData);
          setLeases(Array.isArray(leasesData) ? leasesData : []);
      } catch (error) {
          console.error("Failed to fetch leases:", error);
          // don't toast error here to avoid noise if just empty
      } finally {
          setLoadingLeases(false);
      }
  };

  useEffect(() => {
    if (activeTab === 'tenant') {
        fetchLeases();
    }
  }, [activeTab, initialUnit?.id]);

  // Handle photo upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      setUploadedPhotos(prev => [...prev, ...newPhotos]);
      toast.success(`${files.length} photo(s) uploaded successfully`);
    }
  };

  // Remove photo
  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
    toast.success("Photo removed");
  };

  // Handle virtual tour submission
  const handleVirtualTourSubmit = () => {
    if (!virtualTourUrl) {
      toast.error("Please enter a virtual tour URL");
      return;
    }
    toast.success("Virtual tour URL saved successfully");
    setShowVirtualTour(false);
  };

  // Handle share functionality
  const handleShare = (method: string) => {
    const shareUrl = window.location.href;
    const shareText = `Check out this ${unit.type}: ${unit.propertyName} - Unit ${unit.unitNumber}`;
    
    switch (method) {
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`;
        toast.success("Opening email client...");
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank');
        toast.success("Opening WhatsApp...");
        break;
    }
    setShowShareDialog(false);
  };


  
  // Handle document upload
  const handleDocumentUpload = async () => {
    console.log("Handle Upload Triggered", { selectedDocument, selectedDocumentType });
    if (!selectedDocument) {
      console.warn("No document selected");
      toast.error("Please select a document");
      return;
    }
    
    if (!selectedDocumentType) {
      console.warn("No document type selected");
      toast.error("Please select a document type");
      return;
    }

    setUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedDocument);
      formData.append("entityType", "unit");
      formData.append("entityId", String(initialUnit.id));
      // Map to backend allowed types: 'contract', 'license', 'other'
      let backendDocType = "other";
      if (selectedDocumentType.toLowerCase().includes("agreement") || 
          selectedDocumentType.toLowerCase().includes("contract") ||
          selectedDocumentType.toLowerCase().includes("ejari")) {
        backendDocType = "contract";
      } else if (selectedDocumentType.toLowerCase().includes("license")) {
        backendDocType = "license";
      }

      const notes = `Type: ${selectedDocumentType}`;

      formData.append("documentType", backendDocType);
      formData.append("type", backendDocType); // Keep for compatibility
      formData.append("notes", notes);

      await documentsAPI.upload(formData);
      
      toast.success(`Document "${selectedDocument.name}" uploaded successfully`);
      setIsDocumentUploadOpen(false);
      setSelectedDocument(null);
      setSelectedDocumentType("");
      
      // Refresh list
      
      // Refresh list immediately
      await fetchDocuments();
      console.log("Documents list refreshed after upload");
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(error.response?.data?.message || "Failed to upload document");
    } finally {
      setUploadingDocument(false);
    }
  };

  // Handle document delete
  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await documentsAPI.delete(docId);
      toast.success("Document deleted successfully");
      // Refresh list immediately
      await fetchDocuments();
    } catch (error: any) {
      console.error("Delete failed:", error);
      toast.error(error.response?.data?.message || "Failed to delete document");
    } 
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      const response = await documentsAPI.download(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalName || doc.name || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
       console.error("Download failed:", error);
       toast.error("Failed to download document");
    }
  };

  // Handle export
  const handleExport = () => {
    const unitData = {
      'Unit Number': unit.unitNumber,
      'Property': unit.propertyName,
      'Type': unit.type,
      'Category': unit.category,
      'Area (sq ft)': unit.area,
      'Bedrooms': unit.bedrooms,
      'Bathrooms': unit.bathrooms,
      'Monthly Rent': unit.monthlyRent,
      'Status': unit.status,
      'Tenant': unit.tenantName || 'N/A'
    };
    
    const dataStr = JSON.stringify(unitData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `unit_${unit.unitNumber}_details.json`;
    link.click();
    toast.success("Unit details exported successfully");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Occupied": return "bg-green-100 text-green-800 border-green-200";
      case "Available": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Under Maintenance": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Renovation": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Apartment": return Home;
      case "Villa": return Building2;
      case "Office": return Building2;
      case "Retail": return Building2;
      case "Warehouse": return Building2;
      default: return Home;
    }
  };

  const TypeIcon = getTypeIcon(unit?.type || "");

  if (!initialUnit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {unit.propertyName} - {unit.unitNumber}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {unit.type} • {unit.category} • {unit.area} sq ft
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(unit.status)}>
                {unit.status}
              </Badge>
              <Badge variant="outline">
                {unit.type}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
            <Button variant="outline" size="sm" onClick={() => onEdit(unit)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPhotoGallery(true)}>
              <Camera className="h-4 w-4 mr-2" />
              Photos
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowVirtualTour(true)}>
              <Video className="h-4 w-4 mr-2" />
              Virtual Tour
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(unit)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          {/* Unit Images */}
          {(() => {
            // Safely parse images - handle null, string, or array
            let images = unit.images;
            if (typeof images === 'string') {
              try {
                images = JSON.parse(images);
              } catch (e) {
                images = [];
              }
            }
            if (!Array.isArray(images)) {
              images = [];
            }
            
            return images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <img
                  src={images[0]}
                  alt={`${unit.propertyName} - ${unit.unitNumber}`}
                  className="w-full h-64 object-cover rounded-lg"
                />
                {images.length > 1 && (
                  <div className="grid grid-cols-2 gap-2">
                    {images.slice(1, 5).map((image: string, index: number) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${unit.propertyName} - ${unit.unitNumber} ${index + 2}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tenant">Tenant</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Unit Specifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TypeIcon className="h-5 w-5" />
                      Unit Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Area</p>
                        <p className="font-semibold">{unit.area} sq ft</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Floor</p>
                        <p className="font-semibold">{unit.floor}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-semibold">{unit.bedrooms}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bathrooms</p>
                        <p className="font-semibold">{unit.bathrooms}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Parking</p>
                        <p className="font-semibold">{unit.parking}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Orientation</p>
                        <p className="font-semibold">{unit.orientation || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Energy Rating</p>
                        <p className="font-semibold">{unit.energyRating || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Balcony</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Furnished</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Financial Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Rent</p>
                        <p className="text-2xl font-bold text-primary">AED {unit.monthlyRent?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Security Deposit</p>
                        <p className="text-xl font-semibold">AED {unit.deposit?.toLocaleString() || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Market Value</p>
                        <p className="text-lg font-semibold">AED {unit.marketValue?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ROI</p>
                        <p className="text-lg font-semibold text-green-600">{unit.roi || 'N/A'}%</p>
                      </div>
                    </div>

                    {unit.status === "Occupied" && unit.leaseDuration && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Lease Duration</p>
                        <p className="font-semibold">{unit.leaseDuration} months</p>
                        {unit.leaseStartDate && unit.leaseEndDate && (
                          <p className="text-sm text-muted-foreground">
                            {new Date(unit.leaseStartDate).toLocaleDateString()} - {new Date(unit.leaseEndDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Amenities and Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Amenities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        // Safely parse amenities - handle null, string, or array
                        let amenities = unit.amenities;
                        if (typeof amenities === 'string') {
                          try {
                            amenities = JSON.parse(amenities);
                          } catch (e) {
                            amenities = [];
                          }
                        }
                        if (!Array.isArray(amenities)) {
                          amenities = [];
                        }
                        
                        return amenities.length > 0 ? (
                          amenities.map((amenity: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {amenity}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No amenities listed</p>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        // Safely parse features - handle null, string, or array
                        let features = unit.features;
                        if (typeof features === 'string') {
                          try {
                            features = JSON.parse(features);
                          } catch (e) {
                            features = [];
                          }
                        }
                        if (!Array.isArray(features)) {
                          features = [];
                        }
                        
                        return features.length > 0 ? (
                          features.map((feature: string, index: number) => (
                            <Badge key={index} variant="outline">
                              {feature}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No features listed</p>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Special Notes */}
              {unit.specialNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Special Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{unit.specialNotes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tenant Tab (Lease History) */}
            <TabsContent value="tenant" className="space-y-6">
              {loadingLeases ? (
                  <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : leases.length > 0 ? (
                  <div className="space-y-4">
                      {leases.map((lease, index) => (
                          <Card key={index} className="overflow-hidden">
                              <div className={`h-2 ${lease.status === 'Active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <CardContent className="p-6">
                                  <div className="flex justify-between items-start mb-4">
                                      <div className="flex items-center gap-4">
                                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                              <User className="h-6 w-6 text-slate-600" />
                                          </div>
                                          <div>
                                              <h3 className="text-lg font-semibold">{lease.tenant?.name || lease.tenantName || 'Unknown Tenant'}</h3>
                                              <div className="flex gap-2 text-sm mt-1">
                                                  <Badge variant={lease.status === 'Active' ? 'default' : 'secondary'} className={lease.status === 'Active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                                                      {lease.status}
                                                  </Badge>
                                                  <span className="text-muted-foreground">• Lease #{lease.leaseNumber || lease.id}</span>
                                              </div>
                                          </div>
                                      </div>
                                      <Button variant="outline" size="sm" onClick={() => window.location.href = `/leases?id=${lease.id}`}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Details
                                      </Button>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                          <p className="text-muted-foreground">Start Date</p>
                                          <p className="font-medium">{lease.startDate ? new Date(lease.startDate).toLocaleDateString() : 'N/A'}</p>
                                      </div>
                                      <div>
                                          <p className="text-muted-foreground">End Date</p>
                                          <p className="font-medium">{lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'N/A'}</p>
                                      </div>
                                      <div>
                                          <p className="text-muted-foreground">Rent Amount</p>
                                          <p className="font-medium">AED {lease.rentAmount?.toLocaleString() || '0'}</p>
                                      </div>
                                       <div>
                                          <p className="text-muted-foreground">Payment Frequency</p>
                                          <p className="font-medium">{lease.paymentFrequency || 'N/A'}</p>
                                      </div>
                                  </div>
                              </CardContent>
                          </Card>
                      ))}
                  </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Leases Found</h3>
                    <p className="text-muted-foreground mb-4">
                      This unit currently has no associated leases (draft or active).
                    </p>
                    <Button className="bg-gradient-withu" onClick={() => window.location.href = '/leases?action=new'}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Lease
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Rent History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {unit.rentHistory && unit.rentHistory.length > 0 ? (
                    <div className="space-y-3">
                      {unit.rentHistory.map((payment: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">AED {payment.amount?.toLocaleString() || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">{new Date(payment.date).toLocaleDateString()}</p>
                          </div>
                          <Badge className={payment.status === "Paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {payment.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No rent history available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Financial Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{unit.roi || 'N/A'}%</p>
                      <p className="text-sm text-muted-foreground">ROI</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">AED {unit.marketValue?.toLocaleString() || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Market Value</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{unit.tenantSatisfaction || "N/A"}</p>
                      <p className="text-sm text-muted-foreground">Tenant Rating</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Maintenance Tab */}
            <TabsContent value="maintenance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Maintenance Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className="bg-green-100 text-green-800">{unit.maintenanceStatus || 'N/A'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Maintenance</p>
                      <p className="font-medium">{unit.lastMaintenance ? new Date(unit.lastMaintenance).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Next Inspection</p>
                      <p className="font-medium">{unit.nextInspection ? new Date(unit.nextInspection).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Maintenance Requests</p>
                    <p className="text-2xl font-bold">{unit.maintenanceRequests || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Unit Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingDocuments ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Upload Section - Inline */}
                      {isDocumentUploadOpen ? (
                        <div className="bg-muted/30 border rounded-lg p-4 space-y-4 mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-sm">Upload New Document</h3>
                                <Button variant="ghost" size="sm" onClick={() => setIsDocumentUploadOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label>Document Type</Label>
                                    <Select 
                                      value={selectedDocumentType} 
                                      onValueChange={(val) => {
                                        console.log("Document Type Selected:", val);
                                        setSelectedDocumentType(val);
                                      }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Lease Agreement">Lease Agreement</SelectItem>
                                            <SelectItem value="Ejari Certificate">Ejari Certificate</SelectItem>
                                            <SelectItem value="Title Deed">Title Deed</SelectItem>
                                            <SelectItem value="Passport Copy">Passport Copy</SelectItem>
                                            <SelectItem value="Visa Copy">Visa Copy</SelectItem>
                                            <SelectItem value="Emirates ID">Emirates ID</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>File</Label>
                                    <Input 
                                        type="file" 
                                        onChange={(e) => setSelectedDocument(e.target.files?.[0] || null)} 
                                        className="bg-background"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" size="sm" onClick={() => setIsDocumentUploadOpen(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleDocumentUpload} disabled={uploadingDocument}>
                                        {uploadingDocument ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            "Upload"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                      ) : null}

                      {documents.length > 0 ? (
                        <div className="space-y-3">
                          {documents.map((doc: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{doc.originalName || doc.name || doc.fileName}</p>
                                <p className="text-xs text-muted-foreground">{doc.type || doc.documentType} • {new Date(doc.createdAt || doc.uploadDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* <Badge variant="outline" className="bg-green-100 text-green-800">
                                Available
                              </Badge> */}
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadDocument(doc)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteDocument(doc.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      ) : !isDocumentUploadOpen ? (
                         <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">No documents available</p>
                        </div>
                      ) : null}
                      
                      {!isDocumentUploadOpen && (
                        <div className="pt-2 flex justify-end">
                            <Button size="sm" onClick={() => setIsDocumentUploadOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Document
                            </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      {/* Photo Gallery Dialog */}
      <Dialog open={showPhotoGallery} onOpenChange={setShowPhotoGallery}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Photo Gallery - Unit {unit.unitNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Upload unit photos (JPG, PNG, max 10MB each)
              </p>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="max-w-xs mx-auto"
              />
            </div>

            {uploadedPhotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedPhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Unit photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPhotoGallery(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Virtual Tour Dialog */}
      <Dialog open={showVirtualTour} onOpenChange={setShowVirtualTour}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Virtual Tour - Unit {unit.unitNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="virtualTourUrl">Virtual Tour URL</Label>
              <Input
                id="virtualTourUrl"
                type="url"
                placeholder="https://example.com/virtual-tour"
                value={virtualTourUrl}
                onChange={(e) => setVirtualTourUrl(e.target.value)}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Enter a URL for the virtual tour (e.g., Matterport, YouTube, or custom 360° tour)
              </p>
            </div>

            {virtualTourUrl && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <iframe
                  src={virtualTourUrl}
                  className="w-full h-64 rounded"
                  title="Virtual Tour Preview"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowVirtualTour(false)}>
                Cancel
              </Button>
              <Button onClick={handleVirtualTourSubmit}>
                <Video className="h-4 w-4 mr-2" />
                Save Virtual Tour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Unit - {unit.unitNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this unit with potential tenants or colleagues
            </p>

            <div className="grid gap-3">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleShare('copy')}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Copy Link
              </Button>

              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleShare('email')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Share via Email
              </Button>

              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleShare('whatsapp')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Share via WhatsApp
              </Button>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </Dialog>
  );
}
