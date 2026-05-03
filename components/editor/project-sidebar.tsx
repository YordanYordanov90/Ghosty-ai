"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { EditorProject } from "@/types/editor-project";

export interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  myProjects: EditorProject[];
  sharedProjects: EditorProject[];
  onNewProject: () => void;
  onRenameProject: (project: EditorProject) => void;
  onDeleteProject: (project: EditorProject) => void;
  className?: string;
}

export function ProjectSidebar({
  isOpen,
  onClose,
  myProjects,
  sharedProjects,
  onNewProject,
  onRenameProject,
  onDeleteProject,
  className,
}: ProjectSidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close project sidebar"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:bg-black/40",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
      />

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "fixed top-14 bottom-0 left-0 z-50 flex w-[min(100vw,20rem)] flex-col border-r border-border bg-card text-card-foreground shadow-xl transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
          className
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
          <h2 id="project-sidebar-title" className="truncate text-sm font-semibold tracking-tight">
            Projects
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <Tabs defaultValue="my-projects" className="flex min-h-0 flex-1 flex-col gap-2 p-3 pt-2">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="my-projects" className="flex-1">
              My Projects
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex-1">
              Shared
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-projects" className="mt-0 min-h-0 flex-1 outline-none">
            <ScrollArea className="h-[min(24rem,calc(100vh-14rem))]">
              {myProjects.length === 0 ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
                  No projects yet
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5 pr-3 pb-2">
                  {myProjects.map((project) => (
                    <li
                      key={project.id}
                      className="flex min-h-10 items-center gap-1 rounded-lg border border-border bg-muted/20 px-2 py-1"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{project.name}</span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Rename ${project.name}`}
                          onClick={() => onRenameProject(project)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${project.name}`}
                          onClick={() => onDeleteProject(project)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="shared" className="mt-0 min-h-0 flex-1 outline-none">
            <ScrollArea className="h-[min(24rem,calc(100vh-14rem))]">
              {sharedProjects.length === 0 ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
                  No shared projects
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5 pr-3 pb-2">
                  {sharedProjects.map((project) => (
                    <li
                      key={project.id}
                      className="flex min-h-10 items-center rounded-lg border border-border bg-muted/20 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{project.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="shrink-0 border-t border-border p-3">
          <Button type="button" className="w-full gap-2" onClick={onNewProject}>
            <Plus className="size-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  );
}
