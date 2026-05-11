import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { projectSpecs } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/project-access";
import { jsonError, jsonOk, NO_STORE_HEADERS } from "@/lib/api-response";

export const runtime = "nodejs";

const paramsSchema = z.object({
  projectId: z.string().uuid(),
});

function unauthorized() {
  return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized" });
}

function forbidden() {
  return jsonError({ status: 403, error: "Forbidden", code: "forbidden" });
}

function inferFilename(filePath: string, specId: string) {
  const raw = filePath.split("?")[0] ?? "";
  const last = raw.split("/").pop();
  if (last && last.trim().length > 0) return last;
  return `spec-${specId}.md`;
}

// GET /api/projects/[projectId]/specs
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const rawParams = await context.params;
  const parsedParams = paramsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return jsonError({
      status: 400,
      error: "Invalid params",
      code: "invalid_params",
    });
  }

  const { projectId } = parsedParams.data;

  const accessible = await hasProjectAccess(projectId);
  if (!accessible) return forbidden();

  const rows = await db
    .select({
      id: projectSpecs.id,
      createdAt: projectSpecs.createdAt,
      filePath: projectSpecs.filePath,
    })
    .from(projectSpecs)
    .where(eq(projectSpecs.projectId, projectId))
    .orderBy(desc(projectSpecs.createdAt))
    .limit(100);

  return jsonOk(
    {
      specs: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        filename: inferFilename(r.filePath, r.id),
      })),
    },
    { headers: NO_STORE_HEADERS },
  );
}

