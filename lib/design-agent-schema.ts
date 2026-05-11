import { MarkerType } from "@xyflow/react";
import { z } from "zod";

import type { MutableFlow } from "@liveblocks/react-flow/node";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR_PAIR,
  NODE_COLORS,
  type CanvasNodeShape,
} from "@/types/canvas";

const canvasShapeSchema = z.enum([
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
]);

export const designAgentActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("addNode"),
    id: z.string().min(1).max(128),
    label: z.string().max(200),
    shape: canvasShapeSchema,
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().min(80).max(480).optional(),
    height: z.number().finite().min(48).max(400).optional(),
    colorIndex: z.number().int().min(0).max(NODE_COLORS.length - 1).optional(),
  }),
  z.object({
    type: z.literal("moveNode"),
    id: z.string().min(1).max(128),
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  z.object({
    type: z.literal("resizeNode"),
    id: z.string().min(1).max(128),
    width: z.number().finite().min(80).max(480),
    height: z.number().finite().min(48).max(400),
  }),
  z.object({
    type: z.literal("updateNodeData"),
    id: z.string().min(1).max(128),
    label: z.string().max(200).optional(),
    shape: canvasShapeSchema.optional(),
    colorIndex: z.number().int().min(0).max(NODE_COLORS.length - 1).optional(),
  }),
  z.object({
    type: z.literal("deleteNode"),
    id: z.string().min(1).max(128),
  }),
  z.object({
    type: z.literal("addEdge"),
    id: z.string().min(1).max(128),
    source: z.string().min(1).max(128),
    target: z.string().min(1).max(128),
    label: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal("deleteEdge"),
    id: z.string().min(1).max(128),
  }),
]);

export const designAgentPlanSchema = z.object({
  summary: z.string().max(2000),
  actions: z.array(designAgentActionSchema).max(48),
});

export type DesignAgentPlan = z.infer<typeof designAgentPlanSchema>;
export type DesignAgentAction = z.infer<typeof designAgentActionSchema>;

const EDGE_STROKE =
  "color-mix(in oklab, var(--foreground) 46%, transparent)" as const;

function pairFromIndex(index?: number) {
  if (index === undefined) return DEFAULT_NODE_COLOR_PAIR;
  return NODE_COLORS[index] ?? DEFAULT_NODE_COLOR_PAIR;
}

function defaultSize(shape: CanvasNodeShape): { width: number; height: number } {
  switch (shape) {
    case "circle":
      return { width: 160, height: 160 };
    case "diamond":
      return { width: 240, height: 160 };
    case "pill":
      return { width: 220, height: 110 };
    case "cylinder":
      return { width: 220, height: 140 };
    case "hexagon":
      return { width: 220, height: 140 };
    default:
      return { width: 220, height: 120 };
  }
}

/** Applies validated actions via Liveblocks `mutateFlow` mutable API. */
export function applyDesignAgentActions(
  flow: MutableFlow<CanvasNode, CanvasEdge>,
  actions: DesignAgentAction[],
): void {
  for (const action of actions) {
    switch (action.type) {
      case "addNode": {
        const { width, height } =
          action.width !== undefined && action.height !== undefined
            ? { width: action.width, height: action.height }
            : defaultSize(action.shape);
        const pair = pairFromIndex(action.colorIndex);
        const node: CanvasNode = {
          id: action.id,
          type: CANVAS_NODE_TYPE,
          position: { x: action.x, y: action.y },
          data: {
            label: action.label,
            color: pair.fill,
            textColor: pair.text,
            shape: action.shape,
          },
          style: { width, height },
        };
        flow.addNode(node);
        break;
      }
      case "moveNode":
        flow.updateNode(action.id, { position: { x: action.x, y: action.y } });
        break;
      case "resizeNode":
        flow.updateNode(action.id, {
          style: { width: action.width, height: action.height },
        });
        break;
      case "updateNodeData": {
        const pair =
          action.colorIndex !== undefined
            ? pairFromIndex(action.colorIndex)
            : undefined;
        flow.updateNode(action.id, (node) => {
          const nextData = { ...node.data };
          if (action.label !== undefined) nextData.label = action.label;
          if (action.shape !== undefined) nextData.shape = action.shape;
          if (pair) {
            nextData.color = pair.fill;
            nextData.textColor = pair.text;
          }
          return { ...node, data: nextData };
        });
        break;
      }
      case "deleteNode": {
        const dangling = flow.edges.filter(
          (e) => e.source === action.id || e.target === action.id,
        );
        flow.removeEdges(dangling.map((e) => e.id));
        flow.removeNode(action.id);
        break;
      }
      case "addEdge": {
        const edge: CanvasEdge = {
          id: action.id,
          type: CANVAS_EDGE_TYPE,
          source: action.source,
          target: action.target,
          data: { label: action.label ?? "" },
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            stroke: EDGE_STROKE,
            strokeWidth: 2,
          },
        };
        flow.addEdge(edge);
        break;
      }
      case "deleteEdge":
        flow.removeEdge(action.id);
        break;
    }
  }
}
