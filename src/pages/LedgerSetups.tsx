import { useEffect, useState } from 'react';
import { Plus, Edit, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ledgerSetupsAPI } from '@/services/api';
import LedgerSetupForm from '@/components/finance/LedgerSetupForm';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function LedgerSetups() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [formState, setFormState] = useState<{ show: boolean; mode: 'create' | 'edit' | 'view'; id?: number }>({ show: false, mode: 'create' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id?: number }>({ show: false });

  const fetchData = async (skipCache = false) => {
    setLoading(true);
    try {
      // Use skipCache to force fresh data after mutations
      const res = await ledgerSetupsAPI.getAll({ limit: 500 }, skipCache);
      const data = res.data?.data || {};
      setItems(data.ledgerSetups || []);
    } catch (err) {
      console.error('Failed to load ledger setups', err);
      toast.error('Failed to load ledger setups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await ledgerSetupsAPI.delete(deleteConfirm.id);
      toast.success('Ledger Setup deleted');
      // Skip cache to refresh with fresh data
      setTimeout(() => fetchData(true), 500);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete ledger setup');
    } finally {
      setDeleteConfirm({ show: false });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ledger Setups</h1>
          <p className="text-muted-foreground">Configure accounting posting rules by document type.</p>
        </div>
        <div>
          <Button onClick={() => setFormState({ show: true, mode: 'create' })}>
            <Plus className="mr-2 h-4 w-4" /> Add New Ledger Setup
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input 
            placeholder="Search by Document Type or Sub Document..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger Setup List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Sub Document</TableHead>
                  <TableHead>Calculation On</TableHead>
                  <TableHead>Amount Type</TableHead>
                  <TableHead>Posting Type</TableHead>
                  <TableHead>Modification Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">Loading...</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">No ledger setups found.</TableCell>
                  </TableRow>
                ) : (
                  items.filter(item => {
                    const search = searchTerm.toLowerCase();
                    return (
                      (item.documentType || '').toLowerCase().includes(search) ||
                      (item.subDocument || '').toLowerCase().includes(search)
                    );
                  }).map((row, idx) => (
                    <TableRow key={row.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{row.documentType}</TableCell>
                      <TableCell>{row.subDocument || '-'}</TableCell>
                      <TableCell>{row.calculationOn}</TableCell>
                      <TableCell>{row.amountType}</TableCell>
                      <TableCell>{row.ledger?.accountName || row.postingType}</TableCell>
                      <TableCell>{row.updated_at ? format(new Date(row.updated_at), 'dd MMM yyyy HH:mm') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setFormState({ show: true, mode: 'view', id: row.id })}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setFormState({ show: true, mode: 'edit', id: row.id })}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm({ show: true, id: row.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {formState.show && (
        <LedgerSetupForm
          mode={formState.mode}
          id={formState.id}
          onClose={(refresh?: boolean) => {
            setFormState({ show: false, mode: 'create' });
            if (refresh) {
              // Skip cache and add small delay for server sync
              setTimeout(() => fetchData(true), 500);
            }
          }}
        />
      )}

      <AlertDialog open={deleteConfirm.show} onOpenChange={(show) => setDeleteConfirm({ show, id: deleteConfirm.id })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm({ show: false })}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
