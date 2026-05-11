import { z } from "zod";

const uuidSchema = z.string().uuid();

/**
 * Wire payload. `projectId` is optional when `roomId` is the project UUID (Ghosty uses that UUID as the Liveblocks room id).
 * For Trigger dashboard tests with a non-UUID `roomId`, pass `projectId` explicitly (from `/editor/[projectId]`).
 */
export const designAgentPayloadSchema = z.object({
  prompt: z.string().min(1).max(10_000),
  roomId: z.string().min(1).max(200),
  projectId: z.string().uuid().optional(),
});

export type DesignAgentPayloadInput = z.infer<typeof designAgentPayloadSchema>;

export interface NormalizedDesignAgentPayload {
  prompt: string;
  /** Original client/test room key (may be non-UUID). */
  roomId: string;
  /** Drizzle / ownership UUID (always set after normalize). */
  projectId: string;
  /** Liveblocks document id — project UUID in production. */
  liveblocksRoomId: string;
}

export function resolveDesignAgentProjectId(
  payload: DesignAgentPayloadInput,
): string | undefined {
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

/** Liveblocks rooms are keyed by project UUID; arbitrary `roomId` strings cannot open storage. */
export function resolveDesignAgentLiveblocksRoomId(
  payload: DesignAgentPayloadInput,
  projectId: string,
): string {
  if (uuidSchema.safeParse(payload.roomId).success) {
    return payload.roomId;
  }
  return projectId;
}

export function normalizeDesignAgentPayload(
  payload: DesignAgentPayloadInput,
): NormalizedDesignAgentPayload {
  const projectId = resolveDesignAgentProjectId(payload);
  if (!projectId) {
    throw new Error(
      "Pass projectId (UUID from /editor/[projectId]), or set roomId to that same UUID. Non-UUID roomId values require projectId.",
    );
  }
  return {
    prompt: payload.prompt,
    roomId: payload.roomId,
    projectId,
    liveblocksRoomId: resolveDesignAgentLiveblocksRoomId(payload, projectId),
  };
}
