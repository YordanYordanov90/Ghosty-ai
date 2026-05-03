"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { UseEditorProjectDialogsResult } from "@/hooks/use-editor-project-dialogs";

export type ProjectDialogsProps = UseEditorProjectDialogsResult;

export function ProjectDialogs({
  dialogOpen,
  onDialogOpenChange,
  closeDialog,
  createName,
  setCreateName,
  createSlugPreview,
  createSlugValid,
  renameSlugValid,
  renameName,
  setRenameName,
  loading,
  targetProject,
  submitCreate,
  submitRename,
  submitDelete,
}: ProjectDialogsProps) {
  useEffect(() => {
    if (!dialogOpen.rename) return;
    const id = window.requestAnimationFrame(() => {
      const el = document.getElementById(
        "project-rename-name"
      ) as HTMLInputElement | null;
      el?.focus();
      el?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [dialogOpen.rename]);

  return (
    <>
      <Dialog
        open={dialogOpen.create}
        onOpenChange={(open) => onDialogOpenChange("create", open)}
      >
        <DialogContent showCloseButton={!loading}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitCreate();
            }}
          >
            <DialogHeader>
              <DialogTitle>Create project</DialogTitle>
              <DialogDescription>
                Use lowercase letters, numbers, and hyphens only (URL-safe slug).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2">
                <label htmlFor="project-create-name" className="text-sm font-medium">
                  Project slug
                </label>
                <Input
                  id="project-create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. payments-service"
                  autoComplete="off"
                  disabled={loading}
                  spellCheck={false}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Slug preview:{" "}
                <span className="font-mono text-foreground">
                  {createSlugPreview.length > 0 ? createSlugPreview : "—"}
                </span>
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => closeDialog()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !createSlugValid}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen.rename}
        onOpenChange={(open) => onDialogOpenChange("rename", open)}
      >
        <DialogContent showCloseButton={!loading}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitRename();
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>
                Current slug:{" "}
                <span className="font-medium text-foreground">
                  {targetProject?.name ?? "—"}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <label htmlFor="project-rename-name" className="text-sm font-medium">
                New slug
              </label>
              <Input
                id="project-rename-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                autoComplete="off"
                disabled={loading}
                spellCheck={false}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => closeDialog()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !renameSlugValid}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen.delete}
        onOpenChange={(open) => onDialogOpenChange("delete", open)}
      >
        <DialogContent showCloseButton={!loading}>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This will remove{" "}
              <span className="font-medium text-foreground">
                {targetProject?.name ?? "this project"}
              </span>{" "}
              from your workspace. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => closeDialog()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={loading || targetProject == null}
              onClick={() => void submitDelete()}
            >
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
