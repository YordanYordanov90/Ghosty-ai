# Progress Tracker

Update this file after every meaningful implementation
change.

## What has been done so far

Ghosty AI is being built as a **Next.js App Router** app with **Tailwind CSS v4**, **shadcn/ui** primitives, and **Clerk** for authentication. Work to date establishes the **visual system**, **editor shell**, **auth flows and marketing UI**, a **Drizzle + PostgreSQL** layer for projects and collaborators, **REST project APIs**, and an **editor hub + workspace** flow that loads project lists on the server and mutates them from the client via **`/api/projects`** (create navigates to **`/editor/[projectId]`** with the same id as the Liveblocks room target). Workspace shell access is now server-enforced in **`/editor/[projectId]`** with sign-in redirect for anonymous users and **`AccessDenied`** handling for invalid, missing, or unauthorized projects. Share dialog capabilities are now available from workspace: owners can invite/remove collaborators by email; collaborators are read-only; collaborator profiles are enriched from Clerk when possible.

**Design system (01)** — Tailwind v4 and shadcn were initialized; core UI primitives (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea) and `cn()` exist; dark-first semantic tokens align with the product theme.

**Editor experience (02–04)** — The `/editor` route has a fixed navbar (sidebar toggle, user menu), a slide-in project sidebar (My Projects / Shared tabs, scrim to dismiss), and a canvas placeholder. Project **Create / Rename / Delete** dialogs follow a shared pattern with slug rules from **`lib/project-slug.ts`**. **(07)** replaces the old mock-only hook with real API wiring (see below).

**Authentication (03)** — Clerk is integrated with appearance bridged to app CSS variables, **`proxy.ts`** route protection, and public home plus dedicated sign-in/sign-up routes. The home page embeds sign-up for signed-out users; signed-in users go to **`/editor`**. Auth screens use a two-column shell with a branded marketing panel on the left.

**Database (05)** — **`drizzle/schema.ts`** defines **`projects`** (Clerk `owner_id`, status enum, timestamps, optional canvas path) and **`project_collaborators`** with cascade delete and indexes. **`lib/db.ts`** exposes a cached **`pg`** pool and Drizzle client; **`drizzle.config.ts`** and an **initial migration** are in place. Legacy `db/` Drizzle stubs were removed in favor of this layout.

**Project APIs (06)** — **`app/api/projects/route.ts`**: **`GET`** lists the signed-in user’s rows (`owner_id` = Clerk `userId`), ordered by `created_at` desc; **`POST`** creates a row with optional JSON `name` (Zod), default **`Untitled Project`**, UUID from schema. **`app/api/projects/[projectId]/route.ts`**: **`PATCH`** renames (`name` trim, non-empty); **`DELETE`** removes the row. Unauthenticated calls return **`401`**; wrong owner on mutate returns **`403`**; missing row **`404`**; bad UUID **`400`**. **`proxy.ts`**: `/api/projects(.*)` is treated as a **public middleware path** so handlers can return JSON **`401`** instead of a Clerk **redirect** on anonymous `fetch`. Dependency **`zod`** for request bodies.

**Editor wiring (07)** — **`lib/editor-projects-data.ts`** `fetchEditorProjectsData`: owned rows by Clerk `userId`; shared rows via **`project_collaborators`** + join **`projects`**, case-insensitive email match, excluding owned duplicates. **`app/editor/page.tsx`** and **`app/editor/[projectId]/page.tsx`** are **Server Components** (auth + `currentUser` email) that fetch once and pass lists to the client shells. Client **`hooks/use-editor-project-actions.ts`**: dialog state, **`POST /api/projects`** with slug + random suffix as stored **`name`**, **`router.push(`/editor/${id}`)`** on success; **`PATCH` / `DELETE`** with **`router.refresh()`**; delete while on active workspace → **`router.push("/editor")`** then refresh. **`ProjectDialogs`**: slug preview, **room ID preview** (stored name), rename/delete copy uses **`targetProject.name`**; **`lastError`** on failed fetches.

