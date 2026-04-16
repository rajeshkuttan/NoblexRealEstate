import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Optional alphanumeric + common punctuation (addresses, codes) */
const OPTIONAL_ALPHANUMISH = /^[a-zA-Z0-9\s\-.,#/()]*$/;
const optionalAlphanumish = (fieldLabel: string) =>
  z
    .string()
    .refine((val) => val === "" || OPTIONAL_ALPHANUMISH.test(val), {
      message: `${fieldLabel}: only letters, numbers, spaces, and common punctuation (- . , / # ( ))`,
    });

const tenantFormSchema = z.object({
  // Personal Information
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  accountCode: optionalAlphanumish("Account code"),
  emiratesId: z.string().optional(),
  nationality: z.string().optional(),
  visaStatus: z.enum(["resident", "tourist", "visit", "work", "student"]).optional(),

  // Professional Information
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  salary: z.string().optional(),
  employer: z.string().optional(),
  vatRegNo: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val == null || String(val).trim() === "") return true;
        const digits = String(val).replace(/\D/g, "");
        return digits.length === 15;
      },
      { message: "UAE VAT TRN must be exactly 15 digits (FTA)" },
    ),

  // Emergency Contact
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),

  // Address Information
  address: optionalAlphanumish("Street"),
  buildingNo: optionalAlphanumish("Building No"),
  poBox: optionalAlphanumish("PO Box"),
  city: optionalAlphanumish("City"),
  telephone: optionalAlphanumish("Telephone"),
  fax: optionalAlphanumish("Fax"),
  emirate: z.enum(["dubai", "abu_dhabi", "sharjah", "ajman", "ras_al_khaimah", "fujairah", "umm_al_quwain"]).optional(),
  postalCode: optionalAlphanumish("Postal code"),

  // Additional Information
  notes: z.string().optional(),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

const nationalities = [
  "UAE", "Saudi Arabia", "India", "Pakistan", "Bangladesh", "Philippines", "Egypt", "Jordan",
  "United Kingdom", "United States", "Canada", "Australia", "Germany", "France", "China", "Other"
];

const emirates = [
  { value: "dubai", label: "Dubai" },
  { value: "abu_dhabi", label: "Abu Dhabi" },
  { value: "sharjah", label: "Sharjah" },
  { value: "ajman", label: "Ajman" },
  { value: "ras_al_khaimah", label: "Ras Al Khaimah" },
  { value: "fujairah", label: "Fujairah" },
  { value: "umm_al_quwain", label: "Umm Al Quwain" },
];

interface TenantFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  mode: "create" | "edit";
}

