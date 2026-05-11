# Set up the backend flow for design generation using Trigger.dev

This unit handles triggering background jobs, tracking runs, and issuing tokens. No AI logic yet.

## Implementation

1. Add the design trigger route.

   Create: `POST /api/ai/design`
   This route should:
   - accept the design prompt and required context (`roomId`, `projectId`)
   - trigger the design task through Trigger.dev
   - create a TaskRun record in Drizzle
   - return the run ID to the client

2. Add task run tracking.

   Add a `task_runs` table to `drizzle/schema.ts` to track Trigger.dev runs and verify ownership.

   The table should include:
   - `id` (uuid primary key)
   - `runId` (text, unique)
   - `projectId` (references `projects.id`)
   - `ownerId` (text) — matches `projects.owner_id` from Clerk
   - `createdAt` (timestamp with default now)

   Add:
   - unique index on `runId`
   - compound index on `ownerId` + `projectId`

3. Add the token route.

   Create: `POST /api/ai/design/token`
   This route should:
   - accept a run ID
   - verify ownership using the TaskRun record from Drizzle + `lib/project-access.ts`
   - generate a Trigger.dev public token scoped to that run
   - return the token to the client

4. Create the design task.

   Create `trigger/design-agent.ts`
   - check the existing Trigger.dev setup and installed agent features first
   - reuse the existing setup instead of creating a new pattern
   - export a minimal design task
   - accept the expected payload (`prompt`, `roomId`, `projectId`)
   - log or echo the input for now
   - don’t add AI logic yet

## Scope Limits

- don’t generate nodes or edges yet
- don’t call any AI providers
- don’t update the canvas
- keep this focused on backend task wiring only

## Check When Done

- `POST /api/ai/design` triggers a background task and creates a Drizzle TaskRun record
- `task_runs` table is added to `drizzle/schema.ts` with correct indexes
- `POST /api/ai/design/token` returns a run-scoped token after ownership check
- Design task exists and is callable
- `npm run build` passes with no type errors