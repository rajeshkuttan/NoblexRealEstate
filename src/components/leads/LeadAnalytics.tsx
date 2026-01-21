import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
  Calendar, 
  Download, 
  Filter,
  ArrowUp,
  ArrowDown,
  Star,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LeadAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
  leads: any[];
}

export default function LeadAnalytics({ isOpen, onClose, leads }: LeadAnalyticsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("30d");
  const [sortBy, setSortBy] = useState("leadScore");

  // Calculate analytics data
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.status === "hot").length;
  const warmLeads = leads.filter(l => l.status === "warm").length;
  const coldLeads = leads.filter(l => l.status === "cold").length;
  const convertedLeads = leads.filter(l => l.status === "converted").length;
  
  const avgLeadScore = Math.round(leads.reduce((sum, lead) => sum + lead.leadScore, 0) / totalLeads);
  const avgConversionRate = Math.round(leads.reduce((sum, lead) => sum + lead.conversionProbability, 0) / totalLeads);
  const totalBudget = leads.reduce((sum, lead) => sum + lead.budget, 0);
  
  // Source distribution
  const sourceData = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Status distribution
  const statusData = {
    hot: hotLeads,
    warm: warmLeads,
    cold: coldLeads,
    converted: convertedLeads
  };

  // Priority distribution
  const priorityData = leads.reduce((acc, lead) => {
    acc[lead.priority] = (acc[lead.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top performing team members
  const teamPerformance = leads.reduce((acc, lead) => {
    if (!acc[lead.assignedTo]) {
      acc[lead.assignedTo] = { leads: 0, totalBudget: 0, avgScore: 0 };
    }
    acc[lead.assignedTo].leads += 1;
    acc[lead.assignedTo].totalBudget += lead.budget;
    acc[lead.assignedTo].avgScore += lead.leadScore;
    return acc;
  }, {} as Record<string, { leads: number; totalBudget: number; avgScore: number }>);

  // Calculate averages for team members
  Object.keys(teamPerformance).forEach(member => {
    teamPerformance[member].avgScore = Math.round(teamPerformance[member].avgScore / teamPerformance[member].leads);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot": return "text-red-600";
      case "warm": return "text-orange-600";
      case "cold": return "text-blue-600";
      case "converted": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600";
      case "medium": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  // Export analytics data to Excel
  const handleExport = () => {
    try {
      // Summary sheet
      const summaryData = [{
        'Metric': 'Total Leads',
        'Value': totalLeads
      }, {
        'Metric': 'Hot Leads',
        'Value': hotLeads
      }, {
        'Metric': 'Warm Leads',
        'Value': warmLeads
      }, {
        'Metric': 'Cold Leads',
        'Value': coldLeads
      }, {
        'Metric': 'Converted Leads',
        'Value': convertedLeads
      }, {
        'Metric': 'Average Lead Score',
        'Value': avgLeadScore
      }, {
        'Metric': 'Average Conversion Rate',
        'Value': `${avgConversionRate}%`
      }, {
        'Metric': 'Total Budget',
        'Value': `AED ${totalBudget.toLocaleString()}`
      }];

      // Source distribution sheet
      const sourceSheet = Object.entries(sourceData).map(([source, count]) => ({
        'Source': source,
        'Count': count,
        'Percentage': `${((count / totalLeads) * 100).toFixed(1)}%`
      }));

      // Priority distribution sheet
      const prioritySheet = Object.entries(priorityData).map(([priority, count]) => ({
        'Priority': priority,
        'Count': count,
        'Percentage': `${((count / totalLeads) * 100).toFixed(1)}%`
      }));

      // Team performance sheet
      const teamSheet = Object.entries(teamPerformance).map(([member, stats]) => ({
        'Team Member': member,
        'Leads': stats.leads,
        'Total Budget': `AED ${stats.totalBudget.toLocaleString()}`,
        'Average Lead Score': stats.avgScore
      }));

      // Detailed leads sheet
      const leadsSheet = leads.map(lead => ({
        'Name': lead.name,
        'Email': lead.email,
        'Phone': lead.phone,
        'Status': lead.status,
        'Priority': lead.priority,
        'Source': lead.source,
        'Lead Score': lead.leadScore,
        'Budget': lead.budget,
        'Assigned To': lead.assignedUser?.name || lead.assignedTo || 'Unassigned',
        'Created Date': lead.createdAt
      }));

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      const wsSource = XLSX.utils.json_to_sheet(sourceSheet);
      XLSX.utils.book_append_sheet(wb, wsSource, "Source Distribution");

      const wsPriority = XLSX.utils.json_to_sheet(prioritySheet);
      XLSX.utils.book_append_sheet(wb, wsPriority, "Priority Distribution");

      const wsTeam = XLSX.utils.json_to_sheet(teamSheet);
      XLSX.utils.book_append_sheet(wb, wsTeam, "Team Performance");

      const wsLeads = XLSX.utils.json_to_sheet(leadsSheet);
      XLSX.utils.book_append_sheet(wb, wsLeads, "Detailed Leads");

      XLSX.writeFile(wb, `leads_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Analytics data exported successfully");
    } catch (error) {
      console.error("Error exporting analytics:", error);
      toast.error("Failed to export analytics data");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Lead Analytics
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                Comprehensive insights into your lead pipeline performance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                    <p className="text-2xl font-bold">{totalLeads}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-gradient-withu flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-green-600">+12% this month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hot Leads</p>
                    <p className="text-2xl font-bold text-red-600">{hotLeads}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <Target className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-muted-foreground">
                    {Math.round((hotLeads / totalLeads) * 100)}% of total
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Lead Score</p>
                    <p className="text-2xl font-bold">{avgLeadScore}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Star className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-muted-foreground">Quality score out of 100</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Budget</p>
                    <p className="text-2xl font-bold">AED {totalBudget.toLocaleString()}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-muted-foreground">Potential revenue</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="team">Team Performance</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lead Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Lead Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(statusData).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("h-3 w-3 rounded-full", {
                              "bg-red-500": status === "hot",
                              "bg-orange-500": status === "warm",
                              "bg-blue-500": status === "cold",
                              "bg-green-500": status === "converted"
                            })}></div>
                            <span className="capitalize">{status} leads</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{count}</span>
                            <span className="text-sm text-muted-foreground">
                              ({Math.round((count / totalLeads) * 100)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Priority Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Priority Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(priorityData).map(([priority, count]) => (
                        <div key={priority} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("h-3 w-3 rounded-full", {
                              "bg-red-500": priority === "high",
                              "bg-yellow-500": priority === "medium",
                              "bg-green-500": priority === "low"
                            })}></div>
                            <span className="capitalize">{priority} priority</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{count}</span>
                            <span className="text-sm text-muted-foreground">
                              ({Math.round((count / totalLeads) * 100)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Conversion Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Conversion Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="font-medium">Hot Leads</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-red-600">{hotLeads}</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round((hotLeads / totalLeads) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="font-medium">Warm Leads</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-orange-600">{warmLeads}</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round((warmLeads / totalLeads) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">Cold Leads</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-blue-600">{coldLeads}</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round((coldLeads / totalLeads) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">Converted</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-600">{convertedLeads}</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round((convertedLeads / totalLeads) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sources Tab */}
            <TabsContent value="sources" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Lead Sources Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(sourceData)
                      .sort(([,a], [,b]) => b - a)
                      .map(([source, count]) => (
                        <div key={source} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-withu flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {source.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{source}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold">{count} leads</p>
                              <p className="text-sm text-muted-foreground">
                                {Math.round((count / totalLeads) * 100)}% of total
                              </p>
                            </div>
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-gradient-withu h-2 rounded-full" 
                                style={{ width: `${(count / totalLeads) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Performance Tab */}
            <TabsContent value="team" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(teamPerformance)
                      .sort(([,a], [,b]) => b.leads - a.leads)
                      .map(([member, data]) => (
                        <div key={member} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-withu flex items-center justify-center">
                              <Users className="h-5 w-5 " />
                            </div>
                            <div>
                              <p className="font-semibold">{member}</p>
                              <p className="text-sm text-muted-foreground">Team Member</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-6 text-center">
                            <div>
                              <p className="text-2xl font-bold">{data.leads}</p>
                              <p className="text-sm text-muted-foreground">Leads</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{data.avgScore}</p>
                              <p className="text-sm text-muted-foreground">Avg Score</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">AED {data.totalBudget.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">Total Budget</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Lead Quality Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Average Lead Score</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{avgLeadScore}</span>
                          <ArrowUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">+5%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Conversion Rate</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{avgConversionRate}%</span>
                          <ArrowUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">+3%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Hot Lead Ratio</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{Math.round((hotLeads / totalLeads) * 100)}%</span>
                          <ArrowDown className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">-2%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">New hot lead added</p>
                          <p className="text-xs text-muted-foreground">2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Lead converted to customer</p>
                          <p className="text-xs text-muted-foreground">4 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-orange-50 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Follow-up reminder</p>
                          <p className="text-xs text-muted-foreground">6 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
