import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";

import { taskRuns } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/project-access";
import {
  resolveSpecAgentProjectId,
  specAgentWirePayloadSchema,
} from "@/lib/spec-agent-payload";
import type { generateSpecTask } from "@/trigger/generate-spec";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = specAgentWirePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const projectId = resolveSpecAgentProjectId({ roomId: parsed.data.roomId });
  if (!projectId) {
    return NextResponse.json(
      {
        error:
          "Invalid roomId — must be the project UUID for the workspace you're in.",
      },
      { status: 400 },
    );
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to trigger spec task",
        detail:
          process.env.NODE_ENV === "development"
            ? message
            : "Unable to trigger spec task",
      },
      { status: 500 },
    );
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

  return NextResponse.json({ runId: handle.id }, { status: 202 });
}
