### Quick Wins (Low/No Risk)

### Scan Status 

- LOW findings from universal scan marked fixed:
  - `lib/db.ts` — replaced non-descriptive `α1` with `SSLMODE_PG_V9_WARNING_MODES`
  - `app/api/liveblocks-auth/route.ts` — `createRoom()` errors no longer silently swallowed (dev warning log)

### Quick Wins Status

- **Quick Win #1** (no-store headers): done (`app/api/projects/route.ts`, `app/api/projects/[projectId]/specs/route.ts`, plus other touched responses)
- **Quick Win #2** (Blob token preflight + 503): done (`app/api/projects/[projectId]/canvas/route.ts`, spec fetch/download routes)
- **Quick Win #3** (normalized error payload): done for all routes changed in this batch (added `code` field consistently)

**Quick Win #1: Add explicit no-store headers for user-scoped API responses**
- File: app/api/projects/route.ts:19-30
- Time: ~10 minutes
- Risk: None
- Benefit: Reduces chance of intermediary/proxy caching user-private JSON.
- Suggested change:
  - Add `headers: { "Cache-Control": "private, no-store" }` to `NextResponse.json(...)` for GETs returning user-owned data.

**Quick Win #2: Fail fast when Vercel Blob token missing in canvas/spec API routes**
- File: app/api/projects/[projectId]/canvas/route.ts:68-101
- Time: ~15 minutes
- Risk: Low
- Benefit: Clearer errors vs generic 500; fewer confusing client retries.
- Suggested change:
  - Before calling `put()`/`get()`/`del()`, check `process.env.BLOB_READ_WRITE_TOKEN` (or whichever env `@vercel/blob` expects in this app) and return `503` with a stable error code.

**Quick Win #3: Normalize API error payload shape across handlers**
- File: app/api/**/route.ts (multiple)
- Time: ~20 minutes
- Risk: Low
- Benefit: Simpler client error handling; fewer edge-case UI bugs.
- Suggested change:
  - Standardize to `{ error: string, code?: string, detail?: string }` and always include `status`.

