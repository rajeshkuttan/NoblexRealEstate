import { useState, useEffect } from "react";
import { Building2, Users, FileText, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  propertiesAPI, 
  unitsAPI, 
  leasesAPI, 
  tenantsAPI,
  paymentsAPI,
  ticketsAPI 
} from "@/services/api";
import api from "@/services/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalProperties: 0,
    totalUnits: 0,
    activeLeases: 0,
    activeTenants: 0,
    totalRevenue: 0,
    occupancyRate: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    expiringLeases: 0,
    overduePayments: 0,
    pendingTickets: 0,
    avgRentPerUnit: 0,
    collectionRate: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log("📊 Fetching dashboard data...");

      // Try to use dashboard stats endpoint first (will be created in backend)
      // Fallback to optimized individual calls with pagination
      try {
        const statsRes = await api.get('/dashboard/stats');
        if (statsRes.data?.success && statsRes.data?.data) {
          const stats = statsRes.data.data;
          setDashboardData({
            totalProperties: stats.totalProperties || 0,
            totalUnits: stats.totalUnits || 0,
            activeLeases: stats.activeLeases || 0,
            activeTenants: stats.activeTenants || 0,
            totalRevenue: stats.totalRevenue || 0,
            occupancyRate: stats.occupancyRate || 0,
            occupiedUnits: stats.occupiedUnits || 0,
            vacantUnits: stats.vacantUnits || 0,
            expiringLeases: stats.expiringLeases || 0,
            overduePayments: stats.overduePayments || 0,
            pendingTickets: stats.pendingTickets || 0,
            avgRentPerUnit: stats.avgRentPerUnit || 0,
            collectionRate: stats.collectionRate || 0,
          });
          console.log("✅ Dashboard stats loaded from aggregated endpoint");
          return;
        }
      } catch (statsError) {
        console.log("⚠️ Dashboard stats endpoint not available, using optimized individual calls");
      }

      // Fallback: Use stats endpoints and paginated requests (limit: 100 for calculations)
      const [
        propertiesStatsRes,
        unitsStatsRes,
        leasesStatsRes,
        tenantsStatsRes,
        paymentsStatsRes,
        ticketsStatsRes,
        // Fetch limited data for calculations (only active/needed records)
        leasesRes,
        paymentsRes,
      ] = await Promise.all([
        propertiesAPI.getStats().catch(() => ({ data: { success: false } })),
        unitsAPI.getStats().catch(() => ({ data: { success: false } })),
        leasesAPI.getStats().catch(() => ({ data: { success: false } })),
        tenantsAPI.getStats().catch(() => ({ data: { success: false } })),
        paymentsAPI.getStats().catch(() => ({ data: { success: false } })),
        ticketsAPI.getStats().catch(() => ({ data: { success: false } })),
        // Fetch only active leases for revenue calculation (limit: 100)
        leasesAPI.getAll({ limit: 100, status: 'active' }).catch(() => ({ data: { data: [] } })),
        // Fetch recent payments for collection rate (limit: 100)
        paymentsAPI.getAll({ limit: 100 }).catch(() => ({ data: { data: [] } })),
      ]);

      // Extract stats from responses
      const propertiesStats = propertiesStatsRes.data?.data || {};
      const unitsStats = unitsStatsRes.data?.data || {};
      const leasesStats = leasesStatsRes.data?.data || {};
      const tenantsStats = tenantsStatsRes.data?.data || {};
      const paymentsStats = paymentsStatsRes.data?.data || {};
      const ticketsStats = ticketsStatsRes.data?.data || {};

      // Extract limited data for calculations
      const leases = extractData(leasesRes);
      const payments = extractData(paymentsRes);

      // Use stats where available, otherwise calculate from limited data
      const totalProperties = propertiesStats.total || 0;
      const totalUnits = unitsStats.total || 0;
      const activeLeases = leasesStats.active || leases.filter((l: any) => l.status === 'active' || l.status === 'Active').length;
      const activeTenants = tenantsStats.active || tenantsStats.total || 0;
      
      // Calculate occupancy from stats or limited data
      const occupiedUnits = unitsStats.occupied || 0;
      const vacantUnits = unitsStats.vacant || (totalUnits - occupiedUnits);
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      // Calculate revenue from limited active leases
      const totalRevenue = leases.reduce((sum: number, lease: any) => {
        const rent = parseFloat(lease.monthlyRent || lease.monthly_rent || lease.rentAmount || 0);
        return sum + rent;
      }, 0);

      // Calculate average rent
      const avgRentPerUnit = occupiedUnits > 0 ? Math.round(totalRevenue / occupiedUnits) : 0;

      // Get expiring leases from stats or calculate from limited data
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
      const expiringLeases = leasesStats.expiring || leases.filter((lease: any) => {
        const endDate = new Date(lease.endDate || lease.end_date);
        return endDate <= sixtyDaysFromNow && endDate >= new Date();
      }).length;

      // Get overdue payments from stats or calculate from limited data
      const overduePayments = paymentsStats.overdue || payments.filter((p: any) => 
        p.status === 'overdue' || (p.status === 'pending' && new Date(p.dueDate || p.due_date) < new Date())
      ).length;

      // Get pending tickets from stats
      const pendingTickets = ticketsStats.pending || ticketsStats.open || 0;

      // Calculate collection rate from limited payments
      const totalExpected = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
      const totalCollected = payments.filter((p: any) => p.status === 'paid' || p.status === 'completed').reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      setDashboardData({
        totalProperties,
        totalUnits,
        activeLeases,
        activeTenants,
        totalRevenue,
        occupancyRate,
        occupiedUnits,
        vacantUnits,
        expiringLeases,
        overduePayments,
        pendingTickets,
        avgRentPerUnit,
        collectionRate,
      });

      console.log("✅ Dashboard data loaded successfully");
    } catch (error: any) {
      console.error("❌ Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract data from different API response formats
  const extractData = (response: any) => {
    return (
      response.data?.data?.properties ||
      response.data?.data?.units ||
      response.data?.data?.leases ||
      response.data?.data?.tenants ||
      response.data?.data?.payments ||
      response.data?.data?.tickets ||
      response.data?.properties ||
      response.data?.units ||
      response.data?.leases ||
      response.data?.tenants ||
      response.data?.payments ||
      response.data?.tickets ||
      response.data?.rows ||
      response.data?.data ||
      response.data ||
      []
    );
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `AED ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `AED ${(amount / 1000).toFixed(0)}K`;
    }
    return `AED ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome to withu! Here's your property overview.</p>
        </div>
        <Button 
          className="bg-gradient-withu shadow-glow opacity-100"
          onClick={() => navigate('/leases')}
        >
          <FileText className="h-4 w-4 mr-2" />
          New Lease
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Properties"
          value={dashboardData.totalProperties}
          change={`${dashboardData.totalUnits} units total`}
          changeType="positive"
          icon={Building2}
          gradient="primary"
        />
        <MetricCard
          title="Active Leases"
          value={dashboardData.activeLeases}
          change={`${dashboardData.occupancyRate}% occupancy`}
          changeType={dashboardData.occupancyRate >= 90 ? "positive" : "negative"}
          icon={FileText}
          gradient="secondary"
        />
        <MetricCard
          title="Monthly Revenue"
          value={formatCurrency(dashboardData.totalRevenue)}
          change={`${dashboardData.activeTenants} active tenants`}
          changeType="positive"
          icon={DollarSign}
          gradient="accent"
        />
        <MetricCard
          title="Pending Actions"
          value={dashboardData.pendingTickets + dashboardData.expiringLeases}
          change={`${dashboardData.expiringLeases} leases expiring soon`}
          changeType={dashboardData.pendingTickets > 0 ? "negative" : "positive"}
          icon={AlertCircle}
          gradient="primary"
        />
      </div>

      {/* Alerts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <Card className="shadow-card lg:col-span-1">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Alerts & Reminders</h3>
          </div>
          <div className="p-6 space-y-4">
            {dashboardData.expiringLeases > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Leases Expiring (60 days)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboardData.expiringLeases} lease{dashboardData.expiringLeases !== 1 ? 's' : ''} require renewal action
                  </p>
                </div>
              </div>
            )}
            {dashboardData.overduePayments > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <DollarSign className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Overdue Payments</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboardData.overduePayments} payment{dashboardData.overduePayments !== 1 ? 's' : ''} overdue
                  </p>
                </div>
              </div>
            )}
            {dashboardData.pendingTickets > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Pending Tickets</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboardData.pendingTickets} maintenance ticket{dashboardData.pendingTickets !== 1 ? 's' : ''} open
                  </p>
                </div>
              </div>
            )}
            {dashboardData.expiringLeases === 0 && dashboardData.overduePayments === 0 && dashboardData.pendingTickets === 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
                <FileText className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">All Clear!</p>
                  <p className="text-xs text-muted-foreground mt-1">No pending actions at this time ✓</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Tenant Portfolio</h3>
            <Users className="h-5 w-5 text-secondary" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Active Tenants</span>
              <Badge variant="secondary">{dashboardData.activeTenants}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Active Leases</span>
              <Badge>{dashboardData.activeLeases}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Total Units</span>
              <span className="text-sm font-medium text-foreground">{dashboardData.totalUnits}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Financial Performance</h3>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Collection Rate</span>
              <Badge className={dashboardData.collectionRate >= 90 ? "bg-success" : "bg-warning"}>
                {dashboardData.collectionRate}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Avg. Rent/Unit</span>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(dashboardData.avgRentPerUnit)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Monthly Revenue</span>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(dashboardData.totalRevenue)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Property Status</h3>
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Occupied</span>
              <Badge variant="secondary">{dashboardData.occupiedUnits} units</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Vacant</span>
              <Badge variant="outline">{dashboardData.vacantUnits} units</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Occupancy Rate</span>
              <span className={`text-sm font-medium ${dashboardData.occupancyRate >= 90 ? 'text-success' : 'text-warning'}`}>
                {dashboardData.occupancyRate}%
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
