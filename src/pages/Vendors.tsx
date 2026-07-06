import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VendorList from '@/components/finance/vendors/VendorList';
import AccountsPayableAging from '@/components/finance/vendors/AccountsPayableAging';
import { Building2, TrendingDown } from 'lucide-react';

export default function VendorsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('vendors');

  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header">
        <div>
          <h1 className="uiux-page-title">{t("finance.vendors.title")}</h1>
          <p className="uiux-page-subtitle">
            {t("finance.vendors.subtitle")}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-2">
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="aging" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            AP Aging
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="mt-6">
          <VendorList />
        </TabsContent>

        <TabsContent value="aging" className="mt-6">
          <AccountsPayableAging />
        </TabsContent>
      </Tabs>
    </div>
  );
}

