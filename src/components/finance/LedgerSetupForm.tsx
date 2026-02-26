import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { ledgerSetupsAPI, chartOfAccountsAPI } from '@/services/api';
import { toast } from 'sonner';

type Props = {
  mode: 'create' | 'edit' | 'view';
  id?: number;
  onClose: (refresh?: boolean) => void;
};

const DOCUMENT_TYPES = ['Purchase Invoice', 'Payment Voucher', 'Journal Voucher', 'Sales Invoice', 'Receipt', 'Others'];
const SUB_DOCUMENTS = ['Cash', 'Bank', 'PDC'];
const CALC_ON = ['Gross', 'Net', 'Others'];
const AMOUNT_TYPES = ['Dr', 'Cr'];

export default function LedgerSetupForm({ mode, id, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<any>({
    documentType: 'Purchase Invoice',
    subDocument: null,
    calculationOn: 'Gross',
    amountType: 'Dr',
    postingType: null,
  });
  const [postings, setPostings] = useState<SearchableSelectOption[]>([]); // searchable ledger options

  const fetchPostings = async () => {
    try {
      setLoading(true);
      const res = await chartOfAccountsAPI.getHierarchy();
      const tree = res.data?.data || [];
      
      // Flatten tree and collect leaf nodes (nodes without children)
      const leaves: SearchableSelectOption[] = [];
      const walk = (nodes: any[]) => {
        if (!Array.isArray(nodes)) return;
        nodes.forEach((n) => {
          // Check if node has no children (leaf node)
          const hasNoChildren = !n.subAccounts || n.subAccounts.length === 0;
          
          if (hasNoChildren && n.id) {
            // This is a leaf node - add to selectable options
            leaves.push({
              value: String(n.id),
              label: `${n.accountCode || ''} - ${n.accountName || ''}`,
              description: n.accountType || ''
            });
          } else if (n.subAccounts && n.subAccounts.length > 0) {
            // This has children - recurse
            walk(n.subAccounts);
          }
        });
      };
      walk(tree);
      
      console.log('Loaded leaf accounts for posting type:', leaves.length, leaves);
      setPostings(leaves);
      
      if (leaves.length === 0) {
        toast.warning('No leaf accounts found in chart of accounts');
      }
    } catch (err) {
      console.error('Failed to load chart of accounts', err);
      toast.error('Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Always skip cache for edit/view mode to get latest data
      const res = await ledgerSetupsAPI.getById(id, true);
      const data = res.data?.data;
      if (data) {
        setValues({
          documentType: data.documentType,
          subDocument: data.subDocument,
          calculationOn: data.calculationOn,
          amountType: data.amountType,
          postingType: data.postingType,
          updated_at: data.updated_at,
          id: data.id,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load ledger setup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostings();
    if (mode !== 'create' && id) fetchData();
  }, [id, mode]);

  const handleSave = async () => {
    // validation
    if (!values.documentType || !values.calculationOn || !values.amountType || !values.postingType) {
      toast.error('Please fill required fields');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'create') {
        await ledgerSetupsAPI.create(values);
        toast.success('Ledger Setup created');
      } else {
        await ledgerSetupsAPI.update(id as number, values);
        toast.success('Ledger Setup updated');
      }
      onClose(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save ledger setup');
    } finally {
      setSaving(false);
    }
  };

  const readOnly = mode === 'view';

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(false); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Ledger Setup' : mode === 'edit' ? 'Edit Ledger Setup' : 'View Ledger Setup'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Document Type</label>
            <Select value={values.documentType} onValueChange={(v) => setValues((s: any) => ({ ...s, documentType: v }))} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {(values.documentType === 'Payment Voucher' || values.documentType === 'Receipt') && (
            <div>
              <label className="block text-sm font-medium mb-1">Sub Document</label>
              <Select value={values.subDocument || ''} onValueChange={(v) => setValues((s: any) => ({ ...s, subDocument: v }))} disabled={readOnly}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sub document" />
                </SelectTrigger>
                <SelectContent>
                  {SUB_DOCUMENTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Calculation On</label>
            <Select value={values.calculationOn} onValueChange={(v) => setValues((s: any) => ({ ...s, calculationOn: v }))} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Select calculation" />
              </SelectTrigger>
              <SelectContent>
                {CALC_ON.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount Type</label>
            <Select value={values.amountType} onValueChange={(v) => setValues((s: any) => ({ ...s, amountType: v }))} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Select amount type" />
              </SelectTrigger>
              <SelectContent>
                {AMOUNT_TYPES.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Posting Type (Ledger)</label>
            <SearchableSelect 
              value={String(values.postingType || '')} 
              onValueChange={(v) => setValues((s: any) => ({ ...s, postingType: v ? Number(v) : null }))} 
              options={postings}
              placeholder="Select ledger"
              searchPlaceholder="Search accounts..."
              emptyMessage="No ledger accounts found"
              disabled={readOnly || loading}
            />
          </div>

          {mode !== 'create' && (
            <div>
              <label className="block text-sm font-medium mb-1">Modification Date</label>
              <Input value={values.updated_at ? new Date(values.updated_at).toLocaleString() : ''} readOnly />
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onClose(false)}>Close</Button>
            {!readOnly && <Button onClick={handleSave} disabled={saving}>{mode === 'create' ? 'Create' : 'Save'}</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
