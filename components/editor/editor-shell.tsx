"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { Button } from "@/components/ui/button";
import { useEditorProjectActions } from "@/hooks/use-editor-project-actions";
import type { EditorProject } from "@/types/editor-project";

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
  const projectActions = useEditorProjectActions({
    initialMyProjects,
    initialSharedProjects,
    activeWorkspaceId: workspaceId,
  });

  return (
    <div className="relative min-h-screen bg-background">
      <EditorNavbar
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((open) => !open)}
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

      <main className="min-h-screen flex justify-center items-center">
        {workspaceId ? (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
            <h1 className="text-balance text-2xl font-semibold tracking-tight">
              Project workspace
            </h1>
            <p className="text-pretty font-mono text-xs text-muted-foreground break-all">
              {workspaceId}
            </p>
            <p className="text-pretty text-sm text-muted-foreground">
              Canvas and collaboration will live here. Use the same id for your
              Liveblocks room as for this URL path.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
            <h1 className="text-balance text-2xl font-semibold tracking-tight">
              Create a project or open an existing one
            </h1>
            <p className="text-pretty text-sm text-muted-foreground">
              Start a new architecture workspace, or choose a project from the
              sidebar.
            </p>
            <Button
              type="button"
              className="mt-2 gap-2"
              onClick={() => {
                projectActions.openCreate();
              }}
            >
              <Plus className="size-4" />
              New Project
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
