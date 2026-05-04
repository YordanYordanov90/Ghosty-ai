import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { EditorShell } from "@/components/editor/editor-shell";
import { getClerkAuthPaths } from "@/lib/clerk-auth-paths";
import { fetchEditorProjectsData } from "@/lib/editor-projects-data";

const projectIdSchema = z.string().uuid();

export default async function EditorWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!projectIdSchema.safeParse(projectId).success) {
    notFound();
  }

  const { userId } = await auth();
  if (!userId) {
    redirect(getClerkAuthPaths().signInPath);
  }

  const user = await currentUser();
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  const { myProjects, sharedProjects } = await fetchEditorProjectsData({
    userId,
    primaryEmail,
  });

  return (
    <EditorShell
      initialMyProjects={myProjects}
      initialSharedProjects={sharedProjects}
      workspaceId={projectId}
    />
  );
}
