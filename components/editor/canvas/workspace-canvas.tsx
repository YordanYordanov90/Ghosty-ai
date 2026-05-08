"use client"

import type { Dispatch, Ref, SetStateAction } from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Handle,
  MarkerType,
  NodeResizer,
  Position,
  ReactFlowProvider,
  ReactFlow,
  type EdgeChange,
  type NodeChange,
  type NodeProps,
  type OnConnect,
  type EdgeProps,
  useReactFlow,
} from "@xyflow/react"
import { useMutation } from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react/suspense"
import { ErrorBoundary } from "react-error-boundary"
import {
  Circle,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  Database,
  Minus,
  Plus,
  Scan,
  Undo2,
  Redo2,
} from "lucide-react"

import type { CanvasEdge, CanvasNode, CanvasNodeColorPair } from "@/types/canvas"
import { DEFAULT_NODE_COLOR_PAIR, NODE_COLORS } from "@/types/canvas"
import { CanvasShapeVisual } from "@/components/editor/canvas/canvas-shape-visual"
import { CanvasEdgeRenderer } from "@/components/editor/canvas/canvas-edge"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { cn } from "@/lib/utils"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

export interface WorkspaceCanvasProps {
  roomId: string
}

export interface WorkspaceCanvasHandle {
  importTemplate: (template: CanvasTemplate) => void
}

const MIN_NODE_SIZE = { width: 120, height: 72 }

const EMPTY_DRAG_IMG_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
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

interface ShapeToolbarProps {
  getDragImageEl: () => HTMLImageElement | null
  onDragPreviewChange: Dispatch<
    SetStateAction<null | { payload: ShapePayload; x: number; y: number }>
  >
}

function ShapeToolbar({ getDragImageEl, onDragPreviewChange }: ShapeToolbarProps) {
  const onDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, payload: ShapePayload) => {
      const dragImg = getDragImageEl()
      if (dragImg) {
        e.dataTransfer.setDragImage(dragImg, 0, 0)
      }
      e.dataTransfer.setData(SHAPE_DND_MIME, JSON.stringify(payload))
      e.dataTransfer.setData("text/plain", JSON.stringify(payload))
      e.dataTransfer.effectAllowed = "copy"
      onDragPreviewChange({
        payload,
        x: e.clientX,
        y: e.clientY,
      })
    },
    [getDragImageEl, onDragPreviewChange],
  )

  const onDrag = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      onDragPreviewChange((prev) =>
        prev ? { ...prev, x: e.clientX, y: e.clientY } : prev,
      )
    },
    [onDragPreviewChange],
  )

  const onDragEnd = useCallback(() => {
    onDragPreviewChange(null)
  }, [onDragPreviewChange])

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
            onDrag={onDrag}
            onDragEnd={onDragEnd}
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

/**
 * Connection UX notes:
 * - `@xyflow/react` defaults `.react-flow__handle { pointer-events: none }` — without overriding,
 *   clicks hit the node body (drag) instead of starting/finishing edges.
 * - One stacked pair per side: **target** under **source** at the same edge anchor. XYFlow prefers the
 *   opposite handle type when snapping, so finishing an edge still lands on **target**.
 * - Large transparent hit box (`32×32`) + visible dot via `::before` for affordance.
 */
function CanvasNodeHandles({ selected }: { selected: boolean }) {
  const cls = cn(
    "relative !z-30 !h-8 !w-8 !min-h-8 !min-w-8 !rounded-full !border-0 !bg-transparent",
    "before:pointer-events-none before:absolute before:left-1/2 before:top-1/2 before:h-3 before:w-3",
    "before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-[var(--text-primary)]",
    "before:shadow-[0_0_0_1px_color-mix(in_oklab,var(--border-default)_72%,transparent)]",
    "!pointer-events-auto cursor-crosshair",
    "transition-opacity duration-150 ease-out",
    selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
  )

  return (
    <>
      <Handle type="target" position={Position.Top} id="top-t" className={cls} />
      <Handle type="source" position={Position.Top} id="top-s" className={cls} />
      <Handle type="target" position={Position.Bottom} id="bottom-t" className={cls} />
      <Handle type="source" position={Position.Bottom} id="bottom-s" className={cls} />
      <Handle type="target" position={Position.Left} id="left-t" className={cls} />
      <Handle type="source" position={Position.Left} id="left-s" className={cls} />
      <Handle type="target" position={Position.Right} id="right-t" className={cls} />
      <Handle type="source" position={Position.Right} id="right-s" className={cls} />
    </>
  )
}

