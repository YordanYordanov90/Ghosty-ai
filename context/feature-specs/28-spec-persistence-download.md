# Persist generated specs with Vercel Blob and Drizzle

Persist generated specs with Vercel Blob and store metadata in Drizzle, then add a secure download route so users can retrieve their generated spec files.

## Implementation

1. Add project spec metadata table.

   Add a `project_specs` table to `drizzle/schema.ts` with:
   - `id` (uuid primary key)
   - `projectId` (references `projects.id`)
   - `filePath` (text) — stores the Vercel Blob URL
   - `createdAt` (timestamp with default now)

   Add:
   - index on `projectId`
   - compound index on `projectId` + `createdAt`

   Drizzle stores metadata only. The actual spec content lives in Vercel Blob.

2. Save generated spec.

   After a spec is generated:
   - upload the Markdown content to Vercel Blob
   - store the Blob URL in the new `project_specs.filePath`
   - create the record linked to the correct project
   - follow the same metadata + blob pattern used for canvas persistence

3. Download route.

   Create: `GET /api/projects/[projectId]/specs/[specId]/download`
   It should:
   - authenticate the user with Clerk `auth()`
   - verify access to the project using `lib/project-access.ts`
   - verify the spec belongs to that project
   - fetch the file using the `filePath` from Drizzle
   - return it as a downloadable Markdown file (`Content-Disposition: attachment`)
   - handle not found and forbidden cases properly

## Scope Limits

- do not add frontend or UI logic
- do not store spec content in Drizzle
- do not expose Blob URLs without access checks
- do not modify existing canvas persistence

## Notes

- check `context/project-overview.md` and `context/architecture-context.md` first
- reuse existing project access patterns (`lib/project-access.ts`)
- Drizzle stores metadata, Vercel Blob stores content

## Check When Done

- `project_specs` table exists in `drizzle/schema.ts` with correct fields and indexes
- spec is uploaded to Vercel Blob
- `filePath` is saved correctly in Drizzle
- download route validates access before returning file
- response is a Markdown attachment
- TypeScript and `npm run build` pass