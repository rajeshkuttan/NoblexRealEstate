import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Download, Upload, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chartOfAccountsAPI } from '@/services/api';
import { Progress } from '@/components/ui/progress';
import { postWithRetry } from '@/utils/bulkImport';
import ChartOfAccountsManager from '@/components/finance/coa/ChartOfAccountsManager';
import { OpeningBalancesDialog } from '@/components/finance/coa/OpeningBalancesDialog';

export default function ChartOfAccountsPage() {
  const [externalRefreshKey, setExternalRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showOpeningBalances, setShowOpeningBalances] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await chartOfAccountsAPI.getAll({ limit: 5000 });
      const accounts = response.data?.data?.accounts || [];

      if (accounts.length === 0) {
        toast.warning('No accounts to export');
        return;
      }

      const exportData = accounts.map((acc: any) => ({
        'Account Code': acc.accountCode,
        'Account Name': acc.accountName,
        'Account Type': acc.accountType,
        'Parent Account Code': acc.parentAccount?.accountCode || '',
        'Level': acc.level,
        'Description': acc.description || '',
        'Tax Category': acc.taxCategory || '',
        'Reconcilable': acc.isReconcilable ? 'Yes' : 'No',
        'Active': acc.isActive ? 'Yes' : 'No',
        'Opening Balance': parseFloat(acc.openingBalance || 0),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const colWidths = Object.keys(exportData[0]).map((key) => ({
        wch: Math.max(key.length, ...exportData.map((r: any) => String(r[key] || '').length)) + 2,
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Chart of Accounts');
      XLSX.writeFile(wb, `chart_of_accounts_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exported ${accounts.length} accounts successfully`);
    } catch (error) {
      console.error('Error exporting accounts:', error);
      toast.error('Failed to export accounts');
    } finally {
      setExporting(false);
    }
  };

  // ── Import: Download Template ─────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const template = [
      {
        'Account Code': '6000',
        'Account Name': 'Sample Account',
        'Account Type': 'expense',
        'Parent Account Code': '',
        'Level': 1,
        'Description': 'A sample account (delete this row)',
        'Tax Category': 'vat_exempt',
        'Reconcilable': 'No',
        'Opening Balance': 0,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);

    // Auto-size columns
    const colWidths = Object.keys(template[0]).map((key) => ({
      wch: Math.max(key.length, String((template[0] as any)[key] || '').length) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'chart_of_accounts_import_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  // ── Import: Upload and Process ────────────────────────────────────────
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setImporting(true);
    toast.info('Reading file...', { duration: 2000 });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.warning('File is empty or has no valid data');
          setImporting(false);
          return;
        }

        toast.info(`Found ${jsonData.length} rows. Sending bulk import (one request)…`);

        const response = await postWithRetry(() =>
          chartOfAccountsAPI.bulkImport({ rows: jsonData }),
        );
        const d = response.data?.data;
        const created = d?.created ?? 0;
        const skipped = d?.skipped ?? 0;
        const errors = d?.errors ?? 0;
        const parentsLinked = d?.parentsLinked ?? 0;
        const parentErrors = d?.parentErrors ?? 0;

        if (parentErrors > 0) {
          console.warn('[COA import] parent link failures:', parentErrors);
        }

        setExternalRefreshKey((prev) => prev + 1);

        if (created > 0) {
          toast.success(
            `Import complete: ${created} created, ${skipped} skipped, ${errors} create errors${parentsLinked > 0 ? `, ${parentsLinked} parent links set` : ''}${parentErrors > 0 ? ` (${parentErrors} parent link issues)` : ''}`,
          );
        } else if (skipped > 0 && errors === 0) {
          toast.info(`All ${skipped} accounts already exist or were skipped`);
        } else {
          toast.warning('No accounts were imported');
        }
      } catch (error: any) {
        console.error('Error importing accounts:', error);
        toast.error('Failed to import accounts. Please check the file format.');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-6 uiux-page-enter">
      {/* Header */}
      <div className="uiux-page-header">
        <div>
          <h1 className="uiux-page-title">Chart of Accounts</h1>
          <p className="uiux-page-subtitle">
            Manage your accounting structure and account hierarchy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOpeningBalances(true)}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Opening Balances
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={importing}>
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleUploadClick}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Excel File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {importing && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 space-y-2">
          <p className="text-sm font-medium text-blue-900">
            Processing chart of accounts on server…
          </p>
          <Progress value={100} className="animate-pulse" />
        </div>
      )}

      <ChartOfAccountsManager externalRefreshKey={externalRefreshKey} />

      <OpeningBalancesDialog
        open={showOpeningBalances}
        onClose={(refresh) => {
          setShowOpeningBalances(false);
          if (refresh) {
            setExternalRefreshKey((prev) => prev + 1);
          }
        }}
      />
    </div>
  );
}
