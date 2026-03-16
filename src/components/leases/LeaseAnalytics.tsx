import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building2, 
  Shield, 
  FileText,
  CreditCard,
  Download,
  AlertOctagon,
  Clock,
  XCircle,
  Banknote,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ChartTooltip } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Area, AreaChart, Legend } from "recharts";
import { leasesAPI } from "@/services/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeaseAnalyticsProps {
  leases?: any[];
}

export default function LeaseAnalytics({ leases: _ }: LeaseAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await leasesAPI.getAnalytics(parseInt(selectedYear), selectedMonth);
      if (response.data?.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedYear, selectedMonth]);

  const handleExport = () => {
    if (!data) return;
    
    // Create workbooks for different data sets
    const wb = XLSX.utils.book_new();
    
    // Overview Sheet
    const overviewData = [{
      "Metric": "Total Collected Revenue", "Value": data.totalRevenue
    }, {
      "Metric": "Total Annual Rent (Active)", "Value": data.totalAnnualRent
    }, {
      "Metric": "Active Leases", "Value": data.activeLeases
    }, {
      "Metric": "Occupancy Rate", "Value": `${data.occupancyRate.toFixed(1)}%`
    }];
    const wsOverview = XLSX.utils.json_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

    // Compliance Issues Sheet
    if (data.complianceIssues?.length > 0) {
       const issueData = data.complianceIssues.map((item: any) => ({
         "Lease Number": item.leaseNumber,
         "Unit": item.unit,
         "Missing Compliance": item.issues.join(", ")
       }));
       const wsIssues = XLSX.utils.json_to_sheet(issueData);
       XLSX.utils.book_append_sheet(wb, wsIssues, "Compliance Alerts");
    }

    XLSX.writeFile(wb, `Analytics_Report_${selectedYear}_${selectedMonth}.xlsx`);
    toast.success("Analytics report exported");
  };

  if (loading && !data) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  if (!data) return <div className="p-8 text-center">No data available</div>;

  // Transform Backend Data for Charts
  const statusData = [
    { name: "Active", value: data.statusStats?.active || 0, color: "#10b981" },
    { name: "Pending", value: data.statusStats?.pending || 0, color: "#f59e0b" },
    { name: "Terminated", value: data.statusStats?.terminated || 0, color: "#ef4444" },
    { name: "Expired", value: data.statusStats?.expired || 0, color: "#64748b" },
    { name: "Draft", value: data.statusStats?.draft || 0, color: "#94a3b8" },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Real-time financial and operational insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {new Date(0, i).toLocaleDateString('en-US', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expected Revenue</p>
                <h3 className="text-2xl font-bold mt-2">AED {(data.stats?.totalExpectedRevenue || 0).toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  For {format(new Date(parseInt(selectedYear), selectedMonth === 'all' ? 0 : parseInt(selectedMonth) - 1), 'MMMM yyyy')}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Portfolio Value</p>
                <h3 className="text-2xl font-bold mt-2">AED {(data.stats?.totalAnnualRent || 0).toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Active Rent
                </p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Banknote className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Leases</p>
                <h3 className="text-2xl font-bold mt-2">{data.stats?.activeLeasesCount || 0}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Out of {data.stats?.totalLeasesCount || 0} total
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance Alerts</p>
                <h3 className="text-2xl font-bold mt-2 text-amber-600">
                  {data.complianceIssues?.length || 0}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Issues requiring attention</p>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Revenue Breakdown</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card>
              <CardHeader>
                <CardTitle>Rent Revenue Breakdown</CardTitle>
                <CardDescription>Rent per Lease for Selected Period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.leaseRevenueBreakdown || []} margin={{ bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="leaseNumber" 
                        tick={{ fontSize: 10 }} 
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                             const dataPoint = payload[0].payload;
                             return (
                              <div className="bg-background border rounded-lg p-2 shadow-sm text-sm">
                                <p className="font-bold mb-1">{label}</p>
                                <p className="text-muted-foreground mb-1">{dataPoint.tenantName}</p>
                                <p className="text-green-600 font-medium">
                                  AED {payload[0].value?.toLocaleString()}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="rent" 
                        name="Monthly Rent" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lease Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {statusData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm">{entry.name} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Action Items</CardTitle>
                <CardDescription>
                  Active leases missing mandatory compliance documents or verifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.complianceIssues && data.complianceIssues.length > 0 ? (
                  <ScrollArea className="h-[400px] w-full pr-4">
                     <div className="space-y-4">
                      {data.complianceIssues.map((item: any) => (
                        <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg bg-red-50/50">
                          <AlertOctagon className="h-5 w-5 text-red-500 mt-0.5" />
                          <div className="flex-1">
                             <div className="flex justify-between">
                               <h4 className="font-semibold text-sm">Lease: {item.leaseNumber}</h4>
                               <Badge variant="outline" className="text-xs">{item.unit}</Badge>
                             </div>
                             <div className="mt-2 flex flex-wrap gap-2">
                               {item.issues.map((issue: string, idx: number) => (
                                 <Badge key={idx} variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">
                                   {issue}
                                 </Badge>
                               ))}
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-green-50/50 rounded-lg">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-green-900">All Clear!</h3>
                    <p className="text-sm text-green-700">All active leases are fully compliant.</p>
                  </div>
                )}
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}