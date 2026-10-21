import { describe, it, expect } from "vitest";
import {
  extractTitle,
  extractMetaDescription,
  extractH1,
  extractEmails,
  extractPhones,
  extractServices,
  extractCompanyName,
  detectPageLabel,
  extractCompanyProfile,
  mergeCompanyProfiles,
} from "./page-parser";
import type { CrawledPage } from "./types";

describe("extractTitle", () => {
  it("extracts title from HTML", () => {
    expect(extractTitle("<title>Acme Corp</title>")).toBe("Acme Corp");
  });

  it("returns null for missing title", () => {
    expect(extractTitle("<html><body></body></html>")).toBeNull();
  });
});

describe("extractMetaDescription", () => {
  it("extracts meta description", () => {
    const html = '<meta name="description" content="A great company">';
    expect(extractMetaDescription(html)).toBe("A great company");
  });

  it("returns null for missing meta description", () => {
    expect(extractMetaDescription("<html></html>")).toBeNull();
  });
});

describe("extractH1", () => {
  it("extracts h1 heading", () => {
    expect(extractHTML("<h1>Welcome to Acme</h1>")).toBe("Welcome to Acme");
  });

  it("returns null for missing h1", () => {
    expect(extractHTML("<h2>Subheading</h2>")).toBeNull();
  });
});

function extractHTML(html: string): string | null {
  return extractH1(html);
}

describe("extractEmails", () => {
  it("extracts emails from mailto links", () => {
    const html = '<a href="mailto:contact@example.com">Contact</a>';
    expect(extractEmails(html)).toContain("contact@example.com");
  });

  it("extracts emails from plain text", () => {
    const html = "Email us at info@example.com today";
    expect(extractEmails(html)).toContain("info@example.com");
  });

  it("returns empty array for no emails", () => {
    expect(extractEmails("<html><body></body></html>")).toEqual([]);
  });

  it("deduplicates emails", () => {
    const html = '<a href="mailto:a@example.com">A</a><a href="mailto:a@example.com">A</a>';
    expect(extractEmails(html)).toHaveLength(1);
  });
});

describe("extractPhones", () => {
  it("extracts phones from tel links", () => {
    const html = '<a href="tel:+1234567890">Call</a>';
    expect(extractPhones(html)).toContain("+1234567890");
  });

  it("returns empty array for no phones", () => {
    expect(extractPhones("<html></html>")).toEqual([]);
  });
});

describe("extractServices", () => {
  it("extracts services from h2 headings", () => {
    const html = "<h2>Web Design</h2><h2>SEO Consulting</h2>";
    const services = extractServices(html);
    expect(services).toContain("Web Design");
    expect(services).toContain("SEO Consulting");
  });

  it("extracts services from list items", () => {
    const html = "<li>Graphic Design</li><li>Copywriting</li>";
    const services = extractServices(html);
    expect(services).toContain("Graphic Design");
    expect(services).toContain("Copywriting");
  });
});

describe("extractCompanyName", () => {
  it("extracts company name from title", () => {
    const html = "<title>Acme Corporation - Home</title>";
    expect(extractCompanyName(html, "https://example.com")).toBe(
      "Acme Corporation"
    );
  });

  it("extracts company name from h1", () => {
    const html = "<h1>Acme Corp</h1>";
    expect(extractCompanyName(html, "https://example.com")).toBe("Acme Corp");
  });

  it("returns null when no title or h1", () => {
    expect(extractCompanyName("<html></html>", "https://example.com")).toBeNull();
  });
});

describe("detectPageLabel", () => {
  it("detects about page from URL", () => {
    expect(detectPageLabel("https://example.com/about", "")).toBe("about");
  });

  it("detects contact page from URL", () => {
    expect(detectPageLabel("https://example.com/contact", "")).toBe("contact");
  });

  it("detects services page from URL", () => {
    expect(detectPageLabel("https://example.com/services", "")).toBe(
      "services"
    );
  });

  it("defaults to home", () => {
    expect(detectPageLabel("https://example.com", "")).toBe("home");
  });
});

describe("extractCompanyProfile", () => {
  it("creates profile from crawled page", () => {
    const page: CrawledPage = {
      url: "https://example.com/about",
      domain: "example.com",
      label: "about",
      html: '<title>Acme Corp</title><meta name="description" content="A tech company"><h1>Acme Corp</h1><a href="mailto:info@example.com">Email</a><h2>Web Design</h2>',
      status: 200,
      fetchedAt: "2026-01-01T00:00:00Z",
      fetchedFrom: "live",
    };

    const profile = extractCompanyProfile(page);
    expect(profile.domain).toBe("example.com");
    expect(profile.companyName).toBe("Acme Corp");
    expect(profile.description).toBe("A tech company");
    expect(profile.contactEmail).toBe("info@example.com");
    expect(profile.services).toContain("Web Design");
    expect(profile.confidence).toBeGreaterThan(0);
    expect(profile.sourceUrls).toContain("https://example.com/about");
  });
});

describe("mergeCompanyProfiles", () => {
  it("merges multiple profiles into one", () => {
    const profiles = [
      {
        domain: "example.com",
        companyName: "Acme Corp",
        description: null,
        industry: null,
        location: null,
        contactEmail: null,
        phone: null,
        services: ["Web Design"],
        sourceUrls: ["https://example.com/about"],
        fetchedAt: "2026-01-01T00:00:00Z",
        confidence: 0.5,
      },
      {
        domain: "example.com",
        companyName: null,
        description: "A tech company",
        industry: null,
        location: null,
        contactEmail: "info@example.com",
        phone: null,
        services: ["SEO"],
        sourceUrls: ["https://example.com/contact"],
        fetchedAt: "2026-01-01T00:00:00Z",
        confidence: 0.7,
      },
    ];

    const merged = mergeCompanyProfiles(profiles);
    expect(merged.domain).toBe("example.com");
    expect(merged.companyName).toBe("Acme Corp");
    expect(merged.description).toBe("A tech company");
    expect(merged.contactEmail).toBe("info@example.com");
    expect(merged.services).toContain("Web Design");
    expect(merged.services).toContain("SEO");
    expect(merged.sourceUrls).toHaveLength(2);
    expect(merged.confidence).toBe(0.7);
  });
});
