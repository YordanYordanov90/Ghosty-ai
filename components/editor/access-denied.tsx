import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function AccessDenied() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-base px-6 py-10">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute bottom-[-18%] right-[-12%] h-[min(75%,36rem)] w-[min(75%,36rem)] rounded-full bg-[radial-gradient(circle_closest-side,var(--accent-primary)_0%,transparent_100%)] opacity-[0.08]" />
        <div className="absolute left-[-14%] top-[-14%] h-[min(55%,24rem)] w-[min(55%,24rem)] rounded-full bg-[radial-gradient(circle_closest-side,var(--accent-ai)_0%,transparent_100%)] opacity-[0.06]" />
        <div className="editor-canvas-dots absolute inset-0 opacity-[0.35]" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-1" aria-hidden>
        <div className="auth-marketing-node-pulse absolute left-[10%] top-[38%] size-14 rounded-2xl border border-chart-1/40 bg-chart-1/10 shadow-[0_0_32px_-8px_color-mix(in_oklab,var(--chart-1)_35%,transparent)] [animation-delay:0s]" />
        <div className="auth-marketing-node-pulse absolute right-[18%] top-[32%] size-11 rotate-45 rounded-md border border-chart-5/40 bg-chart-5/12 shadow-[0_0_28px_-8px_color-mix(in_oklab,var(--chart-5)_38%,transparent)] [animation-delay:0.7s]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-dashed border-border-default/70 bg-elevated/35 px-8 py-10 text-center shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_12%,transparent)] backdrop-blur-[2px]">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-border-default bg-base text-brand shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_14%,transparent)]">
          <Lock className="size-5" strokeWidth={2} aria-hidden />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Access denied
          <span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          You do not have permission to access this project workspace.
        </p>
        <p className="mt-6 text-xs leading-snug text-faint">
          Request access from project owner or return to your editor hub.
        </p>
        <Link href="/editor" className="mt-6 inline-flex">
          <Button className="gap-2">
            <Sparkles className="size-4" strokeWidth={2} aria-hidden />
            Back to Editor
          </Button>
        </Link>
      </div>
    </div>
  );
}