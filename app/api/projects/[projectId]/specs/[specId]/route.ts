import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { z } from "zod";

import { projectSpecs } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/project-access";
import { devDetail, jsonError } from "@/lib/api-response";

export const runtime = "nodejs";

const paramsSchema = z.object({
  projectId: z.string().uuid(),
  specId: z.string().uuid(),
});

function unauthorized() {
  return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized" });
}

function forbidden() {
  return jsonError({ status: 403, error: "Forbidden", code: "forbidden" });
}

function blobUnavailable() {
  return jsonError({
    status: 503,
    error: "Blob storage unavailable",
    code: "blob_unavailable",
  });
}

// GET /api/projects/[projectId]/specs/[specId]
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; specId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const rawParams = await context.params;
  const parsedParams = paramsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return jsonError({ status: 400, error: "Invalid params", code: "invalid_params" });
  }

  const { projectId, specId } = parsedParams.data;

  const accessible = await hasProjectAccess(projectId);
  if (!accessible) return forbidden();

  const [spec] = await db
    .select({ filePath: projectSpecs.filePath })
    .from(projectSpecs)
    .where(and(eq(projectSpecs.id, specId), eq(projectSpecs.projectId, projectId)))
    .limit(1);

  if (!spec) {
    return jsonError({ status: 404, error: "Not found", code: "not_found" });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return blobUnavailable();

    const result = await get(spec.filePath, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return jsonError({ status: 404, error: "Not found", code: "not_found" });
    }

    return new Response(result.stream, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError({
      status: 500,
      error: "Failed to fetch spec",
      code: "spec_fetch_failed",
      detail: devDetail(error),
    });
  }
}

