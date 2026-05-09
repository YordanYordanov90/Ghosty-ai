"use client";

import { UserButton } from "@clerk/nextjs";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { cn } from "@/lib/utils";

export interface EditorTopNavProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  title: string;
  trailingActions?: ReactNode;
  className?: string;
}

export function EditorTopNav({
  sidebarOpen,
  onSidebarToggle,
  title,
  trailingActions,
  className,
}: EditorTopNavProps) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-14 shrink-0 items-stretch border-b border-border/60 bg-background/75 backdrop-blur-md supports-backdrop-filter:bg-background/65",
        className,
      )}
    >
      <div className="grid h-full w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4">
        <div className="flex items-center justify-start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={sidebarOpen}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-label={
              sidebarOpen ? "Close project sidebar" : "Open project sidebar"
            }
            onClick={onSidebarToggle}
            className="gap-2"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
            <span>Projects</span>
          </Button>
        </div>

        <h1 className="min-w-0 truncate text-center text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h1>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          {trailingActions}
          <UserButton
            appearance={{
              ...clerkAppearance.userButton,
              variables: clerkAppearance.variables,
            }}
            userProfileProps={{
              appearance: {
                ...clerkAppearance.userProfile,
                variables: clerkAppearance.variables,
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
