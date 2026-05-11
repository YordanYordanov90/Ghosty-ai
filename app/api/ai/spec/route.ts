import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";

import { taskRuns } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/project-access";
import {
  resolveSpecAgentProjectId,
  specAgentWirePayloadSchema,
} from "@/lib/spec-agent-payload";
import { devDetail, jsonError, jsonOk } from "@/lib/api-response";
import type { generateSpecTask } from "@/trigger/generate-spec";

export const runtime = "nodejs";

function unauthorized() {
  return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized" });
}

function forbidden() {
  return jsonError({ status: 403, error: "Forbidden", code: "forbidden" });
}

// POST /api/ai/spec
// Triggers the generate-spec Trigger.dev task and persists a TaskRun record
// scoped to the requesting user + project so the token route can verify ownership later.
// The project is resolved server-side from `roomId` — never trust a client-supplied projectId.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError({ status: 400, error: "Invalid JSON body", code: "invalid_json" });
  }

  const parsed = specAgentWirePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError({
      status: 400,
      error: "Invalid body",
      code: "invalid_body",
      issues: parsed.error.flatten(),
    });
  }

  const projectId = resolveSpecAgentProjectId({ roomId: parsed.data.roomId });
  if (!projectId) {
    return jsonError({
      status: 400,
      error: "Invalid roomId — must be the project UUID for the workspace you're in.",
      code: "invalid_room_id",
    });
  }

  const accessible = await hasProjectAccess(projectId);
  if (!accessible) return forbidden();

  let handle: Awaited<ReturnType<typeof tasks.trigger>>;
  try {
    handle = await tasks.trigger<typeof generateSpecTask>("generate-spec", {
      roomId: parsed.data.roomId,
      projectId,
      chatHistory: parsed.data.chatHistory,
      nodes: parsed.data.nodes,
      edges: parsed.data.edges,
    });
  } catch (error) {
    return jsonError({
      status: 500,
      error: "Failed to trigger spec task",
      code: "trigger_failed",
      detail: devDetail(error) ?? "Unable to trigger spec task",
    });
  }

  try {
    await db.insert(taskRuns).values({
      runId: handle.id,
      projectId,
      ownerId: userId,
    });
  } catch (dbError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[/api/ai/spec] task_runs insert failed:", dbError);
    }
  }

  return jsonOk({ runId: handle.id }, { status: 202 });
}
