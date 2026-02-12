import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Loader2 } from "lucide-react";
import type { ServiceTemplate } from "@/types/serviceTemplate";
import { chartOfAccountsAPI } from "@/services/api";
import { SearchableSelect } from "@/components/ui/searchable-select";

const serviceTemplateSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  defaultAmount: z.string().min(0, "Amount must be positive"),
  isTaxable: z.boolean().default(false),
  billingMethod: z.enum(["included_in_rental", "charged_separately"]),
  description: z.string().optional(),
  category: z.string().optional(),
  sortOrder: z.string().optional(),
  accountId: z.string().optional(),
});

type ServiceTemplateFormData = z.infer<typeof serviceTemplateSchema>;

interface ServiceTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: ServiceTemplate | null;
  mode: "create" | "edit";
}

export default function ServiceTemplateForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: ServiceTemplateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ServiceTemplateFormData>({
    resolver: zodResolver(serviceTemplateSchema),
    defaultValues: {
      name: "",
      defaultAmount: "0",
      isTaxable: false,
      billingMethod: "charged_separately",
      description: "",
      category: "Custom",
      sortOrder: "0",
      accountId: "",
    },
  });

  const isTaxable = watch("isTaxable");
  const billingMethod = watch("billingMethod");

  // Accounts state
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = React.useState(false);

  // Fetch accounts when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLoadingAccounts(true);
      chartOfAccountsAPI.getAll({ limit: 1000 })
        .then((response) => {
          const data = response.data?.data?.accounts || response.data?.data || [];
          setAccounts(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Error fetching accounts:", err);
          setAccounts([]);
        })
        .finally(() => setLoadingAccounts(false));
    }
  }, [isOpen]);

  // Reset form when modal opens with initial data
  React.useEffect(() => {
    if (isOpen && initialData) {
      reset({
        name: initialData.name,
        defaultAmount: initialData.defaultAmount.toString(),
        isTaxable: initialData.isTaxable,
        billingMethod: initialData.billingMethod,
        description: initialData.description || "",
        category: initialData.category || "Custom",
        sortOrder: initialData.sortOrder?.toString() || "0",
        accountId: initialData.accountId ? initialData.accountId.toString() : "",
      });
    } else if (isOpen) {
      reset({
        name: "",
        defaultAmount: "0",
        isTaxable: false,
        billingMethod: "charged_separately",
        description: "",
        category: "Custom",
        sortOrder: "0",
        accountId: "",
      });
    }
  }, [isOpen, initialData, reset]);

  const handleFormSubmit = (data: ServiceTemplateFormData) => {
    const formattedData = {
      ...data,
      defaultAmount: parseFloat(data.defaultAmount) || 0,
      sortOrder: parseInt(data.sortOrder || "0"),
      accountId: data.accountId ? parseInt(data.accountId as string) : null,
    };
    onSubmit(formattedData);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "create" ? "Create Service Template" : "Edit Service Template"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "create"
              ? "Create a reusable service template for leases and units"
              : "Update the service template details"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Service Name */}
          <div>
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Security Deposit, Parking Fee"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Default Amount and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="defaultAmount">Default Amount (AED)</Label>
              <Input
                id="defaultAmount"
                type="number"
                step="0.01"
                {...register("defaultAmount")}
                placeholder="0.00"
                className={errors.defaultAmount ? "border-red-500" : ""}
              />
              {errors.defaultAmount && (
                <p className="text-sm text-red-500 mt-1">{errors.defaultAmount.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Set to 0 for variable amounts
              </p>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={watch("category")}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAE Mandatory">UAE Mandatory</SelectItem>
                  <SelectItem value="Optional">Optional</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Billing Method */}
          <div>
            <Label htmlFor="billingMethod">Billing Method</Label>
            <Select
              value={billingMethod}
              onValueChange={(value: any) => setValue("billingMethod", value)}
            >
              <SelectTrigger id="billingMethod">
                <SelectValue placeholder="Select billing method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="included_in_rental">Included in Rental</SelectItem>
                <SelectItem value="charged_separately">Charged Separately</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {billingMethod === "included_in_rental"
                ? "This charge will be included in the rental amount"
                : "This charge will be billed separately"}
            </p>
          </div>

          {/* Account Ledger */}
          <div>
            <Label htmlFor="accountId">Account Ledger</Label>
            {loadingAccounts ? (
              <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading accounts...
              </div>
            ) : (
              <SearchableSelect
                value={watch("accountId") || ""}
                onValueChange={(value) => setValue("accountId", value)}
                placeholder="Select account (optional)"
                searchPlaceholder="Search accounts..."
                emptyMessage="No accounts found"
                options={[
                  { value: "", label: "No account linked" },
                  ...accounts.map((account: any) => ({
                    value: account.id.toString(),
                    label: `${account.accountCode} - ${account.accountName}`,
                  })),
                ]}
              />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Link this service to a Chart of Accounts entry for financial tracking
            </p>
          </div>

          {/* Taxable Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isTaxable"
              checked={isTaxable}
              onCheckedChange={(checked) => setValue("isTaxable", !!checked)}
            />
            <Label htmlFor="isTaxable" className="cursor-pointer">
              This service is taxable (UAE VAT will be applied)
            </Label>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Optional description for this service template"
              rows={3}
            />
          </div>

          {/* Sort Order */}
          <div>
            <Label htmlFor="sortOrder">Display Order</Label>
            <Input
              id="sortOrder"
              type="number"
              {...register("sortOrder")}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lower numbers appear first
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              {mode === "create" ? "Create Template" : "Update Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
