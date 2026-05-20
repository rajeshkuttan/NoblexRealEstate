import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { 
  Plus, 
  Trash2, 
  FileUp, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Save,
  Download,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/use-toast";
import { legalCasesAPI, leasesAPI, documentsAPI } from "@/services/api";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useDocumentNumberingMode } from "@/hooks/useDocumentNumberingMode";

interface LegalFormProps {
  caseId: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const legalStatusOptions = [
  { value: "dispute", label: "Dispute" },
  { value: "npa", label: "NPA" },
  { value: "case", label: "Ongoing Case" },
  { value: "available", label: "Available" },
  { value: "case_closed", label: "Case Closed" },
];

export default function LegalForm({ caseId, onClose, onSuccess }: LegalFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [caseData, setCaseData] = useState<any>(null);
  const { isManualNumbering, loading: numberingModeLoading } = useDocumentNumberingMode("Legal");

  const form = useForm({
    defaultValues: {
      caseNumber: "",
      leaseId: "",
      tenantId: "",
      unitId: "",
      description: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      expectedClosureDate: "",
      status: "dispute",
      consultantDetails: "",
      remarks: "",
    },
  });

  const fetchAttachments = useCallback(async () => {
    try {
      if (!caseId) return;
      const response = await documentsAPI.getByEntity('legal_case', caseId, true);
      setAttachments(response.data || []);
    } catch (error) {
      console.error("Failed to fetch attachments", error);
    }
  }, [caseId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch leases first
      const leaseResponse = await leasesAPI.getAll({ limit: 500, _t: Date.now() });
      const allLeases = leaseResponse.data?.data?.leases || leaseResponse.data || [];
      setLeases(allLeases);

      // Then fetch case details if needed
      if (caseId) {
        const caseResponse = await legalCasesAPI.getById(caseId, { _t: Date.now() });
        if (caseResponse.data.success) {
          const data = caseResponse.data.data;
          setCaseData(data);
          form.reset({
            caseNumber: data.caseNumber,
            leaseId: data.leaseId.toString(),
            tenantId: data.tenantId.toString(),
            unitId: data.unitId.toString(),
            description: data.description,
            startDate: data.startDate,
            expectedClosureDate: data.expectedClosureDate || "",
            status: data.status,
            consultantDetails: data.consultantDetails || "",
            remarks: data.remarks || "",
          });

          if (data.lease) {
            const formattedLease = {
              ...data.lease,
              tenant: data.tenant,
              unit: data.unit
            };
            setSelectedLease(formattedLease);
            
            // Ensure the current lease is in the list
            const exists = allLeases.some((l: any) => l.id === data.leaseId);
            if (!exists) {
              setLeases(prev => [formattedLease, ...prev]);
            }
          }
          
          // Fetch attachments
          await fetchAttachments();
        }
      }
    } catch (error) {
      console.error("Failed to load data", error);
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [caseId, form, toast, fetchAttachments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLeaseChange = (leaseId: string) => {
    const lease = leases.find(l => l.id.toString() === leaseId);
    if (lease) {
      setSelectedLease(lease);
      form.setValue("tenantId", lease.tenantId.toString());
      form.setValue("unitId", lease.unitId.toString());
    }
  };

  const onSubmit = async (values: any) => {
    try {
      setLoading(true);
      let response;
      if (caseId) {
        response = await legalCasesAPI.update(caseId, values);
      } else {
        response = await legalCasesAPI.create(values);
      }

      if (response.data.success) {
        toast({
          title: "Success",
          description: caseId ? "Case updated successfully" : "Case created successfully",
        });
        if (onSuccess) onSuccess();
        if (!caseId) onClose();
        else loadData();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Operation failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      const response = await legalCasesAPI.approve(caseId!);
      if (response.data.success) {
        toast({
          title: "Approved",
          description: "Legal case approved and unit status updated to Dispute",
        });
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve case",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCase = async () => {
    try {
      setLoading(true);
      const response = await legalCasesAPI.close(caseId!);
      if (response.data.success) {
        toast({
          title: "Closed",
          description: "Legal case marked as closed and unit status updated to Available",
        });
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close case",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('document', file);
    formData.append('entityType', 'legal_case');
    formData.append('entityId', caseId!.toString());
    formData.append('documentType', 'attachment');

    try {
      setLoading(true);
      const response = await documentsAPI.upload(formData);
      if (response.status === 200 || response.status === 201) {
        toast({ title: "Success", description: "Document uploaded successfully" });
        fetchAttachments();
      }
    } catch (error) {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isClosed = caseData?.status === 'case_closed';

  return (
    <div className="space-y-8">
      {caseId && (
        <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Status:</span>
            <Badge variant={caseData?.isApproved ? "default" : "secondary"} className="text-xs px-2.5 py-0.5 rounded-full font-bold">
              {caseData?.isApproved ? "Approved" : "Pending Approval"}
            </Badge>
            <Badge variant={isClosed ? "destructive" : "outline"} className="text-xs px-2.5 py-0.5 rounded-full font-bold border-2">
              {caseData?.status.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            {!caseData?.isApproved && (
              <Button onClick={handleApprove} variant="default" className="shadow-sm hover:translate-y-[-1px] transition-transform">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Case
              </Button>
            )}
            {caseData?.isApproved && !isClosed && (
              <Button onClick={handleCloseCase} variant="secondary" className="shadow-sm hover:translate-y-[-1px] transition-transform font-bold text-destructive hover:bg-destructive/10">
                <XCircle className="mr-2 h-4 w-4" /> Close Legal Case
              </Button>
            )}
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="caseNumber"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-bold text-foreground">Case Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isManualNumbering ? "Enter case number" : "Auto-generated"}
                      {...field}
                      disabled={!!caseId || numberingModeLoading || !isManualNumbering}
                      readOnly={!isManualNumbering}
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leaseId"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-bold text-foreground">Contract (Lease) No.</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      disabled={!!caseId || isClosed}
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        handleLeaseChange(val);
                      }}
                      placeholder="Select a contract"
                      searchPlaceholder="Search contracts..."
                      emptyMessage="No contract found"
                      options={leases.map((l) => ({
                        value: l.id.toString(),
                        label: l.leaseNumber,
                        description: `${l.unit?.property?.title || "No Property"} - Unit ${l.unit?.unitNumber ?? "N/A"}`,
                      }))}
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-medium" />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel className="font-bold text-foreground opacity-70">Associated Tenant</FormLabel>
              <Input value={selectedLease?.tenant?.name || "Select a contract first"} disabled className="bg-muted/50 font-medium" />
            </div>
            
            <div className="space-y-2">
              <FormLabel className="font-bold text-foreground opacity-70">Associated Unit</FormLabel>
              <Input value={selectedLease?.unit?.unitNumber || "Select a contract first"} disabled className="bg-muted/50 font-medium" />
            </div>

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-bold text-foreground">Case Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isClosed} className="hover:border-primary/50 transition-colors" />
                  </FormControl>
                  <FormMessage className="text-xs font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedClosureDate"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-bold text-foreground">Expected Closure Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isClosed} className="hover:border-primary/50 transition-colors" />
                  </FormControl>
                  <FormMessage className="text-xs font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-bold text-foreground">Current Case Status</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isClosed}
                      placeholder="Select status"
                      searchPlaceholder="Search statuses..."
                      emptyMessage="No status found"
                      className="font-semibold"
                      options={legalStatusOptions}
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-medium" />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-bold text-foreground">Case Description / Legal Matter</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Provide detailed description of the legal matter..." 
                      className="min-h-[140px] resize-none hover:border-primary/50 transition-colors" 
                      {...field} 
                      disabled={isClosed} 
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-medium" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consultantDetails"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="font-bold text-foreground">Consultant Details / Legal Advisor</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Legal advisor or law firm information..." 
                      className="min-h-[140px] resize-none hover:border-primary/50 transition-colors" 
                      {...field} 
                      disabled={isClosed} 
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-medium" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="remarks"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="font-bold text-foreground opacity-80">Additional Remarks / Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Any other internal notes..." 
                    className="min-h-[80px] resize-none hover:border-primary/50 transition-colors" 
                    {...field} 
                    disabled={isClosed} 
                  />
                </FormControl>
                <FormMessage className="text-xs font-medium" />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="px-8 font-semibold">
              {isClosed ? "Close View" : "Cancel"}
            </Button>
            {!isClosed && (
              <Button type="submit" disabled={loading} className="px-8 font-bold shadow-md hover:translate-y-[-1px] transition-transform">
                <Save className="mr-2 h-4 w-4" /> {caseId ? "Update Case Details" : "Create Legal Case"}
              </Button>
            )}
          </div>
        </form>
      </Form>

      {/* Attachments Section */}
      {caseId && (
        <div className="pt-8 border-t-2 border-dashed border-border/50 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2 text-foreground/90">
              <FileUp className="h-5 w-5 text-primary" />
              Legal Attachments & Documents
            </h3>
            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button asChild variant="outline" size="sm" className="font-semibold cursor-pointer border-2 border-primary/20 hover:border-primary transition-all">
                <label htmlFor="file-upload" className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" /> Add Attachment
                </label>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {attachments.length === 0 ? (
              <div className="col-span-full py-12 border-2 border-dashed rounded-xl text-center">
                <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground font-medium">No legal documents attached yet.</p>
              </div>
            ) : (
              attachments.map((file) => (
                <div key={file.id} className="group p-4 bg-muted/20 border border-border/50 rounded-xl hover:border-primary/30 hover:bg-muted/40 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="p-2 bg-background rounded-lg border shadow-sm">
                      <FileUp className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">{file.fileName}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">
                        {format(new Date(file.uploadDate || file.created_at), "dd MMM yyyy, HH:mm")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => window.open(file.fileData, '_blank')}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {isClosed && (
        <div className="bg-destructive/10 border-2 border-destructive/20 p-6 rounded-xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Lock className="h-6 w-6 text-destructive mt-0.5 shrink-0" />
          <div>
            <h4 className="font-black text-destructive text-lg uppercase tracking-tight">Case Record Locked</h4>
            <p className="text-destructive/80 font-bold leading-tight">
              This legal case has been closed and the record is now read-only to maintain data integrity. 
              Only new document attachments are permitted to be added.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
