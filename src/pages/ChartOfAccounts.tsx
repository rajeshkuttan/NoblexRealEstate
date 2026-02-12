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

        toast.info(`Found ${jsonData.length} accounts. Importing...`);

        let created = 0;
        let skipped = 0;
        let errors = 0;

        // First pass: create accounts without parent links
        // Collect a map of accountCode → created id for parent resolution
        const codeToIdMap: Record<string, number> = {};

        // Also fetch existing accounts to build the map
        try {
          const existingResponse = await chartOfAccountsAPI.getAll({ limit: 5000 });
          const existingAccounts = existingResponse.data?.data?.accounts || [];
          for (const acc of existingAccounts) {
            codeToIdMap[acc.accountCode] = acc.id;
          }
        } catch (err) {
          console.error('Could not fetch existing accounts for parent mapping:', err);
        }

        for (const row of jsonData) {
          const accountCode = String(row['Account Code'] || '').trim();
          const accountName = String(row['Account Name'] || '').trim();
          const accountType = String(row['Account Type'] || '').trim().toLowerCase();

          if (!accountCode || !accountName || !accountType) {
            skipped++;
            continue;
          }

          if (!['asset', 'liability', 'equity', 'revenue', 'expense'].includes(accountType)) {
            console.warn(`Skipping row with invalid account type: ${accountType}`);
            skipped++;
            continue;
          }

          // Skip if account code already exists
          if (codeToIdMap[accountCode]) {
            skipped++;
            continue;
          }

          const reconcilableVal = String(row['Reconcilable'] || '').trim().toLowerCase();
          const taxCat = String(row['Tax Category'] || '').trim();
          const level = parseInt(String(row['Level'] || '1')) || 1;
          const openingBal = parseFloat(String(row['Opening Balance'] || '0')) || 0;

          try {
            const response = await chartOfAccountsAPI.create({
              accountCode,
              accountName,
              accountType,
              level,
              description: String(row['Description'] || '').trim() || null,
              taxCategory: ['vat_applicable', 'vat_exempt', 'zero_rated', 'out_of_scope'].includes(taxCat)
                ? taxCat
                : 'vat_exempt',
              isReconcilable: reconcilableVal === 'yes' || reconcilableVal === 'true',
              isActive: true,
              openingBalance: openingBal,
              balance: openingBal,
            });

            const createdAcc = response.data?.data;
            if (createdAcc?.id) {
              codeToIdMap[accountCode] = createdAcc.id;
            }
            created++;
          } catch (err: any) {
            console.error(`Error creating account ${accountCode}:`, err?.response?.data || err);
            errors++;
          }
        }

        // Second pass: update parent references
        let parentsLinked = 0;
        for (const row of jsonData) {
          const accountCode = String(row['Account Code'] || '').trim();
          const parentCode = String(row['Parent Account Code'] || '').trim();

          if (!parentCode || !codeToIdMap[accountCode] || !codeToIdMap[parentCode]) continue;

          try {
            await chartOfAccountsAPI.update(codeToIdMap[accountCode], {
              parentAccountId: codeToIdMap[parentCode],
            });
            parentsLinked++;
          } catch (err: any) {
            console.error(`Error linking parent for ${accountCode}:`, err?.response?.data || err);
          }
        }

        // Refresh the tree
        setExternalRefreshKey((prev) => prev + 1);

        if (created > 0) {
          toast.success(`Import complete: ${created} created, ${skipped} skipped, ${errors} errors${parentsLinked > 0 ? `, ${parentsLinked} parent links set` : ''}`);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground">
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
