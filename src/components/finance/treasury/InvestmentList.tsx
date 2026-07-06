import { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, Calendar, MoreHorizontal, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency as formatCurrencySafe } from '@/utils/currencyUtils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { treasuryDepositsAPI } from '@/services/api';
import InvestmentForm from './InvestmentForm';

interface Investment {
  id: number;
  investmentNumber: string;
  investmentType: string;
  principalAmount: number;
  currency: string;
  interestRate: number;
  term: number;
  startDate: string;
  maturityDate: string;
  currentValue: number;
  accruedInterest: number;
  status: string;
  bankAccount: {
    id: number;
    bankName: string;
    accountName: string;
  };
}

export default function InvestmentList() {
  const { toast } = useToast();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvestments();
    fetchStats();
  }, []);

  const fetchInvestments = async () => {
    try {
      const response = await treasuryDepositsAPI.getAll();
      setInvestments(response.data.data.investments || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch investments',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await treasuryDepositsAPI.getStats();
      setStats(response.data.data || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleCalculateInterest = async (id: number) => {
    try {
      const response = await treasuryDepositsAPI.calculateInterest(id);
      toast({
        title: 'Interest Calculated',
        description: `Accrued Interest: ${formatCurrency(response.data.data.accruedInterest)}`,
      });
      fetchInvestments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to calculate interest',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (investment: Investment) => {
    setSelectedInvestment(investment);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedInvestment(null);
    fetchInvestments();
    fetchStats();
  };

  const formatCurrency = (amount: number | undefined | null, currency: string = 'AED') => {
    return formatCurrencySafe(amount, currency);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      active: 'default',
      matured: 'secondary',
      redeemed: 'outline',
      rolled_over: 'secondary',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: any = {
      term_deposit: 'bg-blue-100 text-blue-800',
      fixed_deposit: 'bg-green-100 text-green-800',
      savings: 'bg-yellow-100 text-yellow-800',
      treasury_bill: 'bg-purple-100 text-purple-800',
      bond: 'bg-pink-100 text-pink-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type.replace('_', ' ')}
      </span>
    );
  };

  const getDaysToMaturity = (maturityDate: string) => {
    const days = Math.ceil((new Date(maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invested</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalInvested || 0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.currentValue || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accrued Interest</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.accruedInterest || 0)}</p>
              </div>
              <Calculator className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Investments</p>
                <p className="text-2xl font-bold">{stats.activeCount || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Investments</CardTitle>
              <CardDescription>Manage term deposits, bonds, and other investments</CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedInvestment(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Investment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <InvestmentForm investment={selectedInvestment} onSuccess={handleFormSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investment #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Interest Rate</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Maturity Date</TableHead>
                <TableHead>Days to Maturity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : investments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-400">
                    No investments found
                  </TableCell>
                </TableRow>
              ) : (
                investments.map((investment) => (
                  <TableRow key={investment.id}>
                    <TableCell className="font-medium">{investment.investmentNumber}</TableCell>
                    <TableCell>{getTypeBadge(investment.investmentType)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{investment.bankAccount?.bankName}</p>
                        <p className="text-xs text-gray-500">{investment.bankAccount?.accountName}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(investment.principalAmount, investment.currency)}</TableCell>
                    <TableCell>{investment.interestRate}%</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(investment.currentValue, investment.currency)}
                    </TableCell>
                    <TableCell>{new Date(investment.maturityDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {getDaysToMaturity(investment.maturityDate) > 0 ? (
                        <span className="text-green-600">{getDaysToMaturity(investment.maturityDate)} days</span>
                      ) : (
                        <span className="text-red-600">Matured</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(investment.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(investment)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCalculateInterest(investment.id)}>
                            Calculate Interest
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
