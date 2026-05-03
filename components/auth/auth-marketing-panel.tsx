import { Cpu, Ghost, GitFork, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

const features = [
  {
    icon: Cpu,
    label: "AI maps plain English into architecture on the canvas",
  },
  {
    icon: GitFork,
    label: "Real-time shared canvas with collaborators",
  },
  {
    icon: Zap,
    label: "Generate a Markdown technical spec from the graph",
  },
] as const;

export interface AuthMarketingPanelProps {
  className?: string;
}

export function AuthMarketingPanel({ className }: AuthMarketingPanelProps) {
  return (
    <>
      <style>{`
        @keyframes auth-marketing-node-pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.8;
          }
        }
        .auth-marketing-node-pulse {
          animation: auth-marketing-node-pulse 4s ease-in-out infinite;
        }
      `}</style>

      <div
        className={cn(
          "relative flex min-h-full w-full flex-col overflow-hidden bg-surface text-foreground",
          className,
        )}
      >
        {/* Background: glows + dot grid (tokens only) */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          aria-hidden
        >
          <div className="absolute -bottom-[20%] -right-[15%] h-[min(85%,42rem)] w-[min(85%,42rem)] rounded-full bg-[radial-gradient(circle_closest-side,var(--accent-primary)_0%,transparent_100%)] opacity-[0.08]" />
          <div className="absolute -left-[18%] -top-[18%] h-[min(65%,28rem)] w-[min(65%,28rem)] rounded-full bg-[radial-gradient(circle_closest-side,var(--accent-ai)_0%,transparent_100%)] opacity-[0.06]" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--border-default) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        {/* Abstract canvas-style nodes */}
        <div className="pointer-events-none absolute inset-0 z-1" aria-hidden>
          <div
            className="auth-marketing-node-pulse absolute left-[8%] top-[42%] size-18 rounded-2xl border border-chart-1/45 bg-chart-1/12 shadow-[0_0_40px_-8px_color-mix(in_oklab,var(--chart-1)_35%,transparent)]"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="auth-marketing-node-pulse absolute left-[38%] top-[52%] h-11 w-29 rounded-full border border-chart-2/45 bg-chart-2/12 shadow-[0_0_36px_-10px_color-mix(in_oklab,var(--chart-2)_40%,transparent)]"
            style={{ animationDelay: "1.1s" }}
          />
          <div
            className="auth-marketing-node-pulse absolute right-[14%] top-[36%] size-14 rotate-45 rounded-md border border-chart-5/45 bg-chart-5/15 shadow-[0_0_32px_-8px_color-mix(in_oklab,var(--chart-5)_38%,transparent)]"
            style={{ animationDelay: "0.55s" }}
          />
          <div
            className="auth-marketing-node-pulse absolute bottom-[28%] right-[28%] size-10 rounded-full border border-brand/40 bg-brand-dim shadow-[0_0_28px_-6px_color-mix(in_oklab,var(--accent-primary)_45%,transparent)]"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="auth-marketing-node-pulse absolute right-[22%] top-[58%] hidden size-13 rounded-xl border border-chart-3/40 bg-chart-3/10 md:block"
            style={{ animationDelay: "1.6s" }}
          />
        </div>

        {/* Top: brand */}
        <header className="relative z-10 shrink-0 px-10 pt-10">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border-default bg-elevated text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_18%,transparent)]"
                aria-hidden
              >
                <Ghost className="size-4.5" strokeWidth={2} />
              </span>
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Ghosty AI
              </span>
            </div>
            <p className="max-w-sm text-sm leading-snug text-muted-foreground">
              Ghosty AI is a collaborative system design workspace — describe a
              system, refine it on a shared canvas, and export a technical spec.
            </p>
          </div>
        </header>

        {/* Middle: hero */}
        <section className="relative z-10 flex flex-1 flex-col justify-center px-10 py-12">
          <div className="relative max-w-md">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Describe the system
              <span className="text-brand">.</span>
              <br />
              Ship the spec
              <span className="text-brand">.</span>
            </h1>
            <p className="mt-4 max-w-sm leading-relaxed text-secondary-foreground">
              Import starter designs, prompt AI to extend the graph, and persist
              Markdown specs — built for teams designing software architecture
              together.
            </p>
          </div>
        </section>

        {/* Bottom: features */}
        <footer className="relative z-10 mt-auto shrink-0 px-10 pb-10">
          <ul className="flex flex-col gap-4">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-border-default bg-base text-brand"
                  aria-hidden
                >
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <span className="pt-1 text-sm leading-snug text-secondary-foreground">
                  {label}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs leading-snug text-muted-foreground">
            Dark technical workspace — layered surfaces, cyan focus states, and AI
            accents for generation and co-editing.
          </p>
        </footer>
      </div>
    </>
  );
}
