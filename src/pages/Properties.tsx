import { useState } from "react";
import { Building2, MapPin, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const properties = [
  {
    id: 1,
    name: "Marina Heights Tower",
    location: "Dubai Marina",
    type: "Residential",
    units: 45,
    occupied: 42,
    revenue: "AED 850K",
    status: "active",
  },
  {
    id: 2,
    name: "Business Bay Commercial",
    location: "Business Bay",
    type: "Commercial",
    units: 28,
    occupied: 26,
    revenue: "AED 620K",
    status: "active",
  },
  {
    id: 3,
    name: "Palm Residences",
    location: "Palm Jumeirah",
    type: "Residential",
    units: 32,
    occupied: 30,
    revenue: "AED 1.2M",
    status: "active",
  },
  {
    id: 4,
    name: "Downtown Office Plaza",
    location: "Downtown Dubai",
    type: "Commercial",
    units: 18,
    occupied: 15,
    revenue: "AED 480K",
    status: "active",
  },
];

export default function Properties() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProperties = properties.filter((property) =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground mt-2">Manage your property portfolio</p>
        </div>
        <Button className="bg-gradient-primary shadow-glow">
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <Card key={property.id} className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group">
            <div className="h-40 bg-gradient-primary relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Building2 className="h-16 w-16 text-white/20" />
              </div>
              <Badge className="absolute top-4 right-4 bg-white/20 text-white backdrop-blur-sm">
                {property.type}
              </Badge>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {property.name}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{property.location}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Total Units</p>
                  <p className="text-lg font-semibold text-foreground">{property.units}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Occupied</p>
                  <p className="text-lg font-semibold text-success">{property.occupied}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                  <p className="text-lg font-bold text-accent">{property.revenue}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">
                    {Math.round((property.occupied / property.units) * 100)}%
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                View Details
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
