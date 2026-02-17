import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersAPI } from "@/services/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "manager", "agent", "finance_manager", "finance_executive", "operations_executive", "maintenance_contractor", "tenant", "viewer"]),
  password: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: any;
  mode: "create" | "edit";
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UserForm({ user, mode, onSuccess, onCancel }: UserFormProps) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors }, reset, watch } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "agent",
      isActive: true,
      phone: "",
      password: ""
    }
  });

  useEffect(() => {
    if (user && mode === "edit") {
      reset({
        name: user.name,
        email: user.email,
        role: (user.role || "agent").toLowerCase().trim(),
        isActive: user.isActive,
        phone: user.phone || ""
      });
    } else {
        reset({
            name: "",
            email: "",
            role: "agent",
            isActive: true,
            phone: "",
            password: ""
        });
    }
  }, [user, mode, reset]);

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
        if (!updateData.password) delete updateData.password; // Don't send empty password
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

  const selectedRole = watch("role");

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
          <Select 
            value={selectedRole} 
            onValueChange={(value: any) => setValue("role", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="finance_manager">Finance Manager</SelectItem>
              <SelectItem value="finance_executive">Finance Executive</SelectItem>
              <SelectItem value="operations_executive">Operations Executive</SelectItem>
              <SelectItem value="maintenance_contractor">Maintenance Contractor</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="isActive">Status</Label>
          <Select 
            defaultValue={mode === "create" ? "true" : user?.isActive ? "true" : "false"}
            onValueChange={(value) => setValue("isActive", value === "true")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
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
