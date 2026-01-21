import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Trash2, FileText, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { documentsAPI } from '@/services/api';

interface Document {
  id: number;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadDate: string;
  expiryDate: string | null;
  notes: string | null;
  expiryStatus: 'valid' | 'expiring_soon' | 'expired';
  uploader: {
    id: number;
    name: string;
    email: string;
  };
}

interface DocumentListProps {
  entityType: 'vendor' | 'lead';
  entityId: number;
  documents: Document[];
  onDelete: () => void;
}

export function DocumentList({ entityType, entityId, documents, onDelete }: DocumentListProps) {
  const [filter, setFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getExpiryBadge = (status: string, expiryDate: string | null) => {
    if (!expiryDate) return null;

    switch (status) {
      case 'expired':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Expired
          </Badge>
        );
      case 'expiring_soon':
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            Expiring Soon
          </Badge>
        );
      case 'valid':
        return (
          <Badge variant="default" className="gap-1 bg-green-100 text-green-800">
            Valid
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleDownload = async (documentId: number, fileName: string) => {
    try {
      const response = await documentsAPI.download(documentId);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Document downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.response?.data?.message || 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (documentId: number) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setDeleting(true);

    try {
      const response = await documentsAPI.delete(documentToDelete);

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Document deleted successfully',
        });
        onDelete();
      }
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.response?.data?.message || 'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (filter === 'all') return true;
    return doc.documentType === filter;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Documents ({documents.length})</h3>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="contract">Contracts</SelectItem>
            <SelectItem value="license">Licenses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sortedDocuments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedDocuments.map((doc) => (
            <Card key={doc.id} className="relative overflow-hidden group">
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded-md p-1 backdrop-blur-sm z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleDownload(doc.id, doc.fileName)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteClick(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">
                    {doc.documentType}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium truncate" title={doc.fileName}>
                      {doc.fileName}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.fileSize)} • {formatDate(doc.uploadDate)}
                    </p>
                  </div>

                  {doc.notes && (
                    <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground italic">
                      "{doc.notes}"
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                     <span className="font-medium text-foreground">{doc.uploader.name}</span>
                     <span>Uploaded</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getExpiryBadge(doc.expiryStatus, doc.expiryDate)}
                    {doc.expiryDate && (
                      <span className="text-[10px] text-muted-foreground">
                        Expires: {formatDate(doc.expiryDate)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/50 border-dashed">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
          <p className="text-muted-foreground font-medium">
            {filter === 'all' ? 'No documents uploaded yet' : `No ${filter}s found`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a document to get started
          </p>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
