import { useState, useEffect } from 'react';
import { paymentGatewayAPI, tenantsAPI, leasesAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  gateway: z.string().min(1, 'Please select a payment gateway'),
  tenantId: z.string().min(1, 'Please select a tenant'),
  leaseId: z.string().optional(),
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().default('AED'),
  description: z.string().optional(),
});

interface OnlinePaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function OnlinePaymentForm({
  open,
  onOpenChange,
  onSuccess,
}: OnlinePaymentFormProps) {
  const [gateways, setGateways] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gateway: '',
      tenantId: '',
      leaseId: '',
      amount: '',
      currency: 'AED',
      description: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchGateways();
      fetchTenants();
    }
  }, [open]);

  useEffect(() => {
    const tenantId = form.watch('tenantId');
    if (tenantId) {
      fetchLeasesByTenant(parseInt(tenantId));
    }
  }, [form.watch('tenantId')]);

  const fetchGateways = async () => {
    try {
      const { data } = await paymentGatewayAPI.getAvailableGateways();
      setGateways(data.data || []);
    } catch (error) {
      console.error('Failed to fetch gateways:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data } = await tenantsAPI.getAll({ limit: 100 });
      setTenants(data.data.tenants || []);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  const fetchLeasesByTenant = async (tenantId: number) => {
    try {
      const { data } = await leasesAPI.getAll({ tenantId, status: 'active' });
      setLeases(data.data.leases || []);
    } catch (error) {
      console.error('Failed to fetch leases:', error);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      setPaymentUrl(null);

      const { data } = await paymentGatewayAPI.createPaymentIntent({
        gateway: values.gateway,
        tenantId: parseInt(values.tenantId),
        leaseId: values.leaseId ? parseInt(values.leaseId) : undefined,
        amount: parseFloat(values.amount),
        currency: values.currency,
        description: values.description,
        returnUrl: `${window.location.origin}/payment/success`,
        callbackUrl: `${window.location.origin}/api/payment-gateway/${values.gateway}/webhook`,
      });

      if (data.success) {
        // If Stripe, show embedded form (requires Stripe Elements implementation)
        // If PayTabs/Network, redirect to payment URL
        if (data.data.paymentUrl) {
          setPaymentUrl(data.data.paymentUrl);
        } else if (data.data.clientSecret) {
          toast({
            title: 'Payment Intent Created',
            description: 'Stripe integration requires additional setup',
          });
        }

        toast({
          title: 'Success',
          description: 'Payment intent created successfully',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentUrl = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Online Payment</DialogTitle>
          <DialogDescription>
            Generate a payment link for the tenant to pay online
          </DialogDescription>
        </DialogHeader>

        {paymentUrl ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Payment page is ready! Click the button below to open the payment page.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Payment URL</p>
              <code className="text-xs break-all">{paymentUrl}</code>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleOpenPaymentUrl} className="flex-1">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Payment Page
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(paymentUrl);
                  toast({
                    title: 'Copied',
                    description: 'Payment URL copied to clipboard',
                  });
                }}
              >
                Copy URL
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setPaymentUrl(null);
                form.reset();
              }}
            >
              Create Another Payment
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="gateway"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Gateway</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gateway" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gateways.map((gateway) => (
                          <SelectItem key={gateway.name} value={gateway.name}>
                            {gateway.name.charAt(0).toUpperCase() + gateway.name.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tenant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id.toString()}>
                            {tenant.name} - {tenant.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lease (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lease" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific lease</SelectItem>
                        {leases.map((lease) => (
                          <SelectItem key={lease.id} value={lease.id.toString()}>
                            {lease.leaseNumber} - {lease.unit?.unitNumber || 'N/A'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AED">AED</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Payment description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CreditCard className="mr-2 h-4 w-4" />
                  Create Payment
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
