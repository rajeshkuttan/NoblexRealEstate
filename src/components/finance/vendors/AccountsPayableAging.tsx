import { useState, useEffect } from 'react';
import { vendorInvoicesAPI, vendorsAPI, propertiesAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  TrendingDown,
  Download,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface AgingBucket {
  invoiceId: number;
  invoiceNumber: string;
  vendorName: string;
  propertyName?: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  daysOverdue: number;
}

interface AgingData {
  current: AgingBucket[];
  days_30: AgingBucket[];
  days_60: AgingBucket[];
  days_90: AgingBucket[];
  days_90_plus: AgingBucket[];
  summary: {
    current: number;
    days_30: number;
    days_60: number;
    days_90: number;
    days_90_plus: number;
    total: number;
  };
}

export default function AccountsPayableAging() {
  const [agingData, setAgingData] = useState<AgingData | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [vendorFilter, setVendorFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAgingReport();
    fetchVendors();
    fetchProperties();
  }, [vendorFilter, propertyFilter]);

  const fetchAgingReport = async () => {
    try {
      setLoading(true);
      const { data } = await vendorInvoicesAPI.getAgingReport({
        vendorId: vendorFilter || undefined,
        propertyId: propertyFilter || undefined,
      });
      setAgingData(data.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch aging report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data } = await vendorsAPI.getAll({ limit: 100 });
      setVendors(data.data.vendors);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const { data } = await propertiesAPI.getAll({ limit: 100 });
      setProperties(data.data.properties);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  };

  const exportToExcel = () => {
    if (!agingData) return;

    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Accounts Payable Aging Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      [],
      ['Aging Bucket', 'Amount (AED)', 'Percentage'],
      ['Current (Not Due)', agingData.summary.current, ((agingData.summary.current / agingData.summary.total) * 100).toFixed(2) + '%'],
      ['1-30 Days Overdue', agingData.summary.days_30, ((agingData.summary.days_30 / agingData.summary.total) * 100).toFixed(2) + '%'],
      ['31-60 Days Overdue', agingData.summary.days_60, ((agingData.summary.days_60 / agingData.summary.total) * 100).toFixed(2) + '%'],
      ['61-90 Days Overdue', agingData.summary.days_90, ((agingData.summary.days_90 / agingData.summary.total) * 100).toFixed(2) + '%'],
      ['90+ Days Overdue', agingData.summary.days_90_plus, ((agingData.summary.days_90_plus / agingData.summary.total) * 100).toFixed(2) + '%'],
      [],
      ['Total Accounts Payable', agingData.summary.total, '100%'],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Detail sheets for each bucket
    const buckets = [
      { name: 'Current', data: agingData.current },
      { name: '1-30 Days', data: agingData.days_30 },
      { name: '31-60 Days', data: agingData.days_60 },
      { name: '61-90 Days', data: agingData.days_90 },
      { name: '90+ Days', data: agingData.days_90_plus },
    ];

    buckets.forEach((bucket) => {
      if (bucket.data.length > 0) {
        const detailData = bucket.data.map((item) => ({
          'Invoice #': item.invoiceNumber,
          'Vendor': item.vendorName,
          'Property': item.propertyName || 'N/A',
          'Invoice Date': new Date(item.invoiceDate).toLocaleDateString(),
          'Due Date': new Date(item.dueDate).toLocaleDateString(),
          'Amount (AED)': item.amount,
          'Days Overdue': item.daysOverdue,
        }));

        const detailSheet = XLSX.utils.json_to_sheet(detailData);
        XLSX.utils.book_append_sheet(workbook, detailSheet, bucket.name);
      }
    });

    // Save file
    XLSX.writeFile(workbook, `AP_Aging_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Success',
      description: 'AP Aging Report exported successfully',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  const calculatePercentage = (amount: number, total: number) => {
    return total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0';
  };

  const renderAgingTable = (data: AgingBucket[], title: string) => {
    if (data.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No invoices in this aging bucket
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Days Overdue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((invoice) => (
              <TableRow key={invoice.invoiceId}>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.vendorName}</TableCell>
                <TableCell>{invoice.propertyName || 'N/A'}</TableCell>
                <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {invoice.daysOverdue > 0 ? (
                    <span className="text-red-600 font-medium">
                      {invoice.daysOverdue} days
                    </span>
                  ) : (
                    <span className="text-green-600">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  };

  if (loading || !agingData) {
    return (
      <div className="py-8 text-center">
        {loading ? 'Loading aging report...' : 'No data available'}
      </div>
    );
  }

  const { summary } = agingData;

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accounts Payable Aging</h2>
          <p className="text-muted-foreground">
            Track overdue invoices by aging buckets
          </p>
        </div>
        <Button onClick={exportToExcel}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <SearchableSelect
          value={vendorFilter || "all"}
          onValueChange={(value) => setVendorFilter(value === "all" ? "" : value)}
          placeholder="All Vendors"
          searchPlaceholder="Search vendors..."
          emptyMessage="No vendors found"
          className="w-[250px]"
          options={[
            { value: 'all', label: 'All Vendors' },
            ...vendors.map((vendor) => ({
              value: vendor.id.toString(),
              label: vendor.vendorName,
            })),
          ]}
        />

        <SearchableSelect
          value={propertyFilter || "all"}
          onValueChange={(value) => setPropertyFilter(value === "all" ? "" : value)}
          placeholder="All Properties"
          searchPlaceholder="Search properties..."
          emptyMessage="No properties found"
          className="w-[250px]"
          options={[
            { value: 'all', label: 'All Properties' },
            ...properties.map((property) => ({
              value: property.id.toString(),
              label: property.title,
            })),
          ]}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.current)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(summary.current, summary.total)}% of total
            </p>
            <Progress
              value={parseFloat(calculatePercentage(summary.current, summary.total))}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">1-30 Days</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(summary.days_30)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(summary.days_30, summary.total)}% of total
            </p>
            <Progress
              value={parseFloat(calculatePercentage(summary.days_30, summary.total))}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">31-60 Days</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.days_60)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(summary.days_60, summary.total)}% of total
            </p>
            <Progress
              value={parseFloat(calculatePercentage(summary.days_60, summary.total))}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">61-90 Days</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.days_90)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(summary.days_90, summary.total)}% of total
            </p>
            <Progress
              value={parseFloat(calculatePercentage(summary.days_90, summary.total))}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">90+ Days</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(summary.days_90_plus)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(summary.days_90_plus, summary.total)}% of total
            </p>
            <Progress
              value={parseFloat(calculatePercentage(summary.days_90_plus, summary.total))}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Total Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Accounts Payable
              </p>
              <p className="text-3xl font-bold">{formatCurrency(summary.total)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">
                Total Overdue (30+ days)
              </p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(summary.days_30 + summary.days_60 + summary.days_90 + summary.days_90_plus)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Aging Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Details</CardTitle>
          <CardDescription>
            View invoices by aging bucket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="current">
                Current ({agingData?.current?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="days_30">
                1-30 Days ({agingData?.days_30?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="days_60">
                31-60 Days ({agingData?.days_60?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="days_90">
                61-90 Days ({agingData?.days_90?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="days_90_plus">
                90+ Days ({agingData?.days_90_plus?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="mt-4">
              {renderAgingTable(agingData?.current || [], 'Current (Not Due)')}
            </TabsContent>

            <TabsContent value="days_30" className="mt-4">
              {renderAgingTable(agingData?.days_30 || [], '1-30 Days Overdue')}
            </TabsContent>

            <TabsContent value="days_60" className="mt-4">
              {renderAgingTable(agingData?.days_60 || [], '31-60 Days Overdue')}
            </TabsContent>

            <TabsContent value="days_90" className="mt-4">
              {renderAgingTable(agingData?.days_90 || [], '61-90 Days Overdue')}
            </TabsContent>

            <TabsContent value="days_90_plus" className="mt-4">
              {renderAgingTable(agingData?.days_90_plus || [], '90+ Days Overdue')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

