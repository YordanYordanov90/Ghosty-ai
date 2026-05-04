import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceLayout } from "@/components/editor/workspace-layout"
import { projects } from "@/drizzle/schema"
import { db } from "@/lib/db"
import { fetchEditorProjectsData } from "@/lib/editor-projects-data"
import { getCurrentUserIdentity, hasProjectAccess } from "@/lib/project-access"
import { getClerkAuthPaths } from "@/lib/clerk-auth-paths"

interface PageProps {
  params: Promise<{ projectId: string }>;
}

const projectIdParamSchema = z.uuid()

export default async function EditorWorkspacePage({ params }: PageProps) {
  const { projectId: rawProjectId } = await params
  const idResult = projectIdParamSchema.safeParse(rawProjectId)
  if (!idResult.success) {
    return <AccessDenied />
  }
  const projectId = idResult.data

  // Get current user identity
  const userIdentity = await getCurrentUserIdentity()
  if (!userIdentity) {
    redirect(getClerkAuthPaths().signInPath)
  }

  // Check project access
  const access = await hasProjectAccess(projectId)
  if (!access) {
    return <AccessDenied />
  }

  // Fetch project details for context (exists if access passed)
  const [project] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) return <AccessDenied />
  const projectName = project.name

  // Fetch projects data for sidebar
  const projectsData = await fetchEditorProjectsData({
    userId: userIdentity.userId,
    primaryEmail: userIdentity.primaryEmail,
  })

  return (
    <WorkspaceLayout
      projectId={projectId}
      projectName={projectName}
      myProjects={projectsData.myProjects}
      sharedProjects={projectsData.sharedProjects}
    />
  )
}