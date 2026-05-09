"use client";

import { useEffect, useRef, useState } from "react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseCanvasAutosaveOptions {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  projectId: string;
  onStatusChange?: (status: SaveStatus) => void;
}

/**
 * Watches canvas nodes and edges and debounces a save to
 * PUT /api/projects/[projectId]/canvas every 1500ms after the last change.
 *
 * - Skips the initial mount so loading saved state doesn't immediately re-save.
 * - Tracks save status: "idle" | "saving" | "saved" | "error".
 * - Calls onStatusChange on every transition so parent components can display
 *   the indicator in a different part of the tree (e.g. workspace top nav).
 */
export function useCanvasAutosave({
  nodes,
  edges,
  projectId,
  onStatusChange,
}: UseCanvasAutosaveOptions): { status: SaveStatus } {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag to skip the very first render (mount-time values are the initial Liveblocks state,
  // not a real user change).
  const isMountedRef = useRef(false);
  // Stable ref so the effect closure always calls the latest callback without
  // including it in the dep array (avoids re-scheduling on every render).
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    const save = async () => {
      const update = (next: SaveStatus) => {
        setStatus(next);
        onStatusChangeRef.current?.(next);
      };

      update("saving");
      try {
        const res = await fetch(`/api/projects/${projectId}/canvas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodes, edges }),
        });
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const errorBody = (await res.json()) as {
              error?: string;
              detail?: string;
            };
            detail = [errorBody.error, errorBody.detail]
              .filter(Boolean)
              .join(": ");
          } catch {
            // Keep the HTTP status detail if the response is not JSON.
          }
          throw new Error(detail);
        }
        update("saved");
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Canvas autosave failed", error);
        }
        update("error");
      }
    };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, 1500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // nodes/edges trigger re-scheduling; projectId is stable per workspace mount.
  }, [nodes, edges, projectId]);

  return { status };
}