export default function TenantForm({ isOpen, onClose, onSubmit, initialData, mode }: TenantFormProps) {
  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      accountCode: "",
      emiratesId: "",
      nationality: "",
      visaStatus: "resident",
      company: "",
      jobTitle: "",
      salary: "",
      employer: "",
      vatRegNo: "",
      emergencyContact: "",
      emergencyPhone: "",
      address: "",
      buildingNo: "",
      poBox: "",
      city: "",
      telephone: "",
      fax: "",
      emirate: "dubai",
      postalCode: "",
      notes: "",
    },
  });

  // Load edit data when modal opens in edit mode
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && initialData) {
      setTimeout(() => {
        const src = initialData as Record<string, unknown>;
        form.reset({
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          accountCode: String(src.accountCode ?? src.account_code ?? "") || "",
          emiratesId: initialData.emiratesId || "",
          nationality: initialData.nationality || "",
          visaStatus: initialData.visaStatus || "resident",
          company: initialData.company || "",
          jobTitle: initialData.jobTitle || "",
          salary: initialData.salary?.toString() || "",
          employer: initialData.employer || "",
          vatRegNo: String(src.vatRegNo ?? src.vat_reg_no ?? "") || "",
          emergencyContact: initialData.emergencyContact || "",
          emergencyPhone: initialData.emergencyPhone || "",
          address: initialData.address || "",
          buildingNo: String(src.buildingNo ?? src.building_no ?? "") || "",
          poBox: String(src.poBox ?? src.po_box ?? "") || "",
          city: initialData.city || "",
          telephone: String(src.telephone ?? "") || "",
          fax: String(src.fax ?? "") || "",
          emirate: initialData.emirate || "dubai",
          postalCode: initialData.postalCode || "",
          notes: initialData.notes || "",
        });
      }, 150);
    } else if (mode === "create") {
      form.reset({
        name: "",
        email: "",
        phone: "",
        accountCode: "",
        emiratesId: "",
        nationality: "",
        visaStatus: "resident",
        company: "",
        jobTitle: "",
        salary: "",
        employer: "",
        vatRegNo: "",
        emergencyContact: "",
        emergencyPhone: "",
        address: "",
        buildingNo: "",
        poBox: "",
        city: "",
        telephone: "",
        fax: "",
        emirate: "dubai",
        postalCode: "",
        notes: "",
      });
    }
  }, [isOpen, mode, initialData, form]);

  const emptyToNull = (s: string | undefined) =>
    s != null && String(s).trim() !== "" ? String(s).trim() : null;

  const handleSubmit = (data: TenantFormData) => {
    const vatDigits =
      data.vatRegNo != null && String(data.vatRegNo).trim() !== ""
        ? String(data.vatRegNo).replace(/\D/g, "")
        : null;
    const formData = {
      ...data,
      salary: data.salary ? parseFloat(data.salary) : null,
      accountCode: emptyToNull(data.accountCode),
      buildingNo: emptyToNull(data.buildingNo),
      poBox: emptyToNull(data.poBox),
      city: emptyToNull(data.city),
      telephone: emptyToNull(data.telephone),
      fax: emptyToNull(data.fax),
      address: emptyToNull(data.address),
      postalCode: emptyToNull(data.postalCode),
      vatRegNo: vatDigits && vatDigits.length === 15 ? vatDigits : null,
    };
    onSubmit(formData);
    onClose();
  };

  console.log("🔍 TenantForm render:", { isOpen, mode, hasInitialData: !!initialData });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mode === "create" ? "Add New Tenant" : "Edit Tenant"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "create" 
              ? "Add tenant personal information. Property assignment will be done when creating a lease." 
              : "Update tenant personal information"}
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="contact">Contact & Address</TabsTrigger>
            </TabsList>

            {/* Personal Information */}
            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="e.g., Ahmed Mohammed Al Maktoum"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="ahmed@example.com"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    placeholder="+971 50 123 4567"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="emiratesId">Emirates ID</Label>
                  <Input
                    id="emiratesId"
                    {...form.register("emiratesId")}
                    placeholder="784-1990-1234567-1"
                  />
                  {form.formState.errors.emiratesId && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.emiratesId.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Select
                    value={form.watch("nationality")}
                    onValueChange={(value) => form.setValue("nationality", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      {nationalities.map((nat) => (
                        <SelectItem key={nat} value={nat}>
                          {nat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="visaStatus">Visa Status</Label>
                  <Select
                    value={form.watch("visaStatus")}
                    onValueChange={(value) => form.setValue("visaStatus", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resident">Resident</SelectItem>
                      <SelectItem value="tourist">Tourist</SelectItem>
                      <SelectItem value="visit">Visit Visa</SelectItem>
                      <SelectItem value="work">Work Visa</SelectItem>
                      <SelectItem value="student">Student Visa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="accountCode">Account code</Label>
                  <Input
                    id="accountCode"
                    {...form.register("accountCode")}
                    placeholder="Optional alphanumeric"
                  />
                  {form.formState.errors.accountCode && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.accountCode.message}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Professional Information */}
            <TabsContent value="professional" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    {...form.register("company")}
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    {...form.register("jobTitle")}
                    placeholder="e.g., Manager, Engineer"
                  />
                </div>

                <div>
                  <Label htmlFor="salary">Salary (AED)</Label>
                  <Input
                    id="salary"
                    {...form.register("salary")}
                    placeholder="e.g., 15000"
                    type="number"
                  />
                </div>

                <div>
                  <Label htmlFor="employer">Employer</Label>
                  <Input
                    id="employer"
                    {...form.register("employer")}
                    placeholder="Employer name"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="vatRegNo">VAT TRN (UAE FTA)</Label>
                  <Input
                    id="vatRegNo"
                    {...form.register("vatRegNo")}
                    placeholder="15 digits"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  {form.formState.errors.vatRegNo && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.vatRegNo.message}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Contact & Address */}
            <TabsContent value="contact" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Address</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="address">Street</Label>
                      <Input
                        id="address"
                        {...form.register("address")}
                        placeholder="Street, area"
                      />
                      {form.formState.errors.address && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.address.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="buildingNo">Building No</Label>
                      <Input
                        id="buildingNo"
                        {...form.register("buildingNo")}
                        placeholder="Optional"
                      />
                      {form.formState.errors.buildingNo && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.buildingNo.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="poBox">PO Box</Label>
                      <Input
                        id="poBox"
                        {...form.register("poBox")}
                        placeholder="Optional"
                      />
                      {form.formState.errors.poBox && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.poBox.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        {...form.register("city")}
                        placeholder="Optional"
                      />
                      {form.formState.errors.city && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="telephone">Telephone</Label>
                      <Input
                        id="telephone"
                        {...form.register("telephone")}
                        placeholder="Optional landline"
                      />
                      {form.formState.errors.telephone && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.telephone.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="fax">Fax</Label>
                      <Input
                        id="fax"
                        {...form.register("fax")}
                        placeholder="Optional"
                      />
                      {form.formState.errors.fax && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.fax.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="emirate">Emirate</Label>
                      <Select
                        value={form.watch("emirate")}
                        onValueChange={(value) => form.setValue("emirate", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {emirates.map((emirate) => (
                            <SelectItem key={emirate.value} value={emirate.value}>
                              {emirate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        {...form.register("postalCode")}
                        placeholder="Postal code"
                      />
                      {form.formState.errors.postalCode && (
                        <p className="text-sm text-red-500 mt-1">{form.formState.errors.postalCode.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Emergency Contact</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyContact">Name</Label>
                      <Input
                        id="emergencyContact"
                        {...form.register("emergencyContact")}
                        placeholder="Emergency contact name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyPhone">Phone</Label>
                      <Input
                        id="emergencyPhone"
                        {...form.register("emergencyPhone")}
                        placeholder="+971 50 123 4567"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    placeholder="Additional notes..."
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {mode === "create" ? "Add Tenant" : "Update Tenant"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
