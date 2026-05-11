import { createOpenAI } from "@ai-sdk/openai";
import { AbortTaskRunError, logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { generateText, type LanguageModel } from "ai";
import {
  designAgentPayloadSchema,
  normalizeDesignAgentPayload,
  type NormalizedDesignAgentPayload,
} from "@/lib/design-agent-payload";
import {
  applyDesignAgentActions,
  designAgentPlanSchema,
  type DesignAgentPlan,
} from "@/lib/design-agent-schema";
import { designAgentPresenceUserId } from "@/lib/design-agent-constants";
import { getLiveblocks } from "@/lib/liveblocks";
import { postDesignAgentFeedMessage } from "@/lib/liveblocks-design-agent";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

export { designAgentPayloadSchema, type NormalizedDesignAgentPayload };

const SYSTEM_PROMPT = `You are Ghosty AI Architect. Convert the user's request into a concise plan of canvas mutations for a collaborative system-design canvas.

Rules:
- Use only these node shapes: rectangle, diamond, circle, pill, cylinder, hexagon.
- Colors: reference palette by colorIndex 0–7 only (0 neutral, 1 blue, 2 purple, 3 orange, 4 red, 5 pink, 6 green, 7 teal). Prefer varied indices for distinct components.
- Layout: left-to-right or top-down flow. Minimum spacing ~280px horizontally and ~140px vertically between node positions (node position is top-left).
- Default dimensions are chosen if omitted on addNode; you may set width (80–480) and height (48–400) when helpful.
- Prefer rectangle for services/modules, diamond for decisions, cylinder for data stores.
- Use short labels (≤ 80 chars). Connect nodes with addEdge after nodes exist.
- If the user asks to modify the existing diagram, prefer update/move/delete actions referencing existing node ids from the canvas snapshot.
- Keep action count reasonable (≤ 40). Return a helpful summary string for collaborators.

Canvas snapshot format: nodes and edges arrays use the same ids as on the canvas.`;

/** OpenAI structured-json mode rejects Zod discriminated unions; we ask for raw JSON then validate. */
const JSON_SHAPE_INSTRUCTION = `

Respond with exactly one JSON object (no markdown code fences, no prose before or after). Shape:
{
  "summary": string,
  "actions": Action[]
}
Each Action has "type" and fields for that type only:
- addNode: id, label, shape ("rectangle"|"diamond"|"circle"|"pill"|"cylinder"|"hexagon"), x, y; optional width, height, colorIndex (integer 0-7)
- moveNode: id, x, y
- resizeNode: id, width, height
- updateNodeData: id; optional label, shape, colorIndex
- deleteNode: id
- addEdge: id, source, target; optional label
- deleteEdge: id
`;

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const candidate = fenced ? fenced[1]!.trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Model output did not contain a JSON object");
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new Error("Model output was not valid JSON");
  }
}

async function generateDesignPlan(
  model: LanguageModel,
  userPayloadJson: string,
  repairHint?: string,
): Promise<DesignAgentPlan> {
  const repair =
    repairHint !== undefined
      ? `\nPrevious attempt failed: ${repairHint}\nReturn corrected JSON only.`
      : "";

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT + JSON_SHAPE_INSTRUCTION + repair,
    prompt: userPayloadJson,
    temperature: 0.2,
    maxOutputTokens: 8192,
  });

  const raw = extractJsonObject(text);
  const parsed = designAgentPlanSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; "),
    );
  }
  return parsed.data;
}

async function generateDesignPlanWithRetry(
  model: LanguageModel,
  userPayloadJson: string,
): Promise<DesignAgentPlan> {
  let lastErr: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await generateDesignPlan(model, userPayloadJson, lastErr);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt === 1) throw e;
    }
  }
  throw new Error("design plan generation exhausted retries");
}

