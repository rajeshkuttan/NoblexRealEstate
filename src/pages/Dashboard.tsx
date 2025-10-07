import { Building2, Users, FileText, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome back! Here's your property overview.</p>
        </div>
        <Button className="bg-gradient-primary shadow-glow">
          <FileText className="h-4 w-4 mr-2" />
          New Lease
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Properties"
          value={47}
          change="+3 this month"
          changeType="positive"
          icon={Building2}
          gradient="primary"
        />
        <MetricCard
          title="Active Leases"
          value={142}
          change="95% occupancy"
          changeType="positive"
          icon={FileText}
          gradient="secondary"
        />
        <MetricCard
          title="Monthly Revenue"
          value="AED 2.4M"
          change="+12% from last month"
          changeType="positive"
          icon={DollarSign}
          gradient="accent"
        />
        <MetricCard
          title="Pending Actions"
          value={8}
          change="3 urgent"
          changeType="negative"
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
            <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
              <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Leases Expiring (60 days)</p>
                <p className="text-xs text-muted-foreground mt-1">12 leases require renewal action</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <DollarSign className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Overdue Payments</p>
                <p className="text-xs text-muted-foreground mt-1">AED 145,000 in arrears (5 tenants)</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
              <FileText className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Ejari Compliance</p>
                <p className="text-xs text-muted-foreground mt-1">All leases registered ✓</p>
              </div>
            </div>
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
              <Badge variant="secondary">142</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">New This Month</span>
              <Badge>8</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Avg. Lease Duration</span>
              <span className="text-sm font-medium text-foreground">14 months</span>
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
              <Badge className="bg-success">96%</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Avg. Rent/Unit</span>
              <span className="text-sm font-medium text-foreground">AED 78,500</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">VAT Collected</span>
              <span className="text-sm font-medium text-foreground">AED 120K</span>
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
              <Badge variant="secondary">142 units</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Vacant</span>
              <Badge variant="outline">8 units</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground">Occupancy Rate</span>
              <span className="text-sm font-medium text-success">94.7%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
