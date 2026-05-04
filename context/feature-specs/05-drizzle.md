Drizzle is already installed. Add the project data models, a Drizzle client singleton, and the first migration.

## Goal

Persist project metadata and collaborators in Postgres via Drizzle: schema file, cached DB client, generated migration applied cleanly.

## Schema

Create `drizzle/schema.ts`.

### Project

- owner ID mapped to Clerk user
- name
- optional description
- status enum: `DRAFT`, `ARCHIVED`
- `canvasJsonPath` for future canvas blob storage
- timestamps
- indexes on owner ID and creation date

### ProjectCollaborator

- project relation with cascade delete
- collaborator email
- creation timestamp
- unique constraint on project + email
- indexes on email and project + date

Do not add extra fields unless required by Drizzle.

## Drizzle client

Create `lib/db.ts` as a cached singleton exporting one Drizzle instance.

## Migration

Run migration generation and apply migrations (`drizzle-kit generate` / migrate as wired in `package.json`). Ensure `drizzle.config.ts` points at the schema and migrations output directory.

## Dependencies

Already installed:

- `drizzle-orm`
- `@neondatabase/serverless`
- `drizzle-kit`

## Check When Done

- schema has both models with correct relations and indexes
- `lib/db.ts` exports one cached Drizzle instance
- migration runs successfully
- `npm run build` passes