async function snapshotCanvasJson(roomId: string) {
  const liveblocks = getLiveblocks();
  try {
    const doc = (await liveblocks.getStorageDocument(roomId, "json")) as Record<
      string,
      unknown
    >;
    const flow = doc.flow as
      | {
          nodes?: Record<string, CanvasNode>;
          edges?: Record<string, CanvasEdge>;
        }
      | undefined;
    if (!flow?.nodes && !flow?.edges) {
      return { nodes: [] as CanvasNode[], edges: [] as CanvasEdge[] };
    }
    const nodes = flow.nodes ? Object.values(flow.nodes) : [];
    const edges = flow.edges ? Object.values(flow.edges) : [];
    return { nodes, edges };
  } catch (err) {
    logger.warn("design-agent: could not read storage snapshot", {
      roomId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { nodes: [] as CanvasNode[], edges: [] as CanvasEdge[] };
  }
}

async function pulseAiPresence(
  liveblocks: ReturnType<typeof getLiveblocks>,
  roomId: string,
  aiUserId: string,
  thinking: boolean,
  cursor: { x: number; y: number },
) {
  await liveblocks.setPresence(roomId, {
    userId: aiUserId,
    data: { cursor, thinking },
    userInfo: {
      name: "Ghosty AI",
      color: "#6457f9",
    },
    ttl: 180,
  });
}

async function clearAiPresence(
  liveblocks: ReturnType<typeof getLiveblocks>,
  roomId: string,
  aiUserId: string,
) {
  await liveblocks.setPresence(roomId, {
    userId: aiUserId,
    data: { cursor: null, thinking: false },
    userInfo: {
      name: "Ghosty AI",
      color: "#6457f9",
    },
    ttl: 2,
  });
}

export const designAgentTask = schemaTask({
  id: "design-agent",
  schema: designAgentPayloadSchema,
  run: async (input, { ctx }) => {
    let job: NormalizedDesignAgentPayload;
    try {
      job = normalizeDesignAgentPayload(input);
    } catch (err) {
      throw new AbortTaskRunError(
        err instanceof Error ? err.message : String(err),
      );
    }

    const runId = ctx.run.id;
    const aiUserId = designAgentPresenceUserId(runId);
    const liveblocks = getLiveblocks();
    const room = job.liveblocksRoomId;

    const setStatus = async (
      phase: "start" | "processing" | "complete" | "error",
      message: string,
    ) => {
      metadata.set("phase", phase);
      metadata.set("lastMessage", message);
      metadata.set("runId", runId);
      try {
        await postDesignAgentFeedMessage(liveblocks, room, {
          runId,
          phase,
          message,
        });
      } catch (err) {
        logger.error("design-agent feed message failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    await setStatus("start", "Starting AI Architect…");
    await pulseAiPresence(liveblocks, room, aiUserId, true, {
      x: 320,
      y: 220,
    });

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        await setStatus("error", "OPENAI_API_KEY is not configured for this environment.");
        return { ok: false as const, error: "missing_openai_key" };
      }

      await setStatus("processing", "Reading canvas and interpreting your prompt…");
      await pulseAiPresence(liveblocks, room, aiUserId, true, {
        x: 420,
        y: 280,
      });

      const snapshot = await snapshotCanvasJson(room);
      const snapshotBrief = {
        nodes: snapshot.nodes.map((n) => ({
          id: n.id,
          label: n.data?.label,
          shape: n.data?.shape,
          x: n.position?.x,
          y: n.position?.y,
        })),
        edges: snapshot.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      };

      const openai = createOpenAI({ apiKey });
      const model = openai("gpt-4o");

      await pulseAiPresence(liveblocks, room, aiUserId, true, {
        x: 380,
        y: 360,
      });

      const userPayloadJson = JSON.stringify({
        userPrompt: job.prompt,
        projectId: job.projectId,
        canvas: snapshotBrief,
      });

      const plan = await generateDesignPlanWithRetry(model, userPayloadJson);

      await setStatus("processing", "Applying changes to the shared canvas…");

      await mutateFlow<CanvasNode, CanvasEdge>(
        { client: liveblocks, roomId: room },
        async (flow) => {
          applyDesignAgentActions(flow, plan.actions);
        },
      );

      await setStatus("complete", plan.summary || "Design update complete.");
      logger.info("design-agent completed", {
        runId,
        actionCount: plan.actions.length,
      });

      return {
        ok: true as const,
        runId,
        summary: plan.summary,
        actionCount: plan.actions.length,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Design agent failed unexpectedly.";
      logger.error("design-agent failed", { runId, error: message });
      await setStatus("error", message);
      return { ok: false as const, runId, error: message };
    } finally {
      try {
        await clearAiPresence(liveblocks, room, aiUserId);
      } catch (presenceErr) {
        logger.warn("design-agent: failed to clear AI presence", {
          error:
            presenceErr instanceof Error
              ? presenceErr.message
              : String(presenceErr),
        });
      }
    }
  },
});
