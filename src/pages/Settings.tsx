import { Building2, Bell, Users, Key, Plug } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your system preferences and configurations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <Card className="p-6 shadow-card h-fit">
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground font-medium">
              <Building2 className="h-5 w-5" />
              <span>Company Profile</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <Users className="h-5 w-5" />
              <span>User Management</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <Plug className="h-5 w-5" />
              <span>Integrations</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <Key className="h-5 w-5" />
              <span>Security</span>
            </button>
          </nav>
        </Card>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Profile */}
          <Card className="p-6 shadow-card">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Company Profile</h3>
                <p className="text-sm text-muted-foreground">Update your company information</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" placeholder="PropManage UAE" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trade-license">Trade License</Label>
                    <Input id="trade-license" placeholder="TL-123456" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rera-reg">RERA Registration</Label>
                    <Input id="rera-reg" placeholder="RERA-789012" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trn">Tax Registration Number (TRN)</Label>
                    <Input id="trn" placeholder="100123456700003" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input id="address" placeholder="Dubai Marina, Dubai, UAE" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input id="email" type="email" placeholder="info@propmanage.ae" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="+971 4 123 4567" />
                  </div>
                </div>

                <Button className="bg-gradient-primary shadow-glow">
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>

          {/* Integrations */}
          <Card className="p-6 shadow-card">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">UAE Integrations</h3>
                <p className="text-sm text-muted-foreground">Configure government and payment integrations</p>
              </div>

              <Separator />

              <div className="space-y-4">
                {/* Ejari Integration */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Ejari (DLD)</p>
                      <p className="text-sm text-muted-foreground">Dubai Land Department Integration</p>
                    </div>
                  </div>
                  <Switch />
                </div>

                {/* Tawtheeq Integration */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Tawtheeq (ADM)</p>
                      <p className="text-sm text-muted-foreground">Abu Dhabi Municipality Integration</p>
                    </div>
                  </div>
                  <Switch />
                </div>

                {/* DEWA Integration */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                      <Plug className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">DEWA</p>
                      <p className="text-sm text-muted-foreground">Dubai Electricity & Water Authority</p>
                    </div>
                  </div>
                  <Switch />
                </div>

                {/* Payment Gateway */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success flex items-center justify-center">
                      <Key className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Payment Gateway</p>
                      <p className="text-sm text-muted-foreground">Emirates NBD / Mashreq / Network Int.</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6 shadow-card">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground">Configure how you receive alerts</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Lease Expiry Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified 60 days before lease expiry</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Payment Reminders</p>
                    <p className="text-sm text-muted-foreground">Send reminders for due payments</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Maintenance Requests</p>
                    <p className="text-sm text-muted-foreground">Notify when tenants submit requests</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Compliance Alerts</p>
                    <p className="text-sm text-muted-foreground">RERA/FTA filing deadlines</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
