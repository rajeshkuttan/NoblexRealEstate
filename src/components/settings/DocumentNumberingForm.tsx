import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { documentNumberingAPI } from "@/services/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DocumentNumberingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: any;
  onSuccess: () => void;
}

const DOCUMENT_TYPES = [
  "Legal",
  "Lease",
  "Purchase Order",
  "Goods Receipt Note",
  "Purchase Invoice",
  "Payment Voucher",
  "Receipt Invoice",
  "Receipt",
  "Journal Voucher",
  "Helpdesk"
];

export default function DocumentNumberingForm({
  open,
  onOpenChange,
  config,
  onSuccess
}: DocumentNumberingFormProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!config;

  const [formData, setFormData] = useState({
    documentName: "",
    year: new Date().getFullYear(),
    currentNumber: 0,
    rangeFrom: "",
    rangeTo: "",
    prefix: "",
    suffix: "",
    yearwiseSerial: false,
    includePlotNumber: false,
    isActive: true
  });

  useEffect(() => {
    if (config && open) {
      setFormData({
        documentName: config.documentName || "",
        year: config.year || new Date().getFullYear(),
        currentNumber: config.currentNumber || 0,
        rangeFrom: config.rangeFrom || "",
        rangeTo: config.rangeTo || "",
        prefix: config.prefix || "",
        suffix: config.suffix || "",
        yearwiseSerial: config.yearwiseSerial || false,
        includePlotNumber: config.includePlotNumber || false,
        isActive: config.isActive !== undefined ? config.isActive : true
      });
    } else if (open) {
      setFormData({
        documentName: "",
        year: new Date().getFullYear(),
        currentNumber: 0,
        rangeFrom: "",
        rangeTo: "",
        prefix: "",
        suffix: "",
        yearwiseSerial: false,
        includePlotNumber: false,
        isActive: true
      });
    }
  }, [config, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.documentName) {
      toast.error("Document name is required");
      return;
    }

    setLoading(true);
    try {
      const payload: any = { ...formData };
      if (payload.rangeFrom === "") payload.rangeFrom = null;
      if (payload.rangeTo === "") payload.rangeTo = null;
      if (payload.year === "") payload.year = null;

      if (isEdit) {
        await documentNumberingAPI.update(config.id, payload);
        toast.success("Document numbering updated successfully");
      } else {
        await documentNumberingAPI.create(payload);
        toast.success("Document numbering created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving document numbering:", error);
      toast.error(error.response?.data?.message || "Failed to save document numbering");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Document Numbering" : "New Document Numbering"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Header Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentName">Document Name *</Label>
                  <Select 
                    value={formData.documentName} 
                    onValueChange={(value) => setFormData({...formData, documentName: value})}
                  >
                    <SelectTrigger id="documentName">
                      <SelectValue placeholder="Select Document Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Detail Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefix</Label>
                  <Input 
                    id="prefix" 
                    value={formData.prefix}
                    onChange={(e) => setFormData({...formData, prefix: e.target.value})}
                    placeholder="e.g. INV"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suffix">Suffix</Label>
                  <Input 
                    id="suffix" 
                    value={formData.suffix}
                    onChange={(e) => setFormData({...formData, suffix: e.target.value})}
                    placeholder="e.g. DXB"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentNumber">Current Number</Label>
                  <Input 
                    id="currentNumber" 
                    type="number"
                    min="0"
                    value={formData.currentNumber}
                    onChange={(e) => setFormData({...formData, currentNumber: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input 
                    id="year" 
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value) || new Date().getFullYear()})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rangeFrom">Range From</Label>
                  <Input 
                    id="rangeFrom" 
                    type="number"
                    min="0"
                    value={formData.rangeFrom}
                    onChange={(e) => setFormData({...formData, rangeFrom: e.target.value})}
                    placeholder="Optional starting range"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rangeTo">Range To</Label>
                  <Input 
                    id="rangeTo" 
                    type="number"
                    min="0"
                    value={formData.rangeTo}
                    onChange={(e) => setFormData({...formData, rangeTo: e.target.value})}
                    placeholder="Optional ending range"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="yearwiseSerial">Yearwise Serial</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch 
                      id="yearwiseSerial" 
                      checked={formData.yearwiseSerial}
                      onCheckedChange={(checked) => setFormData({...formData, yearwiseSerial: checked})}
                    />
                    <span className="text-sm font-medium">{formData.yearwiseSerial ? 'Yes' : 'No'}</span>
                    <span className="text-xs text-muted-foreground ml-2">(Resets sequence every year)</span>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <Label htmlFor="includePlotNumber">Include Plot Number</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      id="includePlotNumber"
                      checked={formData.includePlotNumber}
                      onCheckedChange={(checked) => setFormData({...formData, includePlotNumber: checked})}
                    />
                    <span className="text-sm font-medium">{formData.includePlotNumber ? 'Yes' : 'No'}</span>
                    <span className="text-xs text-muted-foreground ml-2">(Adds property plot number when available)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="isActive">Active Status</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch 
                      id="isActive" 
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    />
                    <span className="text-sm font-medium">{formData.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
