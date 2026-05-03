# UI Context

## Theme

**Dark only. No light mode.** TDark only. No light mode. The visual language is a dark technical workspace — near-black backgrounds, layered surfaces, and vivid accent colors for interactive elements.

All colors are defined as CSS custom properties in `globals.css` and mapped to Tailwind tokens via `@theme inline`. **Components must use these tokens — no hardcoded hex values or raw Tailwind color classes like `zinc-*`.**

| Role                | CSS Variable              | Hex / Value                     | Notes |
|---------------------|---------------------------|---------------------------------|-------|
| Page background     | `--bg-base`               | `#080809`                       | Main app background |
| Surface             | `--bg-surface`            | `#111114`                       | Cards, panels, sidebars |
| Elevated surface    | `--bg-elevated`           | `#18181c`                       | Modals, dropdowns, floating elements |
| Subtle surface      | `--bg-subtle`             | `#1e1e23`                       | Subtle highlights, table rows |
| Default border      | `--border-default`        | `#2a2a30`                       | Primary borders |
| Subtle border       | `--border-subtle`         | `#3a3a42`                       | Secondary borders |
| Primary text        | `--text-primary`          | `#f0f0f4`                       | Main content text |
| Secondary text      | `--text-secondary`        | `#c0c0cc`                       | Supporting text |
| Muted text          | `--text-muted`            | `#808090`                       | Less important info |
| Faint text          | `--text-faint`            | `#505060`                       | Placeholders, labels |
| Brand accent        | `--accent-primary`        | `#00c8d4` (cyan)                | Primary CTAs, links, strategy highlights — strong tech/AI identity |
| Brand dim           | `--accent-primary-dim`    | `rgba(0, 200, 212, 0.12)`       | Subtle highlights |
| AI accent           | `--accent-ai`             | `#6457f9` (indigo-purple)       | Grok AI elements, insights, co-pilot |
| AI text             | `--accent-ai-text`        | `#8b82ff`                       | AI-related text |
| Profit / Gain       | `--state-profit`          | `#22c55e`                       | Green for positive performance, P&L, buy signals |
| Loss                | `--state-loss`            | `#ef4444`                       | Red for negative performance, sell signals |
| Error               | `--state-error`           | `#ff4d4f`                       | Errors |
| Success             | `--state-success`         | `#34d399`                       | Confirmations, backtest success |
| Warning             | `--state-warning`         | `#fbbf24`                       | Alerts, risk warnings |

Tailwind utility names map directly to these variables. Use `bg-base`, `bg-surface`, `text-primary`, `text-brand`, `accent-primary`, `text-profit`, etc.

## Typography

| Role      | Font          | CSS Variable          |
|-----------|---------------|-----------------------|
| UI text   | Geist Sans    | `--font-geist-sans`   |
| Code/mono | Geist Mono    | `--font-geist-mono`   |

Both fonts are loaded via `next/font/google` and applied as CSS variables on the `<html>` element. The base `body` uses Geist Sans with `antialiased`.

## Border Radius

Radius increases with surface depth — smaller for inner elements, larger for outer containers.

| Context           | Class         |
|-------------------|---------------|
| Inline / small UI | `rounded-xl`  |
| Cards / panels    | `rounded-2xl` |
| Modal / overlay   | `rounded-3xl` |

## Canvas (React Flow)

### Node Color Palette

8 defined color pairs (from `types/canvas.ts` as `NODE_COLORS`). Used for strategy blocks (indicators, conditions, actions, risk rules, etc.).

| Node fill   | Text color  | Character                  |
|-------------|-------------|----------------------------|
| `#1F1F1F`   | `#EDEDED`   | Neutral dark (default)     |
| `#10233D`   | `#52A8FF`   | Blue (momentum indicators) |
| `#2E1938`   | `#BF7AF0`   | Purple (AI insights)       |
| `#331B00`   | `#FF990A`   | Orange (alerts)            |
| `#3C1618`   | `#FF6166`   | Red (sell / stop-loss)     |
| `#3A1726`   | `#F75F8F`   | Pink (custom rules)        |
| `#0F2E18`   | `#62C073`   | Green (buy / profit)       |
| `#062822`   | `#0AC7B4`   | Teal (risk management)     |

Default node color: `#1F1F1F` with `#EDEDED` text.

### Edge Style

Smooth-step path with arrow marker. Default edge color: `#f8fafc`. Thin stroke — edges stay visually secondary to nodes.

### Node Shapes

6 supported shapes (from `types/canvas.ts` as `NODE_SHAPES`):

- `rectangle` — default general-purpose node
- `diamond` — decision / gateway (e.g., “if RSI > 70”)
- `circle` — event / endpoint
- `pill` — service / process (e.g., “Enter Long”)
- `cylinder` — database / storage (e.g., historical data)
- `hexagon` — external system / boundary

### Connection Handles

Small white circular handles, hidden by default, revealed on node hover. Appear at all four sides of a node.

### Canvas Background

React Flow `<Background>` component. Canvas sits on the base background color.

## Component Library

shadcn/ui on top of Tailwind. No custom design system. Components live in `components/ui/`. Use the `shadcn` CLI to add new components rather than writing them from scratch.

## Layout Patterns

- **Strategy Builder workspace**: full-viewport layout — floating sidebar (left) with indicator library, center canvas for building the trading flow, slide-over AI co-pilot sidebar (right) for Grok-powered suggestions and backtesting results.
- Sidebars: floating overlay with dark semi-transparent background and subtle border.
- Modals and dialogs: centered overlay, `rounded-3xl`, dark background with backdrop blur.
- Navbar: top bar with dark background and bottom border.

## Icons

Lucide React. Stroke-based icons only — no filled variants. Icon sizes: `h-4 w-4` for inline, `h-5 w-5` for buttons, `h-8 w-8` for feature icons in empty states.