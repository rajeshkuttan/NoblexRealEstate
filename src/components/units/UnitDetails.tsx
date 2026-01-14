import { useState } from "react";
import { toast } from "sonner";
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
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UnitDetailsProps {
  unit: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (unit: any) => void;
  onDelete: (unit: any) => void;
}

export default function UnitDetails({ unit, isOpen, onClose, onEdit, onDelete }: UnitDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showVirtualTour, setShowVirtualTour] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(unit?.images || []);
  const [virtualTourUrl, setVirtualTourUrl] = useState(unit?.virtualTourUrl || "");
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);

  if (!unit) return null;

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
  const handleDocumentUpload = () => {
    if (!selectedDocument) {
      toast.error("Please select a document");
      return;
    }
    // Here you would upload to backend
    toast.success(`Document "${selectedDocument.name}" uploaded successfully`);
    setShowDocumentUpload(false);
    setSelectedDocument(null);
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

  const TypeIcon = getTypeIcon(unit.type);

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

            {/* Tenant Tab */}
            <TabsContent value="tenant" className="space-y-6">
              {unit.status === "Occupied" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Current Tenant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-withu flex items-center justify-center">
                        <User className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{unit.tenantName || 'N/A'}</h3>
                        <p className="text-muted-foreground">Tenant since {unit.leaseStartDate ? new Date(unit.leaseStartDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{unit.tenantPhone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{unit.tenantEmail || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Lease Start</p>
                        <p className="font-medium">{unit.leaseStartDate ? new Date(unit.leaseStartDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lease End</p>
                        <p className="font-medium">{unit.leaseEndDate ? new Date(unit.leaseEndDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button variant="outline">
                        <Phone className="h-4 w-4 mr-2" />
                        Call Tenant
                      </Button>
                      <Button variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                      <Button variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        View Lease
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Unit Available</h3>
                    <p className="text-muted-foreground mb-4">
                      This unit is currently available for rent.
                    </p>
                    <Button className="bg-gradient-withu">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tenant
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
                  {(() => {
                    // Safely parse documents - handle null, string, or array
                    let documents = unit.documents;
                    if (typeof documents === 'string') {
                      try {
                        documents = JSON.parse(documents);
                      } catch (e) {
                        documents = [];
                      }
                    }
                    if (!Array.isArray(documents)) {
                      documents = [];
                    }
                    
                    return documents.length > 0 ? (
                      <div className="space-y-3">
                        {documents.map((doc: string, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{doc}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                Available
                              </Badge>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No documents available</p>
                        <Button size="sm" onClick={() => setShowDocumentUpload(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Upload Document
                        </Button>
                      </div>
                    );
                  })()}
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

      {/* Document Upload Dialog */}
      <Dialog open={showDocumentUpload} onOpenChange={setShowDocumentUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document - Unit {unit.unitNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="document">Select Document</Label>
              <Input
                id="document"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedDocument(e.target.files?.[0] || null)}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Supported formats: PDF, DOC, DOCX, JPG, PNG (max 10MB)
              </p>
            </div>

            {selectedDocument && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedDocument.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedDocument.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDocumentUpload(false)}>
                Cancel
              </Button>
              <Button onClick={handleDocumentUpload} disabled={!selectedDocument}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
