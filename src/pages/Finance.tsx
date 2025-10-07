import { DollarSign, TrendingUp, AlertCircle, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const invoices = [
  {
    id: "INV-2024-001",
    tenant: "Sarah Ahmed",
    property: "Marina Heights - Unit 305",
    amount: "AED 21,250",
    vat: "AED 1,062.50",
    total: "AED 22,312.50",
    dueDate: "Apr 1, 2024",
    status: "paid",
    paidDate: "Mar 28, 2024",
  },
  {
    id: "INV-2024-002",
    tenant: "Mohammed Al Mansoori",
    property: "Business Bay - Unit 102",
    amount: "AED 30,000",
    vat: "AED 1,500",
    total: "AED 31,500",
    dueDate: "Apr 1, 2024",
    status: "paid",
    paidDate: "Mar 30, 2024",
  },
  {
    id: "INV-2024-003",
    tenant: "Jennifer Smith",
    property: "Palm Residences - Unit 204",
    amount: "AED 37,500",
    vat: "AED 1,875",
    total: "AED 39,375",
    dueDate: "Apr 5, 2024",
    status: "pending",
  },
  {
    id: "INV-2024-004",
    tenant: "Ahmed Hassan",
    property: "Downtown Plaza - Unit 801",
    amount: "AED 23,750",
    vat: "AED 1,187.50",
    total: "AED 24,937.50",
    dueDate: "Mar 20, 2024",
    status: "overdue",
  },
];

export default function Finance() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground mt-2">Manage invoicing, payments, and financial reporting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-gradient-primary shadow-glow">
            Generate Invoice
          </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Monthly Revenue</p>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <p className="text-3xl font-bold text-foreground">AED 2.4M</p>
          <p className="text-sm text-success mt-2">+12% from last month</p>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <DollarSign className="h-5 w-5 text-warning" />
          </div>
          <p className="text-3xl font-bold text-foreground">AED 145K</p>
          <p className="text-sm text-muted-foreground mt-2">5 pending invoices</p>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Collection Rate</p>
            <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center text-xs text-white font-bold">
              ✓
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">96%</p>
          <p className="text-sm text-success mt-2">Above target (90%)</p>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">VAT Collected</p>
            <AlertCircle className="h-5 w-5 text-accent" />
          </div>
          <p className="text-3xl font-bold text-foreground">AED 120K</p>
          <p className="text-sm text-muted-foreground mt-2">This quarter</p>
        </Card>
      </div>

      {/* Invoices & Payments */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4 mt-6">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="shadow-card hover:shadow-elevated transition-all duration-300">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-foreground">{invoice.id}</h3>
                      <Badge
                        variant={invoice.status === "paid" ? "default" : "secondary"}
                        className={
                          invoice.status === "paid"
                            ? "bg-success text-success-foreground"
                            : invoice.status === "overdue"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-warning text-warning-foreground"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{invoice.tenant}</p>
                    <p className="text-sm text-muted-foreground">{invoice.property}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-accent">{invoice.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">Inc. VAT: {invoice.vat}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className="text-sm font-semibold text-foreground">{invoice.amount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                    <p className="text-sm font-semibold text-foreground">{invoice.dueDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {invoice.status === "paid" ? "Paid Date" : "Status"}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {invoice.paidDate || invoice.status}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-2" />
                    Download PDF
                  </Button>
                  {invoice.status === "pending" && (
                    <Button size="sm" variant="outline">
                      Send Reminder
                    </Button>
                  )}
                  {invoice.status === "overdue" && (
                    <Button size="sm" className="bg-destructive text-destructive-foreground">
                      Escalate
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card className="p-8 text-center shadow-card">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Payment History</h3>
            <p className="text-muted-foreground">Payment records and transaction details will appear here</p>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card className="p-8 text-center shadow-card">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Financial Reports</h3>
            <p className="text-muted-foreground">Detailed financial analytics and reports will be available here</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
