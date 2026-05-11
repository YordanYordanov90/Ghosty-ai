import { auth } from "@clerk/nextjs/server"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"

import { projects } from "@/drizzle/schema"
import { db } from "@/lib/db"
import { jsonError, jsonOk, NO_STORE_HEADERS } from "@/lib/api-response"

export const runtime = "nodejs"

const postBodySchema = z.object({
  name: z.string().max(2000).optional(),
})

function unauthorized() {
  return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized" })
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .orderBy(desc(projects.createdAt))

  return jsonOk({ projects: rows }, { headers: NO_STORE_HEADERS })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = postBodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError({ status: 400, error: "Invalid body", code: "invalid_body" })
  }

  const trimmed = parsed.data.name?.trim()
  const name =
    trimmed !== undefined && trimmed.length > 0 ? trimmed : "Untitled Project"

  const [created] = await db
    .insert(projects)
    .values({ ownerId: userId, name })
    .returning()

  return jsonOk({ project: created }, { status: 201, headers: NO_STORE_HEADERS })
}
