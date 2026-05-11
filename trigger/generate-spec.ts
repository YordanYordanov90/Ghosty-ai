import { createOpenAI } from "@ai-sdk/openai";
import { Liveblocks, LiveblocksError } from "@liveblocks/node";
import { put } from "@vercel/blob";
import {
  AbortTaskRunError,
  logger,
  metadata,
  schemaTask,
} from "@trigger.dev/sdk";
import { generateText } from "ai";
import { randomUUID } from "node:crypto";

import { AI_STATUS_FEED_ID } from "@/lib/ai-status-feed-constants";
import { projectSpecs } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { getLiveblocks } from "@/lib/liveblocks";
import {
  normalizeSpecAgentPayload,
  specAgentTaskPayloadSchema,
  type NormalizedSpecAgentPayload,
  type SpecAgentTaskPayload,
} from "@/lib/spec-agent-payload";

export { specAgentTaskPayloadSchema };

const SYSTEM_PROMPT = `You are Ghosty AI Spec Writer. Convert the user's collaborative canvas + chat history into a clear, production-ready technical specification.

Output rules:
- Output GitHub-flavored Markdown only. No code fences around the whole document, no preamble, no closing remarks.
- Start with a single H1 title summarising the system (e.g. "# <System name> Technical Specification").
- Required sections, in order, using H2 headings:
  1. ## Overview — one short paragraph + bullet list of goals.
  2. ## Architecture — describe how the components on the canvas connect; reference component names from the canvas labels.
  3. ## Components — H3 per component (one per canvas node when meaningful), describing responsibility, key inputs/outputs, and notable dependencies.
  4. ## Data Flow — numbered list of the main flows the diagram implies.
  5. ## API & Interfaces — list the contracts implied by the canvas / chat (HTTP routes, queues, events). Use a Markdown table when several rows fit.
  6. ## Open Questions — bullet list of decisions still needed (cite chat history where useful).
  7. ## Next Steps — bullet list of concrete follow-up tasks.
- Keep claims grounded in the canvas + chat. Do NOT invent vendors, model names, or scale numbers that weren't mentioned. If a section has no input, write a brief honest note ("Not yet defined.") instead of fabricating content.
- Prefer concise prose. Use bullet lists and tables liberally. Avoid filler sentences.
`;

type SpecPhase = "start" | "processing" | "complete" | "error";

interface SpecStatusContext {
  liveblocks: ReturnType<typeof getLiveblocks>;
  roomId: string;
  runId: string;
}

async function ensureAiStatusFeed(
  liveblocks: ReturnType<typeof getLiveblocks>,
  roomId: string,
) {
  try {
    await liveblocks.getFeed({ roomId, feedId: AI_STATUS_FEED_ID });
    return;
  } catch {
    /* feed missing — create */
  }
  try {
    await liveblocks.createFeed({
      roomId,
      feedId: AI_STATUS_FEED_ID,
      metadata: { name: "AI Status" },
    });
  } catch (err) {
    if (err instanceof LiveblocksError && err.status === 409) return;
    throw err;
  }
}

async function postAiStatusFeedMessage(
  liveblocks: ReturnType<typeof getLiveblocks>,
  roomId: string,
  data: { runId: string; phase: SpecPhase; message: string },
) {
  await ensureAiStatusFeed(liveblocks, roomId);
  const phasePayload =
    data.phase === "complete" || data.phase === "error"
      ? data.phase
      : "active";
  await liveblocks.createFeedMessage({
    roomId,
    feedId: AI_STATUS_FEED_ID,
    data: {
      runId: data.runId,
      phase: phasePayload,
      taskKind: "spec",
      text: data.message,
      ts: Date.now(),
    },
  });
}

function buildSnapshotBrief(payload: NormalizedSpecAgentPayload) {
  return {
    nodes: payload.nodes.map((n) => ({
      id: n.id,
      label: n.data?.label,
      shape: n.data?.shape,
      x: n.position?.x,
      y: n.position?.y,
    })),
    edges: payload.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.data?.label,
    })),
    chatHistory: payload.chatHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };
}

