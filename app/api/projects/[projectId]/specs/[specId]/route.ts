import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { projectSpecs } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/project-access";

export const runtime = "nodejs";

const paramsSchema = z.object({
  projectId: z.string().uuid(),
  specId: z.string().uuid(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await get(spec.filePath, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new Response(result.stream, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch spec",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}

