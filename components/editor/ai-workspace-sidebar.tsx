"use client";

import { Bot, Download, FileText, SendHorizontal, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface AiWorkspaceSidebarProps {
  open: boolean;
  onClose: () => void;
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
              className="max-w-[85%] rounded-2xl border-2 border-brand/50 bg-brand-dim px-3 py-2 text-sm text-copy-primary"
              role="article"
            >
              {m.content}
            </div>
          </li>
        ) : (
          <li key={m.id} className="flex justify-start">
            <div
              className="max-w-[85%] rounded-2xl border border-surface-border bg-elevated px-3 py-2 text-sm text-accent-text"
              role="article"
            >
              {m.content}
            </div>
          </li>
        ),
      )}
    </ul>
  );
}

export function AiWorkspaceSidebar({ open, onClose }: AiWorkspaceSidebarProps) {
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
        content: `Preview: "${snippet}" — AI replies will appear here once generation is wired.`,
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
              "data-[active]:bg-accent data-[active]:text-accent-foreground data-[active]:shadow-sm",
              "dark:data-[active]:border-transparent dark:data-[active]:bg-accent dark:data-[active]:text-accent-foreground",
            )}
          >
            AI Architect
          </TabsTrigger>
          <TabsTrigger
            value="specs"
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-text transition-none",
              "data-[active]:bg-accent data-[active]:text-accent-foreground data-[active]:shadow-sm",
              "dark:data-[active]:border-transparent dark:data-[active]:bg-accent dark:data-[active]:text-accent-foreground",
            )}
          >
            Specs
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="architect"
          className="mt-0 flex min-h-0 flex-1 flex-col px-0 pb-0 outline-none data-[orientation=horizontal]:flex-1"
        >
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
                className="mt-auto shrink-0 bg-[var(--accent-primary)] text-white hover:opacity-90"
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
        </TabsContent>

        <TabsContent
          value="specs"
          className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2 outline-none"
        >
          <Button
            type="button"
            className="w-full bg-[var(--accent-primary)] text-white hover:opacity-90"
          >
            Generate Spec
          </Button>

          <div className="rounded-2xl border border-surface-border bg-elevated p-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--border-default)_40%,transparent)]">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-base text-ai-text">
                <FileText className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-primary-text">
                  system-architecture.md
                </p>
                <p className="text-xs leading-relaxed text-accent-text">
                  ## Overview
                  <br />
                  Canvas-derived specification preview — services, data flows, and
                  boundaries…
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 w-full gap-2 border-surface-border text-muted-text"
              disabled
              aria-disabled
            >
              <Download className="size-4" aria-hidden />
              Download
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
