import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { get, put } from "@vercel/blob";

import { projects } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/project-access";

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
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }
  const projectId = idResult.data;

  const accessible = await hasProjectAccess(projectId);
  if (!accessible) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const parsed = canvasBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body must contain a nodes array and an edges array" },
      { status: 400 },
    );
  }

  try {
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

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Canvas save failed",
        detail:
          process.env.NODE_ENV === "development"
            ? message
            : "Unable to persist canvas JSON",
      },
      { status: 500 },
    );
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
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // No canvas saved yet — return an empty canvas
  if (!project.canvasJsonPath) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  try {
    // Use the SDK's get() so auth headers are sent automatically for private blobs.
    const result = await get(project.canvasJsonPath, { access: "private" });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ nodes: [], edges: [] });
    }

    // ReadableStream → text → JSON (works in Node.js 18+ and Next.js edge/nodejs)
    const text = await new Response(result.stream).text();
    const data: unknown = JSON.parse(text);
    return NextResponse.json(data);
  } catch {
    // Blob unavailable — return empty canvas rather than an error
    return NextResponse.json({ nodes: [], edges: [] });
  }
}
