import { auth, currentUser } from "@clerk/nextjs/server"
import { and, eq, sql } from "drizzle-orm"

import { projects, projectCollaborators } from "@/drizzle/schema"
import { db } from "@/lib/db"

export interface UserIdentity {
  userId: string
  primaryEmail: string | null
}

export async function getCurrentUserIdentity(): Promise<UserIdentity | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null

  return { userId, primaryEmail }
}

export async function hasProjectAccess(projectId: string): Promise<boolean> {
  const user = await getCurrentUserIdentity()
  if (!user) return false

  // Check if user is owner
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project.length) return false // Project doesn't exist

  if (project[0].ownerId === user.userId) return true

  const emailNorm = user.primaryEmail?.trim().toLowerCase() ?? null
  if (!emailNorm) return false

  // Check if user is collaborator
  const collaborator = await db
    .select()
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        sql`lower(${projectCollaborators.collaboratorEmail}) = ${emailNorm}`,
      ),
    )
    .limit(1)

  return collaborator.length > 0
}