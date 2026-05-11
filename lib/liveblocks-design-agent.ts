import { Liveblocks, LiveblocksError } from "@liveblocks/node";

import { DESIGN_AGENT_FEED_ID } from "@/lib/design-agent-constants";

type LB = InstanceType<typeof Liveblocks>;

export async function ensureDesignAgentFeed(liveblocks: LB, roomId: string) {
  try {
    await liveblocks.getFeed({ roomId, feedId: DESIGN_AGENT_FEED_ID });
    return;
  } catch {
    /* feed missing — create */
  }
  try {
    await liveblocks.createFeed({
      roomId,
      feedId: DESIGN_AGENT_FEED_ID,
      metadata: { name: "AI Architect" },
    });
  } catch (err) {
    if (err instanceof LiveblocksError && err.status === 409) return;
    throw err;
  }
}

export async function postDesignAgentFeedMessage(
  liveblocks: LB,
  roomId: string,
  data: {
    runId: string;
    phase: "start" | "processing" | "complete" | "error";
    message: string;
  },
) {
  await ensureDesignAgentFeed(liveblocks, roomId);
  await liveblocks.createFeedMessage({
    roomId,
    feedId: DESIGN_AGENT_FEED_ID,
    data: {
      runId: data.runId,
      phase: data.phase,
      message: data.message,
      ts: Date.now(),
    },
  });
}