function getNodeTextColor(data: CanvasNode["data"]) {
  if (typeof data.textColor === "string" && data.textColor.trim()) return data.textColor
  const match = NODE_COLORS.find((pair) => pair.fill.toLowerCase() === data.color.toLowerCase())
  return match?.text ?? DEFAULT_NODE_COLOR_PAIR.text
}

function getMinSizeForShape(shape: CanvasNode["data"]["shape"]) {
  switch (shape) {
    case "circle":
      return { width: 120, height: 120 }
    case "cylinder":
      return { width: 150, height: 96 }
    case "diamond":
      return { width: 140, height: 92 }
    case "pill":
      return { width: 150, height: 72 }
    case "hexagon":
      return { width: 150, height: 92 }
    case "rectangle":
    default:
      return MIN_NODE_SIZE
  }
}

interface NodeColorToolbarProps {
  active: CanvasNodeColorPair
  onSelect: (pair: CanvasNodeColorPair) => void
}

function NodeColorToolbar({ active, onSelect }: NodeColorToolbarProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-1/2 top-0 z-40",
        "-translate-x-1/2 -translate-y-[calc(100%+12px)]",
        "transition-transform duration-150 ease-out",
      )}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onDoubleClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2 py-2 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)] backdrop-blur-md">
        {NODE_COLORS.map((pair) => {
          const isActive =
            pair.fill.toLowerCase() === active.fill.toLowerCase() &&
            pair.text.toLowerCase() === active.text.toLowerCase()

          return (
            <button
              key={`${pair.fill}-${pair.text}`}
              type="button"
              aria-label="Set node color"
              title="Set node color"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSelect(pair)
              }}
              className={cn(
                "relative inline-flex size-7 items-center justify-center rounded-full border transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                isActive
                  ? "border-border-subtle bg-elevated/55 shadow-[0_0_0_1px_color-mix(in_oklab,var(--border-default)_70%,transparent)]"
                  : "border-border/60 bg-elevated/35 hover:bg-elevated/55",
              )}
              style={{
                boxShadow: isActive
                  ? `0 0 0 2px color-mix(in oklab, ${pair.text} 42%, transparent)`
                  : undefined,
              }}
            >
              <span
                aria-hidden
                className={cn(
                  "block size-4.5 rounded-full",
                  "shadow-[0_0_0_1px_color-mix(in_oklab,var(--border-default)_65%,transparent)]",
                )}
                style={{
                  backgroundColor: pair.fill,
                }}
              />
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute bottom-0.5 right-0.5 block size-2 rounded-full shadow-[0_0_0_1px_color-mix(in_oklab,var(--border-default)_70%,transparent)]"
                  style={{ backgroundColor: pair.text }}
                />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-150",
                  "hover:opacity-100",
                )}
                style={{
                  boxShadow: `0 0 0 6px color-mix(in oklab, ${pair.text} 18%, transparent)`,
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface CanvasNodeRendererProps extends NodeProps<CanvasNode> {
  editingNodeId: string | null
  resizingNodeId: string | null
  setResizingNodeId: Dispatch<SetStateAction<string | null>>
  setEditingNodeId: Dispatch<SetStateAction<string | null>>
  updateNodeLabel: (id: string, label: string) => void
  updateNodeColors: (id: string, pair: CanvasNodeColorPair) => void
}

function CanvasNodeRenderer({
  id,
  data,
  selected,
  editingNodeId,
  resizingNodeId,
  setResizingNodeId,
  setEditingNodeId,
  updateNodeLabel,
  updateNodeColors,
}: CanvasNodeRendererProps) {
  const isEditing = editingNodeId === id
  const isResizing = resizingNodeId === id
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const textColor = getNodeTextColor(data)
  const activeColorPair = useMemo<CanvasNodeColorPair>(() => {
    const fill = typeof data.color === "string" && data.color.trim() ? data.color : DEFAULT_NODE_COLOR_PAIR.fill
    return { fill, text: textColor }
  }, [data.color, textColor])
  const minSize = useMemo(() => getMinSizeForShape(data.shape), [data.shape])

  useEffect(() => {
    if (!isEditing) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [isEditing])

  const onStartEditing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setEditingNodeId(id)
    },
    [id, setEditingNodeId],
  )

  return (
    <div className="group relative h-full w-full overflow-visible [&_.react-flow__handle]:pointer-events-auto">
      <NodeResizer
        isVisible={selected && !isEditing}
        minWidth={minSize.width}
        minHeight={minSize.height}
        keepAspectRatio={data.shape === "circle"}
        onResizeStart={() => setResizingNodeId(id)}
        onResizeEnd={() => setResizingNodeId(null)}
        lineStyle={{
          borderColor: "color-mix(in oklab, var(--border) 55%, transparent)",
          opacity: 0.9,
        }}
        handleClassName={cn(
          // larger hit target; visible dot via ::after so it's still crisp
          "!h-6 !w-6 !rounded-md !border-0 !bg-transparent !shadow-none",
          "after:absolute after:left-1/2 after:top-1/2 after:h-2.5 after:w-2.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-[3px]",
          "after:bg-[color-mix(in_oklab,var(--background)_70%,transparent)]",
          "after:shadow-[0_0_0_1px_color-mix(in_oklab,var(--border-default)_65%,transparent),0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_12%,transparent)]",
          "after:backdrop-blur-[6px]",
          "cursor-nwse-resize",
        )}
      />
      <CanvasShapeVisual
        shape={data.shape}
        label=""
        fill={data.color}
        selected={selected}
        variant="node"
      />
      {selected && !isEditing ? (
        <NodeColorToolbar
          active={activeColorPair}
          onSelect={(pair) => updateNodeColors(id, pair)}
        />
      ) : null}
      {/* pointer-events-none on the wrapper so resize borders receive events;
          pointer-events-auto only on the interactive inner element */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-3 text-center">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={data.label}
            onChange={(e) => updateNodeLabel(id, e.target.value)}
            onBlur={() => setEditingNodeId(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault()
                e.stopPropagation()
                setEditingNodeId(null)
              }
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            rows={1}
            className={cn(
              "pointer-events-auto h-auto w-full resize-none bg-transparent p-0",
              "text-center text-xs font-medium leading-snug outline-none",
              "placeholder:text-muted-foreground/65",
            )}
            style={{ color: textColor }}
            placeholder="Label…"
          />
        ) : (
          <div
            onDoubleClick={onStartEditing}
            className={cn(
              "pointer-events-auto w-full cursor-default select-none truncate text-xs font-medium leading-snug",
              data.label.trim() ? "" : "text-muted-foreground/65",
            )}
            style={data.label.trim() ? { color: textColor } : undefined}
          >
            {data.label.trim() ? data.label : "Label…"}
          </div>
        )}
      </div>
      {/* hide connection handles while resizing so resize is easier */}
      {!isResizing ? <CanvasNodeHandles selected={selected} /> : null}
    </div>
  )
}

function CanvasFlow({ canvasHandleRef }: { canvasHandleRef: Ref<WorkspaceCanvasHandle> }) {
  const rf = useReactFlow<CanvasNode, CanvasEdge>()
  const idCounterRef = useRef(0)
  const dragImageRef = useRef<HTMLImageElement | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<
    null | { payload: ShapePayload; x: number; y: number }
  >(null)

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  useKeyboardShortcuts({
    reactFlow: rf,
    undo,
    redo,
  })

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onDelete,
  } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    suspense: true,
    nodes: { initial: [] },
    edges: { initial: [] },
  })

  const importTemplate = useCallback(
    (template: CanvasTemplate) => {
      setEditingNodeId(null)
      setResizingNodeId(null)
      setEditingEdgeId(null)

      if (edges.length) {
        onEdgesChange(edges.map((edge) => ({ type: "remove", id: edge.id } satisfies EdgeChange<CanvasEdge>)))
      }
      if (nodes.length) {
        onNodesChange(nodes.map((node) => ({ type: "remove", id: node.id } satisfies NodeChange<CanvasNode>)))
      }

      if (template.nodes.length) {
        onNodesChange(template.nodes.map((item) => ({ type: "add", item } satisfies NodeChange<CanvasNode>)))
      }
      if (template.edges.length) {
        onEdgesChange(template.edges.map((item) => ({ type: "add", item } satisfies EdgeChange<CanvasEdge>)))
      }

      window.requestAnimationFrame(() => {
        rf.fitView({ duration: 220, padding: 0.2 })
      })
    },
    [edges, nodes, onEdgesChange, onNodesChange, rf],
  )

  useImperativeHandle(
    canvasHandleRef,
    () => ({
      importTemplate,
    }),
    [importTemplate],
  )

  const commitEdgeLabel = useMutation(
    ({ storage }, edgeId: string, label: string) => {
      const flow = storage.get("flow")
      if (!flow) return
      const edges = (flow as unknown as { get: (k: "edges") => unknown }).get("edges") as
        | {
            get: (id: string) => unknown
          }
        | undefined
      const edge = edges?.get(edgeId) as
        | {
            get: (k: "data") => unknown
          }
        | undefined
      const dataObj = edge?.get("data") as
        | {
            set: (k: "label", v: string) => void
          }
        | undefined
      dataObj?.set("label", label)
    },
    [],
  )

  const updateNodeLabel = useMutation(
    ({ storage }, nodeId: string, label: string) => {
      const flow = storage.get("flow")
      if (!flow) return
      // `flow.nodes[id].data.label = label` (synced)
      const nodes = (flow as unknown as { get: (k: "nodes") => unknown }).get("nodes") as
        | {
            get: (id: string) => unknown
          }
        | undefined
      const node = nodes?.get(nodeId) as
        | {
            get: (k: "data") => unknown
          }
        | undefined
      const dataObj = node?.get("data") as
        | {
            set: (k: "label", v: string) => void
          }
        | undefined
      dataObj?.set("label", label)
    },
    [],
  )

  const updateNodeColors = useMutation(
    ({ storage }, nodeId: string, pair: CanvasNodeColorPair) => {
      const flow = storage.get("flow")
      if (!flow) return
      const nodes = (flow as unknown as { get: (k: "nodes") => unknown }).get("nodes") as
        | {
            get: (id: string) => unknown
          }
        | undefined
      const node = nodes?.get(nodeId) as
        | {
            get: (k: "data") => unknown
          }
        | undefined
      const dataObj = node?.get("data") as
        | {
            set: (k: "color" | "textColor", v: string) => void
          }
        | undefined
      dataObj?.set("color", pair.fill)
      dataObj?.set("textColor", pair.text)
    },
    [],
  )

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
          color: DEFAULT_NODE_COLOR_PAIR.fill,
          textColor: DEFAULT_NODE_COLOR_PAIR.text,
          shape: payload.shape,
        },
        style: { width: payload.width, height: payload.height },
      }

      const changes: NodeChange<CanvasNode>[] = [{ type: "add", item: newNode }]
      onNodesChange(changes)
    },
    [onNodesChange, rf],
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const nextCounter = (idCounterRef.current += 1)
      const id = `e-${Date.now()}-${nextCounter}`

      const newEdge: CanvasEdge = {
        id,
        type: "canvasEdge",
        source: connection.source ?? "",
        target: connection.target ?? "",
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        data: { label: "" },
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          stroke: "color-mix(in oklab, var(--foreground) 46%, transparent)",
          strokeWidth: 2,
        },
      }

      onEdgesChange([{ type: "add", item: newEdge }])
    },
    [onEdgesChange],
  )

  const CanvasNodeType = useMemo(() => {
    return function CanvasNodeTypeInner(props: NodeProps<CanvasNode>) {
      return (
        <CanvasNodeRenderer
          {...props}
          editingNodeId={editingNodeId}
          resizingNodeId={resizingNodeId}
          setEditingNodeId={setEditingNodeId}
          setResizingNodeId={setResizingNodeId}
          updateNodeLabel={updateNodeLabel}
          updateNodeColors={updateNodeColors}
        />
      )
    }
  }, [editingNodeId, resizingNodeId, setResizingNodeId, updateNodeColors, updateNodeLabel])

  const edgeTypes = useMemo(() => {
    return {
      canvasEdge: (props: EdgeProps<CanvasEdge>) => (
        <CanvasEdgeRenderer
          {...props}
          editing={editingEdgeId === props.id}
          onStartEditing={(edgeId) => setEditingEdgeId(edgeId)}
          onCommitLabel={(edgeId, label) => commitEdgeLabel(edgeId, label)}
          onStopEditing={() => setEditingEdgeId(null)}
        />
      ),
    }
  }, [commitEdgeLabel, editingEdgeId])

  return (
    <div className="relative h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <img
        ref={dragImageRef}
        src={EMPTY_DRAG_IMG_SRC}
        alt=""
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
        draggable={false}
      />
      {dragPreview ? (
        <div
          className="pointer-events-none fixed z-200"
          style={{
            left: dragPreview.x,
            top: dragPreview.y,
            width: dragPreview.payload.width,
            height: dragPreview.payload.height,
            transform: "translate(-50%, -50%)",
          }}
        >
          <CanvasShapeVisual
            variant="ghost"
            shape={dragPreview.payload.shape}
            fill={DEFAULT_NODE_COLOR_PAIR.fill}
          />
        </div>
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        onEdgeDoubleClick={(e, edge) => {
          e.preventDefault()
          e.stopPropagation()
          setEditingEdgeId(edge.id)
        }}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={42}
        fitView
        nodeTypes={{ canvasNode: CanvasNodeType }}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: "canvasEdge",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            stroke: "color-mix(in oklab, var(--foreground) 46%, transparent)",
            strokeWidth: 2,
          },
        }}
        nodesDraggable={!editingNodeId && !resizingNodeId}
        panOnDrag={!editingNodeId && !resizingNodeId}
        edgesFocusable={!editingEdgeId}
        panOnScroll={!editingEdgeId}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.25} />
      </ReactFlow>

      <div className="pointer-events-auto absolute bottom-5 left-5 z-10">
        <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2 py-2 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)] backdrop-blur-md">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Zoom out"
              title="Zoom out"
              onClick={() => rf.zoomOut({ duration: 160 })}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-elevated/40 text-foreground/90 transition hover:bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              <Minus className="size-4.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Fit view"
              title="Fit view"
              onClick={() => rf.fitView({ duration: 220 })}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-elevated/40 text-foreground/90 transition hover:bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              <Scan className="size-4.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              onClick={() => rf.zoomIn({ duration: 160 })}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-elevated/40 text-foreground/90 transition hover:bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              <Plus className="size-4.5" aria-hidden />
            </button>
          </div>

          <div aria-hidden className="mx-1 h-6 w-px bg-border/60" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Undo"
              title="Undo"
              onClick={undo}
              disabled={!canUndo}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-elevated/40 text-foreground/90 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                canUndo ? "hover:bg-elevated/60" : "opacity-45",
              )}
            >
              <Undo2 className="size-4.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Redo"
              title="Redo"
              onClick={redo}
              disabled={!canRedo}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-full border border-border/60 bg-elevated/40 text-foreground/90 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                canRedo ? "hover:bg-elevated/60" : "opacity-45",
              )}
            >
              <Redo2 className="size-4.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <ShapeToolbar
        getDragImageEl={() => dragImageRef.current}
        onDragPreviewChange={setDragPreview}
      />
    </div>
  )
}

const CanvasInner = forwardRef<WorkspaceCanvasHandle>(function CanvasInnerInner(_, ref) {
  return (
    <ReactFlowProvider>
      <CanvasFlow canvasHandleRef={ref} />
    </ReactFlowProvider>
  )
})

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

export const WorkspaceCanvas = forwardRef<WorkspaceCanvasHandle, WorkspaceCanvasProps>(
  function WorkspaceCanvasInner({ roomId }, ref) {
  const initialPresence = useMemo(
    () => ({ cursor: null, isThinking: false }),
    [],
  )

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId} initialPresence={initialPresence}>
        <ErrorBoundary fallback={<CanvasErrorFallback />}>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <CanvasInner ref={ref} />
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
})

