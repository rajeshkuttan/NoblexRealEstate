import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { documentsAPI } from '@/services/api';

interface DocumentUploadProps {
  entityType: 'vendor' | 'lead';
  entityId: number;
  onUploadSuccess: () => void;
}

const ALLOWED_TYPES = {
  contract: {
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['.pdf', '.doc', '.docx'],
    label: 'Contract (PDF, DOC, DOCX)'
  },
  license: {
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    extensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    label: 'License (PDF, JPG, PNG)'
  }
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const INVALID_FILE_FORMAT_MESSAGE =
  'Invalid file format. Please upload only PDF, JPG, JPEG, PNG, TXT, DOC, or DOCX files.';

export function DocumentUpload({ entityType, entityId, onUploadSuccess }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'contract' | 'license'>('contract');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum limit of 10MB`;
    }

    // Check file type
    const allowedTypes = ALLOWED_TYPES[documentType];
    if (!allowedTypes.mimeTypes.includes(file.type)) {
      return INVALID_FILE_FORMAT_MESSAGE;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: 'Invalid File',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('entityType', entityType);
      formData.append('entityId', entityId.toString());
      formData.append('documentType', documentType);
      if (expiryDate) {
        formData.append('expiryDate', expiryDate);
      }
      if (notes) {
        formData.append('notes', notes);
      }
      // Append file last to ensure fields are available
      formData.append('file', selectedFile);

      const response = await documentsAPI.upload(formData);

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Document uploaded successfully',
        });

        // Reset form
        setSelectedFile(null);
        setDocumentType('contract');
        setExpiryDate('');
        setNotes('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        onUploadSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.response?.data?.message || 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="documentType" className="text-sm font-medium">Document Type</Label>
            <Select
              value={documentType}
              onValueChange={(value: 'contract' | 'license') => {
                setDocumentType(value);
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract (PDF, DOC)</SelectItem>
                <SelectItem value="license">License (PDF, IMG)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate" className="text-sm font-medium">Expiry Date <span className="text-muted-foreground font-normal">(Optional)</span></Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ease-in-out cursor-pointer hover:border-primary/50 hover:bg-accent/50 ${
            dragActive ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-muted-foreground/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_TYPES[documentType].extensions.join(',')}
            onChange={handleFileInputChange}
          />

          {selectedFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 mx-auto text-gray-400" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Drag and drop your file here, or
                </p>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => fileInputRef.current?.click()}
                >
                  browse files
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {ALLOWED_TYPES[documentType].label} • Max 10MB
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes about this document..."
            rows={3}
          />
        </div>

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full"
        >
          {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </CardContent>
    </Card>
  );
}
