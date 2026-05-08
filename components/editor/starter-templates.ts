import { MarkerType } from "@xyflow/react"

import type { CanvasEdge, CanvasNode, CanvasNodeShape } from "@/types/canvas"
import { CANVAS_EDGE_TYPE, CANVAS_NODE_TYPE, NODE_COLORS } from "@/types/canvas"

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

const NEUTRAL = NODE_COLORS[0]
const BLUE = NODE_COLORS[1]
const PURPLE = NODE_COLORS[2]
const ORANGE = NODE_COLORS[3]
const GREEN = NODE_COLORS[6]
const TEAL = NODE_COLORS[7]

function n(args: {
  id: string
  label: string
  shape: CanvasNodeShape
  x: number
  y: number
  w: number
  h: number
  fill: string
  text: string
}): CanvasNode {
  return {
    id: args.id,
    type: CANVAS_NODE_TYPE,
    position: { x: args.x, y: args.y },
    data: {
      label: args.label,
      shape: args.shape,
      color: args.fill,
      textColor: args.text,
    },
    style: { width: args.w, height: args.h },
  }
}

function e(args: {
  id: string
  source: string
  target: string
  label?: string
}): CanvasEdge {
  return {
    id: args.id,
    type: CANVAS_EDGE_TYPE,
    source: args.source,
    target: args.target,
    data: { label: args.label ?? "" },
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: "color-mix(in oklab, var(--foreground) 46%, transparent)",
      strokeWidth: 2,
    },
  }
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices",
    name: "Microservices",
    description:
      "Client → API gateway → services, with database and event stream for async workflows.",
    nodes: [
      n({
        id: "client",
        label: "Client",
        shape: "pill",
        x: 40,
        y: 80,
        w: 140,
        h: 56,
        fill: TEAL.fill,
        text: TEAL.text,
      }),
      n({
        id: "gateway",
        label: "API Gateway",
        shape: "rectangle",
        x: 220,
        y: 78,
        w: 160,
        h: 60,
        fill: BLUE.fill,
        text: BLUE.text,
      }),
      n({
        id: "auth",
        label: "Auth",
        shape: "hexagon",
        x: 430,
        y: 20,
        w: 150,
        h: 64,
        fill: PURPLE.fill,
        text: PURPLE.text,
      }),
      n({
        id: "catalog",
        label: "Catalog",
        shape: "rectangle",
        x: 430,
        y: 90,
        w: 150,
        h: 64,
        fill: GREEN.fill,
        text: GREEN.text,
      }),
      n({
        id: "payments",
        label: "Payments",
        shape: "rectangle",
        x: 430,
        y: 160,
        w: 150,
        h: 64,
        fill: ORANGE.fill,
        text: ORANGE.text,
      }),
      n({
        id: "events",
        label: "Event Stream",
        shape: "cylinder",
        x: 640,
        y: 100,
        w: 170,
        h: 86,
        fill: NEUTRAL.fill,
        text: NEUTRAL.text,
      }),
      n({
        id: "db",
        label: "DB",
        shape: "cylinder",
        x: 640,
        y: 10,
        w: 170,
        h: 86,
        fill: NEUTRAL.fill,
        text: NEUTRAL.text,
      }),
    ],
    edges: [
      e({ id: "e-client-gw", source: "client", target: "gateway", label: "" }),
      e({ id: "e-gw-auth", source: "gateway", target: "auth", label: "" }),
      e({ id: "e-gw-catalog", source: "gateway", target: "catalog", label: "" }),
      e({ id: "e-gw-pay", source: "gateway", target: "payments", label: "" }),
      e({ id: "e-auth-db", source: "auth", target: "db", label: "" }),
      e({ id: "e-cat-db", source: "catalog", target: "db", label: "" }),
      e({ id: "e-pay-events", source: "payments", target: "events", label: "" }),
      e({ id: "e-events-catalog", source: "events", target: "catalog", label: "" }),
    ],
  },
  {
    id: "cicd",
    name: "CI/CD pipeline",
    description:
      "Commit → CI checks → build → deploy, with optional manual approval gates.",
    nodes: [
      n({
        id: "commit",
        label: "Commit",
        shape: "pill",
        x: 40,
        y: 90,
        w: 140,
        h: 56,
        fill: TEAL.fill,
        text: TEAL.text,
      }),
      n({
        id: "ci",
        label: "CI",
        shape: "diamond",
        x: 230,
        y: 76,
        w: 130,
        h: 84,
        fill: BLUE.fill,
        text: BLUE.text,
      }),
      n({
        id: "tests",
        label: "Tests",
        shape: "rectangle",
        x: 420,
        y: 20,
        w: 150,
        h: 64,
        fill: GREEN.fill,
        text: GREEN.text,
      }),
      n({
        id: "build",
        label: "Build",
        shape: "rectangle",
        x: 420,
        y: 100,
        w: 150,
        h: 64,
        fill: PURPLE.fill,
        text: PURPLE.text,
      }),
      n({
        id: "approval",
        label: "Approval",
        shape: "pill",
        x: 610,
        y: 20,
        w: 150,
        h: 56,
        fill: NEUTRAL.fill,
        text: NEUTRAL.text,
      }),
      n({
        id: "deploy",
        label: "Deploy",
        shape: "hexagon",
        x: 610,
        y: 98,
        w: 150,
        h: 64,
        fill: ORANGE.fill,
        text: ORANGE.text,
      }),
    ],
    edges: [
      e({ id: "e-commit-ci", source: "commit", target: "ci", label: "" }),
      e({ id: "e-ci-tests", source: "ci", target: "tests", label: "" }),
      e({ id: "e-ci-build", source: "ci", target: "build", label: "" }),
      e({ id: "e-tests-build", source: "tests", target: "build", label: "" }),
      e({ id: "e-build-approval", source: "build", target: "approval", label: "" }),
      e({ id: "e-build-deploy", source: "build", target: "deploy", label: "" }),
      e({ id: "e-approval-deploy", source: "approval", target: "deploy", label: "" }),
    ],
  },
  {
    id: "event-driven",
    name: "Event-driven system",
    description:
      "Producers publish events to a bus; consumers react asynchronously and update storage.",
    nodes: [
      n({
        id: "producer-a",
        label: "Producer A",
        shape: "rectangle",
        x: 40,
        y: 30,
        w: 150,
        h: 64,
        fill: BLUE.fill,
        text: BLUE.text,
      }),
      n({
        id: "producer-b",
        label: "Producer B",
        shape: "rectangle",
        x: 40,
        y: 110,
        w: 150,
        h: 64,
        fill: PURPLE.fill,
        text: PURPLE.text,
      }),
      n({
        id: "bus",
        label: "Event Bus",
        shape: "cylinder",
        x: 250,
        y: 70,
        w: 170,
        h: 86,
        fill: NEUTRAL.fill,
        text: NEUTRAL.text,
      }),
      n({
        id: "consumer-a",
        label: "Consumer A",
        shape: "hexagon",
        x: 490,
        y: 30,
        w: 160,
        h: 64,
        fill: GREEN.fill,
        text: GREEN.text,
      }),
      n({
        id: "consumer-b",
        label: "Consumer B",
        shape: "hexagon",
        x: 490,
        y: 110,
        w: 160,
        h: 64,
        fill: ORANGE.fill,
        text: ORANGE.text,
      }),
      n({
        id: "store",
        label: "Storage",
        shape: "cylinder",
        x: 700,
        y: 70,
        w: 170,
        h: 86,
        fill: NEUTRAL.fill,
        text: NEUTRAL.text,
      }),
    ],
    edges: [
      e({ id: "e-pa-bus", source: "producer-a", target: "bus", label: "" }),
      e({ id: "e-pb-bus", source: "producer-b", target: "bus", label: "" }),
      e({ id: "e-bus-ca", source: "bus", target: "consumer-a", label: "" }),
      e({ id: "e-bus-cb", source: "bus", target: "consumer-b", label: "" }),
      e({ id: "e-ca-store", source: "consumer-a", target: "store", label: "" }),
      e({ id: "e-cb-store", source: "consumer-b", target: "store", label: "" }),
    ],
  },
]

