"use client"

import { useCallback, useMemo, useRef } from "react"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlowProvider,
  ReactFlow,
  type NodeChange,
  useReactFlow,
} from "@xyflow/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense"
import { ErrorBoundary } from "react-error-boundary"
import { Circle, Diamond, Hexagon, Pill, RectangleHorizontal, Database } from "lucide-react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

interface WorkspaceCanvasProps {
  roomId: string
}

const DEFAULT_NODE_COLOR = "#06b6d4"
const SHAPE_DND_MIME = "application/x-ghosty-shape"

type ShapeName = CanvasNode["data"]["shape"]
type ShapePayload = {
  shape: ShapeName
  width: number
  height: number
}

const SHAPES: Array<{
  shape: ShapeName
  label: string
  Icon: typeof RectangleHorizontal
  size: { width: number; height: number }
}> = [
  {
    shape: "rectangle",
    label: "Rectangle",
    Icon: RectangleHorizontal,
    size: { width: 220, height: 120 },
  },
  {
    shape: "diamond",
    label: "Diamond",
    Icon: Diamond,
    size: { width: 240, height: 160 },
  },
  {
    shape: "circle",
    label: "Circle",
    Icon: Circle,
    size: { width: 160, height: 160 },
  },
  {
    shape: "pill",
    label: "Pill",
    Icon: Pill,
    size: { width: 220, height: 110 },
  },
  {
    shape: "cylinder",
    label: "Cylinder",
    Icon: Database,
    size: { width: 220, height: 140 },
  },
  {
    shape: "hexagon",
    label: "Hexagon",
    Icon: Hexagon,
    size: { width: 220, height: 140 },
  },
]

function ShapeToolbar() {
  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, payload: ShapePayload) => {
      e.dataTransfer.setData(SHAPE_DND_MIME, JSON.stringify(payload))
      e.dataTransfer.setData("text/plain", JSON.stringify(payload))
      e.dataTransfer.effectAllowed = "copy"
    },
    [],
  )

  return (
    <div className="pointer-events-auto absolute bottom-5 left-1/2 z-10 -translate-x-1/2">
      <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2 py-2 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)] backdrop-blur-md">
        {SHAPES.map(({ shape, label, Icon, size }) => (
          <button
            key={shape}
            type="button"
            draggable
            onDragStart={(e) =>
              onDragStart(e, { shape, width: size.width, height: size.height })
            }
            className="inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-elevated/40 text-foreground/90 transition hover:bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            aria-label={`Drag ${label}`}
            title={label}
          >
            <Icon className="size-4.5" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  )
}

function CanvasNodeRenderer({ data }: { data: CanvasNode["data"] }) {
  const base =
    "flex h-full w-full items-center justify-center border-2 border-border/95 bg-background/85 px-3 text-center text-xs font-medium text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"

  if (data.shape === "diamond") {
    return (
      <div className={`${base} rotate-45 rounded-md`}>
        <span className="-rotate-45 truncate">{data.label}</span>
      </div>
    )
  }

  if (data.shape === "circle") {
    return (
      <div className={`${base} rounded-full`}>
        <span className="truncate">{data.label}</span>
      </div>
    )
  }

  if (data.shape === "pill") {
    return (
      <div className={`${base} rounded-full`}>
        <span className="truncate">{data.label}</span>
      </div>
    )
  }

  if (data.shape === "hexagon") {
    return (
      <div
        className={`${base} rounded-md [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0%_50%)]`}
      >
        <span className="truncate">{data.label}</span>
      </div>
    )
  }

  if (data.shape === "cylinder") {
    return (
      <div className={`${base} relative rounded-md`}>
        <div className="pointer-events-none absolute inset-x-2 top-1 h-3 rounded-full border-2 border-border/90 bg-background/70" />
        <div className="pointer-events-none absolute inset-x-2 bottom-1 h-3 rounded-full border-2 border-border/70 bg-background/50" />
        <span className="relative z-10 truncate">{data.label}</span>
      </div>
    )
  }

  return (
    <div className={`${base} rounded-md`}>
      <span className="truncate">{data.label}</span>
    </div>
  )
}

function CanvasFlow() {
  const rf = useReactFlow<CanvasNode, CanvasEdge>()
  const idCounterRef = useRef(0)

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDelete,
  } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    suspense: true,
    nodes: { initial: [] },
    edges: { initial: [] },
  })

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()

      const raw =
        e.dataTransfer.getData(SHAPE_DND_MIME) ??
        e.dataTransfer.getData("text/plain")
      if (!raw) return

      let payload: ShapePayload | null = null
      try {
        payload = JSON.parse(raw) as ShapePayload
      } catch {
        return
      }

      if (
        !payload ||
        typeof payload.shape !== "string" ||
        typeof payload.width !== "number" ||
        typeof payload.height !== "number"
      ) {
        return
      }

      const position = rf.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      })

      const nextCounter = (idCounterRef.current += 1)
      const id = `${payload.shape}-${Date.now()}-${nextCounter}`

      const newNode: CanvasNode = {
        id,
        type: "canvasNode",
        position,
        data: {
          label: "",
          color: DEFAULT_NODE_COLOR,
          shape: payload.shape,
        },
        style: { width: payload.width, height: payload.height },
      }

      const changes: NodeChange<CanvasNode>[] = [{ type: "add", item: newNode }]
      onNodesChange(changes)
    },
    [onNodesChange, rf],
  )

  return (
    <div className="relative h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        fitView
        nodeTypes={{ canvasNode: CanvasNodeRenderer }}
      >
        <MiniMap pannable zoomable />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.25} />
      </ReactFlow>
      <ShapeToolbar />
    </div>
  )
}

function CanvasInner() {
  return (
    <ReactFlowProvider>
      <CanvasFlow />
    </ReactFlowProvider>
  )
}

function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="rounded-2xl border border-border-default/70 bg-elevated/35 px-6 py-4 text-sm text-muted-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_12%,transparent)] backdrop-blur-[2px]">
        Loading canvas…
      </div>
    </div>
  )
}

function CanvasErrorFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="max-w-md rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-4 text-sm text-foreground">
        Live collaboration failed to connect. Try refreshing.
      </div>
    </div>
  )
}

export function WorkspaceCanvas({ roomId }: WorkspaceCanvasProps) {
  const initialPresence = useMemo(
    () => ({ cursor: null, isThinking: false }),
    [],
  )

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId} initialPresence={initialPresence}>
        <ErrorBoundary fallback={<CanvasErrorFallback />}>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <CanvasInner />
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

