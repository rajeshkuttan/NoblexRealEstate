import { useState, useEffect } from 'react';
import { paymentGatewayAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  Settings,
} from 'lucide-react';

interface Gateway {
  name: string;
  configured: boolean;
  methods: string[];
}

export default function PaymentGatewaySettings() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const { data } = await paymentGatewayAPI.getAvailableGateways();
      setGateways(data.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch gateways',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = (gateway: string) => {
    const webhookUrl = `${window.location.origin}/api/payment-gateway/${gateway}/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'Copied',
      description: 'Webhook URL copied to clipboard',
    });
  };

  const getGatewayIcon = (name: string) => {
    return <CreditCard className="h-8 w-8" />;
  };

  const getGatewayDisplayName = (name: string) => {
    const names: { [key: string]: string } = {
      'stripe': 'Stripe',
      'paytabs': 'PayTabs',
      'network': 'Network International'
    };
    return names[name] || name;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Gateway Settings</h2>
          <p className="text-muted-foreground">
            Configure payment gateways for online collections
          </p>
        </div>
        <Button onClick={fetchGateways} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {gateways.length === 0 && (
        <Alert>
          <AlertDescription>
            No payment gateways are configured. Please add gateway credentials to your environment variables.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {gateways.map((gateway) => (
          <Card key={gateway.name} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getGatewayIcon(gateway.name)}
                  <div>
                    <CardTitle>{getGatewayDisplayName(gateway.name)}</CardTitle>
                    <CardDescription>
                      {gateway.configured ? (
                        <Badge variant="default" className="mt-1">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="mt-1">
                          <XCircle className="mr-1 h-3 w-3" />
                          Not Configured
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Supported Methods</h4>
                <div className="flex flex-wrap gap-1">
                  {gateway.methods.map((method) => (
                    <Badge key={method} variant="outline" className="text-xs">
                      {method.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {gateway.configured && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Webhook URL</h4>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                      /api/payment-gateway/{gateway.name}/webhook
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyWebhookUrl(gateway.name)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure this URL in your {getGatewayDisplayName(gateway.name)} dashboard
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  toast({
                    title: 'Coming Soon',
                    description: 'Gateway configuration UI will be available soon',
                  });
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Guide</CardTitle>
          <CardDescription>
            How to set up payment gateways
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Stripe</h4>
            <p className="text-sm text-muted-foreground">
              Add the following environment variables:
            </p>
            <code className="block p-3 bg-muted rounded text-xs">
              STRIPE_SECRET_KEY=sk_test_...
              <br />
              STRIPE_WEBHOOK_SECRET=whsec_...
            </code>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">PayTabs</h4>
            <p className="text-sm text-muted-foreground">
              Add the following environment variables:
            </p>
            <code className="block p-3 bg-muted rounded text-xs">
              PAYTABS_PROFILE_ID=...
              <br />
              PAYTABS_SERVER_KEY=...
            </code>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Network International</h4>
            <p className="text-sm text-muted-foreground">
              Add the following environment variables:
            </p>
            <code className="block p-3 bg-muted rounded text-xs">
              NETWORK_OUTLET_ID=...
              <br />
              NETWORK_API_KEY=...
              <br />
              NETWORK_SECRET_KEY=...
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
