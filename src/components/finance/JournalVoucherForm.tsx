import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Save, 
  AlertCircle,
  Calculator,
  Lock,
  Send,
  Unlock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { chartOfAccountsAPI, journalVouchersAPI, propertiesAPI, vendorsAPI, tenantsAPI, usersAPI, vendorInvoicesAPI } from '@/services/api';
import { cacheService } from '@/services/cache';
import { cn } from '@/lib/utils';
import { useDocumentNumberingMode } from '@/hooks/useDocumentNumberingMode';

const jvLineSchema = z.object({
  type: z.enum(['Dr', 'Cr']),
  particularType: z.enum(['Employee', 'Supplier', 'Customer', 'Bank', 'Cash', 'Other']).optional(),
  particularId: z.number().optional().nullable(),
  ledgerId: z.string().min(1, 'Ledger is required'),
  debitAmount: z.coerce.number().min(0).default(0),
  creditAmount: z.coerce.number().min(0).default(0),
  billId: z.number().optional().nullable(),
  narration: z.string().optional(),
}).refine(data => {
  if (data.type === 'Dr' && data.debitAmount <= 0) return false;
  if (data.type === 'Cr' && data.creditAmount <= 0) return false;
  return true;
}, {
  message: "Amount must be greater than 0",
  path: ["debitAmount"] 
});

const jvSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  propertyId: z.coerce.number().optional().nullable(),
  narration: z.string().min(1, 'Narration is required'),
  details: z.array(jvLineSchema).min(2, 'At least two entries are required'),
});

type JVFormValues = z.infer<typeof jvSchema>;

interface JournalVoucherFormProps {
  onClose: (refresh?: boolean) => void;
  voucherId?: number;
  mode?: 'create' | 'edit' | 'view' | 'duplicate';
}

