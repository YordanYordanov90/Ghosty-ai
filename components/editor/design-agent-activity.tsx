"use client";

import { useFeedMessages } from "@liveblocks/react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { DESIGN_AGENT_FEED_ID } from "@/lib/design-agent-constants";
import { cn } from "@/lib/utils";

interface FeedPayload {
  message?: string;
  phase?: string;
}

export function DesignAgentActivity({
  className,
  defaultCollapsed = true,
}: {
  className?: string;
  defaultCollapsed?: boolean;
}) {
  const { messages, error, isLoading } = useFeedMessages(DESIGN_AGENT_FEED_ID);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const recent = useMemo(() => (messages ?? []).slice(-5), [messages]);
  const latest = recent[recent.length - 1];
  const latestData = (latest?.data ?? {}) as FeedPayload;
  const latestPhase = latestData.phase;
  const latestText = latestData.message ?? "";

  if (isLoading || error || recent.length === 0) return null;

  return (
    <div
      className={cn("w-full", className)}
      aria-live="polite"
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-surface-border bg-base/75 shadow-[0_14px_36px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md",
          latestPhase === "error" && "border-destructive/40",
          latestPhase === "complete" && "border-emerald-500/30",
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-text hover:bg-elevated/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={!collapsed}
        >
          <span className="grid size-7 place-items-center rounded-xl border border-surface-border bg-elevated/60 text-ai-text">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-primary-text">AI activity</span>
            {latestText ? (
              <span className="ml-2 truncate text-muted-text">
                {latestPhase === "processing"
                  ? "Working"
                  : latestPhase === "complete"
                    ? "Done"
                    : latestPhase === "error"
                      ? "Error"
                      : "Update"}
                <span className="text-muted-text"> · </span>
                {latestText}
              </span>
            ) : null}
          </span>
          {collapsed ? (
            <ChevronDown className="size-4 shrink-0 text-muted-text" />
          ) : (
            <ChevronUp className="size-4 shrink-0 text-muted-text" />
          )}
        </button>

        {!collapsed ? (
          <div className="flex flex-col gap-1 border-t border-surface-border/70 px-2 py-2">
            {recent.map((msg) => {
              const data = msg.data as FeedPayload;
              const text = data.message ?? "";
              const phase = data.phase;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-xl border border-surface-border/70 bg-elevated/40 px-2.5 py-1.5 text-[11px] shadow-sm",
                    phase === "error" && "border-destructive/40 text-destructive",
                    phase === "complete" &&
                      "border-emerald-500/25 text-emerald-200",
                  )}
                >
                  <span className="font-medium text-accent-text">
                    {phase === "start"
                      ? "AI"
                      : phase === "processing"
                        ? "AI · Working"
                        : phase === "complete"
                          ? "AI · Done"
                          : phase === "error"
                            ? "AI · Error"
                            : "AI"}
                  </span>
                  <span className="text-muted-text"> — </span>
                  <span className="text-primary">{text}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
