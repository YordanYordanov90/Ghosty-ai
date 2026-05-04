import { auth } from "@clerk/nextjs/server"
import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { projects } from "@/drizzle/schema"
import { db } from "@/lib/db"

export const runtime = "nodejs"

const postBodySchema = z.object({
  name: z.string().max(2000).optional(),
})

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return unauthorized()

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .orderBy(desc(projects.createdAt))

  return NextResponse.json({ projects: rows })
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
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const trimmed = parsed.data.name?.trim()
  const name =
    trimmed !== undefined && trimmed.length > 0 ? trimmed : "Untitled Project"

  const [created] = await db
    .insert(projects)
    .values({ ownerId: userId, name })
    .returning()

  return NextResponse.json({ project: created }, { status: 201 })
}
