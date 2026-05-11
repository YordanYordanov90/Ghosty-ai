"use client";

import {
  Bot,
  Download,
  FileText,
  Loader2,
  SendHorizontal,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
  useSelf,
} from "@liveblocks/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { DesignAgentActivity } from "@/components/editor/design-agent-activity";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AI_CHAT_FEED_ID } from "@/lib/ai-chat-feed-constants";
import { AI_STATUS_FEED_ID } from "@/lib/ai-status-feed-constants";
import { cn } from "@/lib/utils";
import {
  aiChatMessagePayloadSchema,
  parseAiChatMessagePayload,
  parseAiStatusFeedPayload,
} from "@/types/tasks";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import type { designAgentTask } from "@/trigger/design-agent";
import type { generateSpecTask } from "@/trigger/generate-spec";

export interface AiWorkspaceSidebarProps {
  open: boolean;
  onClose: () => void;
  /** Project room id — enables shared feeds + presence when inside `RoomProvider`. */
  roomId?: string;
  canvasNodes?: CanvasNode[];
  canvasEdges?: CanvasEdge[];
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const;

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sender?: string;
  timestamp?: number;
}

function StarterChip({
  label,
  onSelect,
}: {
  label: string;
  onSelect?: (t: string) => void;
}) {
  return (
    <button
      type="button"
      className="rounded-full bg-subtle px-3 py-2 text-left text-sm text-accent-text transition hover:bg-subtle/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onSelect?.(label)}
    >
      {label}
    </button>
  );
}

function ArchitectEmptyState({
  emptyStateDescriptionId,
  onStarterSelect,
}: {
  emptyStateDescriptionId: string;
  onStarterSelect: (text: string) => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 px-4 py-10 text-center"
      aria-describedby={emptyStateDescriptionId}
    >
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-surface-border bg-elevated text-ai-text shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_12%,transparent)]">
        <Bot className="size-7 stroke-[1.75]" aria-hidden />
      </div>
      <div className="space-y-2">
        <p id={emptyStateDescriptionId} className="text-sm text-muted-text">
          Describe your system or tap a starter prompt. Ghost AI will help you
          shape architecture on the canvas.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {STARTER_PROMPTS.map((label) => (
          <StarterChip
            key={label}
            label={label}
            onSelect={onStarterSelect}
          />
        ))}
      </div>
    </div>
  );
}

function ArchitectMessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <ul className="flex flex-col gap-3 px-3 py-4">
      {messages.map((m) =>
        m.role === "user" ? (
          <li key={m.id} className="flex justify-end">
            <div
              className="max-w-[85%] rounded-2xl bg-brand px-3 py-2 text-sm text-white shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_65%,transparent)]"
              role="article"
            >
              {m.sender || m.timestamp ? (
                <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-white/80">
                  <span className="min-w-0 truncate">{m.sender}</span>
                  {m.timestamp ? (
                    <span className="shrink-0 tabular-nums">
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {m.content}
            </div>
          </li>
        ) : (
          <li key={m.id} className="flex justify-start">
            <div
              className="max-w-[85%] rounded-2xl border border-surface-border bg-elevated px-3 py-2 text-sm text-accent-text"
              role="article"
            >
              {m.sender || m.timestamp ? (
                <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-muted-text">
                  <span className="min-w-0 truncate">{m.sender}</span>
                  {m.timestamp ? (
                    <span className="shrink-0 tabular-nums">
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {m.content}
            </div>
          </li>
        ),
      )}
    </ul>
  );
}

/**
 * Mounts only while a run is active. Notifies parent when the run settles
 * (completed, failed, cancelled, etc.) so we can post a final AI message.
 * Keeping this in its own component avoids conditional hook calls in the parent.
 */
function RunTracker({
  runId,
  publicToken,
  onSettled,
}: {
  runId: string;
  publicToken: string;
  onSettled: (status: string, errorMsg?: string) => void;
}) {
  const { run, error } = useRealtimeRun<typeof designAgentTask>(runId, {
    accessToken: publicToken,
  });

  useEffect(() => {
    if (error) {
      onSettled("ERROR", error.message);
      return;
    }
    if (!run?.status) return;
    if (run.status === "QUEUED" || run.status === "EXECUTING") return;
    onSettled(run.status);
  }, [run?.status, error, onSettled]);

  return null;
}

function SpecRunTracker({
  runId,
  publicToken,
  onSettled,
}: {
  runId: string;
  publicToken: string;
  onSettled: (status: string, errorMsg?: string) => void;
}) {
  const { run, error } = useRealtimeRun<typeof generateSpecTask>(runId, {
    accessToken: publicToken,
  });

  useEffect(() => {
    if (error) {
      onSettled("ERROR", error.message);
      return;
    }
    if (!run?.status) return;
    if (run.status === "QUEUED" || run.status === "EXECUTING") return;
    onSettled(run.status);
  }, [run?.status, error, onSettled]);

  return null;
}

function ArchitectChatPanelLocal() {
  const emptyDescId = useId();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendFromText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const snippet =
      trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
    setMessages((prev) => [
      ...prev,
      { id: `user-${crypto.randomUUID()}`, role: "user", content: trimmed },
      {
        id: `assistant-${crypto.randomUUID()}`,
        role: "assistant",
        content: `Preview: "${snippet}" — open a project workspace to use Ghost AI.`,
      },
    ]);
    setDraft("");
  }, []);

  const onSend = useCallback(() => {
    sendFromText(draft);
  }, [draft, sendFromText]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter") return;
      if (e.shiftKey) return;
      e.preventDefault();
      sendFromText(e.currentTarget.value);
    },
    [sendFromText],
  );

  return (
    <>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {messages.length === 0 ? (
          <ArchitectEmptyState
            emptyStateDescriptionId={emptyDescId}
            onStarterSelect={sendFromText}
          />
        ) : (
          <ArchitectMessageList messages={messages} />
        )}
      </div>

      <div className="shrink-0 border-t border-surface-border bg-base/80 p-3 backdrop-blur-sm">
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Ghost AI…"
            rows={2}
            className="min-h-[72px] max-h-[160px] resize-none bg-elevated/60 py-2.5 text-sm text-copy-primary placeholder:text-muted-text"
            aria-label="Message Ghost AI"
          />
          <Button
            type="button"
            size="icon"
            className="mt-auto shrink-0 bg-brand text-white hover:opacity-90"
            aria-label="Send message"
            title="Send"
            onClick={onSend}
          >
            <SendHorizontal className="size-4" />
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-text">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </>
  );
}

function ArchitectChatPanelRoom({ roomId }: { roomId: string }) {
  const emptyDescId = useId();
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [pendingSince, setPendingSince] = useState<number | null>(null);
  const isRunActive = Boolean(runId && publicToken);
  const scrollRef = useRef<HTMLDivElement>(null);

  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const self = useSelf();
  const { messages: statusFeedMessages } = useFeedMessages(AI_STATUS_FEED_ID);
  const { messages: chatFeedMessages } = useFeedMessages(AI_CHAT_FEED_ID);

  useEffect(() => {
    void createFeed(AI_STATUS_FEED_ID, {
      metadata: { name: "AI activity" },
    }).catch(() => {});
  }, [createFeed]);

  useEffect(() => {
    void createFeed(AI_CHAT_FEED_ID, {
      metadata: { name: "AI chat" },
    }).catch(() => {});
  }, [createFeed]);

  const latestStatusPayload = useMemo(() => {
    if (!statusFeedMessages?.length) return null;
    for (let i = statusFeedMessages.length - 1; i >= 0; i--) {
      const parsed = parseAiStatusFeedPayload(statusFeedMessages[i].data);
      if (parsed) return parsed;
    }
    return null;
  }, [statusFeedMessages]);

  const chatMessages = useMemo(() => {
    if (!chatFeedMessages?.length) return [];
    const parsed = chatFeedMessages.reduce<ChatMessage[]>((acc, m) => {
      const payload = parseAiChatMessagePayload(m.data);
      if (!payload) return acc;
      acc.push({
        id: m.id,
        role: payload.role,
        content: payload.content,
        sender: payload.sender,
        timestamp: payload.timestamp,
      });
      return acc;
    }, []);
    parsed.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    return parsed;
  }, [chatFeedMessages]);

  const messagesWithPending = useMemo(() => {
    if (!isRunActive) return chatMessages;
    return [
      ...chatMessages,
      {
        id: "pending-assistant",
        role: "assistant" as const,
        sender: "Ghost AI",
        content: "Generating canvas…",
        timestamp: pendingSince ?? undefined,
      },
    ];
  }, [chatMessages, isRunActive, pendingSince]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messagesWithPending.length, scrollToBottom]);

  const postAssistantMessage = useCallback(
    async (content: string) => {
      const payload = aiChatMessagePayloadSchema.safeParse({
        sender: "Ghost AI",
        role: "assistant",
        content,
        timestamp: Date.now(),
      });
      if (payload.success) {
        await createFeedMessage(AI_CHAT_FEED_ID, payload.data).catch(() => {});
      }
    },
    [createFeedMessage],
  );

  const onRunSettled = useCallback(
    async (status: string, errorMsg?: string) => {
      const content = errorMsg
        ? `Something went wrong: ${errorMsg}`
        : status === "COMPLETED"
          ? "Design complete. Check the canvas for updates."
          : `Run ended with status: ${status.toLowerCase()}.`;
      await postAssistantMessage(content);
      setRunId(null);
      setPublicToken(null);
      setPendingSince(null);
    },
    [postAssistantMessage],
  );

  const sendFromText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isRunActive) return;

      setSendError(null);

      // Ensure feed exists before writing (no-ops if already created)
      try {
        await createFeed(AI_CHAT_FEED_ID, { metadata: { name: "AI chat" } });
      } catch { /* already exists */ }

      // Post user message to the shared chat feed
      const userPayload = aiChatMessagePayloadSchema.safeParse({
        sender: self?.info?.name ?? "Unknown",
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      });
      if (!userPayload.success) return;

      try {
        await createFeedMessage(AI_CHAT_FEED_ID, userPayload.data);
        setDraft("");
      } catch {
        setSendError("Couldn't send message. Please try again.");
        return;
      }

      // Trigger the design agent
      try {
        const designRes = await fetch("/api/ai/design", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: trimmed, roomId }),
        });

        if (!designRes.ok) {
          const detail = await designRes.json().catch(() => null);
          const msg =
            typeof detail?.error === "string"
              ? detail.error
              : "Failed to start design agent.";
          await postAssistantMessage(msg);
          return;
        }

        const designJson = await designRes.json().catch(() => null);
        const newRunId: string | undefined = designJson?.runId;
        if (!newRunId) {
          await postAssistantMessage("Unexpected response from design agent.");
          return;
        }

        // Exchange runId for a short-lived public token
        const tokenRes = await fetch("/api/ai/design/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ runId: newRunId }),
        });

        if (!tokenRes.ok) {
          const detail = await tokenRes.json().catch(() => null);
          const msg =
            typeof detail?.error === "string"
              ? detail.error
              : "Couldn't connect to run.";
          await postAssistantMessage(msg);
          return;
        }

        const tokenJson = await tokenRes.json().catch(() => null);
        const token: string | undefined = tokenJson?.token;
        if (!token) {
          await postAssistantMessage("Couldn't get run token.");
          return;
        }

        // Mount RunTracker — disables input until run settles
        setRunId(newRunId);
        setPublicToken(token);
        setPendingSince(Date.now());
      } catch {
        await postAssistantMessage(
          "Something went wrong starting the design agent.",
        );
        setRunId(null);
        setPublicToken(null);
        setPendingSince(null);
      }
    },
    [
      createFeed,
      createFeedMessage,
      isRunActive,
      postAssistantMessage,
      roomId,
      self?.info?.name,
    ],
  );

  const onSend = useCallback(() => {
    void sendFromText(draft);
  }, [draft, sendFromText]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter") return;
      if (e.shiftKey) return;
      e.preventDefault();
      void sendFromText(e.currentTarget.value);
    },
    [sendFromText],
  );

  // Status strip text — only show while a run is active
  const statusLine = isRunActive
    ? (latestStatusPayload?.text ?? "Ghost AI is working…")
    : null;

  return (
    <>
      {/* RunTracker mounts only during an active run to avoid conditional hooks */}
      {runId && publicToken ? (
        <RunTracker
          runId={runId}
          publicToken={publicToken}
          onSettled={onRunSettled}
        />
      ) : null}

      {statusLine ? (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-surface-border bg-elevated/40 px-4 py-2"
          aria-live="polite"
        >
          <span
            className="size-2 shrink-0 rounded-full bg-brand shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent-primary)_18%,transparent)]"
            aria-hidden
          />
          <p className="min-w-0 truncate text-xs text-muted-text">
            {statusLine}
          </p>
        </div>
      ) : null}

      <div className="shrink-0 px-3 pt-3">
        <DesignAgentActivity defaultCollapsed className="shadow-none" />
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {messagesWithPending.length === 0 ? (
          <ArchitectEmptyState
            emptyStateDescriptionId={emptyDescId}
            onStarterSelect={(t) => void sendFromText(t)}
          />
        ) : (
          <ArchitectMessageList messages={messagesWithPending} />
        )}
      </div>

      <div className="shrink-0 border-t border-surface-border bg-base/80 p-3 backdrop-blur-sm">
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isRunActive ? "Ghost AI is working…" : "Ask Ghost AI…"}
            rows={2}
            className="min-h-[72px] max-h-[160px] resize-none bg-elevated/60 py-2.5 text-sm text-copy-primary placeholder:text-muted-text disabled:opacity-50"
            aria-label="Message Ghost AI"
            disabled={isRunActive}
          />
          <Button
            type="button"
            size="icon"
            className="mt-auto shrink-0 bg-brand text-white hover:opacity-90 disabled:opacity-50"
            aria-label={isRunActive ? "Generating…" : "Send message"}
            title={isRunActive ? "Generating…" : "Send"}
            onClick={onSend}
            disabled={isRunActive}
          >
            {isRunActive ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </Button>
        </div>
        {sendError ? (
          <p className="mt-2 text-[11px] text-destructive" role="status">
            {sendError}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-muted-text">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </>
  );
}

interface ProjectSpecListItem {
  id: string;
  createdAt: string;
  filename: string;
}

interface SpecChatMessage {
  role: "user" | "assistant";
  content: string;
}

function formatSpecCreatedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso;
  return d.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SpecMarkdown({ content }: { content: string }) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-copy-primary",
        "[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-primary-text",
        "[&_h2]:mt-5 [&_h2]:text-[1rem] [&_h2]:leading-6 [&_h2]:font-semibold [&_h2]:text-primary-text",
        "[&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-primary-text",
        "[&_p]:mt-3 [&_p:first-child]:mt-0",
        "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:mt-1",
        "[&_code]:rounded-md [&_code]:bg-elevated/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        "[&_pre]:mt-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-surface-border [&_pre]:bg-elevated/60 [&_pre]:p-3",
        "[&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-primary-text",
        "[&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-surface-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-text",
        "[&_hr]:my-4 [&_hr]:border-surface-border",
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function SpecsTab({
  projectId,
  chatHistory = [],
  nodes = [],
  edges = [],
}: {
  projectId?: string;
  chatHistory?: SpecChatMessage[];
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
}) {
  const [items, setItems] = useState<ProjectSpecListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isStartingGeneration, setIsStartingGeneration] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const [selected, setSelected] = useState<ProjectSpecListItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Trigger a refetch by bumping the counter — keeps fetch logic in the effect
  // so setState calls happen during the synchronization step, not synchronously
  // inside another effect.
  const refreshList = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/specs`, {
          method: "GET",
          signal: controller.signal,
        });
        if (cancelled) return;
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          const msg =
            typeof detail?.error === "string" ? detail.error : "Failed to load specs.";
          setLoadError(msg);
          setItems([]);
          return;
        }
        const json = (await res.json().catch(() => null)) as
          | { specs?: ProjectSpecListItem[] }
          | null;
        if (cancelled) return;
        setItems(Array.isArray(json?.specs) ? json.specs : []);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setLoadError("Failed to load specs.");
        setItems([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [projectId, refreshCounter]);

  const openPreview = useCallback(
    async (spec: ProjectSpecListItem) => {
      if (!projectId) return;
      setSelected(spec);
      setPreviewOpen(true);
      setPreviewContent(null);
      setPreviewError(null);
      setPreviewLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/specs/${spec.id}`, { method: "GET" });
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          const msg = typeof detail?.error === "string" ? detail.error : "Failed to load spec preview.";
          setPreviewError(msg);
          return;
        }
        const text = await res.text();
        setPreviewContent(text);
      } catch {
        setPreviewError("Failed to load spec preview.");
      } finally {
        setPreviewLoading(false);
      }
    },
    [projectId],
  );

  const isGenerating = isStartingGeneration || Boolean(runId && publicToken);

  const onSpecRunSettled = useCallback(
    async (status: string, errorMsg?: string) => {
      setRunId(null);
      setPublicToken(null);
      setIsStartingGeneration(false);

      if (errorMsg) {
        setGenerateError(errorMsg);
        return;
      }

      if (status === "COMPLETED") {
        setGenerateError(null);
        refreshList();
        return;
      }

      setGenerateError(`Spec run ended with status: ${status.toLowerCase()}.`);
    },
    [refreshList],
  );

  const generateSpec = useCallback(async () => {
    if (!projectId || isGenerating) return;

    setGenerateError(null);
    setIsStartingGeneration(true);

    try {
      const specRes = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roomId: projectId,
          chatHistory,
          nodes,
          edges,
        }),
      });

      if (!specRes.ok) {
        const detail = await specRes.json().catch(() => null);
        setGenerateError(
          typeof detail?.error === "string"
            ? detail.error
            : "Failed to start spec generation.",
        );
        return;
      }

      const specJson = await specRes.json().catch(() => null);
      const nextRunId: string | undefined = specJson?.runId;
      if (!nextRunId) {
        setGenerateError("Unexpected response from spec generator.");
        return;
      }

      const tokenRes = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: nextRunId }),
      });

      if (!tokenRes.ok) {
        const detail = await tokenRes.json().catch(() => null);
        setGenerateError(
          typeof detail?.error === "string"
            ? detail.error
            : "Couldn't connect to spec run.",
        );
        return;
      }

      const tokenJson = await tokenRes.json().catch(() => null);
      const token: string | undefined = tokenJson?.token;
      if (!token) {
        setGenerateError("Couldn't get spec run token.");
        return;
      }

      setRunId(nextRunId);
      setPublicToken(token);
    } catch {
      setGenerateError("Something went wrong starting spec generation.");
      setRunId(null);
      setPublicToken(null);
    } finally {
      setIsStartingGeneration(false);
    }
  }, [chatHistory, edges, isGenerating, nodes, projectId]);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setSelected(null);
    setPreviewContent(null);
    setPreviewError(null);
    setPreviewLoading(false);
  }, []);

  return (
    <div className="mt-0 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-4 pt-2 outline-none">
      {runId && publicToken ? (
        <SpecRunTracker
          runId={runId}
          publicToken={publicToken}
          onSettled={onSpecRunSettled}
        />
      ) : null}

      <Button
        type="button"
        className="w-full bg-brand text-white hover:opacity-90 disabled:opacity-50"
        disabled={!projectId || isGenerating}
        aria-disabled={!projectId || isGenerating}
        title={
          projectId
            ? "Generate a Markdown spec from the current canvas and chat"
            : "Open a project workspace to generate specs"
        }
        onClick={() => void generateSpec()}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Generating Spec…
          </>
        ) : (
          "Generate Spec"
        )}
      </Button>

      {generateError ? (
        <div className="rounded-xl border border-surface-border/70 bg-base/40 px-3 py-2 text-xs text-destructive">
          {generateError}
        </div>
      ) : null}

      {!projectId ? (
        <div className="rounded-2xl border border-surface-border bg-elevated p-4 text-sm text-muted-text">
          Open a project workspace to view specs.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-surface-border bg-elevated">
          <div className="flex items-center justify-between gap-3 border-b border-surface-border px-3 py-2">
            <p className="text-xs font-medium text-muted-text">Specs</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-text hover:text-primary-text"
              onClick={refreshList}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>

          <ScrollArea className="h-full">
            <div className="flex flex-col gap-1 p-2">
              {isLoading ? (
                <div className="flex items-center gap-2 rounded-xl px-3 py-3 text-xs text-muted-text">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading specs…
                </div>
              ) : loadError ? (
                <div className="rounded-xl border border-surface-border/70 bg-base/40 px-3 py-3 text-xs text-destructive">
                  {loadError}
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-xl border border-surface-border/70 bg-base/40 px-3 py-3 text-xs text-muted-text">
                  No specs yet.
                </div>
              ) : (
                items.map((spec) => (
                  <div
                    key={spec.id}
                    className="flex items-center gap-2 rounded-xl border border-transparent bg-base/30 px-2.5 py-2 hover:border-surface-border hover:bg-base/40"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => void openPreview(spec)}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-elevated text-ai-text">
                        <FileText className="size-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-primary-text">
                          {spec.filename}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-text">
                          {formatSpecCreatedAt(spec.createdAt)}
                        </p>
                      </div>
                    </button>

                    <a
                      href={`/api/projects/${projectId}/specs/${spec.id}/download`}
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-lg border border-surface-border bg-elevated text-muted-text transition hover:text-primary-text",
                      )}
                      aria-label={`Download ${spec.filename}`}
                      title="Download"
                    >
                      <Download className="size-4" aria-hidden />
                    </a>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={(v) => (v ? null : closePreview())}>
        <DialogContent className="sm:max-w-176">
          <DialogHeader>
            <DialogTitle className="truncate">
              {selected?.filename ?? "Spec preview"}
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between gap-3">
              <span className="truncate">
                {selected?.createdAt ? formatSpecCreatedAt(selected.createdAt) : null}
              </span>
              {projectId && selected ? (
                <a
                  href={`/api/projects/${projectId}/specs/${selected.id}/download`}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-lg border border-surface-border bg-elevated px-2 text-xs text-muted-text hover:text-primary-text",
                  )}
                >
                  <Download className="size-3.5" aria-hidden />
                  Download
                </a>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] rounded-lg border border-surface-border bg-base/30">
            <div className="p-4">
              {previewLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-text">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading preview…
                </div>
              ) : previewError ? (
                <div className="text-xs text-destructive">{previewError}</div>
              ) : previewContent ? (
                <SpecMarkdown content={previewContent} />
              ) : (
                <div className="text-xs text-muted-text">No preview available.</div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SpecsTabRoom({
  projectId,
  nodes,
  edges,
}: {
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}) {
  const { messages: chatFeedMessages } = useFeedMessages(AI_CHAT_FEED_ID);

  const chatHistory = useMemo(() => {
    if (!chatFeedMessages?.length) return [];
    return chatFeedMessages.reduce<SpecChatMessage[]>((acc, m) => {
      const payload = parseAiChatMessagePayload(m.data);
      if (payload) {
        acc.push({ role: payload.role, content: payload.content });
      }
      return acc;
    }, []);
  }, [chatFeedMessages]);

  return (
    <SpecsTab
      projectId={projectId}
      chatHistory={chatHistory}
      nodes={nodes}
      edges={edges}
    />
  );
}

export function AiWorkspaceSidebar({
  open,
  onClose,
  roomId,
  canvasNodes = [],
  canvasEdges = [],
}: AiWorkspaceSidebarProps) {
  const roomConnected = Boolean(roomId);

  return (
    <aside
      className={cn(
        "fixed top-14 right-0 z-40 flex h-[calc(100dvh-3.5rem)] w-[min(100vw,20rem)] flex-col overflow-hidden border border-surface-border bg-base/95 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.85),inset_1px_0_0_0_color-mix(in_oklab,var(--border-default)_65%,transparent)] backdrop-blur-md supports-backdrop-filter:bg-base/90",
        "transition-transform duration-200 ease-out motion-reduce:transition-none",
        open ? "translate-x-0" : "pointer-events-none translate-x-full",
      )}
      aria-hidden={!open}
    >
      <div className="flex shrink-0 items-start gap-3 border-b border-surface-border px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-elevated text-ai-text">
          <Bot className="size-4 stroke-[1.75]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-sm font-semibold tracking-tight text-primary-text">
            AI Workspace
          </h2>
          <p className="mt-0.5 text-xs text-muted-text">
            Collaborate with Ghost AI
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-text hover:text-primary-text"
          aria-label="Close AI sidebar"
          title="Close"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <Tabs defaultValue="architect" className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList
          variant="default"
          className="mx-3 mt-3 h-auto w-auto shrink-0 gap-1 rounded-xl bg-subtle/80 p-1"
        >
          <TabsTrigger
            value="architect"
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-text transition-none",
              "data-active:bg-accent data-active:text-accent-foreground data-active:shadow-sm",
              "dark:data-active:border-transparent dark:data-active:bg-accent dark:data-active:text-accent-foreground",
            )}
          >
            AI Architect
          </TabsTrigger>
          <TabsTrigger
            value="specs"
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-text transition-none",
              "data-active:bg-accent data-active:text-accent-foreground data-active:shadow-sm",
              "dark:data-active:border-transparent dark:data-active:bg-accent dark:data-active:text-accent-foreground",
            )}
          >
            Specs
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="architect"
          className="mt-0 flex min-h-0 flex-1 flex-col px-0 pb-0 outline-none data-[orientation=horizontal]:flex-1"
        >
          {roomConnected && roomId ? (
            <ArchitectChatPanelRoom roomId={roomId} />
          ) : (
            <ArchitectChatPanelLocal />
          )}
        </TabsContent>

        <TabsContent value="specs" className="mt-0 flex min-h-0 flex-1 flex-col outline-none">
          {roomConnected && roomId ? (
            <SpecsTabRoom
              projectId={roomId}
              nodes={canvasNodes}
              edges={canvasEdges}
            />
          ) : (
            <SpecsTab />
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}
