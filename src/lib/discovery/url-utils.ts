import type { NormalizedDomain, SeedUrl } from "./types";

/**
 * Normalize a URL for consistent comparison and deduplication.
 * Strips protocol, www prefix, trailing slashes, query strings, and fragments.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname.toLowerCase();

    // Strip www prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }

    const pathname = parsed.pathname.endsWith("/")
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname;

    return `${hostname}${pathname}`;
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Extract the normalized domain from a URL.
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname.toLowerCase();

    // Strip www prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }

    return hostname;
  } catch {
    return null;
  }
}

/**
 * Validate that a URL is absolute and uses http or https.
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Normalize and validate a list of seed URLs.
 * Returns valid seeds and invalid entries with reasons.
 */
export function normalizeSeedUrls(seedUrls: SeedUrl[]): {
  valid: SeedUrl[];
  invalid: Array<{ url: string; reason: string }>;
} {
  const valid: SeedUrl[] = [];
  const invalid: Array<{ url: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const seed of seedUrls) {
    if (!seed.url || seed.url.trim() === "") {
      invalid.push({ url: seed.url, reason: "Empty URL" });
      continue;
    }

    if (!isValidHttpUrl(seed.url)) {
      invalid.push({
        url: seed.url,
        reason: "URL must be absolute and use http or https",
      });
      continue;
    }

    const normalized = normalizeUrl(seed.url);
    if (seen.has(normalized)) {
      continue; // Skip duplicates
    }
    seen.add(normalized);

    valid.push({ ...seed, url: normalized });
  }

  return { valid, invalid };
}

/**
 * Normalize a domain for consistent comparison.
 * Strips www prefix and converts to lowercase.
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "");
}

/**
 * Check if a domain is valid (non-empty, contains at least one dot).
 */
export function isValidDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  return normalized.length > 0 && normalized.includes(".");
}

/**
 * Parse robots.txt content and check if a URL path is allowed for the given user agent.
 * Simple implementation: looks for Disallow rules matching the path.
 */
export function isAllowedByRobotsTxt(
  robotsTxt: string | null,
  urlPath: string,
  userAgent: string
): boolean {
  if (!robotsTxt) {
    return true; // No robots.txt means allow all
  }

  const lines = robotsTxt.split("\n");
  let currentAgent = "*";
  let disallowedPaths: string[] = [];
  let allowedPaths: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();

    if (trimmed.startsWith("user-agent:")) {
      const agent = trimmed.split(":", 2)[1]?.trim() || "*";
      // If we've already found rules for our specific agent, stop
      if (currentAgent === userAgent.toLowerCase() && agent !== "*") {
        break;
      }
      currentAgent = agent;
      disallowedPaths = [];
      allowedPaths = [];
    } else if (trimmed.startsWith("disallow:")) {
      const path = trimmed.split(":", 2)[1]?.trim();
      if (path && currentAgent === userAgent.toLowerCase()) {
        disallowedPaths.push(path);
      }
    } else if (trimmed.startsWith("allow:")) {
      const path = trimmed.split(":", 2)[1]?.trim();
      if (path && currentAgent === userAgent.toLowerCase()) {
        allowedPaths.push(path);
      }
    }
  }

  // Check allowed paths first (more specific)
  for (const allowed of allowedPaths) {
    if (urlPath.startsWith(allowed)) {
      return true;
    }
  }

  // Check disallowed paths
  for (const disallowed of disallowedPaths) {
    if (urlPath.startsWith(disallowed)) {
      return false;
    }
  }

  return true;
}
