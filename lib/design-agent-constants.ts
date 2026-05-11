/** Liveblocks feed id for AI Architect status (room-scoped). */
export const DESIGN_AGENT_FEED_ID = "ghosty-design-agent-status";

/** Ephemeral presence user id for the design agent (unique per Trigger run). */
export function designAgentPresenceUserId(runId: string): string {
  return `ghosty-ai-design:${runId}`;
}
