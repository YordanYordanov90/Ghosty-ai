"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
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
        "fixed inset-x-0 top-0 z-50 flex h-14 shrink-0 items-stretch border-b border-border bg-background",
        className
      )}
    >
      <div className="flex w-full items-center justify-between gap-3 px-3">
        <div className="flex min-w-0 flex-1 items-center justify-start">
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
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center" />
        <div className="flex min-w-0 flex-1 items-center justify-end" />
      </div>
    </header>
  );
}
