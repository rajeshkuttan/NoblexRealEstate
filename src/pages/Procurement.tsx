import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ItemMasterList from '@/components/procurement/ItemMasterList';
import PurchaseOrderList from '@/components/procurement/PurchaseOrderList';
import GoodsReceiptList from '@/components/procurement/GoodsReceiptList';
import PurchaseInvoiceList from '@/components/procurement/PurchaseInvoiceList';
import { Package, ShoppingCart, Truck, FileText } from 'lucide-react';

export default function Procurement() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'items';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header">
        <div>
          <h1 className="uiux-page-title">{t("procurement.title")}</h1>
          <p className="uiux-page-subtitle">
            {t("procurement.subtitle")}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-4xl grid-cols-4">
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Item Master
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="goods-receipts" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Goods Receipts
          </TabsTrigger>
          <TabsTrigger value="purchase-invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Purchase Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-6">
          <ItemMasterList />
        </TabsContent>

        <TabsContent value="purchase-orders" className="mt-6">
          <PurchaseOrderList />
        </TabsContent>

        <TabsContent value="goods-receipts" className="mt-6">
          <GoodsReceiptList />
        </TabsContent>

        <TabsContent value="purchase-invoices" className="mt-6">
          <PurchaseInvoiceList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
