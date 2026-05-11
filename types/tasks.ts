import { z } from "zod";

/** Phases for shared AI activity on Liveblocks feed `ai-status-feed`. */
export const aiStatusFeedPhaseSchema = z.enum([
  "idle",
  "active",
  "complete",
  "error",
]);

/** Payload for each message on `ai-status-feed` (design/spec-friendly). */
export const aiStatusFeedPayloadSchema = z
  .object({
    text: z.string().max(4000).optional(),
    phase: aiStatusFeedPhaseSchema.optional(),
    taskKind: z.enum(["design", "spec"]).optional(),
    ts: z.number().optional(),
  })
  .strict();

export type AiStatusFeedPayload = z.infer<typeof aiStatusFeedPayloadSchema>;

export function parseAiStatusFeedPayload(
  data: unknown,
): AiStatusFeedPayload | null {
  const result = aiStatusFeedPayloadSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function isAiGenerationActiveFromPayload(
  payload: AiStatusFeedPayload | null,
): boolean {
  return payload?.phase === "active";
}

/** Payload for collaborative room chat messages on Liveblocks feed `ai-chat`. */
export const aiChatMessagePayloadSchema = z
  .object({
    sender: z.string().min(1).max(120),
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
    timestamp: z.number(),
  })
  .strict();

export type AiChatMessagePayload = z.infer<typeof aiChatMessagePayloadSchema>;

export function parseAiChatMessagePayload(
  data: unknown,
): AiChatMessagePayload | null {
  const result = aiChatMessagePayloadSchema.safeParse(data);
  return result.success ? result.data : null;
}
