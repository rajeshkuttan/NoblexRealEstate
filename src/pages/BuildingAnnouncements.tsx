import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { buildingAnnouncementsAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, Trash2, Send, Eye, X } from "lucide-react";

type NoticeStatus = "draft" | "sent" | "failed";

type Notice = {
  id: number;
  propertyId: number;
  propertyTitle?: string | null;
  subject: string;
  bodyHtml: string;
  status: NoticeStatus;
  minDaysEndDate?: number;
  minInitialTermDays?: number;
  strictRenewalFilter?: boolean;
  maxSend?: number;
  recipientCount?: number;
  emailsSent?: number;
  emailsSkipped?: number;
  lastError?: string | null;
  sentAt?: string | null;
  createdAt?: string;
};

const emptyForm = {
  propertyId: "",
  subject: "",
  html: "",
  minDays: "60",
  minTermDays: "90",
  strictRenewal: false,
  sendEmails: false,
  maxSend: "50",
};

export default function BuildingAnnouncements() {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<any[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPropertyId, setFilterPropertyId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [mode, setMode] = useState<"list" | "compose" | "view">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Notice | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadNotices = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { limit: 50 };
      if (filterPropertyId !== "all") params.propertyId = filterPropertyId;
      if (filterStatus !== "all") params.status = filterStatus;
      const res = await buildingAnnouncementsAPI.getAll(params);
      const list = res.data?.data?.announcements ?? res.data?.announcements ?? [];
      setNotices(Array.isArray(list) ? list : []);
    } catch {
      setNotices([]);
      toast.error(t("platform.buildingAnnouncements.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filterPropertyId, filterStatus, t]);

  useEffect(() => {
    const loadProps = async () => {
      try {
        // Same leases permission as this page (avoids /properties limit max 100 + module gate)
        const res = await buildingAnnouncementsAPI.getPropertyOptions();
        const list = res.data?.properties ?? [];
        setProperties(Array.isArray(list) ? list : []);
      } catch {
        setProperties([]);
      }
    };
    loadProps();
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const resetCompose = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMode("list");
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMode("compose");
  };

  const openEdit = (n: Notice) => {
    if (n.status !== "draft") {
      toast.error(t("platform.buildingAnnouncements.editDraftOnly"));
      return;
    }
    setEditingId(n.id);
    setForm({
      propertyId: String(n.propertyId),
      subject: n.subject || "",
      html: n.bodyHtml || "",
      minDays: String(n.minDaysEndDate ?? 60),
      minTermDays: String(n.minInitialTermDays ?? 90),
      strictRenewal: !!n.strictRenewalFilter,
      sendEmails: false,
      maxSend: String(n.maxSend ?? 50),
    });
    setMode("compose");
  };

  const openView = (n: Notice) => {
    setViewing(n);
    setMode("view");
  };

  const handleDelete = async (n: Notice) => {
    if (!window.confirm(t("platform.buildingAnnouncements.deleteConfirm"))) return;
    try {
      await buildingAnnouncementsAPI.delete(n.id);
      toast.success(t("platform.buildingAnnouncements.deleted"));
      if (viewing?.id === n.id) {
        setViewing(null);
        setMode("list");
      }
      await loadNotices();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t("platform.buildingAnnouncements.deleteFailed"));
    }
  };

  const handleSendExisting = async (n: Notice) => {
    try {
      setSaving(true);
      const res = await buildingAnnouncementsAPI.send(n.id);
      toast.success(res.data?.message || t("platform.buildingAnnouncements.sent"));
      await loadNotices();
      setMode("list");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t("platform.buildingAnnouncements.sendFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (doSend: boolean) => {
    if (!form.propertyId || !form.subject.trim() || !form.html.trim()) {
      toast.error(t("platform.buildingAnnouncements.validation"));
      return;
    }
    const payload = {
      propertyId: parseInt(form.propertyId, 10),
      subject: form.subject.trim(),
      bodyHtml: form.html.trim(),
      minDaysEndDate: parseInt(form.minDays, 10) || 60,
      strictRenewalFilter: form.strictRenewal,
      minInitialTermDays: parseInt(form.minTermDays, 10) || 90,
      sendEmails: doSend,
      maxSend: parseInt(form.maxSend, 10) || 50,
    };
    try {
      setSaving(true);
      let res;
      if (editingId) {
        res = await buildingAnnouncementsAPI.update(editingId, payload);
      } else {
        res = await buildingAnnouncementsAPI.create(payload);
      }
      toast.success(res.data?.message || t("platform.buildingAnnouncements.saved"));
      resetCompose();
      await loadNotices();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t("platform.buildingAnnouncements.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: NoticeStatus) => {
    const variant =
      status === "sent" ? "default" : status === "failed" ? "destructive" : "secondary";
    return (
      <Badge variant={variant}>
        {t(`platform.buildingAnnouncements.status.${status}`)}
      </Badge>
    );
  };

  const formatDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleString();
    } catch {
      return v;
    }
  };

  return (
    <div className="space-y-6 uiux-page-enter max-w-5xl">
      <div className="uiux-page-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="uiux-page-title">{t("platform.buildingAnnouncements.title")}</h1>
          <p className="uiux-page-subtitle">{t("platform.buildingAnnouncements.subtitle")}</p>
        </div>
        {mode === "list" && (
          <Button type="button" onClick={openNew}>
            <Plus className="h-4 w-4 me-2" />
            {t("platform.buildingAnnouncements.new")}
          </Button>
        )}
      </div>

      {mode === "list" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("platform.buildingAnnouncements.history")}</CardTitle>
            <CardDescription>{t("platform.buildingAnnouncements.historyHint")}</CardDescription>
            <div className="flex flex-wrap gap-3 pt-2">
              <Select value={filterPropertyId} onValueChange={setFilterPropertyId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder={t("platform.buildingAnnouncements.allProperties")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("platform.buildingAnnouncements.allProperties")}</SelectItem>
                  {properties.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.title || p.name || `Property ${p.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t("platform.buildingAnnouncements.allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("platform.buildingAnnouncements.allStatuses")}</SelectItem>
                  <SelectItem value="draft">{t("platform.buildingAnnouncements.status.draft")}</SelectItem>
                  <SelectItem value="sent">{t("platform.buildingAnnouncements.status.sent")}</SelectItem>
                  <SelectItem value="failed">{t("platform.buildingAnnouncements.status.failed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("platform.buildingAnnouncements.loading")}</p>
            ) : notices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("platform.buildingAnnouncements.empty")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("platform.buildingAnnouncements.colProperty")}</TableHead>
                    <TableHead>{t("platform.buildingAnnouncements.colSubject")}</TableHead>
                    <TableHead>{t("platform.buildingAnnouncements.colStatus")}</TableHead>
                    <TableHead>{t("platform.buildingAnnouncements.colRecipients")}</TableHead>
                    <TableHead>{t("platform.buildingAnnouncements.colSent")}</TableHead>
                    <TableHead className="text-end">{t("platform.buildingAnnouncements.colActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notices.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="max-w-[160px] truncate">
                        {n.propertyTitle || `#${n.propertyId}`}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate font-medium">{n.subject}</TableCell>
                      <TableCell>{statusBadge(n.status)}</TableCell>
                      <TableCell>
                        {n.recipientCount ?? 0}
                        {n.status !== "draft" && n.emailsSent != null
                          ? ` (${n.emailsSent} ${t("platform.buildingAnnouncements.sentCount")})`
                          : ""}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(n.sentAt || (n.status === "draft" ? n.createdAt : null))}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="inline-flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => openView(n)}
                            title={t("platform.buildingAnnouncements.view")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(n.status === "draft" || n.status === "failed") && (
                            <>
                              {n.status === "draft" && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEdit(n)}
                                  title={t("platform.buildingAnnouncements.edit")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSendExisting(n)}
                                disabled={saving}
                                title={t("platform.buildingAnnouncements.send")}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(n)}
                            title={t("platform.buildingAnnouncements.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {mode === "view" && viewing && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{viewing.subject}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                {statusBadge(viewing.status)}
                <span>
                  {viewing.propertyTitle || `#${viewing.propertyId}`}
                </span>
              </CardDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setMode("list")}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                {t("platform.buildingAnnouncements.colRecipients")}: {viewing.recipientCount ?? 0}
                {viewing.emailsSent != null
                  ? ` · ${t("platform.buildingAnnouncements.sentCount")}: ${viewing.emailsSent}`
                  : ""}
              </p>
              <p>
                {t("platform.buildingAnnouncements.colSent")}: {formatDate(viewing.sentAt)}
              </p>
              {viewing.lastError && (
                <p className="text-destructive">{viewing.lastError}</p>
              )}
            </div>
            <div
              className="prose prose-sm max-w-none border rounded-md p-4 bg-muted/30"
              dangerouslySetInnerHTML={{ __html: viewing.bodyHtml }}
            />
            <div className="flex flex-wrap gap-2">
              {(viewing.status === "draft" || viewing.status === "failed") && (
                <>
                  {viewing.status === "draft" && (
                    <Button type="button" onClick={() => openEdit(viewing)}>
                      {t("platform.buildingAnnouncements.edit")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => handleSendExisting(viewing)}
                  >
                    {t("platform.buildingAnnouncements.send")}
                  </Button>
                </>
              )}
              <Button type="button" variant="outline" onClick={() => handleDelete(viewing)}>
                {t("platform.buildingAnnouncements.delete")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode("list")}>
                {t("platform.buildingAnnouncements.back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "compose" && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>
                {editingId
                  ? t("platform.buildingAnnouncements.editTitle")
                  : t("platform.buildingAnnouncements.compose")}
              </CardTitle>
              <CardDescription>{t("platform.buildingAnnouncements.composeHint")}</CardDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={resetCompose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("platform.buildingAnnouncements.property")}</Label>
              <Select
                value={form.propertyId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, propertyId: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("platform.buildingAnnouncements.selectProperty")} />
                </SelectTrigger>
                <SelectContent>
                  {properties.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {t("platform.buildingAnnouncements.noProperties", {
                        defaultValue: "No buildings available",
                      })}
                    </div>
                  ) : (
                    properties.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.title || p.name || `Property ${p.id}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("platform.buildingAnnouncements.minDays")}</Label>
              <Input
                value={form.minDays}
                onChange={(e) => setForm((f) => ({ ...f, minDays: e.target.value }))}
                type="number"
                min={1}
              />
            </div>
            <div>
              <Label>{t("platform.buildingAnnouncements.minTerm")}</Label>
              <Input
                value={form.minTermDays}
                onChange={(e) => setForm((f) => ({ ...f, minTermDays: e.target.value }))}
                type="number"
                min={1}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="strictRenewal"
                checked={form.strictRenewal}
                onCheckedChange={(c) => setForm((f) => ({ ...f, strictRenewal: c === true }))}
              />
              <Label htmlFor="strictRenewal" className="font-normal cursor-pointer">
                {t("platform.buildingAnnouncements.strictRenewal")}
              </Label>
            </div>
            <div>
              <Label>{t("platform.buildingAnnouncements.maxSend")}</Label>
              <Input
                value={form.maxSend}
                onChange={(e) => setForm((f) => ({ ...f, maxSend: e.target.value }))}
                type="number"
                min={1}
                max={200}
              />
            </div>
            <div>
              <Label>{t("platform.buildingAnnouncements.subject")}</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t("platform.buildingAnnouncements.body")}</Label>
              <Textarea
                rows={8}
                value={form.html}
                onChange={(e) => setForm((f) => ({ ...f, html: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? t("platform.buildingAnnouncements.working") : t("platform.buildingAnnouncements.saveDraft")}
              </Button>
              <Button type="button" onClick={() => handleSave(true)} disabled={saving}>
                {saving ? t("platform.buildingAnnouncements.working") : t("platform.buildingAnnouncements.saveAndSend")}
              </Button>
              <Button type="button" variant="ghost" onClick={resetCompose}>
                {t("platform.buildingAnnouncements.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
