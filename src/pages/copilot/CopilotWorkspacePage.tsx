import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import CopilotChart, { type ChartSpec } from "@/components/copilot/CopilotChart";
import { copilotAPI } from "@/services/api";
import { useCan } from "@/hooks/useCan";
import { toast } from "sonner";

type Conversation = {
  id: number;
  title?: string;
  updatedAt?: string;
  entityType?: string | null;
  entityId?: number | null;
  moduleContext?: string | null;
  entityLabel?: string | null;
};

type MessageSource = {
  id?: number;
  sourceType?: string;
  sourceLabel?: string;
  pageNumber?: number | null;
  contentPreview?: string;
  documentId?: number;
  sourceUrl?: string | null;
};

type MessageArtifact =
  | { type: "chart"; toolName?: string; chart: ChartSpec }
  | { type: "table"; toolName?: string; table?: { name?: string; rows?: unknown[] } };

type Message = {
  id: number;
  role: string;
  content: string;
  sources?: MessageSource[];
  artifacts?: MessageArtifact[];
  pendingAction?: PendingAction | null;
};

type PendingAction = {
  status?: string;
  action?: string;
  confirmationToken?: string;
  expiresAt?: string;
  preview?: { title?: string; category?: string; priority?: string };
  summary?: string;
};

type CopilotDoc = {
  id: number;
  title?: string;
  fileName?: string;
  ingestionStatus?: string;
  indexingStatus?: string;
  lastError?: string | null;
};

type AdminStats = {
  messagesToday?: number;
  messagesMonth?: number;
  conversations?: number;
  documents?: { total?: number; ready?: number; failed?: number };
  toolRunsToday?: number;
  toolDeniedToday?: number;
  feedback?: { today?: number; upToday?: number; downToday?: number };
  usage?: {
    tokensToday?: number;
    tokensMonth?: number;
    estimatedCostTodayUsd?: number;
    estimatedCostMonthUsd?: number;
  };
  promptVersion?: string;
  quotas?: { userDailyMessageQuota?: number; companyMonthlyMessageQuota?: number };
  phase?: number;
};

type EvalReport = {
  total?: number;
  passed?: number;
  failed?: number;
  passRate?: number;
  results?: Array<{ caseId?: string; passed?: boolean; failures?: string[] }>;
};

