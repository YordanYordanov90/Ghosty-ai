import { auth, clerkClient } from "@clerk/nextjs/server"
import { and, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { projectCollaborators, projects } from "@/drizzle/schema"
import { db } from "@/lib/db"
import { getCurrentUserIdentity } from "@/lib/project-access"
import { jsonError, jsonOk, NO_STORE_HEADERS } from "@/lib/api-response"

export const runtime = "nodejs"

const projectIdParamSchema = z.uuid()

const inviteBodySchema = z.object({
  email: z.email().max(255),
})

function unauthorized() {
  return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized" })
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
    return jsonError({
      status: 400,
      error: "Invalid project id",
      code: "invalid_project_id",
    })
  }
  const projectId = idResult.data

  const access = await getProjectForUser(
    projectId,
    identity.userId,
    identity.primaryEmail,
  )
  if (!access.project) {
    return jsonError({ status: 404, error: "Not found", code: "not_found" })
  }
  if (!access.canView) {
    return jsonError({ status: 403, error: "Forbidden", code: "forbidden" })
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
  return jsonOk(
    { collaborators, canManageAccess: access.canManage, owner },
    { headers: NO_STORE_HEADERS },
  )
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
    return jsonError({
      status: 400,
      error: "Invalid project id",
      code: "invalid_project_id",
    })
  }
  const projectId = idResult.data

  const [project] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) {
    return jsonError({ status: 404, error: "Not found", code: "not_found" })
  }
  if (project.ownerId !== userId) {
    return jsonError({ status: 403, error: "Forbidden", code: "forbidden" })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError({ status: 400, error: "Invalid body", code: "invalid_body" })
  }
  const parsed = inviteBodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError({ status: 400, error: "Invalid email", code: "invalid_email" })
  }
  const email = parsed.data.email.trim().toLowerCase()

  await db
    .insert(projectCollaborators)
    .values({ projectId, collaboratorEmail: email })
    .onConflictDoNothing()

  return jsonOk({ success: true }, { status: 201, headers: NO_STORE_HEADERS })
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
    return jsonError({
      status: 400,
      error: "Invalid project id",
      code: "invalid_project_id",
    })
  }
  const projectId = idResult.data

  const [project] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) {
    return jsonError({ status: 404, error: "Not found", code: "not_found" })
  }
  if (project.ownerId !== userId) {
    return jsonError({ status: 403, error: "Forbidden", code: "forbidden" })
  }

  const url = new URL(request.url)
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? ""
  const emailResult = z.email().safeParse(email)
  if (!emailResult.success) {
    return jsonError({ status: 400, error: "Invalid email", code: "invalid_email" })
  }

  await db
    .delete(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.collaboratorEmail, emailResult.data),
      ),
    )

  return new Response(null, { status: 204 })
}
