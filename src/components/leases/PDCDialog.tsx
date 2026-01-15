import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X } from "lucide-react";

const pdcSchema = z.object({
  amount: z.number().min(1, "Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["pending", "received", "deposited", "cleared", "bounced"]),
});

type PDCFormData = z.infer<typeof pdcSchema>;

interface PDCEntry {
  id?: number;
  amount: number;
  dueDate: string;
  status: "pending" | "received" | "deposited" | "cleared" | "bounced";
}

interface PDCDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pdc: PDCEntry) => void;
  initialData?: PDCEntry | null;
  mode: "add" | "edit";
}

export default function PDCDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: PDCDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PDCFormData>({
    resolver: zodResolver(pdcSchema),
    defaultValues: {
      amount: 0,
      dueDate: "",
      status: "pending",
    },
  });

  const status = watch("status");

  // Reset form when modal opens with initial data
  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        amount: initialData.amount,
        dueDate: initialData.dueDate,
        status: initialData.status,
      });
    } else if (isOpen) {
      reset({
        amount: 0,
        dueDate: "",
        status: "pending",
      });
    }
  }, [isOpen, initialData, reset]);

  const handleFormSubmit = (data: PDCFormData) => {
    onSubmit(data);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {mode === "add" ? "Add PDC Entry" : "Edit PDC Entry"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {mode === "add"
              ? "Add a new post-dated cheque entry"
              : "Update the post-dated cheque details"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Amount Field */}
          <div>
            <Label htmlFor="amount">Amount (AED) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
              placeholder="85000"
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Due Date Field */}
          <div>
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              {...register("dueDate")}
              className={errors.dueDate ? "border-red-500" : ""}
            />
            {errors.dueDate && (
              <p className="text-sm text-red-500 mt-1">{errors.dueDate.message}</p>
            )}
          </div>

          {/* Status Field */}
          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={status}
              onValueChange={(value: any) => setValue("status", value)}
            >
              <SelectTrigger id="status" className={errors.status ? "border-red-500" : ""}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="deposited">Deposited</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-red-500 mt-1">{errors.status.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              {mode === "add" ? "Add PDC" : "Update PDC"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
