import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, FileText, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { bankStatementsAPI, bankAccountsAPI } from '@/services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface BankAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

interface ImportHistory {
  id: number;
  fileName: string;
  fileType: string;
  totalTransactions: number;
  importedTransactions: number;
  duplicateTransactions: number;
  failedTransactions: number;
  status: string;
  importedAt: string;
  bankAccount: BankAccount;
}

export default function BankStatementImport() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');

  const { register, handleSubmit, reset } = useForm();

  const fetchBankAccounts = async () => {
    try {
      const response = await bankAccountsAPI.getAll();
      setBankAccounts(response.data.data.bankAccounts || []);
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  };

  const fetchImportHistory = async () => {
    try {
      const response = await bankStatementsAPI.getHistory({ page: 1, limit: 10 });
      setImportHistory(response.data.data.imports || []);
    } catch (error) {
      console.error('Failed to fetch import history:', error);
    }
  };

  // Fetch bank accounts and import history on mount
  useEffect(() => {
    fetchBankAccounts();
    fetchImportHistory();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV or Excel file',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'File size must be less than 10MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const onSubmit = async () => {
    if (!selectedFile || !selectedBankAccountId) {
      toast({
        title: 'Missing Information',
        description: 'Please select a bank account and file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('bankAccountId', selectedBankAccountId);

    try {
      const response = await bankStatementsAPI.upload(formData);
      toast({
        title: 'Import Successful',
        description: `Imported ${response.data.data.imported} transactions, ${response.data.data.duplicates} duplicates found`,
      });
      setSelectedFile(null);
      setSelectedBankAccountId('');
      reset();
      fetchImportHistory();
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.response?.data?.message || 'Failed to import statement',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      completed: 'default',
      processing: 'secondary',
      failed: 'destructive',
      partially_completed: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Bank Statement</CardTitle>
          <CardDescription>Upload CSV or Excel files to automatically import transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Bank Account Selection */}
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.bankName} - {account.accountName} ({account.accountNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">Statement File</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="file"
                      id="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="file"
                      className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                    >
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">CSV or Excel files (max 10MB)</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-gray-400">
                    ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </span>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <Button type="submit" disabled={isUploading || !selectedFile || !selectedBankAccountId}>
              {isUploading ? 'Importing...' : 'Import Statement'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>Recent statement imports and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Imported</TableHead>
                <TableHead>Duplicates</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400">
                    No import history
                  </TableCell>
                </TableRow>
              ) : (
                importHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        {getStatusBadge(item.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.fileName}</TableCell>
                    <TableCell>
                      {item.bankAccount.bankName} - {item.bankAccount.accountName}
                    </TableCell>
                    <TableCell>{item.totalTransactions}</TableCell>
                    <TableCell className="text-green-600">{item.importedTransactions}</TableCell>
                    <TableCell className="text-yellow-600">{item.duplicateTransactions}</TableCell>
                    <TableCell className="text-red-600">{item.failedTransactions}</TableCell>
                    <TableCell>{new Date(item.importedAt).toLocaleString()}</TableCell>
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