export function JournalVoucherForm({ onClose, voucherId, mode = 'create' }: JournalVoucherFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [jvNumber, setJvNumber] = useState<string>('[Auto-generated]');
  const [currentStatus, setCurrentStatus] = useState<string>('open');

  const isViewOnly = mode === 'view';

  const form = useForm<JVFormValues>({
    resolver: zodResolver(jvSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      propertyId: null,
      narration: '',
      details: [
        { type: 'Dr', particularType: 'Other', ledgerId: '', debitAmount: 0, creditAmount: 0, narration: '', particularId: null, billId: null },
        { type: 'Cr', particularType: 'Other', ledgerId: '', debitAmount: 0, creditAmount: 0, narration: '', particularId: null, billId: null },
      ],
    },
  });

  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [vendorBills, setVendorBills] = useState<Record<number, any[]>>({}); 
  const { isManualNumbering, loading: numberingModeLoading } = useDocumentNumberingMode('Journal Voucher');

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "details",
  });

  useEffect(() => {   
    const loadInitialData = async () => {
      setFetchingAccounts(true);
      try {
        const accResponse = await chartOfAccountsAPI.getAll({ limit: 1000 });
        setAccounts(accResponse.data?.data?.accounts || []);

        if (voucherId) {
          setFetchingData(true);
          const jvResponse = await journalVouchersAPI.getById(voucherId);
          const jv = jvResponse.data?.data;
          
          if (jv) {
            setJvNumber(mode === 'duplicate' ? '[Auto-generated]' : jv.jvNumber);
            setCurrentStatus(mode === 'duplicate' ? 'open' : jv.status);
            form.reset({
              date: mode === 'duplicate' ? new Date().toISOString().split('T')[0] : new Date(jv.date).toISOString().split('T')[0],
              propertyId: jv.propertyId || jv.property?.id || null,
              narration: jv.narration + (mode === 'duplicate' ? ' (Copy)' : ''),
              details: jv.details.map((d: any) => ({
                type: d.debitAmount > 0 ? 'Dr' : 'Cr',
                particularType: d.particularType,
                particularId: d.particularId,
                ledgerId: d.ledgerId.toString(),
                debitAmount: Number(d.debitAmount),
                creditAmount: Number(d.creditAmount),
                narration: d.narration,
                billId: d.billId
              }))
            });
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load voucher data');
      } finally {
        setFetchingAccounts(false);
        setFetchingData(false);
      }
      try {
        const [propertiesRes, vendorsRes, customersRes, employeesRes] = await Promise.all([
          propertiesAPI.getAll({ limit: 1000 }),
          vendorsAPI.getAll({ limit: 1000 }),
          tenantsAPI.getAll({ limit: 1000 }),
          usersAPI.getAll({ limit: 1000 })
        ]);
        setProperties(propertiesRes.data?.data?.properties || propertiesRes.data?.properties || []);
        setVendors(vendorsRes.data?.data?.vendors || vendorsRes.data?.data || []);
        setCustomers(customersRes.data?.data?.tenants || customersRes.data?.data || []); 
        setEmployees(employeesRes.data?.data?.users || employeesRes.data?.data || []);
      } catch (e) {
        console.error("Failed to load entities", e);
      }
    };
    loadInitialData();
  }, [voucherId, form]);

  useEffect(() => {
    if (mode === 'edit' || mode === 'view') return;
    setJvNumber(isManualNumbering ? '' : '[Auto-generated]');
  }, [isManualNumbering, mode]);

  const watchDetails = form.watch("details");
  const totalDebit = watchDetails.reduce((sum, d) => sum + (d.type === 'Dr' ? (Number(d.debitAmount) || 0) : 0), 0);
  const totalCredit = watchDetails.reduce((sum, d) => sum + (d.type === 'Cr' ? (Number(d.creditAmount) || 0) : 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const onSubmit = async (values: JVFormValues) => {
    if (isViewOnly) return;
    
    if (!isBalanced) {
      toast.error('Total Debit and total Credit must be equal and greater than zero');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...values,
        jvNumber: isManualNumbering ? jvNumber.trim() : undefined,
        details: values.details.map(d => ({
          ...d,
          ledgerId: parseInt(d.ledgerId),
        }))
      };

      if (mode === 'edit' && voucherId) {
        await journalVouchersAPI.update(voucherId, payload);
        toast.success('Journal Voucher updated successfully (Status: Open)');
      } else {
        await journalVouchersAPI.create(payload);
        toast.success('Journal Voucher created successfully (Status: Open)');
      }

      cacheService.invalidatePattern('/journal-vouchers');
      cacheService.invalidatePattern('/chart-of-accounts');
      onClose(true);
    } catch (error: any) {
      console.error('Error saving JV:', error);
      toast.error(error.response?.data?.message || 'Failed to save Journal Voucher');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!voucherId || !isBalanced) return;
    
    setLoading(true);
    try {
      await journalVouchersAPI.post(voucherId);
      toast.success('Journal Voucher posted successfully and locked');
      setCurrentStatus('posted');
      cacheService.invalidatePattern('/journal-vouchers');
      cacheService.invalidatePattern('/chart-of-accounts');
      onClose(true);
    } catch (error: any) {
      console.error('Error posting JV:', error);
      toast.error(error.response?.data?.message || 'Failed to post Journal Voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleUnpost = async () => {
    if (!voucherId) return;
    
    setLoading(true);
    try {
      await journalVouchersAPI.unpost(voucherId);
      toast.success('Journal Voucher unposted successfully and unlocked');
      setCurrentStatus('open');
      cacheService.invalidatePattern('/journal-vouchers');
      cacheService.invalidatePattern('/chart-of-accounts');
      onClose(true);
    } catch (error: any) {
      console.error('Error unposting JV:', error);
      toast.error(error.response?.data?.message || 'Failed to unpost Journal Voucher');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'view') return `View Journal Voucher - ${jvNumber}`;
    if (mode === 'edit') return `Edit Journal Voucher - ${jvNumber}`;
    if (mode === 'duplicate') return `Duplicate Journal Voucher`;
    return 'New Journal Voucher';
  };

  const getValidParticularTypes = (accountCode: string) => {
    if (!accountCode) return ['Other'];
    if (accountCode.startsWith('1')) return ['Bank', 'Cash'];
    if (accountCode.startsWith('2')) return ['Supplier'];
    if (accountCode.startsWith('3')) return [];
    if (accountCode.startsWith('4')) return ['Customer'];
    if (accountCode.startsWith('5')) return ['Employee'];
    return ['Other'];
  };

  const fetchVendorBills = async (vendorId: number) => {
    if (!vendorId || vendorBills[vendorId]) return;
    try {
      const response = await vendorInvoicesAPI.getAll({ vendorId, paymentStatus: 'unpaid' });
      const bills = response.data?.data?.invoices || response.data?.data || [];
      const unpaidBills = bills.filter((b: any) => b.paymentStatus !== 'paid');
      setVendorBills(prev => ({ ...prev, [vendorId]: unpaidBills }));
    } catch (error) {
      console.error('Error loading vendor bills:', error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 rounded-none flex flex-col">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl">{getTitle()}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  {mode === 'view' ? 'Viewing existing journal entry detail.' : 'Save as "Open" to review later before posting to ledger.'}
                </DialogDescription>
              </div>
              <Badge variant={currentStatus === 'posted' ? 'default' : 'secondary'} className={cn(
                currentStatus === 'posted' ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"
              )}>
                {currentStatus.toUpperCase()}
              </Badge>
            </div>
            {mode === 'view' && (
              <Badge variant="outline" className="text-muted-foreground whitespace-nowrap">
                <Lock className="w-3 h-3 mr-1" /> Read Only
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {fetchingData ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Fetching voucher details...</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className="border-0 sm:border shadow-none sm:shadow">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="grid gap-3 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    <FormItem>
                      <FormLabel>JV Number</FormLabel>
                      <Input
                        value={jvNumber}
                        onChange={(e) => setJvNumber(e.target.value)}
                        disabled={isViewOnly || mode === 'edit' || numberingModeLoading || !isManualNumbering}
                        placeholder={isManualNumbering ? 'Enter JV number' : '[Auto-generated]'}
                        className={cn("font-mono", !isManualNumbering || isViewOnly || mode === 'edit' ? "bg-muted" : "")}
                      />
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={isViewOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="narration"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>Narration *</FormLabel>
                          <FormControl>
                            <Input placeholder="General description of the entry" {...field} disabled={isViewOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="propertyId"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel>Property</FormLabel>
                          <Select
                            disabled={isViewOnly}
                            value={field.value ? String(field.value) : "none"}
                            onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property for plot-aware numbering" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No property</SelectItem>
                              {properties.map((property) => (
                                <SelectItem key={property.id} value={String(property.id)}>
                                  {property.title} {property.plotNumber ? `- Plot ${property.plotNumber}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Details Section */}
              <Card className="border-0 sm:border shadow-none sm:shadow">
                <CardContent className="pt-4 sm:pt-6 overflow-x-auto">
                  <Table className="text-xs sm:text-sm">
                    <TableHeader>
                      <TableRow className="flex-wrap">
                        <TableHead className="w-[80px] sm:w-[100px]">Type</TableHead>
                        <TableHead className="w-[150px] sm:w-[250px]">Ledger</TableHead>
                        <TableHead className="hidden sm:table-cell w-[150px]">Particular</TableHead>
                        <TableHead className="w-[70px] sm:w-[150px] text-right">Debit</TableHead>
                        <TableHead className="w-[70px] sm:w-[150px] text-right">Credit</TableHead>
                        <TableHead className="hidden md:table-cell flex-1">Note</TableHead>
                        {!isViewOnly && <TableHead className="w-[40px] sm:w-[50px]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <React.Fragment key={field.id}>
                          <TableRow className="group">
                            <TableCell>
                            <FormField
                              control={form.control}
                              name={`details.${index}.type` as const}
                              render={({ field }) => (
                                <Select 
                                  disabled={isViewOnly}
                                  onValueChange={(val) => {
                                    field.onChange(val);
                                    if (val === 'Dr') form.setValue(`details.${index}.creditAmount`, 0);
                                    else form.setValue(`details.${index}.debitAmount`, 0);
                                  }} 
                                  value={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Dr">Dr</SelectItem>
                                    <SelectItem value="Cr">Cr</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`details.${index}.ledgerId` as const}
                              render={({ field }) => (
                                <Combobox
                                  disabled={isViewOnly || fetchingAccounts}
                                  options={accounts.map(acc => ({
                                    value: acc.id.toString(),
                                    label: `${acc.accountCode} - ${acc.accountName}`
                                  }))}
                                  value={field.value}
                                  onChange={(val) => {
                                    field.onChange(val);
                                    form.setValue(`details.${index}.particularType`, undefined as any);
                                    form.setValue(`details.${index}.particularId`, null);
                                    form.setValue(`details.${index}.billId`, null);
                                  }}
                                  placeholder={fetchingAccounts ? "Loading..." : "Select account"}
                                  searchPlaceholder="Search accounts..."
                                  emptyText="No account found"
                                  className="min-w-[350px] md:min-w-[450px]"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`details.${index}.particularType` as const}
                              render={({ field }) => {
                                const selectedLedgerId = form.watch(`details.${index}.ledgerId`);
                                const selectedAccount = accounts.find(a => a.id.toString() === selectedLedgerId);
                                const validTypes = getValidParticularTypes(selectedAccount?.accountCode || '');
                                const isDisabled = isViewOnly || !selectedLedgerId || validTypes.length === 0;

                                return (
                                  <Select 
                                    disabled={isDisabled} 
                                    onValueChange={(val) => {
                                      field.onChange(val);
                                      form.setValue(`details.${index}.particularId`, null);
                                      form.setValue(`details.${index}.billId`, null);
                                    }} 
                                    value={field.value || ''}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={validTypes.length === 0 ? "N/A" : "Select Type"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {validTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`details.${index}.debitAmount` as const}
                              render={({ field }) => (
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    className="text-right font-mono"
                                    disabled={isViewOnly || form.watch(`details.${index}.type`) !== 'Dr'}
                                    {...field}
                                  />
                                </FormControl>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`details.${index}.creditAmount` as const}
                              render={({ field }) => (
                                <FormControl>
                                  <Input                                                             
                                    type="number" 
                                    step="0.01" 
                                    className="text-right font-mono"
                                    disabled={isViewOnly || form.watch(`details.${index}.type`) !== 'Cr'}
                                    {...field}
                                  />
                                </FormControl>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`details.${index}.narration` as const}
                              render={({ field }) => (
                                <FormControl>
                                  <Input placeholder="Line detail..." {...field} disabled={isViewOnly} />
                                </FormControl>
                              )}
                            />
                          </TableCell>
                          {!isViewOnly && (
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                type="button" 
                                onClick={() => remove(index)}
                                disabled={fields.length <= 2}
                                className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                        
                        {/* Secondary Row for Specific Entity and Bill Selection */}
                        <TableRow key={`${field.id}-ext`} className="bg-muted/10 border-b-2">
                            <TableCell colSpan={8} className="py-2 px-2 sm:px-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                                  {/* Render Particular Entity Selection if needed */}
                                  {(form.watch(`details.${index}.particularType`) === 'Employee' || 
                                    form.watch(`details.${index}.particularType`) === 'Supplier' ||
                                    form.watch(`details.${index}.particularType`) === 'Customer') && (
                                    <FormField
                                      control={form.control}
                                      name={`details.${index}.particularId` as const}
                                      render={({ field }) => {
                                        const pType = form.watch(`details.${index}.particularType`);
                                        let options: {id: number, name: string}[] = [];
                                        
                                        if (pType === 'Employee') {
                                          options = employees.map(e => ({ id: e.id, name: e.name }));
                                        } else if (pType === 'Supplier') {
                                          options = vendors.map(v => ({ id: v.id, name: v.vendorName }));
                                        } else if (pType === 'Customer') {
                                          options = customers.map(c => ({ id: c.id, name: c.name }));
                                        }

                                        return (
                                          <FormItem className="col-span-1">
                                            <FormLabel className="text-xs">Select {pType}</FormLabel>
                                            <Select 
                                              disabled={isViewOnly} 
                                              onValueChange={(val) => {
                                                field.onChange(parseInt(val));
                                                if (pType === 'Supplier') {
                                                  fetchVendorBills(parseInt(val));
                                                  // Reset bill selection when supplier changes
                                                  form.setValue(`details.${index}.billId`, null);
                                                }
                                              }} 
                                              value={field.value ? field.value.toString() : ''}
                                            >
                                              <FormControl>
                                                <SelectTrigger className="h-8">
                                                  <SelectValue placeholder="Select..." />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                {options.map(opt => (
                                                  <SelectItem key={opt.id} value={opt.id.toString()}>
                                                    {opt.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>
                                        );
                                      }}
                                    />
                                  )}

                                  {/* Render Unpaid Bill Selection for Suppliers connected to a Account Code starting with 2 */}
                                  {form.watch(`details.${index}.particularType`) === 'Supplier' && 
                                   form.watch(`details.${index}.particularId`) && 
                                   accounts.find(a => a.id.toString() === form.watch(`details.${index}.ledgerId`))?.accountCode?.startsWith('2') && (
                                    <FormField
                                      control={form.control}
                                      name={`details.${index}.billId` as const}
                                      render={({ field }) => {
                                        const vendorId = form.watch(`details.${index}.particularId`);
                                        const bills = (vendorId ? vendorBills[vendorId] : []) || [];
                                        
                                        return (
                                          <FormItem className="col-span-1">
                                            <FormLabel className="text-xs">Settle Outstanding Bill</FormLabel>
                                            <Select 
                                              disabled={isViewOnly || bills.length === 0} 
                                              onValueChange={(val) => field.onChange(parseInt(val))} 
                                              value={field.value ? field.value.toString() : ''}
                                            >
                                              <FormControl>
                                                <SelectTrigger className="h-8">
                                                  <SelectValue placeholder={bills.length === 0 ? "No unpaid bills" : "Select Bill..."} />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                {bills.map(bill => (
                                                  <SelectItem key={bill.id} value={bill.id.toString()}>
                                                    {bill.invoiceNumber || `Bill #${bill.id}`} - {bill.totalAmount} AED
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>
                                        );
                                      }}
                                    />
                                  )}
                                </div>
                            </TableCell>
                        </TableRow>
                      </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>

                  {!isViewOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => append({ type: 'Dr', particularType: 'Other', ledgerId: '', debitAmount: 0, creditAmount: 0, narration: '', particularId: null, billId: null })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Line
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Footer Summary Section */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30 p-6 rounded-lg border border-dashed">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">Totals Summary</span>
                </div>
                
                <div className="flex flex-wrap gap-8 w-full md:w-auto">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Debit</span>
                    <span className="text-xl font-mono font-bold text-green-600">
                      {totalDebit.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Credit</span>
                    <span className="text-xl font-mono font-bold text-blue-600">
                      {totalCredit.toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                    </span>
                  </div>

                  <div className="flex flex-col items-end border-l pl-8">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Difference</span>
                    <span className={cn(
                      "text-xl font-mono font-bold",
                      Math.abs(totalDebit - totalCredit) < 0.01 ? "text-muted-foreground" : "text-destructive"
                    )}>
                      {Math.abs(totalDebit - totalCredit).toLocaleString('en-AE', { style: 'currency', currency: 'AED' })}
                    </span>
                  </div>
                </div>
              </div>

              {!isBalanced && totalDebit > 0 && !isViewOnly && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md animate-pulse">
                  <AlertCircle className="h-4 w-4" />
                  <span>Validation Error: Total Debits and Credits must be equal. Currently out of balance by {(Math.abs(totalDebit - totalCredit)).toFixed(2)} AED.</span>
                </div>
              )}

              <DialogFooter className="gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t sticky bottom-0 bg-background flex-wrap">
                <Button type="button" variant="outline" onClick={() => onClose()} className="flex-1 sm:flex-none">
                  {isViewOnly ? 'Close' : 'Cancel'}
                </Button>
                
                {currentStatus === 'posted' ? (
                   <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleUnpost} 
                    disabled={loading}
                    className="flex-1 sm:flex-none min-w-[120px]"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlock className="mr-2 h-4 w-4" />}
                    UnPost Voucher
                  </Button>
                ) : (
                  <>
                    {!isViewOnly && (
                      <Button type="submit" disabled={loading || !isBalanced} className="flex-1 sm:flex-none min-w-[120px]">
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="hidden sm:inline">Saving...</span>
                            <span className="sm:hidden">...</span>
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">{mode === 'edit' ? 'Update Open Voucher' : 'Save as Open'}</span>
                            <span className="sm:hidden">{mode === 'edit' ? 'Update' : 'Save'}</span>
                          </>
                        )}
                      </Button>
                    )}
                    
                    {voucherId && mode !== 'create' && mode !== 'duplicate' && (
                      <Button 
                        type="button" 
                        variant="default" 
                        onClick={handlePost} 
                        disabled={loading || !isBalanced}
                        className="flex-1 sm:flex-none min-w-[120px] bg-green-600 hover:bg-green-700"
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Post to Ledger
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            </form>
          </Form>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
