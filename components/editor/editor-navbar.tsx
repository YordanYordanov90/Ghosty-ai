"use client";

import { UserButton } from "@clerk/nextjs";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { cn } from "@/lib/utils";

export interface EditorNavbarProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  className?: string;
}

export function EditorNavbar({
  sidebarOpen,
  onSidebarToggle,
  className,
}: EditorNavbarProps) {
  const Icon = sidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-14 shrink-0 items-stretch border-b border-border/60 bg-background/75 backdrop-blur-md supports-backdrop-filter:bg-background/65",
        className
      )}
    >
      <div className="grid h-full w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "Close project sidebar" : "Open project sidebar"}
          onClick={onSidebarToggle}
        >
          <Icon className="size-4" />
        </Button>

        <h1 className="min-w-0 truncate text-center text-sm font-semibold tracking-tight text-foreground">
          Editor
        </h1>

        <div className="flex items-center justify-end">
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
