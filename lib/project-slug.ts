/** Allowed while typing: lowercase letters, digits, hyphen only. */
export function sanitizeSlugKeystrokes(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** Canonical slug for preview / persistence (trim, strip invalid chars, collapse hyphens, trim edges). */
export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Non-empty slug: one or more alphanumeric segments separated by single hyphens (no leading/trailing `-`). */
export function isValidProjectSlug(raw: string): boolean {
  const s = normalizeSlug(raw);
  return s.length > 0 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

/** Normalized slug or placeholder when input is empty (UI fallback only). */
export function slugFromProjectName(name: string): string {
  const s = normalizeSlug(name);
  return s.length > 0 ? s : "project";
}
