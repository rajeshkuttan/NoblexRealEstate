import { useState } from "react";
import { 
  BarChart3, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User, 
  Building2, 
  Banknote, 
  Wrench, 
  FileText, 
  TrendingDown, 
  Database, 
  History, 
  Trash2, 
  Share, 
  Eye, 
  MoreHorizontal, 
  Check, 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { generatePDF, generateExcel, generateCSV, generateReportSummary } from "@/utils/reportUtils";
import { useToast } from "@/hooks/use-toast";
import FinancialReports from "@/components/reports/FinancialReports";
import PropertyReports from "@/components/reports/PropertyReports";
import TenantReports from "@/components/reports/TenantReports";
import LeaseReports from "@/components/reports/LeaseReports";
import MaintenanceReports from "@/components/reports/MaintenanceReports";
import ScheduledReports from "@/components/reports/ScheduledReports";
import UnitCostRevenueReport from "@/components/reports/UnitCostRevenueReport";
import LossOfIncomeReport from "@/components/reports/LossOfIncomeReport";
import CustomerLedgerReport from "@/components/reports/CustomerLedgerReport";
import AccountsTransReport from "@/components/finance/AccountsTransReport";

// Sample data for reports
const reportCategories = [
  {
    id: "financial",
    name: "Financial Reports",
    description: "Revenue, expenses, profit & loss, cash flow",
    icon: Banknote,
    color: "bg-green-100 text-green-800",
    count: 11
  },
  {
    id: "property",
    name: "Property Reports",
    description: "Performance, occupancy, market analysis",
    icon: Building2,
    color: "bg-blue-100 text-blue-800",
    count: 6
  },
  {
    id: "tenant",
    name: "Tenant Reports",
    description: "Tenant analytics, satisfaction, retention",
    icon: User,
    color: "bg-purple-100 text-purple-800",
    count: 5
  },
  {
    id: "lease",
    name: "Lease Reports",
    description: "Lease performance, renewals, compliance",
    icon: FileText,
    color: "bg-orange-100 text-orange-800",
    count: 7
  },
  {
    id: "maintenance",
    name: "Maintenance Reports",
    description: "Maintenance costs, performance, trends",
    icon: Wrench,
    color: "bg-yellow-100 text-yellow-800",
    count: 4
  }
];

const recentReports = [
  {
    id: "RPT-2024-001",
    name: "Monthly Financial Summary",
    type: "Financial",
    generatedDate: "2024-03-15",
    status: "completed",
    size: "2.4 MB",
    format: "PDF"
  },
  {
    id: "RPT-2024-002",
    name: "Property Performance Analysis",
    type: "Property",
    generatedDate: "2024-03-14",
    status: "completed",
    size: "1.8 MB",
    format: "Excel"
  },
  {
    id: "RPT-2024-003",
    name: "Tenant Satisfaction Survey",
    type: "Tenant",
    generatedDate: "2024-03-13",
    status: "completed",
    size: "1.2 MB",
    format: "PDF"
  },
  {
    id: "RPT-2024-004",
    name: "Lease Renewal Report",
    type: "Lease",
    generatedDate: "2024-03-12",
    status: "completed",
    size: "3.1 MB",
    format: "PDF"
  },
  {
    id: "RPT-2024-005",
    name: "Maintenance Cost Analysis",
    type: "Maintenance",
    generatedDate: "2024-03-11",
    status: "completed",
    size: "1.5 MB",
    format: "Excel"
  }
];

const scheduledReports = [
  {
    id: "SCH-001",
    name: "Weekly Financial Dashboard",
    frequency: "Weekly",
    nextRun: "2024-03-18",
    status: "active",
    recipients: ["finance@company.com", "manager@company.com"]
  },
  {
    id: "SCH-002",
    name: "Monthly Property Report",
    frequency: "Monthly",
    nextRun: "2024-04-01",
    status: "active",
    recipients: ["property@company.com"]
  },
  {
    id: "SCH-003",
    name: "Quarterly Performance Review",
    frequency: "Quarterly",
    nextRun: "2024-06-30",
    status: "active",
    recipients: ["executive@company.com", "board@company.com"]
  }
];

export default function Reports() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 Days");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [showScheduledReports, setShowScheduledReports] = useState(false);

  const periodOptions = ["Last 7 Days", "Last 30 Days", "Last 90 Days", "Last Year", "Custom Range"];
  const categoryOptions = ["All", "Financial", "Property", "Tenant", "Lease", "Maintenance"];

  const filteredReports = recentReports.filter((report) => {
    const matchesSearch = 
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || report.type === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const totalReports = recentReports.length;
  const completedReports = recentReports.filter(r => r.status === "completed").length;
  const scheduledReportsCount = scheduledReports.length;
  const totalSize = recentReports.reduce((sum, r) => sum + parseFloat(r.size), 0);

  const handleGenerateReport = (category: string) => {
    try {
      // Generate comprehensive data for the category
      const detailedData = generateReportDataByType(category, `${category} Summary Report`);
      const reportData = generateReportSummary(category, detailedData);
      
      // Generate Excel report
      generateExcel(reportData, `${category}_Report`);
      
      toast({
        title: "Report Generated!",
        description: `${category} report has been generated and downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowReportDetails(true);
  };

  const generateReportDataByType = (reportType: string, reportName: string) => {
    // Generate comprehensive data based on report type
    switch (reportType) {
      case "Financial":
        return {
          reportName,
          reportType: "Financial Analysis",
          period: selectedPeriod,
          summary: {
            totalRevenue: "AED 2,450,000",
            totalExpenses: "AED 980,000",
            netProfit: "AED 1,470,000",
            profitMargin: "60%",
            outstandingReceivables: "AED 125,000",
            collectionRate: "94.8%"
          },
          monthlyBreakdown: [
            { month: "January", revenue: 410000, expenses: 165000, profit: 245000 },
            { month: "February", revenue: 405000, expenses: 162000, profit: 243000 },
            { month: "March", revenue: 420000, expenses: 168000, profit: 252000 },
            { month: "April", revenue: 415000, expenses: 166000, profit: 249000 },
            { month: "May", revenue: 400000, expenses: 160000, profit: 240000 },
            { month: "June", revenue: 400000, expenses: 159000, profit: 241000 }
          ],
          topRevenueSources: [
            { source: "Marina Heights Tower", revenue: 680000, percentage: 27.8 },
            { source: "Business Bay Plaza", revenue: 520000, percentage: 21.2 },
            { source: "Palm View Apartments", revenue: 450000, percentage: 18.4 },
            { source: "Downtown Complex", revenue: 420000, percentage: 17.1 },
            { source: "Creek Side Villas", revenue: 380000, percentage: 15.5 }
          ]
        };
      case "Property":
        return {
          reportName,
          reportType: "Property Performance Analysis",
          period: selectedPeriod,
          summary: {
            totalProperties: 12,
            averageOccupancy: "92.5%",
            totalRevenue: "AED 2,450,000",
            averageRating: "4.6/5",
            maintenanceCosts: "AED 85,000"
          },
          propertyPerformance: [
            { property: "Marina Heights Tower", occupancy: 95, revenue: 680000, rating: 4.8, units: 24 },
            { property: "Business Bay Plaza", occupancy: 92, revenue: 520000, rating: 4.5, units: 18 },
            { property: "Palm View Apartments", occupancy: 90, revenue: 450000, rating: 4.7, units: 20 },
            { property: "Downtown Complex", occupancy: 88, revenue: 420000, rating: 4.4, units: 16 },
            { property: "Creek Side Villas", occupancy: 94, revenue: 380000, rating: 4.6, units: 12 }
          ],
          occupancyTrends: [
            { month: "January", occupancy: 91, vacantUnits: 8 },
            { month: "February", occupancy: 90, vacantUnits: 9 },
            { month: "March", occupancy: 92, vacantUnits: 7 },
            { month: "April", occupancy: 93, vacantUnits: 6 },
            { month: "May", occupancy: 92, vacantUnits: 7 },
            { month: "June", occupancy: 93, vacantUnits: 6 }
          ]
        };
      case "Tenant":
        return {
          reportName,
          reportType: "Tenant Analytics & Satisfaction",
          period: selectedPeriod,
          summary: {
            totalTenants: 145,
            averageSatisfaction: "4.5/5",
            retentionRate: "88.5%",
            complimentsToComplaintsRatio: "3.2:1"
          },
          satisfactionScores: [
            { category: "Property Condition", score: 4.6, responses: 142 },
            { category: "Maintenance Response", score: 4.4, responses: 138 },
            { category: "Communication", score: 4.5, responses: 145 },
            { category: "Value for Money", score: 4.3, responses: 140 },
            { category: "Amenities", score: 4.7, responses: 135 }
          ],
          paymentBehavior: [
            { status: "Always On Time", count: 110, percentage: 75.9 },
            { status: "Occasional Late", count: 25, percentage: 17.2 },
            { status: "Frequently Late", count: 10, percentage: 6.9 }
          ],
          demographicsData: [
            { segment: "Families", count: 65, percentage: 44.8 },
            { segment: "Young Professionals", count: 50, percentage: 34.5 },
            { segment: "Couples", count: 20, percentage: 13.8 },
            { segment: "Retirees", count: 10, percentage: 6.9 }
          ]
        };
      case "Lease":
        return {
          reportName,
          reportType: "Lease Management Report",
          period: selectedPeriod,
          summary: {
            totalLeases: 145,
            activeLeases: 130,
            expiringNext3Months: 18,
            renewalRate: "85.5%",
            averageLeaseDuration: "12 months"
          },
          leaseStatus: [
            { status: "Active", count: 130, percentage: 89.7 },
            { status: "Expiring Soon", count: 8, percentage: 5.5 },
            { status: "Expired", count: 5, percentage: 3.4 },
            { status: "Pending Renewal", count: 2, percentage: 1.4 }
          ],
          renewalAnalysis: [
            { month: "January", renewals: 12, retention: 91.7 },
            { month: "February", renewals: 10, retention: 83.3 },
            { month: "March", renewals: 15, retention: 86.7 },
            { month: "April", renewals: 8, retention: 87.5 },
            { month: "May", renewals: 11, retention: 90.9 },
            { month: "June", renewals: 14, retention: 85.7 }
          ],
          leaseDurations: [
            { duration: "6 months", count: 15, percentage: 10.3 },
            { duration: "12 months", count: 95, percentage: 65.5 },
            { duration: "24 months", count: 30, percentage: 20.7 },
            { duration: "36 months", count: 5, percentage: 3.4 }
          ]
        };
      case "Maintenance":
        return {
          reportName,
          reportType: "Maintenance Operations Report",
          period: selectedPeriod,
          summary: {
            totalTickets: 287,
            completionRate: "89.2%",
            totalCost: "AED 185,400",
            averageResolutionTime: "2.8 days",
            satisfactionScore: "4.6/5"
          },
          ticketsByStatus: [
            { status: "Completed", count: 256, percentage: 89.2 },
            { status: "In Progress", count: 18, percentage: 6.3 },
            { status: "Pending", count: 10, percentage: 3.5 },
            { status: "Cancelled", count: 3, percentage: 1.0 }
          ],
          categoryBreakdown: [
            { category: "Plumbing", count: 85, cost: 42500, avgTime: 2.5 },
            { category: "Electrical", count: 62, cost: 38200, avgTime: 3.2 },
            { category: "HVAC", count: 48, cost: 56800, avgTime: 3.8 },
            { category: "Appliances", count: 42, cost: 28400, avgTime: 2.1 },
            { category: "General", count: 50, cost: 19500, avgTime: 1.9 }
          ],
          monthlyTrends: [
            { month: "January", tickets: 45, completed: 41, cost: 28900 },
            { month: "February", tickets: 42, completed: 38, cost: 26400 },
            { month: "March", tickets: 50, completed: 46, cost: 32100 },
            { month: "April", tickets: 48, completed: 44, cost: 30800 },
            { month: "May", tickets: 52, completed: 47, cost: 33600 },
            { month: "June", tickets: 50, completed: 40, cost: 33600 }
          ]
        };
      default:
        return {
          reportName,
          reportType: "General Report",
          period: selectedPeriod,
          summary: { message: "Report data for comprehensive analysis" }
        };
    }
  };

  const handleDownloadReport = (report: any) => {
    try {
      // Generate comprehensive data based on report type
      const detailedData = generateReportDataByType(report.type, report.name);
      const reportData = generateReportSummary(report.type, detailedData);
      
      // Download based on format
      if (report.format === "PDF") {
        generatePDF(reportData, report.name);
      } else if (report.format === "Excel") {
        generateExcel(reportData, report.name);
      } else {
        generateCSV(reportData, report.name);
      }
      
      toast({
        title: "Download Started!",
        description: `${report.name} is being downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleScheduleReport = (report: any) => {
    toast({
        title: "Schedule Report",
        description: `Report scheduling for "${report.name}" is not yet implemented.`,
    });
  };

  const handleExportAll = () => {
    try {
      const allReportsData = generateReportSummary("All Reports", filteredReports);
      generateExcel(allReportsData, "All_Reports_Export");
      
      toast({
        title: "Export Started!",
        description: "All reports are being exported to Excel.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export reports. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive reporting and business intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowScheduledReports(true)}>
            <Clock className="h-4 w-4 mr-2" />
            Scheduled Reports
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button className="bg-gradient-primary shadow-glow">
            <Plus className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-3xl font-bold text-foreground">{totalReports}</p>
                <p className="text-sm text-muted-foreground">Generated</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-foreground">{completedReports}</p>
                <p className="text-sm text-muted-foreground">Ready to view</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                <p className="text-3xl font-bold text-foreground">{scheduledReportsCount}</p>
                <p className="text-sm text-muted-foreground">Auto-generated</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Size</p>
                <p className="text-3xl font-bold text-foreground">{totalSize.toFixed(1)} MB</p>
                <p className="text-sm text-muted-foreground">Storage used</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Database className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-primary text-primary-foreground")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((period) => (
                <SelectItem key={period} value={period}>
                  {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Date Range</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="tenant">Tenant</TabsTrigger>
          <TabsTrigger value="lease">Lease</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="specialized">Specialized</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Report Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Card 
                  key={category.id} 
                  className="cursor-pointer transition-all duration-200 hover:shadow-md"
                  onClick={() => handleGenerateReport(category.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", category.color)}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary">{category.count} reports</Badge>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{category.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
                    <Button className="w-full" variant="outline">
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{report.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.type} • {report.format} • {report.size}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Generated: {new Date(report.generatedDate).toLocaleDateString("en-AE")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewReport(report)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleViewReport(report)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Report
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadReport(report)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleScheduleReport(report)}>
                            <Clock className="h-4 w-4 mr-2" />
                            Schedule
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="financial">
          <FinancialReports />
        </TabsContent>

        {/* Property Reports Tab */}
        <TabsContent value="property">
          <PropertyReports />
        </TabsContent>

        {/* Tenant Reports Tab */}
        <TabsContent value="tenant">
          <TenantReports />
        </TabsContent>

        {/* Lease Reports Tab */}
        <TabsContent value="lease">
          <LeaseReports />
        </TabsContent>

        {/* Maintenance Reports Tab */}
        <TabsContent value="maintenance">
          <MaintenanceReports />
        </TabsContent>

        {/* Specialized Reports Tab */}
        <TabsContent value="specialized" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Unit Cost & Revenue Report */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Unit-wise Cost & Revenue Report
                  </CardTitle>
                  <Badge variant="secondary">NEW</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <UnitCostRevenueReport />
              </CardContent>
            </Card>

            {/* Loss of Income Report */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Loss of Income Report
                  </CardTitle>
                  <Badge variant="secondary">NEW</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <LossOfIncomeReport />
              </CardContent>
            </Card>

            {/* Customer Ledger Report */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Ledger Report
                  </CardTitle>
                  <Badge variant="secondary">NEW</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CustomerLedgerReport />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <AccountsTransReport />
        </TabsContent>
      </Tabs>

      {/* Report Details Modal */}
      {showReportDetails && selectedReport && (
        <Dialog open={showReportDetails} onOpenChange={setShowReportDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold text-foreground">
                    {selectedReport.name}
                  </DialogTitle>
                  <p className="text-muted-foreground mt-1">
                    {selectedReport.type} Report • {selectedReport.format} • {selectedReport.size}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    toast({
                      title: "Share Report",
                      description: "Report sharing functionality coming soon!",
                    });
                  }}>
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadReport(selectedReport)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Report Preview</h3>
                    <p className="text-muted-foreground mb-6">
                      This is a preview of the {selectedReport.name} report. 
                      Click download to get the full report in {selectedReport.format} format.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button 
                        variant="outline"
                        onClick={() => handleDownloadReport({...selectedReport, format: "PDF"})}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleDownloadReport({...selectedReport, format: "Excel"})}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Excel
                      </Button>
                      <Button 
                        className="bg-gradient-primary shadow-glow"
                        onClick={() => handleDownloadReport(selectedReport)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download ({selectedReport.format})
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Scheduled Reports Modal */}
      {showScheduledReports && (
        <Dialog open={showScheduledReports} onOpenChange={setShowScheduledReports}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Scheduled Reports
              </DialogTitle>
            </DialogHeader>
            <ScheduledReports reports={scheduledReports} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}