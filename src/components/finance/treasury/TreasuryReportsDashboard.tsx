import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, PieChart, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { treasuryReportsAPI } from '@/services/api';
import { formatCurrency as formatCurrencySafe } from '@/utils/currencyUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { useCompany } from '@/contexts/CompanyContext';

interface CashPositionData {
  accounts: any[];
  totalBalance: number;
  balanceByCurrency: Record<string, number>;
  asOf: string;
}

interface CollectionsData {
  totalCollections: number;
  overduePayments: number;
  upcomingPayments: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

interface DashboardData {
  cashBalance: number;
  investmentValue: number;
  securityDepositsHeld: number;
  pettyCashBalance: number;
  overdueReceivables: number;
  creditExposure: number;
  totalLiquidity: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function TreasuryReportsDashboard() {
  const { activeCompanyId } = useCompany();
  const [cashPosition, setCashPosition] = useState<CashPositionData | null>(null);
  const [collections, setCollections] = useState<CollectionsData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, [activeCompanyId]);

  const fetchAllData = async () => {
    try {
      const [cashRes, collectionsRes, dashboardRes] = await Promise.all([
        treasuryReportsAPI.getCashPosition(),
        treasuryReportsAPI.getCollections({
          startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        }),
        treasuryReportsAPI.getDashboard(),
      ]);

      setCashPosition(cashRes.data.data);
      setCollections(collectionsRes.data.data);
      setDashboard(dashboardRes.data.data);
    } catch (error) {
      console.error('Failed to fetch treasury data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null, currency: string = 'AED') => {
    return formatCurrencySafe(amount, currency);
  };

  // Prepare chart data
  const currencyDistribution = cashPosition?.balanceByCurrency
    ? Object.entries(cashPosition.balanceByCurrency).map(([currency, amount]) => ({
        name: currency,
        value: amount,
      }))
    : [];

  const liquidityBreakdown = dashboard
    ? [
        { name: 'Cash', value: dashboard.cashBalance },
        { name: 'Investments', value: dashboard.investmentValue },
        { name: 'Security Deposits', value: dashboard.securityDepositsHeld },
        { name: 'Petty Cash', value: dashboard.pettyCashBalance },
      ]
    : [];

  const collectionsData = collections
    ? [
        { name: 'Collections', value: collections.totalCollections, fill: '#10b981' },
        { name: 'Overdue', value: collections.overduePayments, fill: '#ef4444' },
        { name: 'Upcoming', value: collections.upcomingPayments, fill: '#3b82f6' },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading treasury reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash Balance */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cash Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard?.cashBalance || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Across all bank accounts</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Liquidity */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Liquidity</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard?.totalLiquidity || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Cash + Investments</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Overdue Receivables */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue Receivables</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(dashboard?.overdueReceivables || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Requires immediate action</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        {/* Investment Value */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Investment Value</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard?.investmentValue || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Active investments</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="cash-position" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cash-position">Cash Position</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="liquidity">Liquidity Breakdown</TabsTrigger>
        </TabsList>

        {/* Cash Position Tab */}
        <TabsContent value="cash-position" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Currency Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Cash by Currency</CardTitle>
                <CardDescription>Distribution across different currencies</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={currencyDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {currencyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bank Accounts */}
            <Card>
              <CardHeader>
                <CardTitle>Bank Accounts</CardTitle>
                <CardDescription>Balance by account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cashPosition?.accounts.map((account: any) => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{account.bankName}</p>
                        <p className="text-sm text-gray-600">{account.accountName}</p>
                        <p className="text-xs text-gray-500">{account.accountNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(account.currentBalance, account.currency)}</p>
                        <p className="text-xs text-gray-500">{account.currency}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collections Overview</CardTitle>
              <CardDescription>Payment collections for the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={collectionsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="value" name="Amount" />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 mb-1">Total Collections</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(collections?.totalCollections || 0)}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 mb-1">Overdue Payments</p>
                  <p className="text-2xl font-bold text-red-700">
                    {formatCurrency(collections?.overduePayments || 0)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">Upcoming Payments</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(collections?.upcomingPayments || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Liquidity Tab */}
        <TabsContent value="liquidity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liquidity Breakdown</CardTitle>
              <CardDescription>Distribution of liquid assets</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RechartsPieChart>
                  <Pie
                    data={liquidityBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {liquidityBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">Total Liquidity</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(dashboard?.totalLiquidity || 0)}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600 mb-1">Credit Exposure</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {formatCurrency(dashboard?.creditExposure || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <PieChart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Security Deposits Held</p>
                <p className="text-xl font-bold">{formatCurrency(dashboard?.securityDepositsHeld || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Petty Cash Balance</p>
                <p className="text-xl font-bold">{formatCurrency(dashboard?.pettyCashBalance || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Credit Exposure</p>
                <p className="text-xl font-bold">{formatCurrency(dashboard?.creditExposure || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
