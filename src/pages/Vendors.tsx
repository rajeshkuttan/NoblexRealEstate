import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VendorList from '@/components/finance/vendors/VendorList';
import VendorInvoiceList from '@/components/finance/vendors/VendorInvoiceList';
import AccountsPayableAging from '@/components/finance/vendors/AccountsPayableAging';
import { Building2, FileText, TrendingDown } from 'lucide-react';

export default function VendorsPage() {
  const [activeTab, setActiveTab] = useState('vendors');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendor Management</h1>
        <p className="text-muted-foreground">
          Manage vendors, invoices, and accounts payable
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="aging" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            AP Aging
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="mt-6">
          <VendorList />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <VendorInvoiceList />
        </TabsContent>

        <TabsContent value="aging" className="mt-6">
          <AccountsPayableAging />
        </TabsContent>
      </Tabs>
    </div>
  );
}

