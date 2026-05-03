import type { ReactNode } from "react";

import { AuthMarketingPanel } from "@/components/auth/auth-marketing-panel";

interface AuthRouteShellProps {
  children: ReactNode;
}

/**
 * Two-panel auth layout: full-height marketing panel (lg+ only) + centered Clerk form.
 */
export function AuthRouteShell({ children }: AuthRouteShellProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh lg:grid-cols-2">
        <aside className="relative hidden min-h-dvh overflow-hidden border-r border-border lg:flex lg:flex-col">
          <AuthMarketingPanel className="min-h-full flex-1" />
        </aside>
        <main className="flex min-h-dvh items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
