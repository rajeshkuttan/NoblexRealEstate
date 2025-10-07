import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, Key, AlertCircle } from "lucide-react";

const activities = [
  {
    id: 1,
    type: "lease",
    title: "New Lease Agreement",
    description: "Unit 305, Marina Heights - Sarah Ahmed",
    time: "2 hours ago",
    icon: FileText,
    status: "success",
  },
  {
    id: 2,
    type: "payment",
    title: "Payment Received",
    description: "AED 85,000 - Mohammed Al Mansoori",
    time: "5 hours ago",
    icon: DollarSign,
    status: "success",
  },
  {
    id: 3,
    type: "maintenance",
    title: "Maintenance Request",
    description: "AC Repair - Unit 102, Business Bay Tower",
    time: "1 day ago",
    icon: Key,
    status: "warning",
  },
  {
    id: 4,
    type: "alert",
    title: "Lease Expiring Soon",
    description: "Unit 450, Dubai Marina - 30 days notice",
    time: "2 days ago",
    icon: AlertCircle,
    status: "warning",
  },
];

export default function RecentActivity() {
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
                <p className="text-xs text-muted-foreground mt-2">{activity.time}</p>
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
