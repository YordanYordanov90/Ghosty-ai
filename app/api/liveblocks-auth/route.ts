import { auth, currentUser } from "@clerk/nextjs/server"
import { z } from "zod"

import { cursorColorFromUserId, getLiveblocks } from "@/lib/liveblocks"
import { hasProjectAccess } from "@/lib/project-access"
import { jsonError } from "@/lib/api-response"

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
    return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized" })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError({ status: 400, error: "Invalid JSON", code: "invalid_json" })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError({
      status: 400,
      error: "Invalid request body",
      code: "invalid_body",
      issues: parsed.error.flatten(),
    })
  }

  const projectId = "projectId" in parsed.data ? parsed.data.projectId : parsed.data.room

  const ok = await hasProjectAccess(projectId)
  if (!ok) {
    return jsonError({ status: 403, error: "Forbidden", code: "forbidden" })
  }

  const liveblocks = getLiveblocks()

  // Ensure room exists (create only if missing)
  try {
    await liveblocks.createRoom(projectId, {
      defaultAccesses: [],
      metadata: {},
    })
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[/api/liveblocks-auth] createRoom failed", {
        projectId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
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

