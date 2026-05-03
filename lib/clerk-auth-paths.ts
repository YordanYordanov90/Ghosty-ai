/**
 * Resolves Clerk-hosted auth URL paths from env (supports absolute URLs or pathnames).
 * Falls back to Clerk defaults when unset.
 */
export function normalizeClerkAuthPath(
  envValue: string | undefined,
  fallback: string,
): string {
  const safeFallback = fallback.startsWith("/") ? fallback : `/${fallback}`;
  const raw = envValue?.trim();
  if (!raw) return safeFallback;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const pathname = new URL(raw).pathname;
      return pathname && pathname !== "/" ? pathname : safeFallback;
    } catch {
      return safeFallback;
    }
  }

  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function getClerkAuthPaths(): { signInPath: string; signUpPath: string } {
  return {
    signInPath: normalizeClerkAuthPath(
      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      "/sign-in",
    ),
    signUpPath: normalizeClerkAuthPath(
      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      "/sign-up",
    ),
  };
}

/** Default post-auth destination when force-redirect env vars are unset. */
const DEFAULT_FORCE_REDIRECT_PATH = "/editor";

function normalizeForceRedirectTarget(envValue: string | undefined, fallback: string): string {
  const fb = fallback.startsWith("/") ? fallback : `/${fallback}`;
  const raw = envValue?.trim();
  if (!raw) return fb;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` — always used after sign-in when set.
 * Falls back to `/editor`. Absolute URLs are passed through unchanged.
 */
export function getClerkSignInForceRedirectUrl(): string {
  return normalizeForceRedirectTarget(
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL,
    DEFAULT_FORCE_REDIRECT_PATH,
  );
}

/**
 * `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` — always used after sign-up when set.
 * Falls back to `/editor`. Absolute URLs are passed through unchanged.
 */
export function getClerkSignUpForceRedirectUrl(): string {
  return normalizeForceRedirectTarget(
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL,
    DEFAULT_FORCE_REDIRECT_PATH,
  );
}