**Workspace shell (08)** — **`app/editor/[projectId]/page.tsx`** now performs server-side workspace access checks via **`lib/project-access.ts`** helpers (`getCurrentUserIdentity`, `hasProjectAccess`). Anonymous users redirect to Clerk sign-in path; invalid UUID, missing project, or unauthorized access render **`components/editor/access-denied.tsx`**. **`components/editor/workspace-layout.tsx`** uses a frosted-glass navbar (`backdrop-blur`), marketing-style canvas zone (**dot grid** + ambient glows + **`auth-marketing-node-pulse`** accents from **`app/globals.css`**), polished dashed-border canvas empty state, and a minimal **`bg-surface`** AI panel; **`ProjectSidebar`** uses **`bg-surface`**, subtle borders, and **`border-l-brand`** for the active project instead of full primary fill. Shared **`editor-canvas-dots`** + pulse animation with **`AuthMarketingPanel`** (inline `<style>` removed). **`components/editor/editor-shell.tsx`** and **`components/editor/access-denied.tsx`** now match this visual language (frosted nav, layered canvas glows, pulse accents, and refined card empty/error states). **`components/editor/editor-navbar.tsx`** was also updated to this same frosted treatment for consistency if reused.

**Share dialog (09)** — Workspace `Share` button now opens **`components/editor/share-dialog.tsx`** from **`components/editor/workspace-layout.tsx`**. New hook **`hooks/use-share-dialog.ts`** handles collaborator list loading, invite/remove actions, link copy with temporary `Copied!` feedback, and owner/collaborator UI permissions. New API route **`app/api/projects/[projectId]/collaborators/route.ts`** supports **`GET`** list, **`POST`** invite, and **`DELETE`** remove; **invite/remove are owner-only server-side** while collaborators can read list only. Collaborator records remain email-based in DB and are enriched via Clerk Backend API (`displayName`, `avatarUrl`) with email fallback when no Clerk user exists.

**Not started yet (at a glance)** — Liveblocks + React Flow canvas; AI generation; spec export; sidebar row navigation to open a workspace (optional UX).

## Current Phase

- **07-wire-editor-home** complete; canvas/Liveblocks still ahead.

## Current Goal

- Implement canvas + Liveblocks using **`workspaceId`** from **`/editor/[projectId]`** as the room id.
- Keep smoke-testing create / rename / delete against real **`DATABASE_URL`**.

## Completed

- **01-design-system** — shadcn/ui init (Tailwind v4, `components.json`), primitives: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea; `lib/utils.ts` `cn()`; `lucide-react`; `.dark` semantic tokens aligned with existing `@theme` hue (260); `npm run build` passes. Generated `components/ui/*` untouched after CLI add.
- **02-editor** — `components/editor/editor-navbar.tsx` (fixed `h-14`, left/center/right, sidebar toggle with `PanelLeftOpen` / `PanelLeftClose`, dark bar + bottom border); `components/editor/project-sidebar.tsx` (overlay slide-in from left, `isOpen` / `onClose`, Projects header + close, shadcn Tabs My Projects / Shared with empty placeholders, full-width New Project + `Plus`); `components/editor/editor-dialog-pattern.tsx` (title, description, footer slots using popover/muted/border tokens — no `Dialog` root). **Editor shell:** `app/editor/page.tsx` composes navbar + sidebar + canvas placeholder.
- **03-auth** — `@clerk/ui` + `dark` from `@clerk/ui/themes`; `lib/clerk-appearance.ts` maps Clerk appearance variables to app CSS tokens; `ClerkProvider` in `app/layout.tsx`. **`proxy.ts`:** protected by default; public routes: **`/`** (home), sign-in and sign-up paths from `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` via **`lib/clerk-auth-paths.ts`** (fallbacks `/sign-in`, `/sign-up`). **`components/auth/auth-route-shell.tsx`:** two-panel layout (`min-h-dvh`, `lg` grid); left **`aside`** is full-height flex column (`overflow-hidden`) with marketing panel **`flex-1`**; right column centers Clerk form. **`components/auth/auth-marketing-panel.tsx`:** full-height left marketing (design tokens + subtle radial glows, dot grid, pulsing abstract canvas-style nodes); brand + hero + feature list; copy aligned with **`context/project-overview.md`** (Ghosty AI, collaborative system design, canvas, Markdown specs). Optional **`className`**. **`app/sign-in/[[...sign-in]]/page.tsx`** & **`app/sign-up/[[...sign-up]]/page.tsx`:** `AuthRouteShell` + `<SignIn />` / `<SignUp />`. **`app/page.tsx`:** signed-in → **`redirect("/editor")`**; signed-out → **`AuthRouteShell`** with **`<SignUp routing="path" path="/" signInUrl={signInPath} />`** (sign-up on home). **`UserButton`** in `components/editor/editor-navbar.tsx` (default Clerk menu).
- **04-project-dialogs** — Original mock-only hook + dialogs + sidebar wiring (historical); superseded by **07** (real data + **`use-editor-project-actions`**). **`lib/project-slug.ts`** + **`types/editor-project.ts`** unchanged in role.
- **05-drizzle** — **`drizzle/schema.ts`:** `projects` (Clerk `owner_id`, name, optional description, `project_status` enum `DRAFT` | `ARCHIVED`, optional `canvas_json_path`, `created_at` / `updated_at` with `$onUpdate`, indexes on `owner_id` + `created_at`); `project_collaborators` (FK to `projects` **ON DELETE CASCADE**, `collaborator_email`, `created_at`, composite PK `(project_id, collaborator_email)`, indexes on email + `(project_id, created_at)`); Drizzle `relations` both ways. **`lib/db.ts`:** `pg` `Pool` cached on `globalThis` in dev + `drizzle(pool, { schema })`. **`drizzle.config.ts`:** schema `./drizzle/schema.ts`, migrations `./drizzle/migrations`. Initial migration generated + applied (`npm run db:generate`, `npm run db:migrate`). Legacy **`db/schema.ts`** / **`db/index.ts`** removed (superseded). **`npm run build`** passes.
- **06-project-apis** — REST: **`GET` / `POST`** `app/api/projects/route.ts`; **`PATCH` / `DELETE`** `app/api/projects/[projectId]/route.ts`. Clerk **`auth()`** for `userId` → `owner_id`; Zod for bodies and UUID param; **`runtime = "nodejs"`** for `pg`. **`proxy.ts`** `isPublicRoute` includes **`/api/projects(.*)`** for JSON **401** behavior. **`npm run build`** passes.
- **07-wire-editor-home** — **`lib/editor-projects-data.ts`** server fetch for owned + shared lists. **`app/editor/page.tsx`** (hub) server-renders `EditorShell` (navbar, sidebar, dialogs, main). **Workspace shell (08)** — **`app/editor/[projectId]/page.tsx`** server-renders `WorkspaceLayout` with server-side access checks: signed-out → Clerk sign-in path; missing/unauthorized/invalid project id → `AccessDenied`. `WorkspaceLayout` adds per-project navbar (project name + Share + AI toggle), highlights current project in `ProjectSidebar`, and reuses `useEditorProjectActions` + `ProjectDialogs` for Create/Rename/Delete while on a workspace. **`lib/project-access.ts`** centralizes identity + access checks (owner or collaborator; collaborator email check is case-insensitive). **`npm run build`** should remain passing.

