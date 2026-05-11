import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { projectSpecs } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/project-access";

export const runtime = "nodejs";

const paramsSchema = z.object({
  projectId: z.string().uuid(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
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

  return NextResponse.json({
    specs: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      filename: inferFilename(r.filePath, r.id),
    })),
  });
}

