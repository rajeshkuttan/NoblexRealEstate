import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rolesAPI, usersAPI } from "@/services/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type RoleOption = {
  id: number;
  key: string;
  name: string;
};

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
  password: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  roleId: z.number().nullable().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

function normalizeRoleForForm(
  role: unknown,
  roleId: unknown,
  availableRoles: RoleOption[],
): { roleKey: string; roleId: number | null } {
  if (typeof roleId === "number") {
    const byId = availableRoles.find((item) => item.id === roleId);
    if (byId) {
      return { roleKey: byId.key, roleId: byId.id };
    }
  }

  const roleKey = typeof role === "string" ? role.toLowerCase().trim() : "";
  const byKey = availableRoles.find((item) => item.key === roleKey);
  if (byKey) {
    return { roleKey: byKey.key, roleId: byKey.id };
  }

  const fallback = availableRoles[0];
  return {
    roleKey: fallback?.key || "",
    roleId: fallback?.id || null,
  };
}

function readIsActive(user: Record<string, unknown> | undefined): boolean {
  if (!user) return true;
  if (typeof user.isActive === "boolean") return user.isActive;
  if (typeof user.is_active === "boolean") return user.is_active;
  return true;
}

interface UserFormProps {
  user?: any;
  mode: "create" | "edit";
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UserForm({ user, mode, onSuccess, onCancel }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "agent",
      roleId: null,
      isActive: true,
      phone: "",
      password: "",
    },
  });

  useEffect(() => {
    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await rolesAPI.getAllRoles();
        const apiRoles = response.data?.data?.roles || [];
        const mappedRoles = apiRoles
          .filter((role: any) => role?.isActive !== false)
          .map((role: any) => ({
            id: Number(role.id),
            key: String(role.key),
            name: String(role.name || role.key),
          }));
        setRoles(mappedRoles);
      } catch (error) {
        console.error("Error loading roles:", error);
        toast.error("Failed to load roles");
      } finally {
        setLoadingRoles(false);
      }
    };
    loadRoles();
  }, []);

  useEffect(() => {
    if (roles.length === 0) return;
    if (user && mode === "edit") {
      const u = user as Record<string, unknown>;
      const normalized = normalizeRoleForForm((user as any).role, (user as any).roleId, roles);
      reset({
        name: String(user.name ?? ""),
        email: String(user.email ?? ""),
        role: normalized.roleKey,
        roleId: normalized.roleId,
        isActive: readIsActive(u),
        phone: String(user.phone ?? ""),
        password: "",
      });
    } else {
      const fallbackRole = roles[0];
      reset({
        name: "",
        email: "",
        role: fallbackRole?.key || "",
        roleId: fallbackRole?.id || null,
        isActive: true,
        phone: "",
        password: "",
      });
    }
  }, [user, mode, reset, roles]);

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    try {
      if (mode === "create") {
        if (!data.password) {
          toast.error("Password is required for new users");
          setLoading(false);
          return;
        }
        await usersAPI.create(data);
        toast.success("User created successfully");
      } else {
        const updateData = { ...data };
        if (!updateData.password) delete updateData.password;
        await usersAPI.update(user.id, updateData);
        toast.success("User updated successfully");
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error(error.response?.data?.message || "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} disabled={mode === "edit"} />
          {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password {mode === "edit" && "(Leave blank to keep current)"}</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  const selectedRole = roles.find((role) => role.key === value);
                  setValue("roleId", selectedRole?.id || null);
                }}
                disabled={loadingRoles}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select role"} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.key}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="isActive">Status</Label>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value === false ? "false" : "true"}
                onValueChange={(value) => field.onChange(value === "true")}
              >
                <SelectTrigger id="isActive">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create User" : "Update User"}
        </Button>
      </div>
    </form>
  );
}
