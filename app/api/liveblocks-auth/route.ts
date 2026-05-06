import { auth, currentUser } from "@clerk/nextjs/server"
import { z } from "zod"

import { cursorColorFromUserId, getLiveblocks } from "@/lib/liveblocks"
import { hasProjectAccess } from "@/lib/project-access"

export const runtime = "nodejs"

const BodySchema = z.union([
  // Custom client payload (if we ever override authEndpoint)
  z.object({ projectId: z.string().uuid() }),
  // Liveblocks default payload when authEndpoint is a string
  z.object({ room: z.string().uuid() }),
])

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const projectId = "projectId" in parsed.data ? parsed.data.projectId : parsed.data.room

  const ok = await hasProjectAccess(projectId)
  if (!ok) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const liveblocks = getLiveblocks()

  // Ensure room exists (create only if missing)
  try {
    await liveblocks.createRoom(projectId, {
      defaultAccesses: [],
      metadata: {},
    })
  } catch {
    // If already exists (or creation not required), continue.
  }

  const user = await currentUser()
  const name =
    user?.fullName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    "User"
  const avatar = user?.imageUrl ?? undefined
  const color = cursorColorFromUserId(userId)

  const session = liveblocks.prepareSession(userId, {
    userInfo: { name, avatar, color },
  })
  session.allow(projectId, session.FULL_ACCESS)

  const { body: tokenBody, status } = await session.authorize()
  return new Response(tokenBody, { status })
}

