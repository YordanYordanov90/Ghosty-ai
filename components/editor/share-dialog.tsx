"use client"

import { Mail, UserMinus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { UseShareDialogResult } from "@/hooks/use-share-dialog"

interface ShareDialogProps {
  share: UseShareDialogResult
}

function initialsFromName(nameOrEmail: string): string {
  const safe = nameOrEmail.trim()
  if (!safe) return "?"
  const parts = safe.split(/\s+/).slice(0, 2)
  if (parts.length > 1) {
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
  }
  return safe[0]?.toUpperCase() ?? "?"
}

export function ShareDialog({ share }: ShareDialogProps) {
  return (
    <Dialog open={share.open} onOpenChange={share.setOpen}>
      <DialogContent showCloseButton={!share.loading && !share.inviting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-4" />
            Share project
          </DialogTitle>
          <DialogDescription>
            {share.canManageAccess
              ? "Invite teammates and manage collaborator access."
              : "You have view-only collaborator access on this project."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {share.canManageAccess ? (
            <div className="grid gap-2">
              <label htmlFor="share-invite-email" className="text-sm font-medium">
                Invite collaborator
              </label>
              <div className="flex gap-2">
                <Input
                  id="share-invite-email"
                  type="email"
                  placeholder="teammate@company.com"
                  value={share.inviteEmail}
                  onChange={(event) => share.setInviteEmail(event.target.value)}
                  disabled={share.inviting || share.loading}
                />
                <Button
                  type="button"
                  onClick={() => void share.invite()}
                  disabled={
                    share.inviting || share.loading || !share.inviteEmailValid
                  }
                >
                  Invite
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-2">
            <p className="text-sm font-medium">Collaborators</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border/70">
              {share.loading ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">Loading…</p>
              ) : share.collaborators.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  No collaborators yet.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {share.collaborators.map((collaborator) => {
                    const label = collaborator.displayName ?? collaborator.email
                    return (
                      <li
                        key={collaborator.email}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        {collaborator.avatarUrl ? (
                          <img
                            src={collaborator.avatarUrl}
                            alt={label}
                            className="size-8 rounded-full border border-border/70 object-cover"
                          />
                        ) : (
                          <div className="flex size-8 items-center justify-center rounded-full border border-border/70 bg-muted text-xs font-semibold text-foreground">
                            {initialsFromName(label)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {label}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {collaborator.email}
                          </p>
                        </div>
                        {share.canManageAccess ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${collaborator.email}`}
                            disabled={share.removingEmail === collaborator.email}
                            onClick={() => void share.remove(collaborator.email)}
                          >
                            <UserMinus className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {share.error ? (
            <p className="text-xs text-destructive" role="alert">
              {share.error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void share.copyLink()}
          >
            <Mail className="size-4" />
            {share.copyLabel}
          </Button>
          <Button type="button" onClick={() => share.setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
