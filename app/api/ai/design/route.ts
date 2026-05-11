import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

import { taskRuns } from "@/drizzle/schema";
import { db } from "@/lib/db";
import {
  designAgentPayloadSchema,
  normalizeDesignAgentPayload,
} from "@/lib/design-agent-payload";
import { hasProjectAccess } from "@/lib/project-access";
import type { designAgentTask } from "@/trigger/design-agent";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = designAgentPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let job;
  try {
    job = normalizeDesignAgentPayload(parsed.data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid project reference";
    return NextResponse.json({ error: message }, { status: 400 });
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to trigger design task",
        detail:
          process.env.NODE_ENV === "development"
            ? message
            : "Unable to trigger design task",
      },
      { status: 500 },
    );
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

  return NextResponse.json({ runId: handle.id }, { status: 202 });
}
