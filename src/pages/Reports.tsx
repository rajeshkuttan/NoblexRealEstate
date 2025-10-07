import { BarChart3, Download, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive insights and compliance reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Select Period
          </Button>
          <Button className="bg-gradient-primary shadow-glow">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              Occupancy Report
            </h3>
            <BarChart3 className="h-6 w-6 text-secondary" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Property occupancy rates and vacancy analysis
          </p>
          <Button variant="outline" className="w-full">
            Generate Report
          </Button>
        </Card>

        <Card className="p-6 shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              Revenue Analysis
            </h3>
            <BarChart3 className="h-6 w-6 text-accent" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Income breakdown by property and tenant
          </p>
          <Button variant="outline" className="w-full">
            Generate Report
          </Button>
        </Card>

        <Card className="p-6 shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              Arrears Report
            </h3>
            <BarChart3 className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Outstanding payments and collection status
          </p>
          <Button variant="outline" className="w-full">
            Generate Report
          </Button>
        </Card>

        <Card className="p-6 shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              Ejari Compliance
            </h3>
            <BarChart3 className="h-6 w-6 text-success" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Registration status for RERA compliance
          </p>
          <Button variant="outline" className="w-full">
            Generate Report
          </Button>
        </Card>

        <Card className="p-6 shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              VAT Summary
            </h3>
            <BarChart3 className="h-6 w-6 text-warning" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            VAT collected and filing requirements for FTA
          </p>
          <Button variant="outline" className="w-full">
            Generate Report
          </Button>
        </Card>

        <Card className="p-6 shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              Lease Expiry
            </h3>
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upcoming lease expirations and renewals
          </p>
          <Button variant="outline" className="w-full">
            Generate Report
          </Button>
        </Card>
      </div>

      {/* Report Preview */}
      <Card className="p-8 shadow-card">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-gradient-primary mx-auto flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Select a Report to View</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Choose from the available reports above to generate detailed analytics and insights for your properties
          </p>
        </div>
      </Card>
    </div>
  );
}
