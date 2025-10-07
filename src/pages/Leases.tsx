import { useState } from "react";
import { FileText, Search, Plus, Calendar, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const leases = [
  {
    id: 1,
    tenant: "Sarah Ahmed",
    property: "Marina Heights - Unit 305",
    startDate: "Jan 15, 2024",
    endDate: "Jan 14, 2025",
    rent: "AED 85,000",
    deposit: "AED 8,500",
    status: "active",
    ejariStatus: "registered",
    paymentStatus: "current",
  },
  {
    id: 2,
    tenant: "Mohammed Al Mansoori",
    property: "Business Bay - Unit 102",
    startDate: "Mar 1, 2024",
    endDate: "Feb 28, 2025",
    rent: "AED 120,000",
    deposit: "AED 12,000",
    status: "active",
    ejariStatus: "registered",
    paymentStatus: "current",
  },
  {
    id: 3,
    tenant: "Jennifer Smith",
    property: "Palm Residences - Unit 204",
    startDate: "Jun 10, 2023",
    endDate: "May 9, 2024",
    rent: "AED 150,000",
    deposit: "AED 15,000",
    status: "expiring",
    ejariStatus: "registered",
    paymentStatus: "current",
  },
  {
    id: 4,
    tenant: "Ahmed Hassan",
    property: "Downtown Plaza - Unit 801",
    startDate: "Feb 20, 2024",
    endDate: "Jan 19, 2025",
    rent: "AED 95,000",
    deposit: "AED 9,500",
    status: "pending",
    ejariStatus: "pending",
    paymentStatus: "pending",
  },
];

export default function Leases() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredLeases = leases.filter((lease) => {
    const matchesSearch =
      lease.tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.property.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && lease.status === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Leases</h1>
          <p className="text-muted-foreground mt-2">Manage lease agreements and compliance</p>
        </div>
        <Button className="bg-gradient-primary shadow-glow">
          <Plus className="h-4 w-4 mr-2" />
          New Lease
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search leases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Leases</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="expiring">Expiring</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredLeases.map((lease) => (
            <Card key={lease.id} className="shadow-card hover:shadow-elevated transition-all duration-300">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{lease.tenant}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{lease.property}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={lease.status === "active" ? "default" : "secondary"}
                      className={
                        lease.status === "expiring"
                          ? "bg-warning text-warning-foreground"
                          : lease.status === "pending"
                          ? "bg-muted text-muted-foreground"
                          : ""
                      }
                    >
                      {lease.status}
                    </Badge>
                    <Badge
                      variant={lease.ejariStatus === "registered" ? "default" : "outline"}
                      className={
                        lease.ejariStatus === "registered"
                          ? "bg-success text-success-foreground"
                          : ""
                      }
                    >
                      {lease.ejariStatus === "registered" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ejari
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Ejari Pending
                        </>
                      )}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Lease Period</p>
                    <div className="flex items-center gap-1 text-sm text-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{lease.startDate}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">to {lease.endDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Annual Rent</p>
                    <p className="text-lg font-bold text-accent">{lease.rent}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Security Deposit</p>
                    <p className="text-sm font-semibold text-foreground">{lease.deposit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Payment Status</p>
                    <Badge
                      variant={lease.paymentStatus === "current" ? "default" : "secondary"}
                      className={
                        lease.paymentStatus === "current"
                          ? "bg-success text-success-foreground"
                          : ""
                      }
                    >
                      {lease.paymentStatus}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Download Agreement
                  </Button>
                  {lease.status === "expiring" && (
                    <Button size="sm" className="bg-gradient-secondary">
                      Initiate Renewal
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
