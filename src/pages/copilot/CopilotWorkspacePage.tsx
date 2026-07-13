import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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

type Message = {
  id: number;
  role: string;
  content: string;
  sources?: MessageSource[];
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

  const confirmPending = async () => {
    if (!pendingAction?.confirmationToken || confirming) return;
    setConfirming(true);
    try {
      const res = await copilotAPI.confirmAction(pendingAction.confirmationToken);
      const result = res.data?.data;
      toast.success(result?.summary || t("copilot.actionConfirmed"));
      setPendingAction(null);
      if (activeId) await loadConversation(activeId);
      void loadAdminStats();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.response?.data?.data?.summary || t("copilot.error"));
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
    return <div className="p-6 text-muted-foreground">{t("copilot.loading")}</div>;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 p-4 md:p-6">
      <div className="flex w-full max-w-xs shrink-0 flex-col gap-4">
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("copilot.conversations")}</CardTitle>
            <Button size="sm" onClick={startConversation}>
              {t("copilot.newConversation")}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-4 pb-4">
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("copilot.emptyConversations")}</p>
              )}
              <ul className="space-y-1">
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
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex max-h-64 flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("copilot.documents")}</CardTitle>
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
                <span className="inline-flex h-8 items-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
                  {uploading ? t("copilot.uploading") : t("copilot.upload")}
                </span>
              </label>
            )}
          </CardHeader>
          <CardContent className="overflow-auto p-3 pt-0">
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("copilot.emptyDocuments")}</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {documents.map((d) => (
                  <li key={d.id} id={`copilot-doc-${d.id}`} className="rounded border px-2 py-1">
                    <div className="font-medium truncate">{d.title || d.fileName}</div>
                    <div className="text-muted-foreground">
                      {t("copilot.status")}: {d.ingestionStatus}/{d.indexingStatus}
                    </div>
                    {d.lastError && (
                      <div className="text-destructive truncate" title={d.lastError}>
                        {d.lastError}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {(canAdmin || canEvaluate) && (
          <Card className="flex max-h-72 flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("copilot.adminPanel")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto space-y-3 p-3 pt-0 text-xs">
              {canAdmin && adminStats && (
                <div className="grid grid-cols-2 gap-2">
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
                    <ul className="max-h-24 overflow-auto space-y-1 text-destructive">
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
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="flex flex-1 flex-col min-w-0">
        <CardHeader>
          <CardTitle>{t("copilot.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("copilot.subtitle")}</p>
          <p className="text-xs text-muted-foreground">{t("copilot.providerHint")}</p>
          {(contextBanner || activeConversation?.entityType) && (
            <p className="text-xs rounded bg-muted px-2 py-1">
              {contextBanner ||
                `${t("copilot.context")}: ${activeConversation?.entityType} #${activeConversation?.entityId}`}
            </p>
          )}
          {health && (
            <p className="text-xs text-muted-foreground">
              Phase {health.phase || "?"} · Provider: {health.providerConfigured ? "yes" : "no"} · RAG:{" "}
              {health.documentRag ? health.retrievalMode || "on" : "off"} · Tools:{" "}
              {(health.toolDomains || []).join(", ") || (health.erpTools ? "on" : "off")}
              {health.streaming ? " · stream:on" : ""}
              {health.controlledActions ? " · actions:on" : ""}
              {health.arabicIntent ? " · ar:on" : ""}
              {health.promptVersion ? ` · prompt:${health.promptVersion}` : ""}
            </p>
          )}
          {adminStats && !canAdmin && (
            <p className="text-xs text-muted-foreground">
              {t("copilot.adminStats")}: {adminStats.messagesToday ?? 0} {t("copilot.msgsToday")} ·{" "}
              {adminStats.documents?.ready ?? 0}/{adminStats.documents?.total ?? 0}{" "}
              {t("copilot.docsReady")} · {adminStats.toolRunsToday ?? 0} {t("copilot.toolRuns")}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
          {!activeId ? (
            <p className="text-sm text-muted-foreground">{t("copilot.selectConversation")}</p>
          ) : (
            <>
              <ScrollArea className="flex-1 rounded-md border p-4">
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      dir="auto"
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                        m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"
                      )}
                    >
                      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                        {m.role}
                      </div>
                      {m.content}
                      {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                        <ul className="mt-2 space-y-1 border-t pt-2 text-xs text-muted-foreground">
                          {m.sources.map((s, idx) => (
                            <li key={s.id || idx}>
                              {s.documentId ? (
                                <button
                                  type="button"
                                  className="text-left underline-offset-2 hover:underline text-foreground"
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
                              {s.contentPreview && (
                                <div className="mt-0.5 line-clamp-2 opacity-80">{s.contentPreview}</div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {m.role === "assistant" && m.id > 0 && (
                        <div className="mt-2 flex gap-2 text-xs">
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="rounded-md border p-3 text-xs text-muted-foreground">
                <div className="font-medium mb-1">{t("copilot.sources")}</div>
                {lastAssistantSources.length === 0 ? (
                  t("copilot.sourcesEmpty")
                ) : (
                  <ul className="space-y-1">
                    {lastAssistantSources.map((s, idx) => (
                      <li key={s.id || idx}>
                        {s.documentId ? (
                          <button
                            type="button"
                            className="underline-offset-2 hover:underline text-foreground"
                            onClick={() => {
                              const el = document.getElementById(`copilot-doc-${s.documentId}`);
                              if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                            }}
                          >
                            [{s.sourceType}] {s.sourceLabel}
                            {s.pageNumber != null ? ` · p.${s.pageNumber}` : ""}
                          </button>
                        ) : (
                          <>
                            [{s.sourceType}] {s.sourceLabel}
                            {s.pageNumber != null ? ` · p.${s.pageNumber}` : ""}
                          </>
                        )}
                        {s.contentPreview && (
                          <div className="mt-0.5 line-clamp-2 opacity-80">{s.contentPreview}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {pendingAction?.confirmationToken && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm space-y-2">
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

              <div className="flex gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("copilot.placeholder")}
                  className="min-h-[80px]"
                  dir="auto"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <Button onClick={sendMessage} disabled={sending || !draft.trim()}>
                  {t("copilot.send")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
