"use client";

import { UserButton } from "@clerk/nextjs";
import { Bot, PanelLeftClose, PanelLeftOpen, Share } from "lucide-react";
import { useState } from "react";

import { WorkspaceCanvas } from "@/components/editor/canvas/workspace-canvas";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ShareDialog } from "@/components/editor/share-dialog";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { Button } from "@/components/ui/button";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { useEditorProjectActions } from "@/hooks/use-editor-project-actions";
import { useShareDialog } from "@/hooks/use-share-dialog";
import type { EditorProject } from "@/types/editor-project";

interface WorkspaceLayoutProps {
  projectId: string;
  projectName: string;
  myProjects: EditorProject[];
  sharedProjects: EditorProject[];
}

export function WorkspaceLayout({
  projectId,
  projectName,
  myProjects,
  sharedProjects,
}: WorkspaceLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleAiSidebar = () => setAiSidebarOpen(!aiSidebarOpen);

  const projectActions = useEditorProjectActions({
    initialMyProjects: myProjects,
    initialSharedProjects: sharedProjects,
    activeWorkspaceId: projectId,
  });
  const share = useShareDialog(projectId);

  return (
    <div className="min-h-dvh bg-background">
      {/* Navbar — frosted glass, aligned with auth / marketing shell */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 shrink-0 items-stretch border-b border-border/60 bg-background/75 backdrop-blur-md supports-backdrop-filter:bg-background/65">
        <div className="grid h-full w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4">
          <div className="flex items-center justify-start">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-expanded={sidebarOpen}
              aria-label={
                sidebarOpen ? "Close project sidebar" : "Open project sidebar"
              }
              onClick={toggleSidebar}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
          </div>

          <h1 className="min-w-0 truncate text-center text-sm font-semibold tracking-tight text-foreground">
            {projectName}
          </h1>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Share project"
              onClick={() => share.setOpen(true)}
            >
              <Share className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-expanded={aiSidebarOpen}
              aria-label={
                aiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"
              }
              onClick={toggleAiSidebar}
            >
              <Bot className="size-4" />
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

      {/* Main layout */}
      <div className="flex min-h-dvh pt-14">
        <ProjectDialogs {...projectActions} />
        <ShareDialog share={share} />

        <ProjectSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          myProjects={projectActions.myProjects}
          sharedProjects={projectActions.sharedProjects}
          onNewProject={() => projectActions.openCreate()}
          onRenameProject={(project) => projectActions.openRename(project)}
          onDeleteProject={(project) => projectActions.openDelete(project)}
          currentProjectId={projectId}
        />

        {/* Canvas — dot grid, ambient glows, subtle nodes (auth-marketing style) */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-base">
          <div className="absolute inset-0 z-0" aria-hidden>
            <div className="pointer-events-none absolute bottom-[-18%] right-[-12%] h-[min(75%,36rem)] w-[min(75%,36rem)] rounded-full bg-[radial-gradient(circle_closest-side,var(--accent-primary)_0%,transparent_100%)] opacity-[0.08]" />
            <div className="pointer-events-none absolute left-[-14%] top-[-14%] h-[min(55%,24rem)] w-[min(55%,24rem)] rounded-full bg-[radial-gradient(circle_closest-side,var(--accent-ai)_0%,transparent_100%)] opacity-[0.06]" />
          </div>

          <div className="relative z-10 min-h-[calc(100dvh-3.5rem)] flex-1">
            <WorkspaceCanvas roomId={projectId} />
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
                Prompt the graph, refine nodes, and export specs — this panel
                will host chat and context for your canvas.
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
