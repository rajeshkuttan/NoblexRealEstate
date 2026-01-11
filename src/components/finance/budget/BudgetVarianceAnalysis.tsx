import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertCircle, Download } from 'lucide-react';

interface BudgetCategory {
  categoryName: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  variance: number;
  variancePercentage: number;
}

export default function BudgetVarianceAnalysis() {
  const [selectedPeriod, setSelectedPeriod] = useState('2024');
  const [selectedProperty, setSelectedProperty] = useState('all');

  // Mock data
  const budgetData: BudgetCategory[] = [
    {
      categoryName: 'Property Maintenance',
      budgetedAmount: 150000,
      spentAmount: 142000,
      remainingAmount: 8000,
      variance: -8000,
      variancePercentage: 94.67,
    },
    {
      categoryName: 'Utilities',
      budgetedAmount: 80000,
      spentAmount: 65000,
      remainingAmount: 15000,
      variance: 15000,
      variancePercentage: 81.25,
    },
    {
      categoryName: 'Staff Salaries',
      budgetedAmount: 300000,
      spentAmount: 315000,
      remainingAmount: -15000,
      variance: -15000,
      variancePercentage: 105.0,
    },
    {
      categoryName: 'Marketing',
      budgetedAmount: 50000,
      spentAmount: 42000,
      remainingAmount: 8000,
      variance: 8000,
      variancePercentage: 84.0,
    },
    {
      categoryName: 'Insurance',
      budgetedAmount: 45000,
      spentAmount: 45000,
      remainingAmount: 0,
      variance: 0,
      variancePercentage: 100.0,
    },
  ];

  const totalBudgeted = budgetData.reduce((sum, item) => sum + item.budgetedAmount, 0);
  const totalSpent = budgetData.reduce((sum, item) => sum + item.spentAmount, 0);
  const totalRemaining = budgetData.reduce((sum, item) => sum + item.remainingAmount, 0);
  const totalVariance = totalBudgeted - totalSpent;
  const totalVariancePercentage = (totalSpent / totalBudgeted) * 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

  const getVarianceBadge = (variance: number, percentage: number) => {
    if (percentage > 100) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Over Budget
        </Badge>
      );
    } else if (percentage > 90) {
      return (
        <Badge className="bg-yellow-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Near Limit
        </Badge>
      );
    } else {
      return (
        <Badge variant="default" className="bg-green-500 flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          Under Budget
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Budget Variance Analysis</h2>
          <p className="text-muted-foreground">
            Track budget vs actual spending by category
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">FY 2024</SelectItem>
            <SelectItem value="2023">FY 2023</SelectItem>
            <SelectItem value="q4-2024">Q4 2024</SelectItem>
            <SelectItem value="q3-2024">Q3 2024</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            <SelectItem value="1">Marina Heights Tower</SelectItem>
            <SelectItem value="2">Downtown Residence</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <Progress value={totalVariancePercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {totalVariancePercentage.toFixed(1)}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(totalRemaining))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalRemaining < 0 ? 'Over budget' : 'Available'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.abs(totalVariancePercentage - 100).toFixed(1)}% variance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Variance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>
            Detailed budget vs actual by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgetData.map((category, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{category.categoryName}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(category.budgetedAmount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(category.spentAmount)}
                  </TableCell>
                  <TableCell className={`text-right ${category.remainingAmount < 0 ? 'text-red-600' : ''}`}>
                    {formatCurrency(Math.abs(category.remainingAmount))}
                  </TableCell>
                  <TableCell className={`text-right ${category.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {category.variance > 0 ? '+' : ''}{formatCurrency(category.variance)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={category.variancePercentage} />
                      <p className="text-xs text-muted-foreground">
                        {category.variancePercentage.toFixed(1)}%
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getVarianceBadge(category.variance, category.variancePercentage)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totalBudgeted)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalSpent)}</TableCell>
                <TableCell className="text-right">{formatCurrency(Math.abs(totalRemaining))}</TableCell>
                <TableCell className={`text-right ${totalVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
                </TableCell>
                <TableCell>
                  <Progress value={totalVariancePercentage} />
                </TableCell>
                <TableCell>
                  {getVarianceBadge(totalVariance, totalVariancePercentage)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

