import { useEffect } from "react"
import type { Edge, Node, ReactFlowInstance } from "@xyflow/react"

export interface UseKeyboardShortcutsArgs<TNode extends Node = Node, TEdge extends Edge = Edge> {
  reactFlow: Pick<ReactFlowInstance<TNode, TEdge>, "zoomIn" | "zoomOut" | "fitView">
  undo: () => void
  redo: () => void
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true

  const tag = target.tagName.toLowerCase()
  if (tag === "input" || tag === "textarea" || tag === "select") return true

  return Boolean(target.closest('[contenteditable="true"]'))
}

export function useKeyboardShortcuts<TNode extends Node, TEdge extends Edge>({
  reactFlow,
  undo,
  redo,
}: UseKeyboardShortcutsArgs<TNode, TEdge>) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (isEditableTarget(e.target)) return

      const isMeta = e.metaKey || e.ctrlKey

      if (e.key === "+" || e.key === "=") {
        e.preventDefault()
        reactFlow.zoomIn({ duration: 160 })
        return
      }

      if (e.key === "-") {
        e.preventDefault()
        reactFlow.zoomOut({ duration: 160 })
        return
      }

      if (!isMeta) return

      // Undo: Cmd/Ctrl + Z
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Redo: Cmd/Ctrl + Shift + Z
      if (e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault()
        redo()
        return
      }

      // Redo: Cmd/Ctrl + Y
      if (e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [reactFlow, redo, undo])
}

