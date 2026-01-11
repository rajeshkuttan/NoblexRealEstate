import { useState } from "react";
import { 
  Home, 
  Building2, 
  Store, 
  Warehouse, 
  Building, 
  MapPin, 
  DollarSign, 
  Users, 
  Calendar, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Target, 
  Award, 
  Heart, 
  Zap, 
  Globe, 
  Phone, 
  Mail, 
  CreditCard, 
  Banknote, 
  Wallet, 
  Receipt, 
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
  BarChart3, 
  PieChart, 
  ThumbsUp, 
  ThumbsDown, 
  Smile, 
  Frown, 
  Meh, 
  User, 
  Car, 
  Wifi, 
  Shield, 
  TrendingUp, 
  TrendingDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface UnitDetailsProps {
  unit: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (unit: any) => void;
  onDelete?: (unit: any) => void;
}

const unitTypeIcons = {
  residential: Home,
  commercial: Building2,
  retail: Store,
  office: Building,
  warehouse: Warehouse,
  industrial: Building2,
};

const statusColors = {
  available: "bg-green-100 text-green-800",
  occupied: "bg-blue-100 text-blue-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  reserved: "bg-purple-100 text-purple-800",
  unavailable: "bg-red-100 text-red-800",
};

export default function UnitDetails({ unit, isOpen, onClose, onEdit, onDelete }: UnitDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  const UnitTypeIcon = unitTypeIcons[unit.unitType as keyof typeof unitTypeIcons] || Home;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <UnitTypeIcon className="h-6 w-6" />
            {unit.unitNumber}
            <Badge className={getStatusColor(unit.status)}>
              {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
            </Badge>
          </DialogTitle>
          <p className="text-muted-foreground">
            {unit.unitType.charAt(0).toUpperCase() + unit.unitType.slice(1)} Unit - {unit.unitDetails.area} sq ft
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Unit Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UnitTypeIcon className="h-5 w-5" />
                    Unit Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Unit Number</p>
                      <p className="font-semibold">{unit.unitNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-semibold capitalize">{unit.unitType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Floor</p>
                      <p className="font-semibold">{unit.unitDetails.floor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Area</p>
                      <p className="font-semibold">{unit.unitDetails.area} sq ft</p>
                    </div>
                  </div>

                  {unit.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Description</p>
                      <p className="text-sm">{unit.description}</p>
                    </div>
                  )}
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
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Monthly Rent</span>
                      <span className="font-semibold">{formatCurrency(unit.financial.monthlyRent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Annual Rent</span>
                      <span className="font-semibold">{formatCurrency(unit.financial.annualRent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Security Deposit</span>
                      <span className="font-semibold">{formatCurrency(unit.financial.securityDeposit)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Monthly Cost</span>
                      <span>{formatCurrency(unit.financial.monthlyRent + unit.financial.maintenanceFee + unit.financial.parkingFee + unit.financial.serviceCharges)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Unit Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Unit Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{unit.unitDetails.bedrooms} Bedrooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{unit.unitDetails.bathrooms} Bathrooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{unit.unitDetails.parking} Parking</span>
                  </div>
                  {unit.unitDetails.balcony && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Balcony</span>
                    </div>
                  )}
                  {unit.unitDetails.garden && (
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Garden</span>
                    </div>
                  )}
                  {unit.unitDetails.terrace && (
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Terrace</span>
                    </div>
                  )}
                  {unit.unitDetails.storage && (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Storage</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Specifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Floor</p>
                      <p className="font-semibold">{unit.unitDetails.floor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Area</p>
                      <p className="font-semibold">{unit.unitDetails.area} sq ft</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-semibold">{unit.unitDetails.bedrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-semibold">{unit.unitDetails.bathrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Parking</p>
                      <p className="font-semibold">{unit.unitDetails.parking}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(unit.status)}>
                        {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Commercial Details */}
              {unit.unitType === "commercial" || unit.unitType === "retail" || unit.unitType === "office" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      Commercial Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {unit.commercialDetails && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Business Type</p>
                            <p className="font-semibold">{unit.commercialDetails.businessType || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Max Occupancy</p>
                            <p className="font-semibold">{unit.commercialDetails.maxOccupancy || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Operating Hours</p>
                            <p className="font-semibold">{unit.commercialDetails.operatingHours || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Customer Parking</p>
                            <p className="font-semibold">{unit.commercialDetails.customerParking || "N/A"}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Commercial Features</p>
                          <div className="flex flex-wrap gap-2">
                            {unit.commercialDetails.licenseRequired && (
                              <Badge variant="outline">License Required</Badge>
                            )}
                            {unit.commercialDetails.signageAllowed && (
                              <Badge variant="outline">Signage Allowed</Badge>
                            )}
                            {unit.commercialDetails.deliveryAccess && (
                              <Badge variant="outline">Delivery Access</Badge>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Rental Information</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Monthly Rent</span>
                          <span className="font-semibold">{formatCurrency(unit.financial.monthlyRent)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Annual Rent</span>
                          <span className="font-semibold">{formatCurrency(unit.financial.annualRent)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Security Deposit</span>
                          <span className="font-semibold">{formatCurrency(unit.financial.securityDeposit)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Additional Charges</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Maintenance Fee</span>
                          <span className="font-semibold">{formatCurrency(unit.financial.maintenanceFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Parking Fee</span>
                          <span className="font-semibold">{formatCurrency(unit.financial.parkingFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Service Charges</span>
                          <span className="font-semibold">{formatCurrency(unit.financial.serviceCharges)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-semibold">Utilities</h4>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Utilities Arrangement</span>
                      <Badge variant="outline">
                        {unit.financial.utilities.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Monthly Cost</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(
                          unit.financial.monthlyRent + 
                          unit.financial.maintenanceFee + 
                          unit.financial.parkingFee + 
                          unit.financial.serviceCharges
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Amenities Tab */}
          <TabsContent value="amenities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Amenities & Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unit.amenities && unit.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {unit.amenities.map((amenity: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{amenity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No amenities specified for this unit</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {unit.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Additional Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{unit.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Unit
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(unit)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Unit
              </Button>
            )}
            <Button variant="outline">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            {onDelete && (
              <Button variant="outline" onClick={() => onDelete(unit)} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
