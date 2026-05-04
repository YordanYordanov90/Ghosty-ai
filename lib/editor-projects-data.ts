import { and, desc, eq, ne, sql } from "drizzle-orm"

import { projectCollaborators, projects } from "@/drizzle/schema"
import { db } from "@/lib/db"
import type { EditorProject } from "@/types/editor-project"

export interface FetchEditorProjectsParams {
  userId: string
  primaryEmail: string | null
}

/**
 * Loads owned + shared projects for the editor sidebar (server-only).
 * Shared = collaborator row for the user’s email, excluding projects they own.
 */
export async function fetchEditorProjectsData({
  userId,
  primaryEmail,
}: FetchEditorProjectsParams): Promise<{
  myProjects: EditorProject[]
  sharedProjects: EditorProject[]
}> {
  const ownedRows = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .orderBy(desc(projects.createdAt))

  const myProjects: EditorProject[] = ownedRows.map((p) => ({
    id: p.id,
    name: p.name,
    ownership: "owned",
  }))

  let sharedProjects: EditorProject[] = []
  if (primaryEmail) {
    const emailNorm = primaryEmail.trim().toLowerCase()
    const sharedRows = await db
      .select({ project: projects })
      .from(projectCollaborators)
      .innerJoin(
        projects,
        eq(projectCollaborators.projectId, projects.id),
      )
      .where(
        and(
          sql`lower(${projectCollaborators.collaboratorEmail}) = ${emailNorm}`,
          ne(projects.ownerId, userId),
        ),
      )
      .orderBy(desc(projects.createdAt))

    sharedProjects = sharedRows.map((row) => ({
      id: row.project.id,
      name: row.project.name,
      ownership: "shared",
    }))
  }

  return { myProjects, sharedProjects }
}
