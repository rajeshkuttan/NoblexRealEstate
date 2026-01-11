import { useState } from "react";
import { 
  MessageSquare, 
  Send, 
  Phone, 
  Video, 
  Calendar, 
  FileText, 
  Image, 
  Paperclip,
  CheckCircle,
  Clock,
  User,
  Building2,
  MapPin,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface WhatsAppIntegrationProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
}

// WhatsApp message templates for UAE real estate
const messageTemplates = [
  {
    id: "greeting",
    title: "Initial Greeting",
    template: "Assalamu Alaikum! Thank you for your interest in our properties. How can I help you find your perfect home in Dubai? 🏠",
    category: "greeting"
  },
  {
    id: "property_inquiry",
    title: "Property Inquiry",
    template: "I have some amazing properties that match your requirements. Would you like to schedule a viewing? 📅",
    category: "inquiry"
  },
  {
    id: "follow_up",
    title: "Follow Up",
    template: "Hi! I wanted to follow up on the properties we discussed. Are you still interested in viewing them?",
    category: "follow_up"
  },
  {
    id: "appointment_reminder",
    title: "Appointment Reminder",
    template: "Reminder: Your property viewing is scheduled for tomorrow at {time}. Location: {location}. See you there! 🏢",
    category: "reminder"
  },
  {
    id: "document_request",
    title: "Document Request",
    template: "To proceed with your application, please provide: Emirates ID, Salary Certificate, and Bank Statement. Thank you! 📄",
    category: "documents"
  },
  {
    id: "pricing_info",
    title: "Pricing Information",
    template: "The property you're interested in is priced at AED {price} per year. Would you like to know about our payment plans? 💰",
    category: "pricing"
  },
  {
    id: "community_info",
    title: "Community Information",
    template: "This property is located in {community} with amazing amenities: Gym, Pool, Security, and 24/7 Concierge. Perfect for families! 🏊‍♀️",
    category: "community"
  },
  {
    id: "closing",
    title: "Closing Message",
    template: "Thank you for choosing us! We'll process your application and get back to you within 24 hours. Welcome to your new home! 🎉",
    category: "closing"
  }
];

const quickActions = [
  { id: "call", label: "Call Now", icon: Phone, color: "bg-green-500" },
  { id: "video", label: "Video Call", icon: Video, color: "bg-blue-500" },
  { id: "schedule", label: "Schedule Viewing", icon: Calendar, color: "bg-purple-500" },
  { id: "send_quote", label: "Send Quote", icon: FileText, color: "bg-orange-500" }
];

export default function WhatsAppIntegration({ lead, isOpen, onClose }: WhatsAppIntegrationProps) {
  const [activeTab, setActiveTab] = useState("messages");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [messageHistory, setMessageHistory] = useState([
    {
      id: 1,
      type: "received",
      message: "Hi, I'm interested in a 2-bedroom apartment in Dubai Marina. My budget is AED 120,000 per year.",
      timestamp: "2024-06-20 10:30 AM",
      status: "read"
    },
    {
      id: 2,
      type: "sent",
      message: "Assalamu Alaikum! Thank you for your interest. I have some excellent options in Dubai Marina within your budget. Would you like to schedule a viewing?",
      timestamp: "2024-06-20 10:35 AM",
      status: "delivered"
    },
    {
      id: 3,
      type: "received",
      message: "Yes, I'm available this weekend. What properties do you have?",
      timestamp: "2024-06-20 10:40 AM",
      status: "read"
    }
  ]);

  const handleSendMessage = (message: string) => {
    const newMessage = {
      id: messageHistory.length + 1,
      type: "sent",
      message,
      timestamp: new Date().toLocaleString(),
      status: "sent"
    };
    setMessageHistory([...messageHistory, newMessage]);
    setCustomMessage("");
  };

  const handleTemplateSelect = (template: any) => {
    let processedTemplate = template.template;
    
    // Replace placeholders with lead data
    processedTemplate = processedTemplate
      .replace("{price}", lead?.budget?.toLocaleString() || "N/A")
      .replace("{location}", lead?.preferredLocation || "Dubai")
      .replace("{community}", lead?.preferredLocation || "Dubai Marina");
    
    setCustomMessage(processedTemplate);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "call":
        window.open(`tel:${lead?.phone}`);
        break;
      case "video":
        // Implement video call functionality
        console.log("Starting video call...");
        break;
      case "schedule":
        // Open calendar/scheduling
        console.log("Opening calendar...");
        break;
      case "send_quote":
        // Generate and send quote
        console.log("Sending quote...");
        break;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Clock className="h-3 w-3 text-gray-400" />;
      case "delivered":
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case "read":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-green-600" />
                WhatsApp Communication
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {lead?.name} • {lead?.phone}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Online
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Quick Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-withu flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{lead?.name}</h3>
                    <p className="text-sm text-muted-foreground">{lead?.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-semibold">AED {lead?.budget?.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.id)}
                className="flex items-center gap-2"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="compose">Compose</TabsTrigger>
            </TabsList>

            {/* Messages Tab */}
            <TabsContent value="messages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Conversation History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {messageHistory.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-3",
                            msg.type === "sent" ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-xs p-3 rounded-lg",
                              msg.type === "sent"
                                ? "bg-green-500 text-white"
                                : "bg-gray-100 text-gray-900"
                            )}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs opacity-70">{msg.timestamp}</span>
                              {msg.type === "sent" && getStatusIcon(msg.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Message Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {messageTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{template.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.template}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compose Tab */}
            <TabsContent value="compose" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Compose Message
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Textarea
                      placeholder="Type your message here..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Image className="h-4 w-4 mr-2" />
                      Image
                    </Button>
                    <Button variant="outline" size="sm">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Document
                    </Button>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => handleSendMessage(customMessage)}
                      disabled={!customMessage.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
