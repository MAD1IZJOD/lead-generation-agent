import type { CrawledPage, CompanyProfile } from "./types";

/**
 * Extract the page title from HTML.
 */
export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract the meta description from HTML.
 */
export function extractMetaDescription(html: string): string | null {
  const match = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
  );
  return match ? match[1].trim() : null;
}

/**
 * Extract the first h1 heading from HTML.
 */
export function extractH1(html: string): string | null {
  const match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract email addresses from mailto links and plain text in HTML.
 */
export function extractEmails(html: string): string[] {
  const emails = new Set<string>();

  // From mailto links
  const mailtoMatches = html.match(/mailto:([^"'\s<>&]+)/gi);
  if (mailtoMatches) {
    for (const match of mailtoMatches) {
      const email = match.replace(/mailto:/i, "").trim();
      if (isValidEmail(email)) {
        emails.add(email.toLowerCase());
      }
    }
  }

  // From plain text (simple email pattern)
  const textMatches = html.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  );
  if (textMatches) {
    for (const email of textMatches) {
      if (isValidEmail(email)) {
        emails.add(email.toLowerCase());
      }
    }
  }

  return Array.from(emails);
}

/**
 * Extract phone numbers from tel links and common patterns.
 */
export function extractPhones(html: string): string[] {
  const phones = new Set<string>();

  // From tel links
  const telMatches = html.match(/tel:([^"'\s<>&]+)/gi);
  if (telMatches) {
    for (const match of telMatches) {
      const phone = match.replace(/tel:/i, "").trim();
      if (phone.length > 0) {
        phones.add(phone);
      }
    }
  }

  return Array.from(phones);
}

/**
 * Extract service-related text from headings and list items.
 * Looks for headings containing service-related keywords.
 */
export function extractServices(html: string): string[] {
  const services = new Set<string>();

  // Extract h2, h3 headings
  const headingMatches = html.match(/<h[23][^>]*>([^<]*)<\/h[23]>/gi);
  if (headingMatches) {
    for (const match of headingMatches) {
      const text = match.replace(/<[^>]*>/g, "").trim();
      if (text.length > 0 && text.length < 100) {
        services.add(text);
      }
    }
  }

  // Extract list items that look like services
  const liMatches = html.match(/<li[^>]*>([^<]*)<\/li>/gi);
  if (liMatches) {
    for (const match of liMatches) {
      const text = match.replace(/<[^>]*>/g, "").trim();
      if (text.length > 0 && text.length < 100) {
        services.add(text);
      }
    }
  }

  return Array.from(services).slice(0, 10);
}

/**
 * Extract company name from title or h1, filtering out common non-company words.
 */
export function extractCompanyName(
  html: string,
  url: string
): string | null {
  const title = extractTitle(html);
  const h1 = extractH1(html);

  // Prefer h1, fall back to title
  const candidate = h1 || title;
  if (!candidate) {
    return null;
  }

  const cleaned = candidate
    .replace(/\|.*$/g, "")
    .trim();

  if (cleaned.length > 0 && cleaned.length < 100) {
    return cleaned;
  }

  return null;
}

/**
 * Detect the page type/label from URL and content.
 */
export function detectPageLabel(url: string, html: string): string {
  const urlLower = url.toLowerCase();
  const htmlLower = html.toLowerCase();

  if (urlLower.includes("/about") || htmlLower.includes("about us")) {
    return "about";
  }
  if (urlLower.includes("/contact") || htmlLower.includes("contact us")) {
    return "contact";
  }
  if (urlLower.includes("/services") || htmlLower.includes("our services")) {
    return "services";
  }
  if (urlLower.includes("/products") || htmlLower.includes("our products")) {
    return "products";
  }
  return "home";
}

/**
 * Extract a structured company profile from a crawled page.
 */
export function extractCompanyProfile(
  page: CrawledPage
): Partial<CompanyProfile> {
  const { html, url, domain } = page;
  const label = detectPageLabel(url, html);

  const title = extractTitle(html);
  const metaDescription = extractMetaDescription(html);
  const h1 = extractH1(html);
  const emails = extractEmails(html);
  const phones = extractPhones(html);
  const services = extractServices(html);
  const companyName = extractCompanyName(html, url);

  // Build description from meta description or h1 or first paragraph
  let description: string | null = null;
  if (metaDescription) {
    description = metaDescription;
  } else if (h1) {
    description = h1;
  } else {
    const pMatch = html.match(/<p[^>]*>([^<]*)<\/p>/i);
    if (pMatch) {
      description = pMatch[1].trim();
    }
  }

  // Determine confidence based on what we found
  let confidence = 0.1; // Base confidence for fetching a page
  if (companyName) confidence += 0.2;
  if (description) confidence += 0.2;
  if (emails.length > 0) confidence += 0.2;
  if (services.length > 0) confidence += 0.2;
  if (label === "about" || label === "contact") confidence += 0.1;
  confidence = Math.min(confidence, 1.0);

  return {
    domain,
    companyName,
    description,
    industry: null, // Cannot determine industry from HTML alone without more context
    location: null, // Cannot determine location from HTML alone
    contactEmail: emails.length > 0 ? emails[0] : null,
    phone: phones.length > 0 ? phones[0] : null,
    services,
    sourceUrls: [url],
    fetchedAt: page.fetchedAt,
    confidence,
  };
}

/**
 * Merge multiple company profiles for the same domain into one.
 * Later profiles can fill in missing fields from earlier ones.
 */
export function mergeCompanyProfiles(
  profiles: Partial<CompanyProfile>[]
): CompanyProfile {
  if (profiles.length === 0) {
    throw new Error("Cannot merge empty profiles");
  }

  // Sort by confidence descending, prefer profiles with more complete data
  const sorted = [...profiles].sort((a, b) => b.confidence! - a.confidence!);

  const first = sorted[0];
  const domain = first.domain!;

  // Merge fields: first non-null wins, but prefer higher confidence
  const companyName =
    sorted.find((p) => p.companyName)?.companyName || null;
  const description =
    sorted.find((p) => p.description)?.description || null;
  const industry =
    sorted.find((p) => p.industry)?.industry || null;
  const location =
    sorted.find((p) => p.location)?.location || null;
  const contactEmail =
    sorted.find((p) => p.contactEmail)?.contactEmail || null;
  const phone =
    sorted.find((p) => p.phone)?.phone || null;

  // Merge services (deduplicate)
  const allServices = sorted
    .flatMap((p) => p.services || [])
    .filter((s, i, arr) => arr.indexOf(s) === i);

  // Merge source URLs
  const allSourceUrls = sorted
    .flatMap((p) => p.sourceUrls || [])
    .filter((s, i, arr) => arr.indexOf(s) === i);

  // Max confidence
  const confidence = Math.max(...sorted.map((p) => p.confidence || 0));
  const fetchedAt = new Date().toISOString();

  return {
    domain,
    companyName,
    description,
    industry,
    location,
    contactEmail,
    phone,
    services: allServices,
    sourceUrls: allSourceUrls,
    fetchedAt,
    confidence,
  };
}

/**
 * Validate an email address format.
 */
function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}
