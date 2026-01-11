import { useState } from "react";
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
  ChevronUp
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

  if (!unit) return null;

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
            <Button variant="outline" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              Photos
            </Button>
            <Button variant="outline" size="sm">
              <Video className="h-4 w-4 mr-2" />
              Virtual Tour
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(unit)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          {/* Unit Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <img
              src={unit.images[0]}
              alt={`${unit.propertyName} - ${unit.unitNumber}`}
              className="w-full h-64 object-cover rounded-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              {unit.images.slice(1, 5).map((image: string, index: number) => (
                <img
                  key={index}
                  src={image}
                  alt={`${unit.propertyName} - ${unit.unitNumber} ${index + 2}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>

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
                        <p className="text-2xl font-bold text-primary">AED {unit.monthlyRent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Security Deposit</p>
                        <p className="text-xl font-semibold">AED {unit.deposit.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Market Value</p>
                        <p className="text-lg font-semibold">AED {unit.marketValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ROI</p>
                        <p className="text-lg font-semibold text-green-600">{unit.roi}%</p>
                      </div>
                    </div>

                    {unit.status === "Occupied" && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Lease Duration</p>
                        <p className="font-semibold">{unit.leaseDuration} months</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(unit.leaseStartDate).toLocaleDateString()} - {new Date(unit.leaseEndDate).toLocaleDateString()}
                        </p>
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
                      {unit.amenities.map((amenity: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {amenity}
                        </Badge>
                      ))}
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
                      {unit.features.map((feature: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {feature}
                        </Badge>
                      ))}
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
                        <h3 className="text-xl font-semibold">{unit.tenantName}</h3>
                        <p className="text-muted-foreground">Tenant since {new Date(unit.leaseStartDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{unit.tenantPhone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{unit.tenantEmail}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Lease Start</p>
                        <p className="font-medium">{new Date(unit.leaseStartDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lease End</p>
                        <p className="font-medium">{new Date(unit.leaseEndDate).toLocaleDateString()}</p>
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
                            <p className="font-medium">AED {payment.amount.toLocaleString()}</p>
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
                      <p className="text-2xl font-bold text-primary">{unit.roi}%</p>
                      <p className="text-sm text-muted-foreground">ROI</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">AED {unit.marketValue.toLocaleString()}</p>
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
                      <Badge className="bg-green-100 text-green-800">{unit.maintenanceStatus}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Maintenance</p>
                      <p className="font-medium">{new Date(unit.lastMaintenance).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Next Inspection</p>
                      <p className="font-medium">{new Date(unit.nextInspection).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Maintenance Requests</p>
                    <p className="text-2xl font-bold">{unit.maintenanceRequests}</p>
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
                  {unit.documents && unit.documents.length > 0 ? (
                    <div className="space-y-3">
                      {unit.documents.map((doc: string, index: number) => (
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
                    <p className="text-muted-foreground">No documents available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
