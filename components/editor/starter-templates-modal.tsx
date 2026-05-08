"use client"

import { useMemo } from "react"

import type { CanvasNode } from "@/types/canvas"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { CANVAS_TEMPLATES } from "@/components/editor/starter-templates"

function nodeRect(node: CanvasNode): { x: number; y: number; w: number; h: number } {
  const w = typeof node.style?.width === "number" ? node.style.width : 160
  const h = typeof node.style?.height === "number" ? node.style.height : 72
  return { x: node.position.x, y: node.position.y, w, h }
}

function viewBoxFor(nodes: CanvasNode[]) {
  const pad = 18
  if (!nodes.length) return { minX: 0, minY: 0, vbW: 100, vbH: 60 }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const node of nodes) {
    const r = nodeRect(node)
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.w)
    maxY = Math.max(maxY, r.y + r.h)
  }

  return {
    minX: minX - pad,
    minY: minY - pad,
    vbW: Math.max(1, maxX - minX + pad * 2),
    vbH: Math.max(1, maxY - minY + pad * 2),
  }
}

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const vb = useMemo(() => viewBoxFor(template.nodes), [template.nodes])

  const centers = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>()
    for (const node of template.nodes) {
      const r = nodeRect(node)
      m.set(node.id, { x: r.x + r.w / 2, y: r.y + r.h / 2 })
    }
    return m
  }, [template.nodes])

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-xl border border-border/70 bg-background/40">
      <svg
        className="h-full w-full"
        viewBox={`${vb.minX} ${vb.minY} ${vb.vbW} ${vb.vbH}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {/* edges */}
        <g opacity={0.9}>
          {template.edges.map((edge) => {
            const s = centers.get(edge.source)
            const t = centers.get(edge.target)
            if (!s || !t) return null
            return (
              <line
                key={edge.id}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="color-mix(in oklab, var(--foreground) 34%, transparent)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            )
          })}
        </g>

        {/* nodes */}
        <g>
          {template.nodes.map((node) => {
            const r = nodeRect(node)
            const fill = node.data.color
            const stroke = "color-mix(in oklab, var(--foreground) 24%, transparent)"

            const common = {
              fill,
              stroke,
              strokeWidth: 2,
            }

            switch (node.data.shape) {
              case "circle": {
                const cx = r.x + r.w / 2
                const cy = r.y + r.h / 2
                const rad = Math.min(r.w, r.h) / 2
                return <circle key={node.id} cx={cx} cy={cy} r={rad} {...common} />
              }
              case "pill":
                return (
                  <rect
                    key={node.id}
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    rx={Math.min(r.h / 2, 999)}
                    {...common}
                  />
                )
              case "diamond": {
                const cx = r.x + r.w / 2
                const cy = r.y + r.h / 2
                const pts = [
                  `${cx},${r.y}`,
                  `${r.x + r.w},${cy}`,
                  `${cx},${r.y + r.h}`,
                  `${r.x},${cy}`,
                ].join(" ")
                return <polygon key={node.id} points={pts} {...common} />
              }
              case "hexagon": {
                const x0 = r.x
                const y0 = r.y
                const x1 = r.x + r.w
                const y1 = r.y + r.h
                const dx = r.w * 0.22
                const pts = [
                  `${x0 + dx},${y0}`,
                  `${x1 - dx},${y0}`,
                  `${x1},${y0 + r.h / 2}`,
                  `${x1 - dx},${y1}`,
                  `${x0 + dx},${y1}`,
                  `${x0},${y0 + r.h / 2}`,
                ].join(" ")
                return <polygon key={node.id} points={pts} {...common} />
              }
              case "cylinder": {
                const rx = Math.max(6, r.w * 0.18)
                const topH = Math.max(8, r.h * 0.22)
                return (
                  <g key={node.id}>
                    <rect
                      x={r.x}
                      y={r.y + topH / 2}
                      width={r.w}
                      height={r.h - topH}
                      {...common}
                    />
                    <ellipse
                      cx={r.x + r.w / 2}
                      cy={r.y + topH / 2}
                      rx={rx}
                      ry={topH / 2}
                      {...common}
                    />
                    <ellipse
                      cx={r.x + r.w / 2}
                      cy={r.y + r.h - topH / 2}
                      rx={rx}
                      ry={topH / 2}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={2}
                      opacity={0.55}
                    />
                  </g>
                )
              }
              case "rectangle":
              default:
                return (
                  <rect
                    key={node.id}
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    rx={12}
                    {...common}
                  />
                )
            }
          })}
        </g>
      </svg>

      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          boxShadow:
            "inset 0 0 0 1px color-mix(in oklab, var(--accent-primary) 10%, transparent)",
        }}
      />
    </div>
  )
}

export interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: CanvasTemplate) => void
  templates?: CanvasTemplate[]
}

export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
  templates,
}: StarterTemplatesModalProps) {
  const list = templates ?? CANVAS_TEMPLATES

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(90dvh,52rem)] w-[min(96vw,86rem)] sm:max-w-7xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Starter templates</DialogTitle>
          <DialogDescription>
            Import a starter diagram. This replaces your current canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-x-auto overflow-y-auto pr-1 mx-auto">
          <div className="flex w-max gap-5 pb-1">
            {list.map((tpl) => (
              <div
                key={tpl.id}
                className={cn(
                  "group flex w-88 min-h-96 shrink-0 flex-col rounded-2xl border border-border/70 bg-elevated/30 p-5 shadow-[0_10px_26px_-22px_rgba(0,0,0,0.65)]",
                  "transition hover:bg-elevated/40 hover:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.75)]",
                )}
              >
                <TemplatePreview template={tpl} />
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                      {tpl.name}
                    </p>
                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {tpl.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      onImport(tpl)
                      onOpenChange(false)
                    }}
                  >
                    Import
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

