# Add autosave and loading for the collaborative canvas

Canvas JSON should be persisted to Vercel Blob before AI generation runs.  
The saved blob URL should be stored on the Drizzle `projects` record.

## What to Install
- `@vercel/blob`

## Implementation

1. Check the existing project schema.
   - Review `drizzle/schema.ts`
   - The `projects` table **already has** the optional `canvas_json_path` column (added in **05-drizzle**)
   - Reuse `canvas_json_path` to store the Vercel Blob URL
   - Drizzle remains responsible for all metadata only

2. Add canvas save/load API routes.

   Create: `PUT /api/projects/[projectId]/canvas`
   This route should:
   - receive the latest canvas JSON (nodes + edges)
   - **validate the request body with Zod** before any processing
     - confirm it contains a `nodes` array and an `edges` array
     - reject anything else (security protection)
   - upload the validated JSON as a blob to Vercel Blob
   - update the `canvas_json_path` field on the matching Drizzle `projects` record
   - use Clerk `auth()` + `lib/project-access.ts` for ownership/collaborator check

   Create: `GET /api/projects/[projectId]/canvas`
   This route should:
   - read the `canvas_json_path` from the Drizzle `projects` record
   - fetch the saved canvas JSON from Vercel Blob
   - return the canvas state to the editor

3. Add an autosave hook in the `/hooks` folder.
   - Create `hooks/use-canvas-autosave.ts`
   - watch the Liveblocks canvas nodes and edges (`useLiveblocksFlow`)
   - debounce saves at **1500ms**
   - call the canvas save API route
   - track save status: `saving` | `saved` | `error`

4. Load saved canvas state in the editor.
   - In `components/editor/canvas/workspace-canvas.tsx` (or the Liveblocks flow hook)
   - When the room loads: check if Liveblocks already has nodes/edges
   - If the room is empty **and** the project has a `canvas_json_path`, fetch and load the saved canvas state
   - If the room already has nodes or edges, skip the load entirely (to protect active collaboration)

5. Add a small save status indicator in the editor.
   - Show the save status in the **workspace top nav `trailingActions` slot**, left of the AI sidebar toggle button
   - Use existing design tokens (`text-muted-text`, `accent`, etc.)

## Storage Pattern
- Drizzle (`projects` table) stores project metadata + the Vercel Blob URL (`canvas_json_path`)
- Vercel Blob stores the actual canvas JSON (nodes + edges + metadata)
- Liveblocks remains the source of truth for real-time collaboration

## Check When Done
- `@vercel/blob` is installed and configured
- `canvas_json_path` is used correctly in Drizzle queries
- Save/load routes use Drizzle + Vercel Blob + Zod validation on PUT
- Autosave hook debounces at 1500ms and tracks status (`saving` / `saved` / `error`)
- Editor loads saved canvas only when Liveblocks room is empty
- Save status indicator appears in `trailingActions` (left of AI toggle)
- `npm run build` passes with no type errors