import { Liveblocks } from "@liveblocks/node"

const CURSOR_COLORS = [
  "#22c55e", // green-500
  "#3b82f6", // blue-500
  "#a855f7", // purple-500
  "#f97316", // orange-500
  "#ef4444", // red-500
  "#14b8a6", // teal-500
  "#eab308", // yellow-500
  "#06b6d4", // cyan-500
] as const

function hashString(input: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function cursorColorFromUserId(userId: string): string {
  const idx = hashString(userId) % CURSOR_COLORS.length
  return CURSOR_COLORS[idx]!
}

declare global {
  var __liveblocks__: Liveblocks | undefined
}

export function getLiveblocks(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY
  if (!secret) {
    throw new Error("Missing LIVEBLOCKS_SECRET_KEY")
  }

  if (process.env.NODE_ENV !== "production") {
    globalThis.__liveblocks__ ??= new Liveblocks({ secret })
    return globalThis.__liveblocks__
  }

  return new Liveblocks({ secret })
}

