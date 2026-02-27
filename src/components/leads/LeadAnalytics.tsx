import { useState, useEffect } from "react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Target, 
  Banknote, 
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

import { leadsAPI } from "@/services/api";

interface LeadAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeadAnalytics({ isOpen, onClose }: LeadAnalyticsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Fetch analytics data
  useEffect(() => {
     if (isOpen) {
       fetchAnalytics();
     }
  }, [isOpen, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await leadsAPI.getAnalytics();
      if (response.data.success) {
        setAnalyticsData(response.data.data);
      } else {
        setError("Failed to load analytics data");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("An error occurred while loading analytics");
    } finally {
      setLoading(false);
    }
  };

  // Safe accessors for data
  const overview = analyticsData?.overview || {};
  const statusDistribution = analyticsData?.statusDistribution || [];
  const sourceDistribution = analyticsData?.sourceDistribution || [];
  const teamPerformanceData = analyticsData?.teamPerformance || [];
  const recentActivities = analyticsData?.recentActivities || [];

  const totalLeads = overview.totalLeads || 0;
  
  // Export analytics data to Excel
  const handleExport = () => {
    try {
      // Summary sheet
      const summaryData = [{
        'Metric': 'Total Leads',
        'Value': totalLeads
      }, {
        'Metric': 'Hot Leads',
        'Value': overview.hotLeads || 0
      }, {
        'Metric': 'New Leads',
        'Value': overview.newLeads || 0
      }, {
        'Metric': 'Qualified Leads',
        'Value': overview.qualifiedLeads || 0
      }, {
        'Metric': 'Converted Leads',
        'Value': overview.closedWonLeads || 0
      }, {
        'Metric': 'Average Lead Score',
        'Value': overview.avgLeadScore || 0
      }, {
        'Metric': 'Average Conversion Rate',
        'Value': `${overview.conversionRate || 0}%`
      }];

      // Source distribution sheet
      const sourceSheet = sourceDistribution.map((item: any) => ({
        'Source': item.source,
        'Count': item.count,
        'Percentage': `${totalLeads > 0 ? ((item.count / totalLeads) * 100).toFixed(1) : 0}%`
      }));

      // Status distribution sheet
      const statusSheet = statusDistribution.map((item: any) => ({
        'Status': item.status,
        'Count': item.count,
        'Percentage': `${totalLeads > 0 ? ((item.count / totalLeads) * 100).toFixed(1) : 0}%`
      }));

      // Team performance sheet
      const teamSheet = teamPerformanceData.map((item: any) => ({
        'Team Member': item.assignedUser?.name || 'Unassigned',
        'Leads': item.leads,
        'Total Budget': `AED ${parseFloat(item.totalBudget || 0).toLocaleString()}`,
        'Average Lead Score': parseFloat(item.avgScore || 0).toFixed(1)
      }));

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      const wsSource = XLSX.utils.json_to_sheet(sourceSheet);
      XLSX.utils.book_append_sheet(wb, wsSource, "Source Distribution");

      const wsStatus = XLSX.utils.json_to_sheet(statusSheet);
      XLSX.utils.book_append_sheet(wb, wsStatus, "Status Distribution");

      const wsTeam = XLSX.utils.json_to_sheet(teamSheet);
      XLSX.utils.book_append_sheet(wb, wsTeam, "Team Performance");

      XLSX.writeFile(wb, `leads_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Analytics data exported successfully");
    } catch (error) {
      console.error("Error exporting analytics:", error);
      toast.error("Failed to export analytics data");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto w-[95vw]">
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
              <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || !analyticsData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error loading analytics</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchAnalytics}>Try Again</Button>
          </div>
        ) : (
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
                  <span className="text-muted-foreground">Active pipeline</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hot Leads</p>
                    <p className="text-2xl font-bold text-red-600">{overview.hotLeads || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <Target className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-muted-foreground">
                    {totalLeads > 0 ? Math.round(((overview.hotLeads || 0) / totalLeads) * 100) : 0}% of total
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Lead Score</p>
                    <p className="text-2xl font-bold">{overview.avgLeadScore || 0}</p>
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
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold text-green-600">{overview.conversionRate || 0}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Banknote className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-muted-foreground">Closed won / Total leads</span>
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
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
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
                      {statusDistribution.map((item: any) => (
                        <div key={item.status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                            <span className="capitalize">{item.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.count}</span>
                            <span className="text-sm text-muted-foreground">
                              ({totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0}%)
                            </span>
                          </div>
                        </div>
                      ))}
                      {statusDistribution.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Conversion Funnel - Simplified due to different data structure */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Funnel Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium">New Leads</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-blue-600">{overview.newLeads || 0}</span>
                        </div>
                      </div>
                       <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <span className="font-medium">Contacted</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-orange-600">{overview.contactedLeads || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                        <span className="font-medium">Qualified</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-indigo-600">{overview.qualifiedLeads || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="font-medium">Closed Won</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-green-600">{overview.closedWonLeads || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                    {sourceDistribution
                      .sort((a: any, b: any) => b.count - a.count)
                      .map((item: any) => (
                        <div key={item.source} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-withu flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {item.source.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium capitalize">{item.source}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold">{item.count} leads</p>
                              <p className="text-sm text-muted-foreground">
                                {totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0}% of total
                              </p>
                            </div>
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-gradient-withu h-2 rounded-full" 
                                style={{ width: `${totalLeads > 0 ? (item.count / totalLeads) * 100 : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {sourceDistribution.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No source data available</p>
                      )}
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
                    {teamPerformanceData
                      .map((item: any) => (
                        <div key={item.assignedTo || 'unassigned'} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-withu flex items-center justify-center">
                              <Users className="h-5 w-5 " />
                            </div>
                            <div>
                              <p className="font-semibold">{item.assignedUser?.name || 'Unassigned'}</p>
                              <p className="text-sm text-muted-foreground">Team Member</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-6 text-center">
                            <div>
                              <p className="text-2xl font-bold">{item.leads}</p>
                              <p className="text-sm text-muted-foreground">Leads</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{parseFloat(item.avgScore || 0).toFixed(1)}</p>
                              <p className="text-sm text-muted-foreground">Avg Score</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">AED {parseFloat(item.totalBudget || 0).toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">Total Budget</p>
                            </div>
                          </div>
                        </div>
                      ))}
                       {teamPerformanceData.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No team performance data available</p>
                      )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends/Activity Tab - Renamed to Activity as backend doesn't give historical trends easily yet */}
            <TabsContent value="activity" className="space-y-6">
                 <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentActivities.map((activity: any) => (
                         <div key={activity.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                           <Clock className="h-4 w-4 text-muted-foreground" />
                           <div className="flex-1">
                             <p className="text-sm font-medium">
                               {activity.title} 
                               {activity.lead && <span className="text-muted-foreground"> - {activity.lead.name}</span>}
                             </p>
                             <p className="text-xs text-muted-foreground">
                               {activity.description}
                               <span className="mx-1">•</span>
                               {new Date(activity.createdAt).toLocaleString()}
                               {activity.user && <span className="mx-1">• by {activity.user.name}</span>}
                             </p>
                           </div>
                         </div>
                      ))}
                      {recentActivities.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No recent activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
