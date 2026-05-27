import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Plus, RefreshCw } from "lucide-react";
import { companySettingsAPI, usersAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import {
  COMPANY_SETTINGS_ASSIGN_USERS,
  COMPANY_SETTINGS_AUDIT,
} from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ListPagination } from "@/components/common/ListPagination";
import { Switch } from "@/components/ui/switch";

const EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];

const emptyForm = () => ({
  companyName: "",
  companyNameArabic: "",
  tradeLicense: "",
  commercialRegister: "",
  taxNumber: "",
  vatNumber: "",
  address: "",
  city: "",
  emirate: "Dubai" as string,
  postalCode: "",
  country: "UAE",
  phone: "",
  email: "",
  website: "",
  currency: "AED",
  timezone: "Asia/Dubai",
  language: "en",
  fiscalYearStart: "",
  fiscalYearEnd: "",
  contractTerminology: "Ejari",
  isActive: true,
});

type CompanyRow = {
  id: number;
  companyName: string;
  companyNameArabic?: string;
  emirate?: string;
  vatNumber?: string;
  currency?: string;
  isActive: boolean;
  userCount?: number;
};

type CompanyUserRow = {
  id: number;
  userId: number;
  roleInCompany?: string;
  isDefault: boolean;
  isActive: boolean;
  user?: { id: number; name: string; email: string };
};

