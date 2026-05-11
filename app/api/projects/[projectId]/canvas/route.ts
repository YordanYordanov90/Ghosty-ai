import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { get, put } from "@vercel/blob";

import { projects } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/project-access";
import { jsonError, jsonOk, NO_STORE_HEADERS, devDetail } from "@/lib/api-response";

export const runtime = "nodejs";

const projectIdSchema = z.string().uuid();

// Zod: validate body is strictly { nodes: unknown[], edges: unknown[] }
const canvasBodySchema = z
  .object({
    nodes: z.array(z.unknown()),
    edges: z.array(z.unknown()),
  })
  .strict();

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

// PUT /api/projects/[projectId]/canvas
// Uploads canvas JSON to Vercel Blob and stores the URL on the project record.
export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const { projectId: rawId } = await context.params;
  const idResult = projectIdSchema.safeParse(rawId);
  if (!idResult.success) {
    return jsonError({
      status: 400,
      error: "Invalid project id",
      code: "invalid_project_id",
    });
  }
  const projectId = idResult.data;

  const accessible = await hasProjectAccess(projectId);
  if (!accessible) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError({
      status: 400,
      error: "Invalid request body",
      code: "invalid_body",
    });
  }

  const parsed = canvasBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError({
      status: 400,
      error: "Body must contain a nodes array and an edges array",
      code: "invalid_body",
    });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return blobUnavailable();

    // Deterministic pathname — one snapshot per project.
    // allowOverwrite: true is required so subsequent autosaves don't fail.
    // access: "private" matches the store configuration.
    const blob = await put(
      `canvas/${projectId}.json`,
      JSON.stringify(parsed.data),
      {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      },
    );

    await db
      .update(projects)
      .set({ canvasJsonPath: blob.url })
      .where(eq(projects.id, projectId));

    return jsonOk({ url: blob.url }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return jsonError({
      status: 500,
      error: "Canvas save failed",
      code: "canvas_save_failed",
      detail: devDetail(error) ?? "Unable to persist canvas JSON",
    });
  }
}

// GET /api/projects/[projectId]/canvas
// Reads canvas_json_path from Drizzle, fetches the private blob, and returns JSON.
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const { projectId: rawId } = await context.params;
  const idResult = projectIdSchema.safeParse(rawId);
  if (!idResult.success) {
    return jsonError({
      status: 400,
      error: "Invalid project id",
      code: "invalid_project_id",
    });
  }
  const projectId = idResult.data;

  const accessible = await hasProjectAccess(projectId);
  if (!accessible) return forbidden();

  const [project] = await db
    .select({ canvasJsonPath: projects.canvasJsonPath })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return jsonError({ status: 404, error: "Not found", code: "not_found" });
  }

  // No canvas saved yet — return an empty canvas
  if (!project.canvasJsonPath) {
    return jsonOk({ nodes: [], edges: [] }, { headers: NO_STORE_HEADERS });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonOk({ nodes: [], edges: [] }, { headers: NO_STORE_HEADERS });
    }

    // Use the SDK's get() so auth headers are sent automatically for private blobs.
    const result = await get(project.canvasJsonPath, { access: "private" });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return jsonOk({ nodes: [], edges: [] }, { headers: NO_STORE_HEADERS });
    }

    // ReadableStream → text → JSON (works in Node.js 18+ and Next.js edge/nodejs)
    const text = await new Response(result.stream).text();
    const data: unknown = JSON.parse(text);
    return jsonOk(data, { headers: NO_STORE_HEADERS });
  } catch {
    // Blob unavailable — return empty canvas rather than an error
    return jsonOk({ nodes: [], edges: [] }, { headers: NO_STORE_HEADERS });
  }
}
