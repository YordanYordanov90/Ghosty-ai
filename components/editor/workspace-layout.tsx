"use client";

import {
  AlertCircle,
  Bot,
  Check,
  LayoutTemplate,
  Loader2,
  Share,
} from "lucide-react";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { AiWorkspaceSidebar } from "@/components/editor/ai-workspace-sidebar";
import {
  type CanvasSnapshot,
  WorkspaceCanvas,
  WorkspaceCanvasErrorFallback,
  WorkspaceCanvasLoading,
} from "@/components/editor/canvas/workspace-canvas";
import { EditorTopNav } from "@/components/editor/editor-top-nav";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ShareDialog } from "@/components/editor/share-dialog";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import { Button } from "@/components/ui/button";
import { useEditorProjectActions } from "@/hooks/use-editor-project-actions";
import { useShareDialog } from "@/hooks/use-share-dialog";
import type { WorkspaceCanvasHandle } from "@/components/editor/canvas/workspace-canvas";
import type { SaveStatus } from "@/hooks/use-canvas-autosave";
import type { EditorProject } from "@/types/editor-project";
import { cn } from "@/lib/utils";

/** Small save-status pill shown in the workspace top-nav trailingActions slot. */
function CanvasSaveStatus({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs",
        status === "error" ? "text-destructive" : "text-muted-foreground",
      )}
      aria-live="polite"
    >
      {status === "saving" && (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden />
          <span>Saving…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3 text-emerald-500" aria-hidden />
          <span>Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="size-3" aria-hidden />
          <span>Save failed</span>
        </>
      )}
    </span>
  );
}

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
  const [starterOpen, setStarterOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [canvasSnapshot, setCanvasSnapshot] = useState<CanvasSnapshot>({
    nodes: [],
    edges: [],
  });
  const canvasRef = useRef<WorkspaceCanvasHandle | null>(null);
  const initialPresence = useMemo(
    () => ({ cursor: null, thinking: false }),
    [],
  );

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
      <EditorTopNav
        sidebarOpen={sidebarOpen}
        onSidebarToggle={toggleSidebar}
        title={projectName}
        trailingActions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Starter templates"
              aria-label="Open starter templates"
              onClick={() => setStarterOpen(true)}
              className="gap-2"
            >
              <LayoutTemplate className="size-4 shrink-0" />
              <span>Templates</span>
            </Button>
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
            <CanvasSaveStatus status={saveStatus} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={aiSidebarOpen}
              title={aiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
              aria-label={
                aiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"
              }
              onClick={toggleAiSidebar}
              className="gap-2"
            >
              <Bot className="size-4 shrink-0" />
              <span>AI</span>
            </Button>
          </>
        }
      />

      {/* Main layout */}
      <div className="flex min-h-dvh pt-14">
        <ProjectDialogs {...projectActions} />
        <ShareDialog share={share} />
        <StarterTemplatesModal
          open={starterOpen}
          onOpenChange={setStarterOpen}
          onImport={(template) => {
            canvasRef.current?.importTemplate(template);
          }}
        />

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

        <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
          <RoomProvider id={projectId} initialPresence={initialPresence}>
            {/* Canvas — dot grid, ambient glows, subtle nodes (auth-marketing style) */}
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-base">
              <div className="absolute inset-0 z-0" aria-hidden>
                <div className="pointer-events-none absolute bottom-[-18%] right-[-12%] h-[min(75%,36rem)] w-[min(75%,36rem)] rounded-full bg-[radial-gradient(circle_closest-side,var(--accent-primary)_0%,transparent_100%)] opacity-[0.08]" />
                <div className="pointer-events-none absolute left-[-14%] top-[-14%] h-[min(55%,24rem)] w-[min(55%,24rem)] rounded-full bg-[radial-gradient(circle_closest-side,var(--accent-ai)_0%,transparent_100%)] opacity-[0.06]" />
              </div>

              <div className="relative z-10 min-h-[calc(100dvh-3.5rem)] flex-1">
                <ErrorBoundary fallback={<WorkspaceCanvasErrorFallback />}>
                  <ClientSideSuspense fallback={<WorkspaceCanvasLoading />}>
                    <WorkspaceCanvas
                      ref={canvasRef}
                      roomId={projectId}
                      onSaveStatusChange={setSaveStatus}
                      onCanvasSnapshotChange={setCanvasSnapshot}
                    />
                  </ClientSideSuspense>
                </ErrorBoundary>
              </div>
            </div>

            <AiWorkspaceSidebar
              roomId={projectId}
              canvasNodes={canvasSnapshot.nodes}
              canvasEdges={canvasSnapshot.edges}
              open={aiSidebarOpen}
              onClose={() => setAiSidebarOpen(false)}
            />
          </RoomProvider>
        </LiveblocksProvider>
      </div>
    </div>
  );
}