export default function CompanySettingsAdmin() {
  const { can, user } = useAuth();
  const { companies: myCompanies, activeCompanyId, refreshCompanies } = useCompany();
  const canAssign = can(COMPANY_SETTINGS_ASSIGN_USERS);
  const canAudit = can(COMPANY_SETTINGS_AUDIT);
  const canCreate = can("module:company_settings:create");
  const canUpdate = can("module:company_settings:update");

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState("profile");
  const [form, setForm] = useState(emptyForm());
  const [isNew, setIsNew] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<CompanyUserRow[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState("");
  const [assignDefault, setAssignDefault] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<number | null>(null);
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(10);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditAction, setAuditAction] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditUserId, setAuditUserId] = useState("");

  const loadCompanies = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await companySettingsAPI.getAll();
      setCompanies(res.data?.data ?? []);
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to load companies"
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    try {
      const res = await companySettingsAPI.getById(id);
      const d = res.data?.data;
      if (!d) return;
      setForm({
        companyName: d.companyName ?? "",
        companyNameArabic: d.companyNameArabic ?? "",
        tradeLicense: d.tradeLicense ?? "",
        commercialRegister: d.commercialRegister ?? "",
        taxNumber: d.taxNumber ?? "",
        vatNumber: d.vatNumber ?? "",
        address: d.address ?? "",
        city: d.city ?? "",
        emirate: d.emirate ?? "Dubai",
        postalCode: d.postalCode ?? "",
        country: d.country ?? "UAE",
        phone: d.phone ?? "",
        email: d.email ?? "",
        website: d.website ?? "",
        currency: d.currency ?? "AED",
        timezone: d.timezone ?? "Asia/Dubai",
        language: d.language ?? "en",
        fiscalYearStart: d.fiscalYearStart ?? "",
        fiscalYearEnd: d.fiscalYearEnd ?? "",
        contractTerminology: d.contractTerminology ?? "Ejari",
        isActive: d.isActive !== false,
      });
      setIsNew(false);
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to load company"
      );
    }
  }, []);

  const loadUsers = useCallback(async (id: number) => {
    if (!canAssign) return;
    try {
      const res = await companySettingsAPI.getUsers(id);
      setCompanyUsers(res.data?.data ?? []);
    } catch {
      setCompanyUsers([]);
    }
  }, [canAssign]);

  const loadAudit = useCallback(async () => {
    if (!selectedId || !canAudit) return;
    try {
      const res = await companySettingsAPI.getAudit(selectedId, {
        page: auditPage,
        limit: auditLimit,
        ...(auditAction ? { action: auditAction } : {}),
        ...(auditUserId ? { user_id: auditUserId } : {}),
        ...(auditFrom ? { from_date: auditFrom } : {}),
        ...(auditTo ? { to_date: auditTo } : {}),
      });
      setAuditRows(res.data?.data ?? []);
      const p = res.data?.pagination;
      setAuditTotal(p?.totalItems ?? p?.total ?? 0);
    } catch {
      setAuditRows([]);
    }
  }, [selectedId, canAudit, auditPage, auditLimit, auditAction, auditUserId, auditFrom, auditTo]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    usersAPI.getAll({ limit: 500 }).then((res) => {
      const list = res.data?.data?.users ?? res.data?.data ?? [];
      setAllUsers(
        (Array.isArray(list) ? list : []).map((u: { id: number; name: string; email: string }) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }))
      );
    }).catch(() => setAllUsers([]));
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
      loadUsers(selectedId);
    }
  }, [selectedId, loadDetail, loadUsers]);

  useEffect(() => {
    if (detailTab === "audit") loadAudit();
  }, [detailTab, loadAudit]);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setDetailTab("profile");
  };

  const handleNew = () => {
    setSelectedId(null);
    setIsNew(true);
    setForm(emptyForm());
    setDetailTab("profile");
    setCompanyUsers([]);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    try {
      if (isNew) {
        if (!canCreate) {
          toast.error("No permission to create companies");
          return;
        }
        const res = await companySettingsAPI.create(form);
        const created = res.data?.data;
        toast.success("Company created");
        await loadCompanies();
        if (created?.id) handleSelect(created.id);
      } else if (selectedId) {
        if (!canUpdate) {
          toast.error("No permission to update companies");
          return;
        }
        await companySettingsAPI.updateById(selectedId, form);
        toast.success("Company updated");
        await loadCompanies();
        await loadDetail(selectedId);
      }
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Save failed"
      );
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedId) return;
    const next = !form.isActive;
    if (!next) {
      setConfirmDeactivate(true);
      return;
    }
    try {
      await companySettingsAPI.patchStatus(selectedId, true);
      toast.success("Company activated");
      await loadCompanies();
      await loadDetail(selectedId);
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Status update failed"
      );
    }
  };

  const confirmDeactivateCompany = async () => {
    if (!selectedId) return;
    try {
      await companySettingsAPI.patchStatus(selectedId, false);
      toast.success("Company deactivated");
      setConfirmDeactivate(false);
      await loadCompanies();
      await loadDetail(selectedId);
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Cannot deactivate company"
      );
    }
  };

  const handleAssign = async () => {
    if (!selectedId || !assignUserId) return;
    try {
      await companySettingsAPI.assignUser(selectedId, {
        userId: Number(assignUserId),
        roleInCompany: assignRole || undefined,
        isDefault: assignDefault,
      });
      toast.success("User assigned");
      setAssignUserId("");
      setAssignRole("");
      setAssignDefault(false);
      await loadUsers(selectedId);
      await loadCompanies();
      if (Number(assignUserId) === user?.id) await refreshCompanies();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Assign failed"
      );
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!selectedId) return;
    try {
      await companySettingsAPI.removeUser(selectedId, userId);
      toast.success("User removed");
      setConfirmRemoveUserId(null);
      await loadUsers(selectedId);
      await loadCompanies();
      if (userId === user?.id) await refreshCompanies();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Remove failed"
      );
    }
  };

  const handleSetDefault = async (userId: number) => {
    if (!selectedId) return;
    try {
      await companySettingsAPI.setUserDefault(selectedId, userId);
      toast.success("Default company updated");
      await loadUsers(selectedId);
      if (userId === user?.id) await refreshCompanies();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to set default"
      );
    }
  };

  const defaultForMe = (id: number) =>
    myCompanies.some((c) => c.id === id && c.is_default);

  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="uiux-page-title flex items-center gap-2">
            <Building2 className="h-7 w-7" />
            Company management
          </h1>
          <p className="uiux-page-subtitle">
            Legal entities, user assignments, and company audit trail.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadCompanies()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              New company
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings">Back to settings</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Companies</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingList ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer ${selectedId === c.id ? "bg-muted/60" : ""}`}
                      onClick={() => handleSelect(c.id)}
                    >
                      <TableCell>
                        <div className="font-medium">{c.companyName}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.emirate}
                          {defaultForMe(c.id) ? " · default for you" : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            c.isActive ? "text-green-600 text-xs" : "text-muted-foreground text-xs"
                          }
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base">
              {isNew ? "New company" : selectedId ? form.companyName || "Company" : "Select a company"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedId && !isNew ? (
              <p className="text-sm text-muted-foreground">
                Select a company from the list or create a new one.
              </p>
            ) : (
              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  {canAssign && <TabsTrigger value="users">Users</TabsTrigger>}
                  {canAudit && <TabsTrigger value="audit">Audit</TabsTrigger>}
                </TabsList>

                <TabsContent value="profile" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Company name</Label>
                      <Input
                        value={form.companyName}
                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Arabic name</Label>
                      <Input
                        value={form.companyNameArabic}
                        onChange={(e) => setForm({ ...form, companyNameArabic: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Emirate</Label>
                      <Select
                        value={form.emirate}
                        onValueChange={(v) => setForm({ ...form, emirate: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EMIRATES.map((e) => (
                            <SelectItem key={e} value={e}>
                              {e}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>VAT number</Label>
                      <Input
                        value={form.vatNumber}
                        onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Input
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Fiscal year start</Label>
                      <Input
                        type="date"
                        value={form.fiscalYearStart}
                        onChange={(e) => setForm({ ...form, fiscalYearStart: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Fiscal year end</Label>
                      <Input
                        type="date"
                        value={form.fiscalYearEnd}
                        onChange={(e) => setForm({ ...form, fiscalYearEnd: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/settings/company-finance-config">
                          Company finance configuration
                        </Link>
                      </Button>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Email</Label>
                      <Input
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Trade license</Label>
                      <Input
                        value={form.tradeLicense}
                        onChange={(e) => setForm({ ...form, tradeLicense: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Contract terminology</Label>
                      <Input
                        value={form.contractTerminology}
                        onChange={(e) =>
                          setForm({ ...form, contractTerminology: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {!isNew && canUpdate && (
                    <div className="flex items-center gap-2 pt-2">
                      <Switch checked={form.isActive} onCheckedChange={handleToggleStatus} />
                      <Label>Active</Label>
                      {selectedId === activeCompanyId && !form.isActive && (
                        <span className="text-xs text-amber-600">Currently selected in header</span>
                      )}
                    </div>
                  )}

                  {(canCreate || canUpdate) && (
                    <Button onClick={handleSave}>Save company</Button>
                  )}
                </TabsContent>

                {canAssign && (
                  <TabsContent value="users" className="space-y-4 mt-4">
                    <div className="flex flex-wrap gap-2 items-end border rounded-md p-3">
                      <div className="min-w-[12rem]">
                        <Label>User</Label>
                        <Select value={assignUserId} onValueChange={setAssignUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            {allUsers.map((u) => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                {u.name} ({u.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Role in company</Label>
                        <Input
                          value={assignRole}
                          onChange={(e) => setAssignRole(e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-2">
                        <Switch checked={assignDefault} onCheckedChange={setAssignDefault} />
                        <Label>Default</Label>
                      </div>
                      <Button onClick={handleAssign} disabled={!assignUserId}>
                        Assign
                      </Button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Default</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companyUsers.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              {row.user?.name ?? row.userId}
                              <div className="text-xs text-muted-foreground">
                                {row.user?.email}
                              </div>
                            </TableCell>
                            <TableCell>{row.roleInCompany || "—"}</TableCell>
                            <TableCell>{row.isDefault ? "Yes" : "No"}</TableCell>
                            <TableCell className="space-x-2">
                              {!row.isDefault && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetDefault(row.userId)}
                                >
                                  Set default
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setConfirmRemoveUserId(row.userId)}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                )}

                {canAudit && (
                  <TabsContent value="audit" className="space-y-4 mt-4">
                    <div className="flex flex-wrap gap-2 items-end">
                      <div>
                        <Label>Action</Label>
                        <Input
                          value={auditAction}
                          onChange={(e) => setAuditAction(e.target.value)}
                          placeholder="e.g. COMPANY_SWITCHED"
                        />
                      </div>
                      <div>
                        <Label>User ID</Label>
                        <Input value={auditUserId} onChange={(e) => setAuditUserId(e.target.value)} />
                      </div>
                      <div>
                        <Label>From</Label>
                        <Input type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} />
                      </div>
                      <div>
                        <Label>To</Label>
                        <Input type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} />
                      </div>
                      <Button variant="outline" onClick={() => loadAudit()}>
                        Filter
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>When</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditRows.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {log.createdAt
                                ? new Date(log.createdAt).toLocaleString()
                                : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{log.action}</TableCell>
                            <TableCell className="text-xs">
                              {log.user?.name ?? log.userId}
                            </TableCell>
                            <TableCell className="text-xs max-w-xs truncate">
                              {log.newValue?.reason ||
                                log.newValue?.target_user_id ||
                                log.ipAddress ||
                                "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ListPagination
                      page={auditPage}
                      totalPages={Math.max(1, Math.ceil(auditTotal / auditLimit))}
                      totalItems={auditTotal}
                      itemsPerPage={auditLimit}
                      itemLabel="audit entries"
                      onPageChange={setAuditPage}
                      onItemsPerPageChange={(n) => {
                        setAuditLimit(n);
                        setAuditPage(1);
                      }}
                    />
                  </TabsContent>
                )}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate company?</AlertDialogTitle>
            <AlertDialogDescription>
              Users who rely on this as their only active company will be blocked. You cannot
              deactivate your currently selected company from the header without switching first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivateCompany}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmRemoveUserId != null}
        onOpenChange={(o) => !o && setConfirmRemoveUserId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user from company?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot remove a user&apos;s last active company or yourself from the active
              company in the header.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmRemoveUserId != null && handleRemoveUser(confirmRemoveUserId)
              }
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
