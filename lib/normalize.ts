// Small helpers to turn messy provider payloads into clean CRM fields.

const FREE_EMAIL = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

// Pick the first non-empty value from a list of possible keys.
export function pick(
  obj: Record<string, unknown> | undefined | null,
  ...keys: string[]
): string | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

export function domainFromEmail(email?: string): string | undefined {
  if (!email || !email.includes("@")) return undefined;
  const d = email.split("@")[1]?.toLowerCase().trim();
  if (!d || FREE_EMAIL.has(d)) return undefined;
  return d;
}

// Split "Jane Doe" into first/last; leave alone if already provided.
export function splitName(
  full?: string,
  first?: string,
  last?: string
): { first_name?: string; last_name?: string; full_name?: string } {
  if (first || last) {
    return {
      first_name: first,
      last_name: last,
      full_name: full || [first, last].filter(Boolean).join(" ") || undefined,
    };
  }
  if (!full) return {};
  const parts = full.trim().split(/\s+/);
  return {
    first_name: parts[0],
    last_name: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
    full_name: full.trim(),
  };
}

export function cleanDomain(d?: string): string | undefined {
  if (!d) return undefined;
  return d
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .toLowerCase()
    .trim();
}
