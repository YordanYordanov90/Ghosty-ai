import type { Edge, Node } from "@xyflow/react"

export type CanvasNodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon"

export interface CanvasNodeColorPair {
  fill: string
  text: string
}

/**
 * Predefined node color pairs (fill + matching label text).
 * Source of truth: `context/ui-context.md` (Canvas → Node Color Palette)
 */
export const NODE_COLORS = [
  { fill: "#1F1F1F", text: "#EDEDED" }, // neutral (default)
  { fill: "#10233D", text: "#52A8FF" }, // blue
  { fill: "#2E1938", text: "#BF7AF0" }, // purple
  { fill: "#331B00", text: "#FF990A" }, // orange
  { fill: "#3C1618", text: "#FF6166" }, // red
  { fill: "#3A1726", text: "#F75F8F" }, // pink
  { fill: "#0F2E18", text: "#62C073" }, // green
  { fill: "#062822", text: "#0AC7B4" }, // teal
] satisfies CanvasNodeColorPair[]

export const DEFAULT_NODE_COLOR_PAIR = NODE_COLORS[0]

export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  color: string
  textColor?: string
  shape: CanvasNodeShape
}

export const CANVAS_NODE_TYPE = "canvasNode" as const
export const CANVAS_EDGE_TYPE = "canvasEdge" as const

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>
export interface CanvasEdgeData extends Record<string, unknown> {
  label?: string
}

export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>

