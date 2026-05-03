"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { Button } from "@/components/ui/button";
import { useEditorProjectDialogs } from "@/hooks/use-editor-project-dialogs";

export default function EditorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const projectDialogs = useEditorProjectDialogs();

  return (
    <div className="relative min-h-screen bg-background">
      <EditorNavbar
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((open) => !open)}
      />
      <ProjectSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        myProjects={projectDialogs.myProjects}
        sharedProjects={projectDialogs.sharedProjects}
        onNewProject={() => {
          projectDialogs.openCreate();
        }}
        onRenameProject={(p) => {
          projectDialogs.openRename(p);
        }}
        onDeleteProject={(p) => {
          projectDialogs.openDelete(p);
        }}
      />

      <ProjectDialogs {...projectDialogs} />

      <main className="min-h-screen flex justify-center items-center">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
          <h1 className="text-balance text-2xl font-semibold tracking-tight">
            Create a project or open an existing one
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Start a new architecture workspace, or choose a project from the sidebar.
          </p>
          <Button
            type="button"
            className="mt-2 gap-2"
            onClick={() => {
              projectDialogs.openCreate();
            }}
          >
            <Plus className="size-4" />
            New Project
          </Button>
        </div>
      </main>
    </div>
  );
}
