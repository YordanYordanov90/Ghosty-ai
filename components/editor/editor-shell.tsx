"use client";

import { UserButton } from "@clerk/nextjs";
import { Bot, PanelLeftClose, PanelLeftOpen, Plus, Share, Sparkles } from "lucide-react";
import { useState } from "react";

import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ShareDialog } from "@/components/editor/share-dialog";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { Button } from "@/components/ui/button";
import { useEditorProjectActions } from "@/hooks/use-editor-project-actions";
import { useShareDialog } from "@/hooks/use-share-dialog";
import { clerkAppearance } from "@/lib/clerk-appearance";
import type { EditorProject } from "@/types/editor-project";

function EditorShellShareToolbar({ projectId }: { projectId: string }) {
  const share = useShareDialog(projectId);
  return (
    <>
      <ShareDialog share={share} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        title="Share"
        aria-label="Share project"
        onClick={() => share.setOpen(true)}
        className="gap-2"
      >
        <Share className="size-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>
    </>
  );
}

export interface EditorShellProps {
  initialMyProjects: EditorProject[];
  initialSharedProjects: EditorProject[];
  workspaceId: string | null;
}

export function EditorShell({
  initialMyProjects,
  initialSharedProjects,
  workspaceId,
}: EditorShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const projectActions = useEditorProjectActions({
    initialMyProjects,
    initialSharedProjects,
    activeWorkspaceId: workspaceId,
  });

  return (
    <div className="min-h-dvh bg-background">
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 shrink-0 items-stretch border-b border-border/60 bg-background/75 backdrop-blur-md supports-backdrop-filter:bg-background/65">
        <div className="grid h-full w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4">
          <div className="flex items-center justify-start">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={sidebarOpen}
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-label={sidebarOpen ? "Close project sidebar" : "Open project sidebar"}
              onClick={() => setSidebarOpen((open) => !open)}
              className="gap-2"
            >
              {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
              <span className="hidden sm:inline">Projects</span>
            </Button>
          </div>
          <h1 className="min-w-0 truncate text-center text-sm font-semibold tracking-tight text-foreground">
            {workspaceId ? "Project workspace" : "Editor"}
          </h1>
          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            {workspaceId ? <EditorShellShareToolbar projectId={workspaceId} /> : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={aiSidebarOpen}
              title={aiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
              aria-label={aiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
              onClick={() => setAiSidebarOpen((open) => !open)}
              className="gap-2"
            >
              <Bot className="size-4" />
              <span className="hidden sm:inline">AI</span>
            </Button>
            <UserButton
              appearance={{
                ...clerkAppearance.userButton,
                variables: clerkAppearance.variables,
              }}
              userProfileProps={{
                appearance: {
                  ...clerkAppearance.userProfile,
                  variables: clerkAppearance.variables,
                },
              }}
            />
          </div>
        </div>
      </header>
      <ProjectSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        myProjects={projectActions.myProjects}
        sharedProjects={projectActions.sharedProjects}
        onNewProject={() => {
          projectActions.openCreate();
        }}
        onRenameProject={(p: EditorProject) => {
          projectActions.openRename(p);
        }}
        onDeleteProject={(p: EditorProject) => {
          projectActions.openDelete(p);
        }}
      />

      <ProjectDialogs {...projectActions} />

      <main className="flex min-h-dvh pt-14">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-base">
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
            <div className="absolute bottom-[-18%] right-[-12%] h-[min(75%,36rem)] w-[min(75%,36rem)] rounded-full bg-[radial-gradient(circle_closest-side,var(--accent-primary)_0%,transparent_100%)] opacity-[0.08]" />
            <div className="absolute left-[-14%] top-[-14%] h-[min(55%,24rem)] w-[min(55%,24rem)] rounded-full bg-[radial-gradient(circle_closest-side,var(--accent-ai)_0%,transparent_100%)] opacity-[0.06]" />
            <div className="editor-canvas-dots absolute inset-0 opacity-[0.35]" />
          </div>

          <div className="pointer-events-none absolute inset-0 z-1" aria-hidden>
            <div className="auth-marketing-node-pulse absolute left-[10%] top-[38%] size-14 rounded-2xl border border-chart-1/40 bg-chart-1/10 shadow-[0_0_32px_-8px_color-mix(in_oklab,var(--chart-1)_35%,transparent)] [animation-delay:0s]" />
            <div className="auth-marketing-node-pulse absolute right-[18%] top-[32%] size-11 rotate-45 rounded-md border border-chart-5/40 bg-chart-5/12 shadow-[0_0_28px_-8px_color-mix(in_oklab,var(--chart-5)_38%,transparent)] [animation-delay:0.7s]" />
            <div className="auth-marketing-node-pulse absolute bottom-[26%] right-[24%] size-9 rounded-full border border-brand/35 bg-brand-dim shadow-[0_0_24px_-6px_color-mix(in_oklab,var(--accent-primary)_45%,transparent)] [animation-delay:1.4s]" />
          </div>

          <div className="relative z-10 flex min-h-[calc(100dvh-3.5rem)] flex-1 items-center justify-center p-6 sm:p-10">
            {workspaceId ? (
              <div className="w-full max-w-md rounded-2xl border border-dashed border-border-default/70 bg-elevated/35 px-8 py-10 text-center shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_12%,transparent)] backdrop-blur-[2px]">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-border-default bg-base text-brand shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_14%,transparent)]">
                  <Sparkles className="size-5" strokeWidth={2} aria-hidden />
                </div>
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  Project workspace
                  <span className="text-brand">.</span>
                </p>
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                  {workspaceId}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Canvas and collaboration will live here. Use this same id for your
                  Liveblocks room.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-md rounded-2xl border border-dashed border-border-default/70 bg-elevated/35 px-8 py-10 text-center shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_12%,transparent)] backdrop-blur-[2px]">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-border-default bg-base text-brand shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_14%,transparent)]">
                  <Sparkles className="size-5" strokeWidth={2} aria-hidden />
                </div>
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  Create or open project
                  <span className="text-brand">.</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Start architecture workspace or pick existing project from sidebar.
                </p>
                <Button
                  type="button"
                  className="mt-5 gap-2"
                  onClick={() => {
                    projectActions.openCreate();
                  }}
                >
                  <Plus className="size-4" />
                  New Project
                </Button>
              </div>
            )}
          </div>
        </div>

        {aiSidebarOpen && (
          <aside className="flex w-80 shrink-0 flex-col border-l border-border-default bg-surface shadow-[inset_1px_0_0_0_color-mix(in_oklab,var(--border-default)_80%,transparent)]">
            <div className="shrink-0 border-b border-border/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI assistant
              </p>
              <p className="mt-1 text-sm font-medium tracking-tight text-foreground">
                Co-pilot
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Prompt graph, refine nodes, and export specs. This panel will host
                chat and context for canvas.
              </p>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
