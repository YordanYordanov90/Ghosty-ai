import { auth, clerkClient } from "@clerk/nextjs/server"
import { and, eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

import { projectCollaborators, projects } from "@/drizzle/schema"
import { db } from "@/lib/db"
import { getCurrentUserIdentity } from "@/lib/project-access"

export const runtime = "nodejs"

const projectIdParamSchema = z.uuid()

const inviteBodySchema = z.object({
  email: z.email().max(255),
})

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

async function getProjectForUser(projectId: string, userId: string, email: string | null) {
  const [project] = await db
    .select({
      id: projects.id,
      ownerId: projects.ownerId,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) {
    return { project: null, canView: false, canManage: false }
  }

  const isOwner = project.ownerId === userId
  if (isOwner) {
    return { project, canView: true, canManage: true }
  }

  const emailNorm = email?.trim().toLowerCase() ?? null
  if (!emailNorm) {
    return { project, canView: false, canManage: false }
  }

  const [collaborator] = await db
    .select({ projectId: projectCollaborators.projectId })
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        sql`lower(${projectCollaborators.collaboratorEmail}) = ${emailNorm}`,
      ),
    )
    .limit(1)

  const canView = Boolean(collaborator)
  return { project, canView, canManage: false }
}

interface ShareOwnerPayload {
  userId: string
  displayName: string | null
  avatarUrl: string | null
  email: string | null
}

async function enrichOwnerFromClerk(ownerId: string): Promise<ShareOwnerPayload> {
  const base: ShareOwnerPayload = {
    userId: ownerId,
    displayName: null,
    avatarUrl: null,
    email: null,
  }
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(ownerId)
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
    return {
      userId: ownerId,
      displayName:
        fullName ||
        user.username ||
        user.primaryEmailAddress?.emailAddress ||
        null,
      avatarUrl: user.imageUrl ?? null,
      email: user.primaryEmailAddress?.emailAddress ?? null,
    }
  } catch {
    return base
  }
}

async function enrichCollaboratorsWithClerk(
  rows: Array<{ collaboratorEmail: string; createdAt: Date }>,
) {
  const client = await clerkClient()
  return Promise.all(
    rows.map(async (row) => {
      const email = row.collaboratorEmail
      try {
        const users = await client.users.getUserList({
          emailAddress: [email],
          limit: 1,
        })
        const user = users.data[0]
        const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
        return {
          email,
          displayName:
            fullName ||
            user?.username ||
            user?.primaryEmailAddress?.emailAddress ||
            null,
          avatarUrl: user?.imageUrl ?? null,
          createdAt: row.createdAt.toISOString(),
        }
      } catch {
        return {
          email,
          displayName: null,
          avatarUrl: null,
          createdAt: row.createdAt.toISOString(),
        }
      }
    }),
  )
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const identity = await getCurrentUserIdentity()
  if (!identity) return unauthorized()

  const { projectId: rawProjectId } = await context.params
  const idResult = projectIdParamSchema.safeParse(rawProjectId)
  if (!idResult.success) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 })
  }
  const projectId = idResult.data

  const access = await getProjectForUser(
    projectId,
    identity.userId,
    identity.primaryEmail,
  )
  if (!access.project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (!access.canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const collaboratorRows = await db
    .select({
      collaboratorEmail: projectCollaborators.collaboratorEmail,
      createdAt: projectCollaborators.createdAt,
    })
    .from(projectCollaborators)
    .where(eq(projectCollaborators.projectId, projectId))
    .orderBy(projectCollaborators.createdAt)

  const [collaborators, owner] = await Promise.all([
    enrichCollaboratorsWithClerk(collaboratorRows),
    enrichOwnerFromClerk(access.project.ownerId),
  ])
  return NextResponse.json({
    collaborators,
    canManageAccess: access.canManage,
    owner,
  })
}

export async function POST(
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

  const [project] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const parsed = inviteBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }
  const email = parsed.data.email.trim().toLowerCase()

  await db
    .insert(projectCollaborators)
    .values({ projectId, collaboratorEmail: email })
    .onConflictDoNothing()

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(
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

  const [project] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? ""
  const emailResult = z.email().safeParse(email)
  if (!emailResult.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  await db
    .delete(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.collaboratorEmail, emailResult.data),
      ),
    )

  return new NextResponse(null, { status: 204 })
}
