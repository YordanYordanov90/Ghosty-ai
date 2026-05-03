"use client";

import type { SetStateAction } from "react";
import { useCallback, useMemo, useState } from "react";

import {
  isValidProjectSlug,
  normalizeSlug,
  sanitizeSlugKeystrokes,
} from "@/lib/project-slug";
import type { EditorProject } from "@/types/editor-project";

export type EditorProjectDialog = "create" | "rename" | "delete" | null;

const MOCK_PROJECTS: EditorProject[] = [
  { id: "p-mock-1", name: "website-redesign", ownership: "owned" },
  { id: "p-mock-2", name: "api-gateway", ownership: "owned" },
  { id: "p-mock-3", name: "team-wiki", ownership: "shared" },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export interface UseEditorProjectDialogsResult {
  myProjects: EditorProject[];
  sharedProjects: EditorProject[];
  activeDialog: EditorProjectDialog;
  createName: string;
  setCreateName: (value: string) => void;
  renameName: string;
  setRenameName: (value: string) => void;
  createSlugPreview: string;
  createSlugValid: boolean;
  renameSlugValid: boolean;
  loading: boolean;
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
  onDialogOpenChange: (dialog: Exclude<EditorProjectDialog, null>, open: boolean) => void;
}

export function useEditorProjectDialogs(): UseEditorProjectDialogsResult {
  const [projects, setProjects] = useState<EditorProject[]>(MOCK_PROJECTS);
  const [activeDialog, setActiveDialog] = useState<EditorProjectDialog>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [createName, setCreateNameState] = useState("");
  const [renameName, setRenameNameState] = useState("");
  const [loading, setLoading] = useState(false);

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
    () => projects.find((p) => p.id === targetId),
    [projects, targetId]
  );

  const myProjects = useMemo(
    () => projects.filter((p) => p.ownership === "owned"),
    [projects]
  );
  const sharedProjects = useMemo(
    () => projects.filter((p) => p.ownership === "shared"),
    [projects]
  );

  const createSlugPreview = useMemo(
    () => normalizeSlug(createName),
    [createName]
  );
  const createSlugValid = useMemo(
    () => isValidProjectSlug(createName),
    [createName]
  );
  const renameSlugValid = useMemo(
    () => isValidProjectSlug(renameName),
    [renameName]
  );

  const closeDialog = useCallback(() => {
    setLoading(false);
    setActiveDialog(null);
    setTargetId(null);
  }, []);

  const openCreate = useCallback(() => {
    setCreateName("");
    setTargetId(null);
    setActiveDialog("create");
  }, [setCreateName]);

  const openRename = useCallback((project: EditorProject) => {
    setTargetId(project.id);
    setRenameName(project.name);
    setActiveDialog("rename");
  }, [setRenameName]);

  const openDelete = useCallback((project: EditorProject) => {
    setTargetId(project.id);
    setActiveDialog("delete");
  }, []);

  const submitCreate = useCallback(async () => {
    const name = normalizeSlug(createName);
    if (!isValidProjectSlug(name)) return;
    setLoading(true);
    try {
      await delay(450);
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `p-${Date.now()}`;
      setProjects((prev) => [...prev, { id, name, ownership: "owned" }]);
      setActiveDialog(null);
      setTargetId(null);
    } finally {
      setLoading(false);
    }
  }, [createName]);

  const submitRename = useCallback(async () => {
    const name = normalizeSlug(renameName);
    const id = targetId;
    if (!isValidProjectSlug(name) || id == null) return;
    setLoading(true);
    try {
      await delay(450);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name } : p))
      );
      setActiveDialog(null);
      setTargetId(null);
    } finally {
      setLoading(false);
    }
  }, [renameName, targetId]);

  const submitDelete = useCallback(async () => {
    const id = targetId;
    if (id == null) return;
    setLoading(true);
    try {
      await delay(450);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setActiveDialog(null);
      setTargetId(null);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  const onDialogOpenChange = useCallback(
    (which: Exclude<EditorProjectDialog, null>, open: boolean) => {
      if (!open && activeDialog === which) {
        closeDialog();
      }
    },
    [activeDialog, closeDialog]
  );

  return {
    myProjects,
    sharedProjects,
    activeDialog,
    createName,
    setCreateName,
    renameName,
    setRenameName,
    createSlugPreview,
    createSlugValid,
    renameSlugValid,
    loading,
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
