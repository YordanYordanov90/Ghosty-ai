# Ghosty AI

**Real-time collaborative system design workspace powered by AI.**

Ghosty AI lets engineers describe a system in plain English. An AI agent maps the description into a shared visual canvas, collaborators refine the architecture together in real time, and the app converts the final graph into a Markdown technical specification that can be reviewed and downloaded.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running Locally](#running-locally)
- [Background Workers (Trigger.dev)](#background-workers-triggerdev)
- [API Reference](#api-reference)
- [Architecture Notes](#architecture-notes)
- [Development Workflow](#development-workflow)

---

## Overview

### The Problem

System design is expensive. Whiteboarding sessions are ephemeral, architecture diagrams live in Figma files nobody updates, and converting a diagram into a written spec is manual work.

### The Solution

Ghosty AI turns a natural language description into a shared, editable system design canvas. Multiple engineers can work on the same canvas simultaneously. When the design is ready, one click produces a Markdown spec tied to the project.

### Core User Flow

1. Sign in
2. Create or open a project
3. Type a prompt — the AI generates nodes and edges on the canvas
4. Collaborators join, refine shapes, labels, and connections in real time
5. Import a starter system template as a base when needed
6. Generate a Markdown spec from the final graph
7. Download or review the spec in-app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth | Clerk (`@clerk/nextjs`) |
| Real-time | Liveblocks (`@liveblocks/react`, `@liveblocks/react-flow`) |
| Canvas | React Flow (`@xyflow/react`) |
| Database | Neon Postgres via Drizzle ORM |
| File Storage | Vercel Blob (private store) |
| Background Jobs | Trigger.dev v4 |
| AI / LLM | Vercel AI SDK + OpenAI (`gpt-4o`) |
| Deployment | Vercel |

---

## Features

### Authentication & Projects
- Clerk-powered sign-in / sign-up with dark-themed marketing panel
- Route protection via Clerk middleware (`proxy.ts`); all editor routes are private by default
- Project CRUD (create, rename, archive, delete) with Drizzle-backed persistence
- Collaborator invite and access management (owner + collaborator roles by email)

### Collaborative Canvas
- Shared real-time canvas over Liveblocks — nodes, edges, and presence synced across all connected clients
- Six draggable shape types: rectangle, diamond, circle, pill, cylinder, hexagon
- Inline label editing on nodes and edges (double-click to edit, Escape to cancel)
- Node resize handles, color swatches (fill + text color pairs)
- Smooth-step edge routing with arrowheads and inline edge labels
- Live cursors and presence avatars for all connected collaborators
- Undo / redo wired to Liveblocks history
- Keyboard shortcuts: `+`/`-` zoom, `Ctrl+Z` undo, `Ctrl+Shift+Z` / `Ctrl+Y` redo

### Starter Templates
- Curated library of system design templates (monolith, microservices, event-driven, serverless, and more)
- SVG previews in the import modal; loading a template replaces the current canvas state

### Canvas Autosave
- Debounced autosave (1.5 s) persists canvas JSON to Vercel Blob (`canvas/{projectId}.json`, private)
- Blob URL stored in `projects.canvas_json_path` via Drizzle
- On workspace load: canvas is restored from Blob when the Liveblocks room is empty

### AI Architecture Generation
- Type a prompt in the AI Architect panel → Trigger.dev job calls OpenAI → nodes and edges are written directly into the Liveblocks room
- All connected collaborators see the AI drawing the canvas in real time
- AI presence cursor and "thinking" badge visible to other participants during generation
- Status feed (`ai-status-feed`) gates the input panel while a job is active
- Chat history persisted in room-scoped Liveblocks feed (`ai-chat`)

### Spec Generation
- Sends canvas snapshot + chat history to a Trigger.dev job → OpenAI generates a Markdown spec
- Spec stored in Vercel Blob (`specs/{projectId}/{specId}.md`, private) and indexed in `project_specs` table
- In-app spec list with creation timestamps; click to preview rendered Markdown
- Download via authenticated route (`GET /api/projects/[projectId]/specs/[specId]/download`)

---

## Project Structure

```
ghosty-ai/
├── app/
│   ├── api/                  # Route handlers (projects, canvas, AI, Liveblocks auth)
│   ├── editor/               # Editor hub + per-project workspace
│   ├── sign-in/              # Clerk sign-in route
│   ├── sign-up/              # Clerk sign-up route
│   └── page.tsx              # Home (public sign-up landing)
├── components/
│   ├── auth/                 # Auth layout shells + marketing panel
│   ├── editor/               # All editor UI (nav, sidebar, canvas, AI panel, dialogs)
│   └── ui/                   # shadcn/ui primitives (do not hand-edit)
├── context/                  # Product and architecture documentation
├── drizzle/
│   ├── schema.ts             # Drizzle table definitions
│   └── migrations/           # Generated SQL migration files (tracked in git)
├── hooks/                    # Custom React hooks
├── lib/                      # Shared utilities, DB client, Liveblocks client, auth helpers
├── trigger/                  # Trigger.dev task definitions (design-agent, generate-spec)
├── types/                    # TypeScript type definitions
├── drizzle.config.ts
├── liveblocks.config.ts      # Typed Presence, Storage, UserMeta
├── proxy.ts                  # Clerk middleware (route protection)
└── trigger.config.ts         # Trigger.dev project config
```

---

## Prerequisites

- Node.js 20+
- npm 10+
- A [Neon](https://neon.tech) Postgres database
- A [Clerk](https://clerk.com) application (development keys)
- A [Liveblocks](https://liveblocks.io) project
- A [Vercel Blob](https://vercel.com/storage/blob) store (private)
- A [Trigger.dev](https://trigger.dev) project
- An [OpenAI](https://platform.openai.com) API key

---

## Local Setup

```powershell
# 1. Clone the repo
git clone https://github.com/your-org/ghosty-ai.git
cd ghosty-ai

# 2. Install dependencies
npm install

# 3. Copy the example env file and fill in your keys
Copy-Item .env.example .env.local
```

---

## Environment Variables

Edit `.env.local` with your credentials. All variables are required for full functionality.

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | [Clerk Dashboard → API Keys](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | Clerk secret key | Clerk Dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` | Post sign-in redirect | Set to `/editor` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | Post sign-up redirect | Set to `/editor` |
| `DATABASE_URL` | Neon Postgres connection string | [Neon Console](https://console.neon.tech) |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | Liveblocks public key | [Liveblocks Dashboard](https://liveblocks.io/dashboard) |
| `LIVEBLOCKS_SECRET_KEY` | Liveblocks secret key | Liveblocks Dashboard → API Keys |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | Vercel Dashboard → Storage → Blob |
| `TRIGGER_SECRET_KEY` | Trigger.dev secret key | [Trigger.dev Cloud](https://cloud.trigger.dev) → Project → API Keys |
| `TRIGGER_PROJECT_REF` | Trigger.dev project reference | Trigger.dev Cloud → Project settings |
| `OPENAI_API_KEY` | OpenAI API key | [OpenAI Platform](https://platform.openai.com/api-keys) |

> **Note:** `LIVEBLOCKS_SECRET_KEY` and `OPENAI_API_KEY` must also be set in the **Trigger.dev environment variables** for background workers to access them.

---

## Database

Ghosty AI uses Drizzle ORM with Neon Postgres. Migration files are tracked in git under `drizzle/migrations/`.

```powershell
# Generate a new migration after schema changes
npm run db:generate

# Apply all pending migrations
npm run db:migrate

# Open Drizzle Studio (local DB browser)
npm run db:studio
```

> **Never use `npm run db:push` in production.** Use `npm run db:migrate` only.

### Schema Overview

| Table | Purpose |
|---|---|
| `projects` | Project metadata, owner, status, canvas blob URL |
| `project_collaborators` | Email-based collaborator access per project |
| `task_runs` | Trigger.dev run ownership records (design + spec jobs) |
| `project_specs` | Generated spec metadata and Vercel Blob path |

---

## Running Locally

```powershell
# Start the Next.js dev server (webpack mode)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The home page renders the Clerk sign-up form. After sign-in you are redirected to `/editor`.

---

## Background Workers (Trigger.dev)

AI generation tasks run as durable background jobs on Trigger.dev, not in the Next.js process.

```powershell
# Start the Trigger.dev dev worker (connects to cloud, runs tasks locally)
npm run trigger:dev

# Deploy tasks to production
npm run trigger:deploy
```

### Tasks

| Task ID | File | Purpose |
|---|---|---|
| `design-agent` | `trigger/design-agent.ts` | Generates canvas nodes + edges from a user prompt |
| `generate-spec` | `trigger/generate-spec.ts` | Converts canvas snapshot into a Markdown spec |

> Both tasks require `OPENAI_API_KEY` and `LIVEBLOCKS_SECRET_KEY` to be set in the Trigger.dev project environment variables.

---

## API Reference

### Projects

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects` | Owner | List owned + shared projects |
| `POST` | `/api/projects` | Owner | Create a project |
| `PATCH` | `/api/projects/[projectId]` | Owner | Rename / update a project |
| `DELETE` | `/api/projects/[projectId]` | Owner | Delete a project |
| `GET` | `/api/projects/[projectId]/collaborators` | Owner | List collaborators |
| `POST` | `/api/projects/[projectId]/collaborators` | Owner | Add collaborator by email |
| `DELETE` | `/api/projects/[projectId]/collaborators` | Owner | Remove collaborator |

### Canvas

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects/[projectId]/canvas` | Collaborator | Load saved canvas JSON |
| `PUT` | `/api/projects/[projectId]/canvas` | Collaborator | Save canvas JSON to Vercel Blob |

### Specs

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects/[projectId]/specs` | Collaborator | List generated specs |
| `GET` | `/api/projects/[projectId]/specs/[specId]` | Collaborator | Get spec Markdown content |
| `GET` | `/api/projects/[projectId]/specs/[specId]/download` | Collaborator | Download spec as `.md` |

### AI

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/design` | Collaborator | Trigger a design generation job |
| `POST` | `/api/ai/design/token` | Collaborator | Get a scoped Trigger.dev public token for a design run |
| `POST` | `/api/ai/spec` | Collaborator | Trigger a spec generation job |
| `POST` | `/api/ai/spec/token` | Collaborator | Get a scoped Trigger.dev public token for a spec run |

### Liveblocks

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/liveblocks-auth` | Collaborator | Issue a Liveblocks session token for the requesting user |

---

## Architecture Notes

- **Route protection** is handled in `proxy.ts` (Clerk middleware). All routes are private by default. API routes under `/api/projects`, `/api/ai/design`, and `/api/ai/spec` are listed as public so that unauthenticated fetch clients receive a `401 JSON` response instead of a sign-in redirect.
- **Liveblocks** is the real-time source of truth for canvas state. Vercel Blob is a durable backup loaded on first mount when the room is empty.
- **Vercel Blob** is configured as a **private** store. All `put()` and `get()` calls use `access: "private"`. Never use `"public"`.
- **Trigger.dev run tokens** are read-only, scoped to a single `runId`, and expire after 1 hour. The `task_runs` table exists solely to bind a `runId` to a Clerk `ownerId` + `projectId` so the token route can verify ownership.
- **AI canvas mutations** from background tasks use the Liveblocks REST API (`mutateFlow`) to write into the same `flow` storage key that `useLiveblocksFlow` reads — no special sync layer needed.
- **LLM structured output**: `generateObject` was rejected by OpenAI for the discriminated-union action schema. Both AI tasks use `generateText` + JSON extraction + `safeParse` with a single retry on validation failure.
- **Database runtime**: All DB-touching routes use `runtime = "nodejs"` (Node.js `pg` pool). Do not move these to the Edge runtime without switching to the Neon serverless driver first.

---

## Development Workflow

1. **Branch** — Create a `feature/` or `fix/` branch for every change.
2. **Implement** — Follow patterns in `context/code-standards.md` and `context/architecture-context.md`.
3. **Build check** — Run `npm run build` and fix all errors before committing.
4. **Update tracker** — Note the change in `context/progress-tracker.md`.
5. **Commit** — Use conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`). One feature per commit. Do not auto-commit.
6. **Merge** — Merge to `main` after review.
7. **Delete branch** — Delete the feature branch after merge.

### Key conventions

- Components live in `components/[feature]/ComponentName.tsx` (PascalCase).
- Server Actions for mutations; API routes for webhooks, file uploads, and third-party integrations.
- Validate all external input and LLM output with Zod. No `any` types.
- Prefer React Server Components. Use `'use client'` only when interactivity or browser APIs are required.
- Do not hand-edit files under `components/ui/` — they are managed by the shadcn CLI.
- Tailwind CSS v4: all theme config lives in `app/globals.css` under `@theme`. There is no `tailwind.config.ts`.
