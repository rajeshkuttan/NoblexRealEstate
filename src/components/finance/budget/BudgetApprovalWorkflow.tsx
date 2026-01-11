import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react';

interface ApprovalRequest {
  id: number;
  budgetName: string;
  requestedBy: string;
  requestDate: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export default function BudgetApprovalWorkflow() {
  const approvalRequests: ApprovalRequest[] = [
    {
      id: 1,
      budgetName: 'Q4 2024 Marketing Budget',
      requestedBy: 'John Doe',
      requestDate: '2024-10-10',
      amount: 50000,
      status: 'pending',
      notes: 'Increased allocation for digital marketing campaigns',
    },
    {
      id: 2,
      budgetName: 'Property Maintenance 2024',
      requestedBy: 'Jane Smith',
      requestDate: '2024-10-08',
      amount: 150000,
      status: 'approved',
      notes: 'Approved by Finance Director on 2024-10-09',
    },
    {
      id: 3,
      budgetName: 'Staff Training Budget',
      requestedBy: 'Mike Johnson',
      requestDate: '2024-10-05',
      amount: 25000,
      status: 'rejected',
      notes: 'Insufficient justification provided',
    },
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { icon: Clock, color: 'bg-yellow-500', text: 'PENDING' },
      approved: { icon: CheckCircle, color: 'bg-green-500', text: 'APPROVED' },
      rejected: { icon: XCircle, color: 'bg-red-500', text: 'REJECTED' },
    };
    const { icon: Icon, color, text } = config[status as keyof typeof config];
    
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {text}
      </Badge>
    );
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Budget Approval Workflow</h2>
        <p className="text-muted-foreground">
          Review and approve budget requests
        </p>
      </div>

      {approvalRequests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{request.budgetName}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {request.requestedBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(request.requestDate)}
                  </span>
                </CardDescription>
              </div>
              {getStatusBadge(request.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Requested Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(request.amount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {request.status === 'pending' && 'Awaiting approval'}
                  {request.status === 'approved' && 'Approved and active'}
                  {request.status === 'rejected' && 'Request denied'}
                </p>
              </div>
            </div>

            {request.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground">{request.notes}</p>
                </div>
              </>
            )}

            {request.status === 'pending' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor={`approval-notes-${request.id}`}>Approval Notes</Label>
                  <Textarea
                    id={`approval-notes-${request.id}`}
                    placeholder="Add notes for your decision..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="default">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button variant="destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