export default function CopilotWorkspacePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const can = useCan();
  const canManageDocs = can("module:copilot:documents");
  const canAdmin = can("module:copilot:admin");
  const canExport = can("module:copilot:export") || canAdmin;
  const canEvaluate = can("module:copilot:evaluate") || canAdmin;
  const contextBootstrapped = useRef(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [runningEval, setRunningEval] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [documents, setDocuments] = useState<CopilotDoc[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [contextBanner, setContextBanner] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Record<number, number>>({});
  const [evalSummary, setEvalSummary] = useState<string | null>(null);
  const [evalReport, setEvalReport] = useState<EvalReport | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [health, setHealth] = useState<{
    providerConfigured?: boolean;
    documentRag?: boolean;
    erpTools?: boolean;
    retrievalMode?: string;
    toolDomains?: string[];
    phase?: number;
    controlledActions?: boolean;
    streaming?: boolean;
    evaluation?: boolean;
    arabicIntent?: boolean;
    promptVersion?: string;
  } | null>(null);

  const loadAdminStats = useCallback(async () => {
    if (!canAdmin) return;
    try {
      const res = await copilotAPI.adminStats();
      setAdminStats(res.data?.data || null);
    } catch {
      /* ignore */
    }
  }, [canAdmin]);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await copilotAPI.listDocuments();
      setDocuments(res.data?.data || []);
    } catch {
      /* list may 403 for use-only without documents — ignore */
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const [listRes, healthRes] = await Promise.all([
        copilotAPI.listConversations(),
        copilotAPI.health().catch(() => null),
      ]);
      const list = listRes.data?.data || [];
      setConversations(list);
      setHealth(healthRes?.data?.data || null);
      if (!activeId && list.length) {
        setActiveId(list[0].id);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("copilot.error"));
    } finally {
      setLoading(false);
    }
  }, [activeId, t]);

  const loadConversation = useCallback(
    async (id: number) => {
      try {
        const res = await copilotAPI.getConversation(id);
        const data = res.data?.data;
        setMessages(data?.messages || []);
      } catch (e: any) {
        toast.error(e.response?.data?.message || t("copilot.error"));
      }
    },
    [t]
  );

  useEffect(() => {
    loadConversations();
    loadDocuments();
    loadAdminStats();
  }, []);

  // Contextual deep-link: /copilot?entityType=lease&entityId=12&q=...
  useEffect(() => {
    if (loading || contextBootstrapped.current) return;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const moduleCtx = searchParams.get("module");
    const preset = searchParams.get("q");
    if (!entityType && !entityId && !preset) {
      contextBootstrapped.current = true;
      return;
    }
    contextBootstrapped.current = true;

    (async () => {
      try {
        if (entityType && entityId) {
          const resolved = await copilotAPI.resolveContext({
            entityType,
            entityId,
            module: moduleCtx || undefined,
          });
          const ctx = resolved.data?.data;
          const created = await copilotAPI.createConversation({
            entityType,
            entityId: Number(entityId),
            moduleContext: moduleCtx || ctx?.moduleContext || undefined,
            title: ctx?.label
              ? `Ask about ${entityType} ${ctx.label}`
              : `Ask about ${entityType} #${entityId}`,
          });
          const conv = created.data?.data;
          setContextBanner(
            ctx?.label
              ? `${t("copilot.context")}: ${entityType} — ${ctx.label}`
              : `${t("copilot.context")}: ${entityType} #${entityId}`
          );
          await loadConversations();
          if (conv?.id) setActiveId(conv.id);
        }
        if (preset) setDraft(preset);
        setSearchParams({}, { replace: true });
      } catch (e: any) {
        toast.error(e.response?.data?.message || t("copilot.contextError"));
      }
    })();
  }, [loading, searchParams, setSearchParams, t, loadConversations]);

  useEffect(() => {
    if (activeId) loadConversation(activeId);
  }, [activeId, loadConversation]);

  const startConversation = async () => {
    try {
      const res = await copilotAPI.createConversation({ title: "New conversation" });
      const created = res.data?.data;
      await loadConversations();
      if (created?.id) setActiveId(created.id);
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("copilot.error"));
    }
  };

  const sendMessage = async () => {
    if (!activeId || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    const tempAssistantId = -Date.now();
    try {
      let streamed = "";
      let sawDone = false;
      await copilotAPI.postMessageStream(activeId, text, {
        onUserMessage: (msg: any) => {
          setMessages((prev) => [...prev, msg]);
        },
        onDelta: (chunk) => {
          streamed += chunk;
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== tempAssistantId);
            return [
              ...withoutTemp,
              {
                id: tempAssistantId,
                role: "assistant",
                content: streamed,
              },
            ];
          });
        },
        onPendingAction: (action: any) => {
          setPendingAction(action);
        },
        onDone: (data: any) => {
          sawDone = true;
          setPendingAction(data?.pendingAction || null);
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== tempAssistantId);
            const user = data?.userMessage;
            const assistant = data?.assistantMessage
              ? { ...data.assistantMessage, pendingAction: data.pendingAction || null }
              : null;
            const next = [...withoutTemp];
            if (user && !next.some((m) => m.id === user.id)) next.push(user);
            if (assistant) {
              const idx = next.findIndex((m) => m.id === assistant.id);
              if (idx >= 0) next[idx] = assistant;
              else next.push(assistant);
            }
            return next;
          });
        },
        onError: (err) => {
          toast.error(err.message || t("copilot.error"));
        },
      });
      if (!sawDone && activeId) await loadConversation(activeId);
      await loadConversations();
      void loadAdminStats();
    } catch (e: any) {
      // Fallback to non-streaming JSON endpoint
      try {
        const res = await copilotAPI.postMessage(activeId, text);
        const data = res.data?.data;
        if (data?.pendingAction?.confirmationToken) {
          setPendingAction(data.pendingAction);
        } else {
          setPendingAction(null);
        }
        if (data?.userMessage && data?.assistantMessage) {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== tempAssistantId),
            data.userMessage,
            { ...data.assistantMessage, pendingAction: data.pendingAction || null },
          ]);
        } else {
          await loadConversation(activeId);
        }
        await loadConversations();
        void loadAdminStats();
      } catch (e2: any) {
        toast.error(e2.response?.data?.message || e.response?.data?.message || t("copilot.error"));
        setDraft(text);
      }
    } finally {
      setSending(false);
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async (messageId: number) => {
    if (!activeId || !canExport) {
      toast.error(t("copilot.exportDenied"));
      return;
    }
    setExportingId(messageId);
    try {
      const res = await copilotAPI.exportAnswerPdf(activeId, messageId);
      downloadBlob(res.data as Blob, `copilot-answer-${messageId}.pdf`);
      toast.success(t("copilot.exportDone"));
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("copilot.exportDenied"));
    } finally {
      setExportingId(null);
    }
  };

  const exportXlsx = async (messageId: number) => {
    if (!activeId || !canExport) {
      toast.error(t("copilot.exportDenied"));
      return;
    }
    setExportingId(messageId);
    try {
      const res = await copilotAPI.exportToolXlsx(activeId, messageId);
      downloadBlob(res.data as Blob, `copilot-data-${messageId}.xlsx`);
      toast.success(t("copilot.exportDone"));
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("copilot.error"));
    } finally {
      setExportingId(null);
    }
  };

  const confirmPending = async () => {
    if (!pendingAction?.confirmationToken || confirming) return;
    setConfirming(true);
    try {
      const res = await copilotAPI.confirmAction(pendingAction.confirmationToken);
      const result = res.data?.data;
      toast.success(result?.summary || t("copilot.actionConfirmed"));
      setPendingAction(null);
      if (result?.action === "generateReportExport" && result?.data?.messageId && activeId) {
        const mid = result.data.messageId;
        if (result.data.format === "pdf") await exportPdf(mid);
        else await exportXlsx(mid);
      }
      if (activeId) await loadConversation(activeId);
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("copilot.error"));
    } finally {
      setConfirming(false);
    }
  };

  const onUpload = async (file: File | null) => {
    if (!file || !canManageDocs) return;
    setUploading(true);
    try {
      await copilotAPI.uploadDocument(file);
      toast.success(t("copilot.uploadSuccess"));
      await loadDocuments();
      setTimeout(() => void loadDocuments(), 6000);
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("copilot.error"));
    } finally {
      setUploading(false);
    }
  };

  const sendFeedback = async (messageId: number, rating: number) => {
    if (messageId < 0 || feedbackSent[messageId]) return;
    try {
      await copilotAPI.feedback({ messageId, rating, feedbackType: rating > 0 ? "up" : "down" });
      setFeedbackSent((prev) => ({ ...prev, [messageId]: rating }));
      toast.success(t("copilot.feedbackThanks"));
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("copilot.error"));
    }
  };

  const runEval = async () => {
    if (!canEvaluate || runningEval) return;
    setRunningEval(true);
    try {
      const res = await copilotAPI.runEvaluations();
      const data = res.data?.data;
      setEvalReport(data || null);
      setEvalSummary(
        `${data?.passed ?? 0}/${data?.total ?? 0} passed (${data?.passRate ?? 0}%)`
      );
      toast.success(t("copilot.evalDone"));
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("copilot.error"));
    } finally {
      setRunningEval(false);
    }
  };

  const lastAssistantSources =
    [...messages].reverse().find((m) => m.role === "assistant")?.sources || [];

  const activeConversation = conversations.find((c) => c.id === activeId);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center text-muted-foreground">
        {t("copilot.loading")}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-0 w-full overflow-hidden">
      {/* Left rail */}
      <aside className="flex w-72 shrink-0 flex-col border-e border-border bg-card/40 min-h-0">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border">
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <h2 className="text-sm font-semibold">{t("copilot.conversations")}</h2>
            <Button size="sm" className="h-8 shrink-0" onClick={startConversation}>
              {t("copilot.newConversation")}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {conversations.length === 0 && (
              <p className="px-2 text-sm text-muted-foreground">{t("copilot.emptyConversations")}</p>
            )}
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                      activeId === c.id && "bg-muted font-medium"
                    )}
                    onClick={() => setActiveId(c.id)}
                  >
                    {c.title || `Chat #${c.id}`}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex max-h-52 shrink-0 flex-col overflow-hidden border-b border-border">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <h2 className="text-sm font-semibold">{t("copilot.documents")}</h2>
            {canManageDocs && (
              <label className="inline-flex cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.html,.csv,.docx,.xlsx"
                  disabled={uploading}
                  onChange={(e) => {
                    void onUpload(e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                />
                <span className="inline-flex h-7 items-center rounded-md bg-secondary px-2.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
                  {uploading ? t("copilot.uploading") : t("copilot.upload")}
                </span>
              </label>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("copilot.emptyDocuments")}</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {documents.map((d) => (
                  <li key={d.id} id={`copilot-doc-${d.id}`} className="rounded border px-2 py-1">
                    <div className="truncate font-medium">{d.title || d.fileName}</div>
                    <div className="text-muted-foreground">
                      {t("copilot.status")}: {d.ingestionStatus}/{d.indexingStatus}
                    </div>
                    {d.lastError && (
                      <div className="truncate text-destructive" title={d.lastError}>
                        {d.lastError}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {(canAdmin || canEvaluate) && (
          <div className="flex max-h-64 shrink-0 flex-col overflow-hidden">
            <div className="px-3 py-2">
              <h2 className="text-sm font-semibold">{t("copilot.adminPanel")}</h2>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3 text-xs">
              {canAdmin && adminStats && (
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded border px-2 py-1">
                    <div className="text-muted-foreground">{t("copilot.msgsToday")}</div>
                    <div className="font-medium">{adminStats.messagesToday ?? 0}</div>
                  </div>
                  <div className="rounded border px-2 py-1">
                    <div className="text-muted-foreground">{t("copilot.docsReady")}</div>
                    <div className="font-medium">
                      {adminStats.documents?.ready ?? 0}/{adminStats.documents?.total ?? 0}
                    </div>
                  </div>
                  <div className="rounded border px-2 py-1">
                    <div className="text-muted-foreground">{t("copilot.toolRuns")}</div>
                    <div className="font-medium">{adminStats.toolRunsToday ?? 0}</div>
                  </div>
                  <div className="rounded border px-2 py-1">
                    <div className="text-muted-foreground">{t("copilot.tokensToday")}</div>
                    <div className="font-medium">{adminStats.usage?.tokensToday ?? 0}</div>
                  </div>
                  <div className="rounded border px-2 py-1">
                    <div className="text-muted-foreground">{t("copilot.costToday")}</div>
                    <div className="font-medium">
                      ${(adminStats.usage?.estimatedCostTodayUsd ?? 0).toFixed(4)}
                    </div>
                  </div>
                  <div className="rounded border px-2 py-1">
                    <div className="text-muted-foreground">{t("copilot.feedbackToday")}</div>
                    <div className="font-medium">
                      ↑{adminStats.feedback?.upToday ?? 0} ↓{adminStats.feedback?.downToday ?? 0}
                    </div>
                  </div>
                </div>
              )}
              {canAdmin && adminStats?.promptVersion && (
                <p className="text-muted-foreground">
                  {t("copilot.promptVersion")}: {adminStats.promptVersion}
                </p>
              )}
              {canEvaluate && (
                <div className="space-y-2">
                  <Button size="sm" variant="outline" onClick={() => void runEval()} disabled={runningEval}>
                    {runningEval ? t("copilot.evalRunning") : t("copilot.runEval")}
                  </Button>
                  {evalSummary && <p className="text-muted-foreground">{evalSummary}</p>}
                  {evalReport?.results && evalReport.results.some((r) => !r.passed) && (
                    <ul className="max-h-20 space-y-1 overflow-auto text-destructive">
                      {evalReport.results
                        .filter((r) => !r.passed)
                        .slice(0, 8)
                        .map((r) => (
                          <li key={r.caseId}>
                            {r.caseId}: {(r.failures || []).join("; ")}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main column */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-border px-4 py-2.5 md:px-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">{t("copilot.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("copilot.subtitle")}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {(contextBanner || activeConversation?.entityType) && (
              <span className="rounded bg-muted px-2 py-0.5 text-foreground">
                {contextBanner ||
                  `${t("copilot.context")}: ${activeConversation?.entityType} #${activeConversation?.entityId}`}
              </span>
            )}
            {health && (
              <span className="truncate">
                Phase {health.phase || "?"} · Provider: {health.providerConfigured ? "yes" : "no"} · RAG:{" "}
                {health.documentRag ? health.retrievalMode || "on" : "off"}
                {health.streaming ? " · stream" : ""}
                {health.promptVersion ? ` · ${health.promptVersion}` : ""}
              </span>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {!activeId ? (
            <p className="p-6 text-sm text-muted-foreground">{t("copilot.selectConversation")}</p>
          ) : (
            <>
              {/* Messages — primary */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8">
                <div className="mx-auto w-full max-w-[min(72rem,100%)] space-y-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      dir="auto"
                      className={cn(
                        "rounded-xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap",
                        m.role === "user" ? "bg-primary/10 ms-6 md:ms-16" : "bg-muted/80 me-4 md:me-12"
                      )}
                    >
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {m.role}
                      </div>
                      {m.content}
                      {m.role === "assistant" &&
                        (m.artifacts || [])
                          .filter((a): a is { type: "chart"; chart: ChartSpec; toolName?: string } => a.type === "chart" && Boolean(a.chart))
                          .map((a, i) => (
                            <CopilotChart key={`${m.id}-chart-${i}`} chart={a.chart} />
                          ))}
                      {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                          {m.sources.map((s, idx) => (
                            <li key={s.id || idx}>
                              {s.documentId ? (
                                <button
                                  type="button"
                                  className="text-left text-foreground underline-offset-2 hover:underline"
                                  onClick={() => {
                                    const el = document.getElementById(`copilot-doc-${s.documentId}`);
                                    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                    else toast.message(`${s.sourceLabel || "Document"} #${s.documentId}`);
                                  }}
                                >
                                  [{s.sourceType}] {s.sourceLabel}
                                  {s.pageNumber != null ? ` · p.${s.pageNumber}` : ""}
                                </button>
                              ) : (
                                <span>
                                  [{s.sourceType}] {s.sourceLabel}
                                  {s.pageNumber != null ? ` · p.${s.pageNumber}` : ""}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {m.role === "assistant" && m.id > 0 && (
                        <div className="mt-2 flex flex-wrap gap-3 text-xs">
                          <button
                            type="button"
                            className={cn(
                              "underline-offset-2 hover:underline",
                              feedbackSent[m.id] === 1 && "font-semibold"
                            )}
                            onClick={() => void sendFeedback(m.id, 1)}
                            disabled={Boolean(feedbackSent[m.id])}
                          >
                            {t("copilot.thumbsUp")}
                          </button>
                          <button
                            type="button"
                            className={cn(
                              "underline-offset-2 hover:underline",
                              feedbackSent[m.id] === -1 && "font-semibold"
                            )}
                            onClick={() => void sendFeedback(m.id, -1)}
                            disabled={Boolean(feedbackSent[m.id])}
                          >
                            {t("copilot.thumbsDown")}
                          </button>
                          {canExport && (
                            <>
                              <button
                                type="button"
                                className="underline-offset-2 hover:underline"
                                disabled={exportingId === m.id}
                                onClick={() => void exportPdf(m.id)}
                              >
                                {exportingId === m.id ? t("copilot.exporting") : t("copilot.downloadPdf")}
                              </button>
                              {(m.artifacts || []).some((a) => a.type === "table") && (
                                <button
                                  type="button"
                                  className="underline-offset-2 hover:underline"
                                  disabled={exportingId === m.id}
                                  onClick={() => void exportXlsx(m.id)}
                                >
                                  {t("copilot.exportExcel")}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sources — capped / collapsible */}
              <div className="shrink-0 border-t border-border bg-card/30">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium hover:bg-muted/40 md:px-6"
                  onClick={() => setSourcesOpen((o) => !o)}
                  aria-expanded={sourcesOpen}
                >
                  <span>
                    {t("copilot.sources")}
                    {lastAssistantSources.length > 0 ? ` (${lastAssistantSources.length})` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {sourcesOpen ? t("copilot.sourcesHide") : t("copilot.sourcesShow")}
                  </span>
                </button>
                {sourcesOpen && (
                  <div className="max-h-[22vh] overflow-y-auto border-t border-border/60 px-4 py-2 text-xs text-muted-foreground md:px-6">
                    {lastAssistantSources.length === 0 ? (
                      t("copilot.sourcesEmpty")
                    ) : (
                      <ul className="space-y-1.5">
                        {lastAssistantSources.map((s, idx) => (
                          <li key={s.id || idx} className="min-w-0">
                            {s.documentId ? (
                              <button
                                type="button"
                                className="text-foreground underline-offset-2 hover:underline"
                                onClick={() => {
                                  const el = document.getElementById(`copilot-doc-${s.documentId}`);
                                  if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                }}
                              >
                                [{s.sourceType}] {s.sourceLabel}
                                {s.pageNumber != null ? ` · p.${s.pageNumber}` : ""}
                              </button>
                            ) : (
                              <span>
                                [{s.sourceType}] {s.sourceLabel}
                                {s.pageNumber != null ? ` · p.${s.pageNumber}` : ""}
                              </span>
                            )}
                            {s.contentPreview && (
                              <div className="mt-0.5 line-clamp-1 opacity-70" title={s.contentPreview}>
                                {s.contentPreview}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {pendingAction?.confirmationToken && (
                <div className="shrink-0 space-y-2 border-t border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm md:px-6">
                  <div className="font-medium">{t("copilot.confirmTitle")}</div>
                  <p className="text-xs text-muted-foreground">
                    {pendingAction.preview?.title} · {pendingAction.preview?.category} ·{" "}
                    {pendingAction.preview?.priority}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void confirmPending()} disabled={confirming}>
                      {confirming
                        ? t("copilot.confirming")
                        : pendingAction.action === "prepareCollectionNotice"
                          ? t("copilot.confirmNotice")
                          : pendingAction.action === "generateReportExport"
                            ? t("copilot.confirmExport")
                            : t("copilot.confirmAction")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingAction(null)}
                      disabled={confirming}
                    >
                      {t("copilot.dismissAction")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Composer */}
              <div className="shrink-0 border-t border-border bg-background px-4 py-3 md:px-6">
                <div className="mx-auto flex w-full max-w-[min(72rem,100%)] gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t("copilot.placeholder")}
                    className="min-h-[96px] flex-1 text-[15px]"
                    dir="auto"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <Button
                    className="self-end"
                    onClick={sendMessage}
                    disabled={sending || !draft.trim()}
                  >
                    {t("copilot.send")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