## In Progress

- None.

## Next Up

- Canvas + Liveblocks room keyed to **`projectId`** in the URL.
- Optional: add owner row/label in share dialog list if product wants explicit "owner" visibility.
- Continue from feature spec checklist (imports, `cn()`, no default light bleed).

## Open Questions

- None for design system setup.

## Architecture Decisions

- shadcn/ui via CLI; do not hand-edit `components/ui/*` after generation (per feature spec).
- Next.js 16 + Clerk: use root **`proxy.ts`** (not `middleware.ts`) per Clerk quickstart and product spec.
- Auth UI: Clerk **`dark`** theme from `@clerk/ui/themes` (per `03-auth.md`), not Clerk’s `shadcn` theme, with variables bridged to app tokens.
- **Home (`/`)** is a **public** route and hosts the **embedded `<SignUp />`** (path routing on `/`); **`/editor`** remains the post-auth workspace; dedicated **`/sign-in`** and **`/sign-up`** routes remain for deep links and parity with Clerk env paths.
- Editor project UI (**07**): orchestration in **`use-editor-project-actions`**; initial lists from **`fetchEditorProjectsData`** on the server; mutations via **`fetch`** to **`/api/projects`** with **`router.refresh()`**.
- Database (**05**): Drizzle schema lives under **`drizzle/schema.ts`**; app entrypoint **`lib/db.ts`** (Node `pg` pool; not Edge — use Neon serverless driver later if routes must run on Edge).
- Project REST (**06**): Handlers under **`app/api/projects`** validate with **Zod** and enforce owner checks on **`PATCH`** / **`DELETE`**; **`/api/projects`** is **public in `proxy.ts`** only so anonymous requests reach handlers and receive **`401` JSON**, not a sign-in redirect.

## Session Notes

- Layout: `className="dark"` on `<html>`, Geist via `next/font`, `cn()` in layout. shadcn CLI added `tw-animate-css`, `shadcn/tailwind.css` imports, and `@base-ui/react` (default init stack).
- Auth marketing left panel uses restrained token-based glows and decorative shapes (not Clerk cards); right column stays standard Clerk. **`Link` + `buttonVariants`** used where `Button` has no `asChild` (Base UI).
