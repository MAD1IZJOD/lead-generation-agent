import type { CrawledPage, DiscoveryConfig } from "./types";
import { extractDomain, isAllowedByRobotsTxt, normalizeUrl } from "./url-utils";

/**
 * Fetch a single page with timeout and retry logic.
 * Returns the page HTML and HTTP status, or throws on failure.
 */
async function fetchPageWithRetry(
  url: string,
  config: DiscoveryConfig
): Promise<{ html: string; status: number }> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.requestTimeoutMs);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": config.userAgent,
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return { html, status: response.status };
    } catch (err) {
      lastError = err;

      // Don't retry on abort (timeout) - it's a permanent failure for this page
      if (err instanceof Error && err.name === "AbortError") {
        break;
      }

      if (attempt < config.maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, config.retryDelayMs * (attempt + 1))
        );
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}

/**
 * Fetch robots.txt from a domain root.
 * Returns null if robots.txt cannot be fetched.
 */
async function fetchRobotsTxt(
  domain: string,
  config: DiscoveryConfig
): Promise<string | null> {
  const robotsUrl = `https://${domain}/robots.txt`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    const response = await fetch(robotsUrl, {
      method: "GET",
      headers: { "User-Agent": config.userAgent },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Rate limiter: ensures minimum delay between requests.
 */
class RateLimiter {
  private lastRequestTime = 0;

  constructor(private delayMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.delayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.delayMs - elapsed)
      );
    }
    this.lastRequestTime = Date.now();
  }
}

/**
 * Fetch multiple pages from a list of URLs with rate limiting,
 * robots.txt checking, and per-domain limits.
 *
 * Returns crawled pages and any errors encountered.
 */
export async function crawlPages(
  urls: string[],
  config: DiscoveryConfig
): Promise<{
  pages: CrawledPage[];
  errors: Array<{ url: string; error: string }>;
  robotsCache: Map<string, string | null>;
}> {
  const pages: CrawledPage[] = [];
  const errors: Array<{ url: string; error: string }> = [];
  const robotsCache = new Map<string, string | null>();
  const rateLimiter = new RateLimiter(config.rateLimitDelayMs);
  const domainCount = new Map<string, number>();

  for (const url of urls) {
    const normalized = normalizeUrl(url);
    const domain = extractDomain(normalized);

    if (!domain) {
      errors.push({ url, error: "Invalid domain" });
      continue;
    }

    // Check per-domain limit
    const count = domainCount.get(domain) || 0;
    if (count >= config.maxPagesPerDomain) {
      errors.push({
        url,
        error: `Max pages per domain (${config.maxPagesPerDomain}) reached`,
      });
      continue;
    }

    // Check total limit
    if (pages.length + errors.length >= config.maxTotalPages) {
      errors.push({
        url,
        error: "Max total pages reached",
      });
      continue;
    }

    // Check robots.txt
    if (config.respectRobotsTxt) {
      let robotsTxt = robotsCache.get(domain);
      if (robotsTxt === undefined) {
        robotsTxt = await fetchRobotsTxt(domain, config);
        robotsCache.set(domain, robotsTxt);
      }

      const urlObj = new URL(normalized);
      if (!isAllowedByRobotsTxt(robotsTxt, urlObj.pathname, config.userAgent)) {
        errors.push({ url, error: "Blocked by robots.txt" });
        continue;
      }
    }

    // Rate limit
    await rateLimiter.wait();

    try {
      const { html, status } = await fetchPageWithRetry(normalized, config);
      domainCount.set(domain, count + 1);

      pages.push({
        url: normalized,
        domain,
        label: "",
        html,
        status,
        fetchedAt: new Date().toISOString(),
        fetchedFrom: "live",
      });
    } catch (err) {
      errors.push({
        url,
        error: err instanceof Error ? err.message : "Unknown fetch error",
      });
    }
  }

  return { pages, errors, robotsCache };
}
