"use client"

import { useCallback, useMemo, useState } from "react"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ShareCollaborator {
  email: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface ShareOwner {
  userId: string
  displayName: string | null
  avatarUrl: string | null
  email: string | null
}

interface CollaboratorsResponse {
  collaborators: ShareCollaborator[]
  canManageAccess: boolean
  owner: ShareOwner
}

export interface UseShareDialogResult {
  open: boolean
  loading: boolean
  inviting: boolean
  removingEmail: string | null
  canManageAccess: boolean
  owner: ShareOwner | null
  inviteEmail: string
  inviteEmailValid: boolean
  collaborators: ShareCollaborator[]
  copyLabel: string
  error: string | null
  peopleTotal: number
  setOpen: (open: boolean) => void
  setInviteEmail: (value: string) => void
  refresh: () => Promise<void>
  invite: () => Promise<void>
  remove: (email: string) => Promise<void>
  copyLink: () => Promise<void>
  workspaceUrl: string
}

export function useShareDialog(projectId: string): UseShareDialogResult {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [canManageAccess, setCanManageAccess] = useState(false)
  const [owner, setOwner] = useState<ShareOwner | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [collaborators, setCollaborators] = useState<ShareCollaborator[]>([])
  const [copyLabel, setCopyLabel] = useState("Copy link")
  const [error, setError] = useState<string | null>(null)

  const inviteEmailValid = useMemo(
    () => EMAIL_REGEX.test(inviteEmail.trim().toLowerCase()),
    [inviteEmail],
  )

  const peopleTotal = useMemo(
    () => (owner ? 1 : 0) + collaborators.length,
    [owner, collaborators.length],
  )

  const workspaceUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/editor/${projectId}`
  }, [projectId])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "GET",
        credentials: "include",
      })
      const body = (await res.json().catch(() => null)) as
        | CollaboratorsResponse
        | { error?: string }
        | null
      if (!res.ok) {
        const message =
          body && "error" in body && typeof body.error === "string"
            ? body.error
            : `Load failed (${res.status})`
        setError(message)
        return
      }
      if (
        !body ||
        !("collaborators" in body) ||
        !body.owner ||
        typeof body.owner.userId !== "string"
      ) {
        setError("Invalid server response")
        return
      }
      setCollaborators(body.collaborators)
      setCanManageAccess(body.canManageAccess)
      setOwner(body.owner)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const setOpenWithRefresh = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next) {
        void refresh()
      }
    },
    [refresh],
  )

  const invite = useCallback(async () => {
    if (!inviteEmailValid) return
    setInviting(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase() }),
      })
      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null
      if (!res.ok) {
        const message =
          body && typeof body.error === "string"
            ? body.error
            : `Invite failed (${res.status})`
        setError(message)
        return
      }
      setInviteEmail("")
      await refresh()
    } finally {
      setInviting(false)
    }
  }, [inviteEmail, inviteEmailValid, projectId, refresh])

  const remove = useCallback(
    async (email: string) => {
      setRemovingEmail(email)
      setError(null)
      try {
        const encoded = encodeURIComponent(email)
        const res = await fetch(
          `/api/projects/${projectId}/collaborators?email=${encoded}`,
          {
            method: "DELETE",
            credentials: "include",
          },
        )
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        if (!res.ok) {
          const message =
            body && typeof body.error === "string"
              ? body.error
              : `Remove failed (${res.status})`
          setError(message)
          return
        }
        await refresh()
      } finally {
        setRemovingEmail(null)
      }
    },
    [projectId, refresh],
  )

  const copyLink = useCallback(async () => {
    const url =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/editor/${projectId}`
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopyLabel("Copied!")
    window.setTimeout(() => setCopyLabel("Copy link"), 1200)
  }, [projectId])

  return {
    open,
    loading,
    inviting,
    removingEmail,
    canManageAccess,
    owner,
    inviteEmail,
    inviteEmailValid,
    collaborators,
    copyLabel,
    error,
    peopleTotal,
    setOpen: setOpenWithRefresh,
    setInviteEmail,
    refresh,
    invite,
    remove,
    copyLink,
    workspaceUrl,
  }
}
