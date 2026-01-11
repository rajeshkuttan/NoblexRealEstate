import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, Save } from 'lucide-react';

export default function BudgetAlertSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Budget Alert Settings</h2>
        <p className="text-muted-foreground">
          Configure alerts and notifications for budget thresholds
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Thresholds</CardTitle>
          <CardDescription>
            Set percentage thresholds for budget alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="warningThreshold">Warning Threshold (%)</Label>
              <Input id="warningThreshold" type="number" defaultValue="75" min="0" max="100" />
              <p className="text-xs text-muted-foreground">
                Alert when spent amount reaches this percentage
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="criticalThreshold">Critical Threshold (%)</Label>
              <Input id="criticalThreshold" type="number" defaultValue="90" min="0" max="100" />
              <p className="text-xs text-muted-foreground">
                Critical alert when spent amount reaches this percentage
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Alert Frequency</h3>
            <div className="space-y-2">
              <Label htmlFor="frequency">How often to send alerts</Label>
              <Select defaultValue="weekly">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="realtime">Real-time (immediate)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notification Channels</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <Label>In-App Notifications</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Show alerts within the application
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <Label>Email Notifications</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Send alerts via email
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Email Recipients</h3>
            <div className="space-y-2">
              <Label htmlFor="recipients">Add email addresses (comma-separated)</Label>
              <Input
                id="recipients"
                placeholder="finance@company.com, manager@company.com"
                defaultValue="finance@emirateslease.com"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

