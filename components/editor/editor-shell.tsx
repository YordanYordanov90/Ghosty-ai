"use client";

import { Bot, LayoutTemplate, Plus, Share, Sparkles } from "lucide-react";
import { useState } from "react";

import { AiWorkspaceSidebar } from "@/components/editor/ai-workspace-sidebar";
import { EditorTopNav } from "@/components/editor/editor-top-nav";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ShareDialog } from "@/components/editor/share-dialog";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { Button } from "@/components/ui/button";
import { useEditorProjectActions } from "@/hooks/use-editor-project-actions";
import { useShareDialog } from "@/hooks/use-share-dialog";
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
        <Share className="size-4 shrink-0" />
        <span>Share</span>
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
      <EditorTopNav
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((open) => !open)}
        title={workspaceId ? "Project workspace" : "Editor"}
        trailingActions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!workspaceId}
              title={
                workspaceId
                  ? undefined
                  : "Open or create a project to import templates"
              }
              aria-label={
                workspaceId
                  ? "Open starter templates"
                  : "Templates — open a project first"
              }
              className="gap-2 disabled:opacity-45"
            >
              <LayoutTemplate className="size-4 shrink-0" />
              <span className="truncate">Templates</span>
            </Button>
            {workspaceId ? (
              <EditorShellShareToolbar projectId={workspaceId} />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={aiSidebarOpen}
              title={aiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
              aria-label={
                aiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"
              }
              onClick={() => setAiSidebarOpen((open) => !open)}
              className="gap-2"
            >
              <Bot className="size-4 shrink-0" />
              <span>AI</span>
            </Button>
          </>
        }
      />
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

        <AiWorkspaceSidebar
          open={aiSidebarOpen}
          onClose={() => setAiSidebarOpen(false)}
        />
      </main>
    </div>
  );
}
