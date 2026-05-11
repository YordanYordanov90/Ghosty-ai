import { auth as clerkAuth } from "@clerk/nextjs/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { taskRuns } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/project-access";
import { devDetail, jsonError, jsonOk } from "@/lib/api-response";

export const runtime = "nodejs";

const bodySchema = z.object({
  runId: z.string().min(1).max(200),
});

function unauthorized() {
  return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized" });
}

function forbidden() {
  return jsonError({ status: 403, error: "Forbidden", code: "forbidden" });
}

// POST /api/ai/design/token
// Issues a Trigger.dev public token scoped to a single run after verifying that
// the requesting user owns the matching TaskRun + still has access to its project.
export async function POST(request: Request) {
  const { userId } = await clerkAuth();
  if (!userId) return unauthorized();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError({ status: 400, error: "Invalid JSON body", code: "invalid_json" });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError({ status: 400, error: "Invalid body", code: "invalid_body" });
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

    return jsonOk({ token });
  } catch (error) {
    return jsonError({
      status: 500,
      error: "Failed to create token",
      code: "token_create_failed",
      detail: devDetail(error) ?? "Unable to create token",
    });
  }
}
