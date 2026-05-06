"use client"

import type { ReactNode } from "react"
import { Link2, Mail, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type {
  ShareCollaborator,
  ShareOwner,
  UseShareDialogResult,
} from "@/hooks/use-share-dialog"

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

function RoleBadge({
  role,
  className,
}: {
  role: "owner" | "collaborator"
  className?: string
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        role === "owner"
          ? "border-primary/45 bg-primary/15 text-primary"
          : "border-border bg-muted/80 text-muted-foreground",
        className,
      )}
    >
      {role === "owner" ? "Owner" : "Collaborator"}
    </span>
  )
}

function PersonRow({
  title,
  subtitle,
  avatarUrl,
  fallbackInitials,
  badge,
  trailing,
}: {
  title: string
  subtitle: string | null
  avatarUrl: string | null
  fallbackInitials: string
  badge: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div className="flex min-w-0 w-full max-w-full items-center gap-3 rounded-xl border border-border/70 bg-card/50 px-3 py-2.5 shadow-sm">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="size-10 shrink-0 rounded-full border border-border/60 object-cover"
        />
      ) : (
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-sm font-semibold text-foreground"
          aria-hidden
        >
          {fallbackInitials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {badge}
        </div>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}

function ownerDisplayLines(owner: ShareOwner): { title: string; subtitle: string | null } {
  const email = owner.email?.trim() || null
  const name = owner.displayName?.trim() || null
  if (name && email) return { title: name, subtitle: email }
  if (email) return { title: email, subtitle: null }
  if (name) return { title: name, subtitle: null }
  return { title: "Project owner", subtitle: null }
}

function collaboratorDisplayLines(c: ShareCollaborator): {
  title: string
  subtitle: string | null
} {
  const name = c.displayName?.trim() || null
  const email = c.email.trim()
  if (name) return { title: name, subtitle: email }
  return { title: email, subtitle: null }
}

export function ShareDialog({ share }: ShareDialogProps) {
  const subtitle = share.canManageAccess
    ? "Invite collaborators, copy the workspace link, and manage access."
    : "View who has access. You can copy the workspace link; only the owner can invite or remove people."

  return (
    <Dialog open={share.open} onOpenChange={share.setOpen}>
      <DialogContent
        showCloseButton={!share.loading && !share.inviting}
        className="max-h-[min(90dvh,40rem)] w-full max-w-[min(100vw-2rem,36rem)] gap-0 overflow-x-hidden overflow-y-auto p-0 sm:max-w-xl md:max-w-2xl"
      >
        <div className="border-b border-border/60 px-5 pb-4 pt-5 pr-12">
          <DialogHeader className="gap-1.5 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight">
              Share project
            </DialogTitle>
            <DialogDescription className="text-left text-xs leading-relaxed sm:text-sm">
              {subtitle}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-w-0 space-y-4 px-5 py-4">
          {/* Workspace link */}
          <section className="min-w-0 rounded-xl border border-border/70 bg-card/30 p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">Workspace link</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Share a direct link with teammates after you grant them access.
                </p>
                {share.workspaceUrl ? (
                  <p
                    className="break-all font-mono text-[11px] leading-snug text-faint"
                    title={share.workspaceUrl}
                  >
                    {share.workspaceUrl}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full shrink-0 gap-1.5 border-border bg-background/80 sm:w-auto sm:self-start"
                disabled={share.loading}
                onClick={() => void share.copyLink()}
              >
                <Link2 className="size-3.5" />
                {share.copyLabel}
              </Button>
            </div>
          </section>

          {/* Invite */}
          {share.canManageAccess ? (
            <section className="min-w-0 rounded-xl border border-border/70 bg-card/30 p-4">
              <form
                className="min-w-0 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void share.invite()
                }}
              >
                <label
                  htmlFor="share-invite-email"
                  className="text-sm font-medium text-foreground"
                >
                  Invite by email
                </label>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                  <div className="relative min-w-0 flex-1">
                    <Mail
                      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="share-invite-email"
                      type="email"
                      autoComplete="email"
                      placeholder="teammate@company.com"
                      value={share.inviteEmail}
                      onChange={(event) => share.setInviteEmail(event.target.value)}
                      disabled={share.inviting || share.loading}
                      className="h-9 pl-9"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      share.inviting || share.loading || !share.inviteEmailValid
                    }
                    className="w-full shrink-0 sm:w-auto sm:min-w-22"
                  >
                    {share.inviting ? "Inviting…" : "Invite"}
                  </Button>
                </div>
              </form>
            </section>
          ) : null}

          {/* People with access */}
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">People with access</h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {share.loading ? "…" : `${share.peopleTotal} total`}
              </span>
            </div>

            <div className="space-y-2">
              {share.loading && !share.owner ? (
                <p className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                  Loading…
                </p>
              ) : share.owner ? (
                <>
                  {(() => {
                    const { title, subtitle } = ownerDisplayLines(share.owner)
                    return (
                      <PersonRow
                        title={title}
                        subtitle={subtitle}
                        avatarUrl={share.owner.avatarUrl}
                        fallbackInitials={initialsFromName(title)}
                        badge={<RoleBadge role="owner" />}
                      />
                    )
                  })()}
                  {share.collaborators.map((c: ShareCollaborator) => {
                    const { title, subtitle } = collaboratorDisplayLines(c)
                    return (
                      <PersonRow
                        key={c.email}
                        title={title}
                        subtitle={subtitle}
                        avatarUrl={c.avatarUrl}
                        fallbackInitials={initialsFromName(title)}
                        badge={<RoleBadge role="collaborator" />}
                        trailing={
                          share.canManageAccess ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={`Remove ${c.email}`}
                              disabled={share.removingEmail === c.email}
                              onClick={() => void share.remove(c.email)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : undefined
                        }
                      />
                    )
                  })}
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                  Unable to load people for this project.
                </p>
              )}
            </div>
          </section>

          {share.error ? (
            <p className="text-xs text-destructive" role="alert">
              {share.error}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
