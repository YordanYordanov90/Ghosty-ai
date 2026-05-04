"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ShareCollaborator {
  email: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}

interface CollaboratorsResponse {
  collaborators: ShareCollaborator[]
  canManageAccess: boolean
}

export interface UseShareDialogResult {
  open: boolean
  loading: boolean
  inviting: boolean
  removingEmail: string | null
  canManageAccess: boolean
  inviteEmail: string
  inviteEmailValid: boolean
  collaborators: ShareCollaborator[]
  copyLabel: string
  error: string | null
  setOpen: (open: boolean) => void
  setInviteEmail: (value: string) => void
  refresh: () => Promise<void>
  invite: () => Promise<void>
  remove: (email: string) => Promise<void>
  copyLink: () => Promise<void>
}

export function useShareDialog(projectId: string): UseShareDialogResult {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [canManageAccess, setCanManageAccess] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [collaborators, setCollaborators] = useState<ShareCollaborator[]>([])
  const [copyLabel, setCopyLabel] = useState("Copy link")
  const [error, setError] = useState<string | null>(null)

  const inviteEmailValid = useMemo(
    () => EMAIL_REGEX.test(inviteEmail.trim().toLowerCase()),
    [inviteEmail],
  )

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
      if (!body || !("collaborators" in body)) {
        setError("Invalid server response")
        return
      }
      setCollaborators(body.collaborators)
      setCanManageAccess(body.canManageAccess)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

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
    const url = `${window.location.origin}/editor/${projectId}`
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
    inviteEmail,
    inviteEmailValid,
    collaborators,
    copyLabel,
    error,
    setOpen,
    setInviteEmail,
    refresh,
    invite,
    remove,
    copyLink,
  }
}
