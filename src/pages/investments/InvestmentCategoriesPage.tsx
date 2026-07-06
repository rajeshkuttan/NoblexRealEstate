import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { NobleXPageHeader } from "@/components/noblex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { investmentsAPI } from "@/services/api";
import { categorySchema, type CategoryFormValues } from "@/lib/investmentSchemas";
import { toast } from "sonner";

type Category = {
  id: number;
  code: string;
  name: string;
  assetClass?: string;
  isActive: boolean;
};

export default function InvestmentCategoriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { code: "", name: "", assetClass: "equity" },
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["investment-categories"],
    queryFn: async () => {
      const res = await investmentsAPI.getCategories();
      return (res.data?.data || []) as Category[];
    },
  });

  const onCreate = async (values: CategoryFormValues) => {
    try {
      await investmentsAPI.createCategory({
        code: values.code.trim(),
        name: values.name.trim(),
        assetClass: values.assetClass,
        isActive: true,
      });
      toast.success(t("investments.toast.categoryCreated"));
      reset({ code: "", name: "", assetClass: "equity" });
      queryClient.invalidateQueries({ queryKey: ["investment-categories"] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Failed to create category");
    }
  };

  const deactivate = async (id: number) => {
    try {
      await investmentsAPI.deleteCategory(id);
      toast.success(t("investments.toast.categoryDeactivated"));
      queryClient.invalidateQueries({ queryKey: ["investment-categories"] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Failed to deactivate category");
    }
  };

  return (
    <div className="space-y-6 p-1">
      <NobleXPageHeader
        title={t("investments.categories.title")}
        subtitle={t("investments.categories.subtitle")}
      />

      <form onSubmit={handleSubmit(onCreate)} className="rounded-lg border border-noblex-border bg-noblex-surface p-4 grid gap-4 sm:grid-cols-4 items-end">
        <div>
          <Label>Code</Label>
          <Input className="mt-1" {...register("code")} placeholder="EQ-ETF" />
          {errors.code && <p className="text-xs text-rose-400 mt-1">{errors.code.message}</p>}
        </div>
        <div>
          <Label>Name</Label>
          <Input className="mt-1" {...register("name")} placeholder="Equity ETFs" />
          {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label>Asset class</Label>
          <select {...register("assetClass")} className="mt-1 w-full rounded-md border border-noblex-border bg-noblex-midnight px-3 py-2 text-sm h-10">
            <option value="equity">Equity</option>
            <option value="fixed_income">Fixed income</option>
            <option value="fund">Fund</option>
            <option value="commodities">Commodities</option>
            <option value="real_estate">Real estate</option>
            <option value="other">Other</option>
          </select>
          {errors.assetClass && <p className="text-xs text-rose-400 mt-1">{errors.assetClass.message}</p>}
        </div>
        <Button type="submit" variant="noblex-primary" disabled={isSubmitting}>
          Add category
        </Button>
      </form>

      <div className="rounded-lg border border-noblex-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Asset class</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4}>Loading…</TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={4}>No categories yet.</TableCell></TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.assetClass || "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-rose-400" onClick={() => deactivate(c.id)}>
                      Deactivate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
