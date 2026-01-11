import { useState, useEffect } from "react";
import { DocumentUpload } from '@/components/common/DocumentUpload';
import { DocumentList } from '@/components/common/DocumentList';
import axios from 'axios';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Star, 
  Target, 
  Users, 
  MessageSquare, 
  FileText, 
  Edit, 
  Trash2, 
  PhoneCall, 
  Video, 
  Send, 
  Download, 
  Share2, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  TrendingUp,
  Activity,
  Eye,
  Plus,
  History,
  Tag,
  FileCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LeadDetailsProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lead: any) => void;
  onDelete: (lead: any) => void;
}

export default function LeadDetails({ lead, isOpen, onClose, onEdit, onDelete }: LeadDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (lead?.id) {
      fetchDocuments();
    }
  }, [lead?.id]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3001/api/documents/lead/${lead.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.success) {
        setDocuments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  if (!lead) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot": return "bg-red-100 text-red-800 border-red-200";
      case "warm": return "bg-orange-100 text-orange-800 border-orange-200";
      case "cold": return "bg-blue-100 text-blue-800 border-blue-200";
      case "converted": return "bg-green-100 text-green-800 border-green-200";
      case "lost": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "call": return <PhoneCall className="h-4 w-4 text-blue-600" />;
      case "email": return <Mail className="h-4 w-4 text-green-600" />;
      case "meeting": return <Video className="h-4 w-4 text-purple-600" />;
      case "website": return <Eye className="h-4 w-4 text-gray-600" />;
      case "referral": return <Users className="h-4 w-4 text-orange-600" />;
      case "social": return <Share2 className="h-4 w-4 text-pink-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Lead Details
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {lead.name} • {lead.company}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(lead.status)}>
                {lead.status}
              </Badge>
              <Badge className={getPriorityColor(lead.priority)}>
                {lead.priority} priority
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
            <Button variant="outline" size="sm" onClick={() => onEdit(lead)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <PhoneCall className="h-4 w-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <Video className="h-4 w-4 mr-2" />
              Meeting
            </Button>
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Send Quote
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(lead)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="interactions">Interactions</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-withu flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{lead.name}</h3>
                        <p className="text-muted-foreground">{lead.position} at {lead.company}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.phone}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.company}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lead Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Lead Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-2xl font-bold">{lead.leadScore}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Lead Score</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-2xl font-bold">{lead.conversionProbability}%</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Budget</span>
                        <span className="font-semibold">AED {lead.budget.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Source</span>
                        <Badge variant="outline">{lead.source}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Assigned To</span>
                        <span className="text-sm">{lead.assignedTo}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Property Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Property Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{lead.preferredLocation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Property Type</p>
                      <p className="font-medium capitalize">{lead.propertyType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Area</p>
                      <p className="font-medium">{lead.area} sq ft</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Move-in Date</p>
                      <p className="font-medium">{new Date(lead.moveInDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-medium">{lead.bedrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-medium">{lead.bathrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Parking</p>
                      <p className="font-medium">{lead.parking} spaces</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {lead.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{lead.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Interactions Tab */}
            <TabsContent value="interactions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Interaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lead.interactions && lead.interactions.length > 0 ? lead.interactions.map((interaction: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                          {getInteractionIcon(interaction.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium capitalize">{interaction.type}</h4>
                            <span className="text-sm text-muted-foreground">
                              {new Date(interaction.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {interaction.notes}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No interaction history available</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                    <Button className="w-full" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Interaction
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.requirements && lead.requirements.length > 0 ? (
                    <div className="text-sm">
                      <p className="whitespace-pre-wrap">{lead.requirements}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No specific requirements noted</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.tags && Array.isArray(lead.tags) && lead.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No tags assigned</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Required Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DocumentUpload
                    entityType="lead"
                    entityId={lead.id}
                    onUploadSuccess={fetchDocuments}
                  />
                  <DocumentList
                    entityType="lead"
                    entityId={lead.id}
                    documents={documents}
                    onDelete={fetchDocuments}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
