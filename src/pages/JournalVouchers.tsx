import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  FileText,
  Eye,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  Trash2,
  Send,
  Unlock,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { journalVouchersAPI } from '@/services/api';
import { cacheService } from '@/services/cache';
import { JournalVoucherForm } from '@/components/finance/JournalVoucherForm';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { printDocument, generateVoucherHtml } from '@/utils/printUtils';

export default function JournalVouchers() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formState, setFormState] = useState<{show: boolean, mode: 'create' | 'edit' | 'view' | 'duplicate', id?: number}>({
    show: false,
    mode: 'create'
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id?: number}>({
    show: false
  });
  const [postConfirm, setPostConfirm] = useState<{show: boolean, id?: number}>({
    show: false
  });
  const [unpostConfirm, setUnpostConfirm] = useState<{show: boolean, id?: number}>({
    show: false
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await journalVouchersAPI.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
      });
      const data = response.data?.data || {};
      setVouchers(data.vouchers || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 1,
      }));
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [pagination.page, searchTerm]);

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await journalVouchersAPI.delete(deleteConfirm.id);
      toast.success('Journal Voucher cancelled successfully');
      cacheService.invalidatePattern('/journal-vouchers');
      cacheService.invalidatePattern('/chart-of-accounts');
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel voucher');
    } finally {
      setDeleteConfirm({ show: false });
    }
  };

  const handlePost = async () => {
    if (!postConfirm.id) return;
    try {
      await journalVouchersAPI.post(postConfirm.id);
      toast.success('Journal Voucher posted successfully to LEDGER');
      cacheService.invalidatePattern('/journal-vouchers');
      cacheService.invalidatePattern('/chart-of-accounts');
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to post voucher');
    } finally {
      setPostConfirm({ show: false });
    }
  };

  const handleUnpost = async () => {
    if (!unpostConfirm.id) return;
    try {
      await journalVouchersAPI.unpost(unpostConfirm.id);
      toast.success('Journal Voucher unposted successfully');
      cacheService.invalidatePattern('/journal-vouchers');
      cacheService.invalidatePattern('/chart-of-accounts');
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unpost voucher');
    } finally {
      setUnpostConfirm({ show: false });
    }
  };

  const handlePrint = async (id: number) => {
    try {
      const response = await journalVouchersAPI.getById(id);
      const jv = response.data?.data;
      if (!jv) return;

      const htmlContent = generateVoucherHtml(jv, 'journal');
      printDocument(`Journal Voucher - ${jv.jvNumber}`, htmlContent);
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to generate print view');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Posted</Badge>;
      case 'open':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Open</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header flex-col md:flex-row items-start md:items-center gap-4">
        <div>
          <h1 className="uiux-page-title">Journal Vouchers</h1>
          <p className="uiux-page-subtitle">Manage and record manual journal entries.</p>
        </div>
        <Button onClick={() => setFormState({ show: true, mode: 'create' })} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> New Journal Voucher
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vouchers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all statuses</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by JV number or narration..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>JV Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Amount (AED)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 animate-spin" />
                        Loading vouchers...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : vouchers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No journal vouchers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  vouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-mono font-medium">{voucher.jvNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(voucher.date), 'dd MMM yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{voucher.narration}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {parseFloat(voucher.totalDebit).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => setFormState({ show: true, mode: 'view', id: voucher.id })}
                            >
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => setFormState({ show: true, mode: 'duplicate', id: voucher.id })}
                            >
                              <Copy className="mr-2 h-4 w-4" /> Duplicate JV
                            </DropdownMenuItem>
                            
                            {voucher.status === 'open' && (
                                <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="cursor-pointer text-primary font-semibold"
                                    onClick={() => setPostConfirm({ show: true, id: voucher.id })}
                                >
                                    <Send className="mr-2 h-4 w-4" /> Post to Ledger
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    className="cursor-pointer"
                                    onClick={() => setFormState({ show: true, mode: 'edit', id: voucher.id })}
                                >
                                    <Edit className="mr-2 h-4 w-4" /> Edit Voucher
                                </DropdownMenuItem>
                                </>
                            )}
                            {voucher.status === 'posted' && (
                                <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="cursor-pointer text-orange-500 font-semibold focus:text-orange-600"
                                    onClick={() => setUnpostConfirm({ show: true, id: voucher.id })}
                                >
                                    <Unlock className="mr-2 h-4 w-4" /> Unpost Voucher
                                </DropdownMenuItem>
                                </>
                            )}

                            {voucher.status !== 'cancelled' && (
                                <DropdownMenuItem 
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => setDeleteConfirm({ show: true, id: voucher.id })}
                                >
                                <Trash2 className="mr-2 h-4 w-4" /> Cancel Voucher
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => handlePrint(voucher.id)}
                            >
                              <Download className="mr-2 h-4 w-4" /> Print Voucher
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {vouchers.length} of {pagination.total} vouchers
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm font-medium">Page {pagination.page} of {pagination.pages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {formState.show && (
        <JournalVoucherForm 
          voucherId={formState.id}
          mode={formState.mode}
          onClose={(refresh) => {
            setFormState({ show: false, mode: 'create' });
            if (refresh) fetchVouchers();
          }} 
        />
      )}

      <AlertDialog open={deleteConfirm.show} onOpenChange={(show) => setDeleteConfirm({ show, id: deleteConfirm.id })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the journal voucher and reverse all its ledger impacts if it was posted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm({ show: false })}>Keep Voucher</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={postConfirm.show} onOpenChange={(show) => setPostConfirm({ show, id: postConfirm.id })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post to Ledger?</AlertDialogTitle>
            <AlertDialogDescription>
              Posting this voucher will permanently record the financial transactions and update the account balances in the Chart of Accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPostConfirm({ show: false })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePost} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Confirm & Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unpostConfirm.show} onOpenChange={(show) => setUnpostConfirm({ show, id: unpostConfirm.id })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpost Voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              Unposting this voucher will reverse all its ledger impacts and make it open for editing again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnpostConfirm({ show: false })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnpost} className="bg-orange-500 text-white hover:bg-orange-600">
              Confirm Unpost
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
