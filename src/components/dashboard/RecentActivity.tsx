import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, Key, AlertCircle, User, Building2 } from "lucide-react";
import { leasesAPI, paymentsAPI, ticketsAPI, tenantsAPI } from "@/services/api";
import { formatDistanceToNow } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";

export default function RecentActivity() {
  const { activeCompanyId } = useCompany();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, [activeCompanyId]);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      console.log("📊 Fetching recent activity...");

      // Fetch recent data from all sources
      const [leasesRes, paymentsRes, ticketsRes, tenantsRes] = await Promise.all([
        leasesAPI.getAll(),
        paymentsAPI.getAll(),
        ticketsAPI.getAll(),
        tenantsAPI.getAll(),
      ]);

      const leases = extractData(leasesRes);
      const payments = extractData(paymentsRes);
      const tickets = extractData(ticketsRes);
      const tenants = extractData(tenantsRes);

      // Combine and format activities
      const allActivities: any[] = [];

      // Add recent leases
      leases.slice(0, 2).forEach((lease: any) => {
        allActivities.push({
          id: `lease-${lease.id}`,
          type: "lease",
          title: "Lease Agreement",
          description: `Lease #${lease.id} - ${lease.status || 'Active'}`,
          time: lease.created_at || lease.createdAt || new Date(),
          icon: FileText,
          status: lease.status === 'active' ? 'success' : 'warning',
        });
      });

      // Add recent payments
      payments.slice(0, 2).forEach((payment: any) => {
        allActivities.push({
          id: `payment-${payment.id}`,
          type: "payment",
          title: payment.status === 'paid' ? 'Payment Received' : 'Payment Pending',
          description: `AED ${parseFloat(payment.amount || 0).toLocaleString()}`,
          time: payment.created_at || payment.createdAt || payment.paymentDate || new Date(),
          icon: DollarSign,
          status: payment.status === 'paid' ? 'success' : 'warning',
        });
      });

      // Add recent tickets
      tickets.slice(0, 2).forEach((ticket: any) => {
        allActivities.push({
          id: `ticket-${ticket.id}`,
          type: "maintenance",
          title: ticket.title || 'Maintenance Request',
          description: ticket.description || `Ticket #${ticket.id}`,
          time: ticket.created_at || ticket.createdAt || new Date(),
          icon: Key,
          status: ticket.status === 'resolved' ? 'success' : 'warning',
        });
      });

      // Add recent tenants
      tenants.slice(0, 1).forEach((tenant: any) => {
        allActivities.push({
          id: `tenant-${tenant.id}`,
          type: "tenant",
          title: "New Tenant Added",
          description: tenant.name || `Tenant #${tenant.id}`,
          time: tenant.created_at || tenant.createdAt || new Date(),
          icon: User,
          status: 'success',
        });
      });

      // Sort by time (most recent first)
      allActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // Take top 5
      setActivities(allActivities.slice(0, 5));
      console.log("✅ Recent activity loaded:", allActivities.length);
    } catch (error) {
      console.error("❌ Failed to fetch recent activity:", error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const extractData = (response: any) => {
    return (
      response.data?.data?.leases ||
      response.data?.data?.payments ||
      response.data?.data?.tickets ||
      response.data?.data?.tenants ||
      response.data?.leases ||
      response.data?.payments ||
      response.data?.tickets ||
      response.data?.tenants ||
      response.data?.rows ||
      response.data?.data ||
      response.data ||
      []
    );
  };

  const formatTime = (time: any) => {
    try {
      return formatDistanceToNow(new Date(time), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading activity...</p>
        </div>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="shadow-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No recent activity to display</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => (
          <div key={activity.id} className="p-6 hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-4">
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  activity.status === "success"
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                }`}
              >
                <activity.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatTime(activity.time)}</p>
              </div>
              <Badge
                variant={activity.status === "success" ? "default" : "secondary"}
                className="shrink-0"
              >
                {activity.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
