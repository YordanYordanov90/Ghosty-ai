import { auth as clerkAuth } from "@clerk/nextjs/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { taskRuns } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/project-access";

export const runtime = "nodejs";

const bodySchema = z.object({
  runId: z.string().min(1).max(200),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST /api/ai/spec/token
// Issues a Trigger.dev public token scoped to a single spec run after verifying that
// the requesting user owns the matching TaskRun + still has access to its project.
export async function POST(request: Request) {
  const { userId } = await clerkAuth();
  if (!userId) return unauthorized();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { runId } = parsed.data;

  const [record] = await db
    .select()
    .from(taskRuns)
    .where(and(eq(taskRuns.runId, runId), eq(taskRuns.ownerId, userId)))
    .limit(1);

  if (!record) return forbidden();

  // Re-check project access in case collaborators were removed since trigger time.
  const accessible = await hasProjectAccess(record.projectId);
  if (!accessible) return forbidden();

  try {
    const token = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [runId] } },
      expirationTime: "1h",
    });

    return NextResponse.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to create token",
        detail:
          process.env.NODE_ENV === "development"
            ? message
            : "Unable to create token",
      },
      { status: 500 },
    );
  }
}
