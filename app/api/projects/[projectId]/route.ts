import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { del } from "@vercel/blob"

import { projectSpecs, projects } from "@/drizzle/schema"
import { db } from "@/lib/db"
import { jsonError, jsonOk, NO_STORE_HEADERS } from "@/lib/api-response"

export const runtime = "nodejs"

const projectIdParamSchema = z.uuid()

const patchBodySchema = z.object({
  name: z.string().max(2000),
})

function unauthorized() {
  return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized" })
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
    return jsonError({
      status: 400,
      error: "Invalid project id",
      code: "invalid_project_id",
    })
  }
  const projectId = idResult.data

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError({ status: 400, error: "Invalid body", code: "invalid_body" })
  }

  const parsed = patchBodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError({ status: 400, error: "Invalid body", code: "invalid_body" })
  }

  const trimmedName = parsed.data.name.trim()
  if (trimmedName.length === 0) {
    return jsonError({
      status: 400,
      error: "Name cannot be empty",
      code: "invalid_name",
    })
  }

  const [existing] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!existing) {
    return jsonError({ status: 404, error: "Not found", code: "not_found" })
  }
  if (existing.ownerId !== userId) {
    return jsonError({ status: 403, error: "Forbidden", code: "forbidden" })
  }

  const [updated] = await db
    .update(projects)
    .set({ name: trimmedName })
    .where(eq(projects.id, projectId))
    .returning()

  return jsonOk({ project: updated }, { headers: NO_STORE_HEADERS })
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
    return jsonError({
      status: 400,
      error: "Invalid project id",
      code: "invalid_project_id",
    })
  }
  const projectId = idResult.data

  const [existing] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!existing) {
    return jsonError({ status: 404, error: "Not found", code: "not_found" })
  }
  if (existing.ownerId !== userId) {
    return jsonError({ status: 403, error: "Forbidden", code: "forbidden" })
  }

  // Best-effort Blob cleanup (DB cascade does not delete Vercel Blob objects).
  // Must happen before DB delete so we can still read blob URLs.
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Skip Blob cleanup if Blob not configured; continue with DB deletion.
      throw new Error("blob_unavailable")
    }

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

  return new Response(null, { status: 204 })
}
