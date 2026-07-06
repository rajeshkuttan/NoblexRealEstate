import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Trash2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NobleXDataTable } from "@/components/noblex";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { investmentsAPI } from "@/services/api";
import { resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";

const DOCUMENT_TYPES = [
  { value: "CONTRACT", label: "Contract" },
  { value: "PROSPECTUS", label: "Prospectus" },
  { value: "STATEMENT", label: "Statement" },
  { value: "CUSTODY", label: "Custody certificate" },
  { value: "OTHER", label: "Other" },
] as const;

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"];

interface InvestmentDocumentUploaderProps {
  assetId: number;
}

interface InvestmentDocument {
  id: number;
  documentType: string;
  fileName: string;
  filePath: string;
  expiryDate?: string | null;
  remarks?: string | null;
  createdAt?: string;
}

export function InvestmentDocumentUploader({ assetId }: InvestmentDocumentUploaderProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("OTHER");
  const [expiryDate, setExpiryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["investment-asset-documents", assetId],
    queryFn: async () => {
      const res = await investmentsAPI.getAssetDocuments(assetId);
      return (res.data?.data || []) as InvestmentDocument[];
    },
    enabled: !!assetId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Select a file first");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("documentType", documentType);
      if (expiryDate) formData.append("expiryDate", expiryDate);
      if (remarks) formData.append("remarks", remarks);
      return investmentsAPI.uploadDocument(assetId, formData);
    },
    onSuccess: () => {
      toast.success("Document uploaded");
      setSelectedFile(null);
      setExpiryDate("");
      setRemarks("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["investment-asset-documents", assetId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => investmentsAPI.deleteDocument(id),
    onSuccess: () => {
      toast.success("Document removed");
      qc.invalidateQueries({ queryKey: ["investment-asset-documents", assetId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Delete failed"),
  });

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return "File exceeds 15MB limit";
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return "Allowed: PDF, images, Word, Excel";
    }
    return null;
  };

  const pickFile = (file: File) => {
    const err = validateFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    setSelectedFile(file);
  };

  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <div className="space-y-6">
      <div
        className={`rounded-lg border border-dashed p-6 transition-colors ${
          dragActive ? "border-noblex-gold bg-noblex-gold/5" : "border-noblex-border bg-noblex-surface"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) pickFile(file);
        }}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <Upload className="h-8 w-8 text-noblex-gold" />
          <p className="text-sm text-noblex-platinum">Drag & drop or choose a file (max 15MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickFile(file);
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose file
          </Button>
          {selectedFile && (
            <p className="text-xs text-noblex-gold-light flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {selectedFile.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          <div>
            <Label>Document type</Label>
            <select
              className="w-full mt-1 rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Expiry date</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="mt-1" />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button
              type="button"
              variant="noblex-primary"
              className="w-full"
              disabled={!selectedFile || uploadMutation.isPending}
              onClick={() => uploadMutation.mutate()}
            >
              {uploadMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : "Upload document"}
            </Button>
          </div>
          <div className="md:col-span-3">
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="mt-1" rows={2} placeholder="Optional notes" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-noblex-slate">Loading documents…</p>
      ) : (
        <NobleXDataTable>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-noblex-slate py-8">
                  No documents attached to this asset yet.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="text-sm">{doc.fileName}</TableCell>
                  <TableCell>{doc.documentType}</TableCell>
                  <TableCell>{formatDate(doc.createdAt)}</TableCell>
                  <TableCell>{formatDate(doc.expiryDate)}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="ghost" asChild>
                      <a href={resolveImageUrl(doc.filePath)} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-400 hover:text-rose-300"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </NobleXDataTable>
      )}
    </div>
  );
}