async function publishStatus(
  ctx: SpecStatusContext,
  phase: SpecPhase,
  message: string,
) {
  metadata.set("phase", phase);
  metadata.set("lastMessage", message);
  metadata.set("runId", ctx.runId);
  metadata.set("taskKind", "spec");
  try {
    await postAiStatusFeedMessage(ctx.liveblocks, ctx.roomId, {
      runId: ctx.runId,
      phase,
      message,
    });
  } catch (err) {
    logger.warn("generate-spec: failed to publish ai-status-feed message", {
      runId: ctx.runId,
      phase,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const generateSpecTask = schemaTask({
  id: "generate-spec",
  schema: specAgentTaskPayloadSchema,
  run: async (input: SpecAgentTaskPayload, { ctx }) => {
    let job: NormalizedSpecAgentPayload;
    try {
      job = normalizeSpecAgentPayload(input);
    } catch (err) {
      throw new AbortTaskRunError(
        err instanceof Error ? err.message : String(err),
      );
    }

    const runId = ctx.run.id;
    const liveblocks: InstanceType<typeof Liveblocks> = getLiveblocks();
    const statusCtx: SpecStatusContext = {
      liveblocks,
      roomId: job.liveblocksRoomId,
      runId,
    };

    await publishStatus(statusCtx, "start", "Starting AI spec writer…");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const msg = "OPENAI_API_KEY is not configured for this environment.";
      await publishStatus(statusCtx, "error", msg);
      throw new AbortTaskRunError(msg);
    }

    try {
      await publishStatus(
        statusCtx,
        "processing",
        "Reading canvas and chat history…",
      );

      const snapshotBrief = buildSnapshotBrief(job);

      const openai = createOpenAI({ apiKey });
      const model = openai("gpt-4o");

      const userPayloadJson = JSON.stringify({
        projectId: job.projectId,
        canvas: { nodes: snapshotBrief.nodes, edges: snapshotBrief.edges },
        chatHistory: snapshotBrief.chatHistory,
      });

      await publishStatus(
        statusCtx,
        "processing",
        "Drafting Markdown specification…",
      );

      const { text } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: userPayloadJson,
        temperature: 0.2,
        maxOutputTokens: 8192,
      });

      const spec = text.trim();
      if (!spec) {
        const msg = "Spec generation returned empty output.";
        await publishStatus(statusCtx, "error", msg);
        throw new AbortTaskRunError(msg);
      }

      metadata.set("specBytes", spec.length);

      await publishStatus(statusCtx, "processing", "Saving spec for download…");

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        const msg =
          "BLOB_READ_WRITE_TOKEN is not configured for this environment.";
        await publishStatus(statusCtx, "error", msg);
        throw new AbortTaskRunError(msg);
      }

      const specId = randomUUID();
      const blob = await put(
        `specs/${job.projectId}/${specId}.md`,
        spec,
        {
          access: "private",
          addRandomSuffix: false,
          contentType: "text/markdown; charset=utf-8",
        },
      );

      await db.insert(projectSpecs).values({
        id: specId,
        projectId: job.projectId,
        filePath: blob.url,
      });

      await publishStatus(
        statusCtx,
        "complete",
        "Specification ready for review.",
      );
      logger.info("generate-spec completed", {
        runId,
        specBytes: spec.length,
        nodeCount: job.nodes.length,
        edgeCount: job.edges.length,
        chatTurns: job.chatHistory.length,
      });

      return {
        ok: true as const,
        runId,
        spec,
        projectId: job.projectId,
        specId,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Spec generation failed.";
      logger.error("generate-spec failed", { runId, error: message });
      await publishStatus(statusCtx, "error", message);
      return { ok: false as const, runId, error: message };
    }
  },
});
