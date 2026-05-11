import { auth, currentUser } from "@clerk/nextjs/server"
import { and, eq, sql } from "drizzle-orm"
import { cache } from "react"

import { projects, projectCollaborators } from "@/drizzle/schema"
import { db } from "@/lib/db"

export interface UserIdentity {
  userId: string
  primaryEmail: string | null
}

export const getCurrentUserIdentity = cache(
  async (): Promise<UserIdentity | null> => {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null

  return { userId, primaryEmail }
},
)

export const hasProjectAccess = cache(
  async (projectId: string): Promise<boolean> => {
    const user = await getCurrentUserIdentity()
    if (!user) return false

    const emailNorm = user.primaryEmail?.trim().toLowerCase() ?? null

    if (!emailNorm) {
      const [row] = await db
        .select({ ownerId: projects.ownerId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)

      if (!row) return false
      return row.ownerId === user.userId
    }

    const [row] = await db
      .select({
        ownerId: projects.ownerId,
        collaboratorEmail: projectCollaborators.collaboratorEmail,
      })
      .from(projects)
      .leftJoin(
        projectCollaborators,
        and(
          eq(projectCollaborators.projectId, projects.id),
          sql`lower(${projectCollaborators.collaboratorEmail}) = ${emailNorm}`,
        ),
      )
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!row) return false
    if (row.ownerId === user.userId) return true
    return row.collaboratorEmail != null
  },
)