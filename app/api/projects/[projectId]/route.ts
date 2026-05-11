import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { del } from "@vercel/blob"

import { projectSpecs, projects } from "@/drizzle/schema"
import { db } from "@/lib/db"

export const runtime = "nodejs"

const projectIdParamSchema = z.uuid()

const patchBodySchema = z.object({
  name: z.string().max(2000),
})

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { projectId: rawProjectId } = await context.params
  const idResult = projectIdParamSchema.safeParse(rawProjectId)
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 })
  }
  const projectId = idResult.data

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const parsed = patchBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const trimmedName = parsed.data.name.trim()
  if (trimmedName.length === 0) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
  }

  const [existing] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (existing.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [updated] = await db
    .update(projects)
    .set({ name: trimmedName })
    .where(eq(projects.id, projectId))
    .returning()

  return NextResponse.json({ project: updated })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const { projectId: rawProjectId } = await context.params
  const idResult = projectIdParamSchema.safeParse(rawProjectId)
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 })
  }
  const projectId = idResult.data

  const [existing] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (existing.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Best-effort Blob cleanup (DB cascade does not delete Vercel Blob objects).
  // Must happen before DB delete so we can still read blob URLs.
  try {
    const specRows = await db
      .select({ filePath: projectSpecs.filePath })
      .from(projectSpecs)
      .where(eq(projectSpecs.projectId, projectId))

    const urls: string[] = []
    if (existing.canvasJsonPath) urls.push(existing.canvasJsonPath)
    for (const row of specRows) urls.push(row.filePath)

    if (urls.length > 0) {
      await del(urls)
    }
  } catch {
    // Swallow errors so project deletion isn't blocked by blob cleanup.
  }

  await db.delete(projects).where(eq(projects.id, projectId))

  return new NextResponse(null, { status: 204 })
}
