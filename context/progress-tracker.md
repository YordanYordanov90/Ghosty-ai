# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- Ready for next feature (**03-auth** complete; home + auth shell finalized).

## Current Goal

- Smoke-test in browser: sign-up on `/`, `/sign-up`, sign-in, `/editor` after login, `UserButton` sign-out.
- If Clerk misroutes the root sign-up flow, confirm **Paths** in the Clerk dashboard allow the **Sign up** component on **`/`** (and that `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` match `lib/clerk-auth-paths` when customized).

## Completed

- **01-design-system** — shadcn/ui init (Tailwind v4, `components.json`), primitives: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea; `lib/utils.ts` `cn()`; `lucide-react`; `.dark` semantic tokens aligned with existing `@theme` hue (260); `npm run build` passes. Generated `components/ui/*` untouched after CLI add.
- **02-editor** — `components/editor/editor-navbar.tsx` (fixed `h-14`, left/center/right, sidebar toggle with `PanelLeftOpen` / `PanelLeftClose`, dark bar + bottom border); `components/editor/project-sidebar.tsx` (overlay slide-in from left, `isOpen` / `onClose`, Projects header + close, shadcn Tabs My Projects / Shared with empty placeholders, full-width New Project + `Plus`); `components/editor/editor-dialog-pattern.tsx` (title, description, footer slots using popover/muted/border tokens — no `Dialog` root). **Editor shell:** `app/editor/page.tsx` composes navbar + sidebar + canvas placeholder.
- **03-auth** — `@clerk/ui` + `dark` from `@clerk/ui/themes`; `lib/clerk-appearance.ts` maps Clerk appearance variables to app CSS tokens; `ClerkProvider` in `app/layout.tsx`. **`proxy.ts`:** protected by default; public routes: **`/`** (home), sign-in and sign-up paths from `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` via **`lib/clerk-auth-paths.ts`** (fallbacks `/sign-in`, `/sign-up`). **`components/auth/auth-route-shell.tsx`:** two-panel layout (`min-h-dvh`, `lg` grid); left **`aside`** is full-height flex column (`overflow-hidden`) with marketing panel **`flex-1`**; right column centers Clerk form. **`components/auth/auth-marketing-panel.tsx`:** full-height left marketing (design tokens + subtle radial glows, dot grid, pulsing abstract canvas-style nodes); brand + hero + feature list; copy aligned with **`context/project-overview.md`** (Ghosty AI, collaborative system design, canvas, Markdown specs). Optional **`className`**. **`app/sign-in/[[...sign-in]]/page.tsx`** & **`app/sign-up/[[...sign-up]]/page.tsx`:** `AuthRouteShell` + `<SignIn />` / `<SignUp />`. **`app/page.tsx`:** signed-in → **`redirect("/editor")`**; signed-out → **`AuthRouteShell`** with **`<SignUp routing="path" path="/" signInUrl={signInPath} />`** (sign-up on home). **`UserButton`** in `components/editor/editor-navbar.tsx` (default Clerk menu).

## In Progress

- None.

## Next Up

- Continue from feature spec checklist (imports, `cn()`, no default light bleed).
- Align **`context/feature-specs/03-auth.md`** with implemented behavior if you want the written spec to match home-as-sign-up and public `/` (optional doc edit).

## Open Questions

- None for design system setup.

## Architecture Decisions

- shadcn/ui via CLI; do not hand-edit `components/ui/*` after generation (per feature spec).
- Next.js 16 + Clerk: use root **`proxy.ts`** (not `middleware.ts`) per Clerk quickstart and product spec.
- Auth UI: Clerk **`dark`** theme from `@clerk/ui/themes` (per `03-auth.md`), not Clerk’s `shadcn` theme, with variables bridged to app tokens.
- **Home (`/`)** is a **public** route and hosts the **embedded `<SignUp />`** (path routing on `/`); **`/editor`** remains the post-auth workspace; dedicated **`/sign-in`** and **`/sign-up`** routes remain for deep links and parity with Clerk env paths.

## Session Notes

- Layout: `className="dark"` on `<html>`, Geist via `next/font`, `cn()` in layout. shadcn CLI added `tw-animate-css`, `shadcn/tailwind.css` imports, and `@base-ui/react` (default init stack).
- Auth marketing left panel uses restrained token-based glows and decorative shapes (not Clerk cards); right column stays standard Clerk. **`Link` + `buttonVariants`** used where `Button` has no `asChild` (Base UI).
