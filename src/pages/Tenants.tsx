import { useState } from "react";
import { Users, Search, Plus, Mail, Phone, FileCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const tenants = [
  {
    id: 1,
    name: "Sarah Ahmed",
    email: "sarah.ahmed@email.com",
    phone: "+971 50 123 4567",
    property: "Marina Heights - Unit 305",
    leaseStart: "Jan 2024",
    leaseEnd: "Dec 2024",
    rent: "AED 85,000",
    status: "active",
    kycStatus: "verified",
  },
  {
    id: 2,
    name: "Mohammed Al Mansoori",
    email: "m.almansoori@email.com",
    phone: "+971 55 987 6543",
    property: "Business Bay - Unit 102",
    leaseStart: "Mar 2024",
    leaseEnd: "Feb 2025",
    rent: "AED 120,000",
    status: "active",
    kycStatus: "verified",
  },
  {
    id: 3,
    name: "Jennifer Smith",
    email: "j.smith@email.com",
    phone: "+971 52 456 7890",
    property: "Palm Residences - Unit 204",
    leaseStart: "Jun 2023",
    leaseEnd: "May 2024",
    rent: "AED 150,000",
    status: "expiring",
    kycStatus: "verified",
  },
  {
    id: 4,
    name: "Ahmed Hassan",
    email: "a.hassan@email.com",
    phone: "+971 54 321 0987",
    property: "Downtown Plaza - Unit 801",
    leaseStart: "Feb 2024",
    leaseEnd: "Jan 2025",
    rent: "AED 95,000",
    status: "active",
    kycStatus: "pending",
  },
];

export default function Tenants() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTenants = tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.property.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground mt-2">Manage tenant information and relationships</p>
        </div>
        <Button className="bg-gradient-primary shadow-glow">
          <Plus className="h-4 w-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tenants List */}
      <div className="space-y-4">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="shadow-card hover:shadow-elevated transition-all duration-300">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-gradient-primary text-white text-lg font-semibold">
                      {getInitials(tenant.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{tenant.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{tenant.property}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={tenant.status === "active" ? "default" : "secondary"}
                          className={
                            tenant.status === "expiring"
                              ? "bg-warning text-warning-foreground"
                              : ""
                          }
                        >
                          {tenant.status}
                        </Badge>
                        <Badge
                          variant={tenant.kycStatus === "verified" ? "default" : "outline"}
                          className={
                            tenant.kycStatus === "verified"
                              ? "bg-success text-success-foreground"
                              : ""
                          }
                        >
                          <FileCheck className="h-3 w-3 mr-1" />
                          {tenant.kycStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{tenant.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{tenant.phone}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Lease: {tenant.leaseStart} - {tenant.leaseEnd}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Rent</p>
                        <p className="text-lg font-bold text-accent">{tenant.rent}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                        <Button variant="outline" size="sm">
                          View Lease
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
