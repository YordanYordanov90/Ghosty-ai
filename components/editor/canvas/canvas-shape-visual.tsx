"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import type { CanvasNodeShape } from "@/types/canvas"

/** Readable label on arbitrary hex fills (ui-context default pairs). */
export function pickContrastLabelColor(fill: string): string {
  const hex = fill.trim()
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return "#EDEDED"
  const r = Number.parseInt(m[1], 16)
  const g = Number.parseInt(m[2], 16)
  const b = Number.parseInt(m[3], 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.52 ? "#171717" : "#EDEDED"
}

export interface CanvasShapeVisualProps {
  shape: CanvasNodeShape
  label?: string
  fill: string
  selected?: boolean
  variant?: "node" | "ghost"
  className?: string
}

const VB = "0 0 100 100"

export function CanvasShapeVisual({
  shape,
  label = "",
  fill,
  selected = false,
  variant = "node",
  className,
}: CanvasShapeVisualProps) {
  const isGhost = variant === "ghost"
  const labelColor = pickContrastLabelColor(fill)
  const strokeRest = "color-mix(in oklab, var(--border) 72%, transparent)"
  const strokeSelected = "var(--accent-primary)"
  const stroke = selected ? strokeSelected : strokeRest
  const sw = selected ? 2.25 : 1.35

  const overlayLabel = (
    <div
      className={cn(
        "pointer-events-none flex items-center justify-center px-2 text-center text-xs font-medium",
        isGhost && "opacity-0",
      )}
      style={{ color: labelColor }}
    >
      <span className="truncate">{label}</span>
    </div>
  )

  const svgChrome = (body: ReactNode) => (
    <div className={cn("pointer-events-none relative h-full w-full", className)}>
      <svg
        className={cn(
          "absolute inset-0 size-full overflow-visible",
          isGhost && "opacity-90 drop-shadow-md",
        )}
        viewBox={VB}
        preserveAspectRatio="none"
        aria-hidden
      >
        {body}
      </svg>
      <div className="absolute inset-0 z-1 flex items-center justify-center">
        {overlayLabel}
      </div>
    </div>
  )

  if (shape === "rectangle") {
    return (
      <div
        className={cn(
          "pointer-events-none flex h-full w-full items-center justify-center rounded-md px-3",
          isGhost && "opacity-55 drop-shadow-md",
          className,
        )}
        style={{
          backgroundColor: fill,
          boxShadow: selected
            ? "0 0 0 2px var(--accent-primary), inset 0 0 0 1px color-mix(in oklab, var(--border) 48%, transparent)"
            : "inset 0 0 0 1px color-mix(in oklab, var(--border) 42%, transparent)",
        }}
      >
        {!isGhost && overlayLabel}
      </div>
    )
  }

  if (shape === "pill") {
    return (
      <div
        className={cn(
          "pointer-events-none flex h-full w-full items-center justify-center rounded-full px-3",
          isGhost && "opacity-55 drop-shadow-md",
          className,
        )}
        style={{
          backgroundColor: fill,
          boxShadow: selected
            ? "0 0 0 2px var(--accent-primary), inset 0 0 0 1px color-mix(in oklab, var(--border) 45%, transparent)"
            : "0 0 0 1px color-mix(in oklab, var(--border) 38%, transparent)",
        }}
      >
        {!isGhost && overlayLabel}
      </div>
    )
  }

  if (shape === "circle") {
    return (
      <div
        className={cn(
          "pointer-events-none flex h-full w-full items-center justify-center rounded-full px-3",
          isGhost && "opacity-55 drop-shadow-md",
          className,
        )}
        style={{
          backgroundColor: fill,
          boxShadow: selected
            ? "0 0 0 2px var(--accent-primary), inset 0 0 0 1px color-mix(in oklab, var(--border) 45%, transparent)"
            : "0 0 0 1px color-mix(in oklab, var(--border) 38%, transparent)",
        }}
      >
        {!isGhost && overlayLabel}
      </div>
    )
  }

  if (shape === "diamond") {
    return svgChrome(
      <polygon
        points="50,2 98,50 50,98 2,50"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />,
    )
  }

  if (shape === "hexagon") {
    return svgChrome(
      <polygon
        points="50,4 93,27 93,73 50,96 7,73 7,27"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />,
    )
  }

  if (shape === "cylinder") {
    return svgChrome(
      <>
        <path
          d="M 12 28 L 12 72 A 38 10 0 0 0 88 72 L 88 28 A 38 10 0 0 1 12 28 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <ellipse
          cx="50"
          cy="28"
          rx="38"
          ry="10"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
        />
        <ellipse
          cx="50"
          cy="72"
          rx="38"
          ry="10"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
        />
      </>,
    )
  }

  return null
}
