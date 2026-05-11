import { z } from "zod";

const uuidSchema = z.string().uuid();

/** Permissive chat message — `role` covers user/assistant/system; content is bounded. */
export const specChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(20_000),
  })
  .strict();

/**
 * Permissive node snapshot used as LLM context. We don't try to enforce the full
 * React Flow shape — the canvas snapshot is fed to the model verbatim, so we keep
 * fields the prompt actually needs (id, label, shape, position).
 */
export const specCanvasNodeSchema = z
  .object({
    id: z.string().min(1).max(200),
    position: z
      .object({ x: z.number(), y: z.number() })
      .partial()
      .optional(),
    data: z
      .object({
        label: z.string().max(2000).optional(),
        shape: z.string().max(80).optional(),
        color: z.string().max(40).optional(),
        textColor: z.string().max(40).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const specCanvasEdgeSchema = z
  .object({
    id: z.string().min(1).max(200),
    source: z.string().min(1).max(200),
    target: z.string().min(1).max(200),
    data: z
      .object({
        label: z.string().max(2000).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/**
 * Wire payload accepted by `POST /api/ai/spec`. `projectId` is intentionally absent
 * here — the API route always resolves it from `roomId` + authenticated user so a
 * client cannot trigger spec generation for a project they cannot access.
 */
export const specAgentWirePayloadSchema = z.object({
  roomId: z.string().min(1).max(200),
  chatHistory: z.array(specChatMessageSchema).max(200).default([]),
  nodes: z.array(specCanvasNodeSchema).max(500).default([]),
  edges: z.array(specCanvasEdgeSchema).max(1000).default([]),
});

export type SpecAgentWirePayload = z.infer<typeof specAgentWirePayloadSchema>;

/**
 * Task payload — same shape as the wire payload but `projectId` is required because
 * the API route resolves it before triggering. Validated again inside the task via Zod.
 */
export const specAgentTaskPayloadSchema = specAgentWirePayloadSchema.extend({
  projectId: z.string().uuid(),
});

export type SpecAgentTaskPayload = z.infer<typeof specAgentTaskPayloadSchema>;

export interface NormalizedSpecAgentPayload {
  /** Original client/test room key (may be non-UUID). */
  roomId: string;
  /** Drizzle / ownership UUID (always set after normalize). */
  projectId: string;
  /** Liveblocks document id — project UUID in production. */
  liveblocksRoomId: string;
  chatHistory: SpecAgentTaskPayload["chatHistory"];
  nodes: SpecAgentTaskPayload["nodes"];
  edges: SpecAgentTaskPayload["edges"];
}

/**
 * Resolve a stable project UUID from the wire payload. When the API route owns the
 * resolution this collapses to "trust `roomId` if it's already a UUID"; otherwise the
 * caller must look the project up themselves and pass it as `projectId`.
 */
export function resolveSpecAgentProjectId(payload: {
  roomId: string;
  projectId?: string;
}): string | undefined {
  if (
    payload.projectId !== undefined &&
    uuidSchema.safeParse(payload.projectId).success
  ) {
    return payload.projectId;
  }
  if (uuidSchema.safeParse(payload.roomId).success) {
    return payload.roomId;
  }
  return undefined;
}

export function resolveSpecAgentLiveblocksRoomId(
  payload: { roomId: string },
  projectId: string,
): string {
  if (uuidSchema.safeParse(payload.roomId).success) {
    return payload.roomId;
  }
  return projectId;
}

export function normalizeSpecAgentPayload(
  payload: SpecAgentTaskPayload,
): NormalizedSpecAgentPayload {
  const projectId = resolveSpecAgentProjectId(payload);
  if (!projectId) {
    throw new Error(
      "Pass projectId (UUID from /editor/[projectId]), or set roomId to that same UUID. Non-UUID roomId values require projectId.",
    );
  }
  return {
    roomId: payload.roomId,
    projectId,
    liveblocksRoomId: resolveSpecAgentLiveblocksRoomId(payload, projectId),
    chatHistory: payload.chatHistory,
    nodes: payload.nodes,
    edges: payload.edges,
  };
}
