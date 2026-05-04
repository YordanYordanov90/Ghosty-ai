"use client";

import type { SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  isValidProjectSlug,
  normalizeSlug,
  sanitizeSlugKeystrokes,
} from "@/lib/project-slug";
import type { EditorProject } from "@/types/editor-project";

export type EditorProjectDialog = "create" | "rename" | "delete" | null;

function makeSuffix(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]!).join("");
}

export interface UseEditorProjectActionsOptions {
  initialMyProjects: EditorProject[];
  initialSharedProjects: EditorProject[];
  /** Current workspace route id (`/editor/[projectId]`), or null on hub `/editor`. */
  activeWorkspaceId: string | null;
}

export interface UseEditorProjectActionsResult {
  myProjects: EditorProject[];
  sharedProjects: EditorProject[];
  activeDialog: EditorProjectDialog;
  createName: string;
  setCreateName: (value: string) => void;
  createSlugPreview: string;
  createRoomPreview: string;
  createSlugValid: boolean;
  renameSlugValid: boolean;
  renameName: string;
  setRenameName: (value: string) => void;
  loading: boolean;
  lastError: string | null;
  targetProject: EditorProject | undefined;
  openCreate: () => void;
  openRename: (project: EditorProject) => void;
  openDelete: (project: EditorProject) => void;
  closeDialog: () => void;
  submitCreate: () => Promise<void>;
  submitRename: () => Promise<void>;
  submitDelete: () => Promise<void>;
  dialogOpen: {
    create: boolean;
    rename: boolean;
    delete: boolean;
  };
  onDialogOpenChange: (
    dialog: Exclude<EditorProjectDialog, null>,
    open: boolean,
  ) => void;
}

export function useEditorProjectActions({
  initialMyProjects,
  initialSharedProjects,
  activeWorkspaceId,
}: UseEditorProjectActionsOptions): UseEditorProjectActionsResult {
  const router = useRouter();
  const [myProjects, setMyProjects] = useState(initialMyProjects);
  const [sharedProjects, setSharedProjects] = useState(
    initialSharedProjects,
  );
  const [activeDialog, setActiveDialog] = useState<EditorProjectDialog>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [createName, setCreateNameState] = useState("");
  const [createSuffix, setCreateSuffix] = useState(() => makeSuffix(6));
  const [renameName, setRenameNameState] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    setMyProjects(initialMyProjects);
    setSharedProjects(initialSharedProjects);
  }, [initialMyProjects, initialSharedProjects]);

  const setCreateName = useCallback((value: SetStateAction<string>) => {
    setCreateNameState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      return sanitizeSlugKeystrokes(next);
    });
  }, []);

  const setRenameName = useCallback((value: SetStateAction<string>) => {
    setRenameNameState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      return sanitizeSlugKeystrokes(next);
    });
  }, []);

  const targetProject = useMemo(
    () => myProjects.find((p) => p.id === targetId),
    [myProjects, targetId],
  );

  const createSlugPreview = useMemo(
    () => normalizeSlug(createName),
    [createName],
  );
  const createSlugValid = useMemo(
    () => isValidProjectSlug(createName),
    [createName],
  );
  const createRoomPreview = useMemo(() => {
    if (!createSlugValid) return "";
    return `${createSlugPreview}-${createSuffix}`;
  }, [createSlugPreview, createSlugValid, createSuffix]);

  const renameSlugValid = useMemo(
    () => isValidProjectSlug(renameName),
    [renameName],
  );

  const closeDialog = useCallback(() => {
    setLoading(false);
    setLastError(null);
    setActiveDialog(null);
    setTargetId(null);
  }, []);

  const openCreate = useCallback(() => {
    setCreateSuffix(makeSuffix(6));
    setCreateName("");
    setLastError(null);
    setTargetId(null);
    setActiveDialog("create");
  }, [setCreateName]);

  const openRename = useCallback((project: EditorProject) => {
    setTargetId(project.id);
    setRenameName(project.name);
    setLastError(null);
    setActiveDialog("rename");
  }, [setRenameName]);

  const openDelete = useCallback((project: EditorProject) => {
    setTargetId(project.id);
    setLastError(null);
    setActiveDialog("delete");
  }, []);

  const submitCreate = useCallback(async () => {
    if (!createSlugValid) return;
    const name = `${createSlugPreview}-${createSuffix}`;
    setLoading(true);
    setLastError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const body = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        const err =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : `Create failed (${res.status})`;
        setLastError(err);
        return;
      }
      const projectId =
        typeof body === "object" &&
        body !== null &&
        "project" in body &&
        typeof (body as { project: { id?: string } }).project?.id === "string"
          ? (body as { project: { id: string } }).project.id
          : null;
      if (!projectId) {
        setLastError("Invalid response from server");
        return;
      }
      setActiveDialog(null);
      setTargetId(null);
      router.push(`/editor/${projectId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }, [createSlugPreview, createSlugValid, createSuffix, router]);

  const submitRename = useCallback(async () => {
    const name = normalizeSlug(renameName);
    const id = targetId;
    if (!isValidProjectSlug(renameName) || id == null) return;
    setLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const body = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        const err =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : `Rename failed (${res.status})`;
        setLastError(err);
        return;
      }
      setActiveDialog(null);
      setTargetId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }, [renameName, router, targetId]);

  const submitDelete = useCallback(async () => {
    const id = targetId;
    if (id == null) return;
    setLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as unknown;
        const err =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : `Delete failed (${res.status})`;
        setLastError(err);
        return;
      }
      const wasActive = activeWorkspaceId === id;
      setActiveDialog(null);
      setTargetId(null);
      if (wasActive) {
        router.push("/editor");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, router, targetId]);

  const onDialogOpenChange = useCallback(
    (which: Exclude<EditorProjectDialog, null>, open: boolean) => {
      if (!open && activeDialog === which) {
        closeDialog();
      }
    },
    [activeDialog, closeDialog],
  );

  return {
    myProjects,
    sharedProjects,
    activeDialog,
    createName,
    setCreateName,
    createSlugPreview,
    createRoomPreview,
    createSlugValid,
    renameSlugValid,
    renameName,
    setRenameName,
    loading,
    lastError,
    targetProject,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    submitCreate,
    submitRename,
    submitDelete,
    dialogOpen: {
      create: activeDialog === "create",
      rename: activeDialog === "rename",
      delete: activeDialog === "delete",
    },
    onDialogOpenChange,
  };
}
