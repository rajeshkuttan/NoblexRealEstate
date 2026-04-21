import { useCallback, useEffect, useMemo, useState } from "react";
import { rolesAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Edit, Plus, Shield, Trash2 } from "lucide-react";
import { normalizeRoleKeyForMatch, parseStableRoleId } from "@/lib/permissions";

type Permission = {
  id: number;
  code: string;
  module: string;
  action: string;
  description?: string;
};

type Role = {
  id: number;
  name: string;
  key: string;
  description?: string;
  isSystem?: boolean;
  isActive?: boolean;
  permissions?: Permission[];
};

type RoleFormState = {
  name: string;
  key: string;
  description: string;
  permissionIds: number[];
};

const EMPTY_ROLE_FORM: RoleFormState = {
  name: "",
  key: "",
  description: "",
  permissionIds: [],
};

function formatModule(moduleKey: string) {
  return moduleKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export type RolePermissionsFocus =
  | { roleId?: number; roleKey?: string }
  | null;

type RolesPermissionsManagerProps = {
  /** When set (e.g. from Users list), opens edit dialog for that role after roles load */
  focusRole?: RolePermissionsFocus;
  onFocusHandled?: () => void;
};

export default function RolesPermissionsManager({
  focusRole,
  onFocusHandled,
}: RolesPermissionsManagerProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleFormState>(EMPTY_ROLE_FORM);

  const permissionGroups = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((permission) => {
      if (!groups[permission.module]) groups[permission.module] = [];
      groups[permission.module].push(permission);
    });
    return groups;
  }, [permissions]);

  const fetchRBAC = async () => {
    setLoading(true);
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        rolesAPI.getAllRoles(),
        rolesAPI.getPermissions(),
      ]);
      setRoles(rolesRes.data?.data?.roles || []);
      const rawPerm = permissionsRes.data?.data?.permissions;
      const normalized = Array.isArray(rawPerm)
        ? rawPerm.map((p: Permission & { id?: unknown }) => ({
            ...p,
            id: Number(p.id),
          })).filter((p) => Number.isFinite(p.id))
        : [];
      setPermissions(normalized);
    } catch (error) {
      console.error("Failed to load roles/permissions:", error);
      toast.error("Failed to load roles and permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRBAC();
  }, []);

  const openCreate = () => {
    setEditingRole(null);
    setForm(EMPTY_ROLE_FORM);
    setShowDialog(true);
  };

  const openEdit = useCallback((role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name || "",
      key: role.key || "",
      description: role.description || "",
      permissionIds: (role.permissions || []).map((p) => p.id),
    });
    setShowDialog(true);
  }, []);

  useEffect(() => {
    if (!focusRole || roles.length === 0) return;

    const id = parseStableRoleId(focusRole.roleId);
    let target: Role | undefined;
    if (id !== undefined) {
      target = roles.find((r) => r.id === id);
    }
    if (!target && focusRole.roleKey) {
      const keyNorm = normalizeRoleKeyForMatch(focusRole.roleKey);
      if (keyNorm) {
        target = roles.find((r) => normalizeRoleKeyForMatch(r.key) === keyNorm);
      }
    }

    if (target) {
      openEdit(target);
    } else {
      toast.error("Could not find this role. Open Roles & Permissions and select it manually.");
    }
    onFocusHandled?.();
  }, [focusRole, roles, openEdit, onFocusHandled]);

  const handleTogglePermission = (permissionId: number, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      permissionIds: checked
        ? [...new Set([...prev.permissionIds, permissionId])]
        : prev.permissionIds.filter((id) => id !== permissionId),
    }));
  };

  const handleSaveRole = async () => {
    if (!form.name.trim() || !form.key.trim()) {
      toast.error("Role name and key are required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      key: form.key.trim().toLowerCase(),
      description: form.description.trim(),
      permissionIds: form.permissionIds,
    };

    try {
      if (editingRole) {
        await rolesAPI.updateRole(editingRole.id, payload);
        toast.success("Role updated successfully");
      } else {
        await rolesAPI.createRole(payload);
        toast.success("Role created successfully");
      }
      setShowDialog(false);
      await fetchRBAC();
    } catch (error: any) {
      console.error("Failed to save role:", error);
      toast.error(error?.response?.data?.message || "Failed to save role");
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    try {
      await rolesAPI.deleteRole(role.id);
      toast.success("Role deleted successfully");
      await fetchRBAC();
    } catch (error: any) {
      console.error("Failed to delete role:", error);
      toast.error(error?.response?.data?.message || "Failed to delete role");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Roles & Permissions
          </CardTitle>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading roles and permissions...</div>
        ) : (
          <div className="space-y-3">
            {roles.map((role) => (
              <div key={role.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role.name}</span>
                    <Badge variant="outline">{role.key}</Badge>
                    {role.isSystem ? <Badge>System</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {role.description || "No description provided"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permissions: {(role.permissions || []).length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(role)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!role.isSystem ? (
                    <Button variant="outline" size="sm" onClick={() => handleDeleteRole(role)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <div className="p-6 pb-2 shrink-0 space-y-4">
            <DialogHeader>
              <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-key">Role Key</Label>
                <Input
                  id="role-key"
                  value={form.key}
                  disabled={!!editingRole?.isSystem}
                  onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="role-description">Description</Label>
                <Input
                  id="role-description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="border-t px-6 py-3 flex-1 min-h-0 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-base">Module permissions</Label>
              <span className="text-xs text-muted-foreground">
                {permissions.length} permission{permissions.length === 1 ? "" : "s"} in catalog
              </span>
            </div>
            <ScrollArea className="h-[min(50vh,420px)] rounded-md border">
              <div className="p-3 space-y-4 pr-4">
                {permissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No permissions were returned from the server. After refreshing, open this dialog again. If it stays empty,
                    ensure the API <code className="text-xs">GET /roles/permissions</code> succeeds and the database is
                    reachable.
                  </p>
                ) : (
                  Object.entries(permissionGroups).map(([moduleKey, modulePermissions]) => (
                    <div key={moduleKey || "unknown"} className="space-y-2">
                      <div className="font-medium text-sm">{formatModule(moduleKey || "general")}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {modulePermissions.map((permission) => {
                          const checked = form.permissionIds.includes(permission.id);
                          return (
                            <label key={permission.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => handleTogglePermission(permission.id, !!value)}
                              />
                              <span className="break-all">{permission.code}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="p-6 border-t shrink-0 bg-background">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole}>
              {editingRole ? "Update Role" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

