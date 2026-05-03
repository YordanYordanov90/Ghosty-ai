import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Presentational layout for future editor dialogs.
 * Uses semantic colors from `app/globals.css` (popover, border, muted-foreground).
 * Does not mount a Dialog root — wire to `components/ui/dialog` when implementing flows.
 */
export interface EditorDialogPatternProps {
  title: ReactNode;
  description?: ReactNode;
  footer: ReactNode;
  className?: string;
}

export function EditorDialogPattern({
  title,
  description,
  footer,
  className,
}: EditorDialogPatternProps) {
  return (
    <div
      data-slot="editor-dialog-pattern"
      className={cn(
        "grid w-full max-w-sm gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="font-heading text-base font-medium leading-none">
          {title}
        </div>
        {description != null ? (
          <div className="text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t border-border bg-muted/50 p-4 sm:flex-row sm:justify-end">
        {footer}
      </div>
    </div>
  );
}
