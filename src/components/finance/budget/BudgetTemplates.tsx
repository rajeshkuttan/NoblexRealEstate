import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Edit, Plus, Trash2 } from 'lucide-react';

interface BudgetTemplate {
  id: number;
  name: string;
  description: string;
  totalAmount: number;
  categories: number;
  usageCount: number;
  lastUsed?: string;
}

export default function BudgetTemplates() {
  const templates: BudgetTemplate[] = [
    {
      id: 1,
      name: 'Annual Property Maintenance',
      description: 'Standard template for annual property maintenance budgets',
      totalAmount: 500000,
      categories: 8,
      usageCount: 12,
      lastUsed: '2024-10-01',
    },
    {
      id: 2,
      name: 'Quarterly Marketing Budget',
      description: 'Marketing and promotional activities budget template',
      totalAmount: 75000,
      categories: 5,
      usageCount: 8,
      lastUsed: '2024-09-15',
    },
    {
      id: 3,
      name: 'New Property Setup',
      description: 'One-time budget for setting up a new property',
      totalAmount: 250000,
      categories: 10,
      usageCount: 3,
      lastUsed: '2024-08-20',
    },
    {
      id: 4,
      name: 'Monthly Operations',
      description: 'Recurring monthly operational expenses',
      totalAmount: 120000,
      categories: 6,
      usageCount: 24,
      lastUsed: '2024-10-10',
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Budget Templates</h2>
          <p className="text-muted-foreground">
            Reusable budget templates for quick setup
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {template.description}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{template.usageCount} uses</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(template.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Categories</p>
                  <p className="text-lg font-bold">{template.categories}</p>
                </div>
              </div>

              {template.lastUsed && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Last used: {formatDate(template.lastUsed)}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Copy className="mr-2 h-3 w-3" />
                  Use Template
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

