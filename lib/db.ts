import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "@/drizzle/schema"

declare global {
  var ghostyDbPool: Pool | undefined
}

/**
 * pg v8 warns that `sslmode=require|prefer|verify-ca` will change meaning in pg v9.
 * Replacing those with `verify-full` matches today's pg behavior and clears the warning.
 * URLs without `sslmode` or with `disable` / `verify-full` are left unchanged (e.g. local Postgres).
 */
const SSLMODE_PG_V9_WARNING_MODES = new Set(["require", "prefer", "verify-ca"])

function withSslModeVerifyFull(connectionString: string): string {
  try {
    const u = new URL(connectionString)
    const mode = u.searchParams.get("sslmode")?.toLowerCase()
    if (mode == null || !SSLMODE_PG_V9_WARNING_MODES.has(mode)) {
      return connectionString
    }
    u.searchParams.set("sslmode", "verify-full")
    return u.href
  } catch {
    return connectionString
  }
}

function getPool(): Pool {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  return new Pool({ connectionString: withSslModeVerifyFull(url) })
}

const pool = globalThis.ghostyDbPool ?? getPool()
if (process.env.NODE_ENV !== "production") {
  globalThis.ghostyDbPool = pool
}

export const db = drizzle(pool, { schema })
