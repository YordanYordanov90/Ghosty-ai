"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react"

import type { CanvasEdge } from "@/types/canvas"
import { cn } from "@/lib/utils"

export interface CanvasEdgeProps extends EdgeProps<CanvasEdge> {
  editing: boolean
  onStartEditing: (edgeId: string) => void
  onCommitLabel: (edgeId: string, label: string) => void
  onStopEditing: () => void
}

function computeInputWidthPx(text: string) {
  const len = Math.max(0, text.trim().length)
  // compact + predictable sizing without measuring DOM
  return Math.min(380, Math.max(56, (len + 1) * 8 + 22))
}

export function CanvasEdgeRenderer({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
  editing,
  onStartEditing,
  onCommitLabel,
  onStopEditing,
}: CanvasEdgeProps) {
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const label = (typeof data?.label === "string" ? data.label : "").trim()

  useEffect(() => {
    if (!editing) return
    queueMicrotask(() => inputRef.current?.focus())
  }, [editing])

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  })

  const isActive = hovered || selected
  const stroke = useMemo(() => {
    if (isActive) return "color-mix(in oklab, var(--foreground) 76%, transparent)"
    return "color-mix(in oklab, var(--foreground) 46%, transparent)"
  }, [isActive])

  const onPointerDownLabel = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDoubleClickLabel = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onStartEditing(id)
      queueMicrotask(() => inputRef.current?.focus())
    },
    [id, onStartEditing],
  )

  const onSave = useCallback(
    (next: string) => {
      onCommitLabel(id, next)
      onStopEditing()
    },
    [id, onCommitLabel, onStopEditing],
  )

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ stroke, strokeWidth: 2 }} />
      {/* invisible interaction stroke: easier hover/click without visual thickness */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <EdgeLabelRenderer>
        <div
          className={cn(
            "pointer-events-auto absolute z-50 -translate-x-1/2 -translate-y-1/2",
            "select-none",
          )}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          onPointerDown={onPointerDownLabel}
          onDoubleClick={onDoubleClickLabel}
        >
          {editing ? (
            <input
              ref={inputRef}
              defaultValue={label}
              aria-label="Edge label"
              className={cn(
                "h-7 rounded-full border border-border/70 bg-background/70 px-2.5 text-xs text-foreground shadow-sm",
                "outline-none backdrop-blur-md",
                "focus-visible:ring-2 focus-visible:ring-brand/50",
              )}
              style={{ width: computeInputWidthPx(label) }}
              onBlur={(e) => onSave(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  e.preventDefault()
                  e.stopPropagation()
                  onSave((e.currentTarget as HTMLInputElement).value)
                }
              }}
            />
          ) : label ? (
            <div
              className={cn(
                "rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] font-medium",
                "text-foreground/90 shadow-sm backdrop-blur-md",
              )}
            >
              {label}
            </div>
          ) : selected ? (
            <div
              className={cn(
                "rounded-full border border-border/55 bg-background/35 px-2.5 py-1 text-[11px]",
                "text-muted-foreground/70 shadow-sm backdrop-blur-md",
              )}
            >
              Double-click to label
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

