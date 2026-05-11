import { NextResponse } from "next/server"

export interface ApiErrorPayload {
  error: string
  code: string
  detail?: string
  issues?: unknown
}

export interface ApiErrorInput {
  status: number
  code: string
  error: string
  detail?: string
  issues?: unknown
  headers?: HeadersInit
}

export function jsonError(input: ApiErrorInput) {
  const { status, headers, ...payload } = input
  return NextResponse.json(payload satisfies ApiErrorPayload, { status, headers })
}

export function jsonOk<T>(
  data: T,
  init?: {
    status?: number
    headers?: HeadersInit
  },
) {
  return NextResponse.json(data, {
    status: init?.status,
    headers: init?.headers,
  })
}

export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
} as const

export function devDetail(error: unknown) {
  if (process.env.NODE_ENV !== "development") return undefined
  return error instanceof Error ? error.message : "Unknown error"
}

