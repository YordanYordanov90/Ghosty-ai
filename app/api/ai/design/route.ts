import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";

import { taskRuns } from "@/drizzle/schema";
import { db } from "@/lib/db";
import {
  designAgentPayloadSchema,
  normalizeDesignAgentPayload,
} from "@/lib/design-agent-payload";
import { hasProjectAccess } from "@/lib/project-access";
import { devDetail, jsonError, jsonOk } from "@/lib/api-response";
import type { designAgentTask } from "@/trigger/design-agent";

export const runtime = "nodejs";

function unauthorized() {
  return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized" });
}

function forbidden() {
  return jsonError({ status: 403, error: "Forbidden", code: "forbidden" });
}

// POST /api/ai/design
// Triggers the design-agent Trigger.dev task and persists a TaskRun record
// scoped to the requesting user + project so the token route can verify ownership later.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError({
      status: 400,
      error: "Invalid JSON body",
      code: "invalid_json",
    });
  }

  const parsed = designAgentPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError({
      status: 400,
      error: "Invalid body",
      code: "invalid_body",
      issues: parsed.error.flatten(),
    });
  }

  let job;
  try {
    job = normalizeDesignAgentPayload(parsed.data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid project reference";
    return jsonError({
      status: 400,
      error: message,
      code: "invalid_project_reference",
    });
  }

  const accessible = await hasProjectAccess(job.projectId);
  if (!accessible) return forbidden();

  let handle: Awaited<ReturnType<typeof tasks.trigger>>;
  try {
    handle = await tasks.trigger<typeof designAgentTask>(
      "design-agent",
      {
        prompt: job.prompt,
        roomId: job.roomId,
        projectId: job.projectId,
      },
    );
  } catch (error) {
    return jsonError({
      status: 500,
      error: "Failed to trigger design task",
      code: "trigger_failed",
      detail: devDetail(error) ?? "Unable to trigger design task",
    });
  }

  try {
    await db.insert(taskRuns).values({
      runId: handle.id,
      projectId: job.projectId,
      ownerId: userId,
    });
  } catch (dbError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[/api/ai/design] task_runs insert failed:", dbError);
    }
  }

  return jsonOk({ runId: handle.id }, { status: 202 });
}
