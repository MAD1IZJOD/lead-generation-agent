import { describe, it, expect } from "vitest";
import {
  normalizeSeedUrls,
  extractDomain,
  isValidHttpUrl,
  normalizeUrl,
  isValidDomain,
  normalizeDomain,
  isAllowedByRobotsTxt,
} from "./url-utils";

describe("normalizeUrl", () => {
  it("strips protocol and trailing slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("example.com");
  });

  it("strips www prefix", () => {
    expect(normalizeUrl("https://www.example.com/about")).toBe(
      "example.com/about"
    );
  });

  it("removes query strings and fragments", () => {
    expect(
      normalizeUrl("https://example.com/page?foo=bar#section")
    ).toBe("example.com/page");
  });

  it("handles URLs without path", () => {
    expect(normalizeUrl("https://example.com")).toBe("example.com");
  });
});

describe("extractDomain", () => {
  it("extracts hostname from URL", () => {
    expect(extractDomain("https://www.example.com/about")).toBe(
      "example.com"
    );
  });

  it("returns null for invalid URLs", () => {
    expect(extractDomain("not-a-url")).toBeNull();
  });
});

describe("isValidHttpUrl", () => {
  it("accepts http URLs", () => {
    expect(isValidHttpUrl("http://example.com")).toBe(true);
  });

  it("accepts https URLs", () => {
    expect(isValidHttpUrl("https://example.com")).toBe(true);
  });

  it("rejects ftp URLs", () => {
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isValidHttpUrl("not-a-url")).toBe(false);
  });
});

describe("normalizeSeedUrls", () => {
  it("accepts valid URLs", () => {
    const { valid, invalid } = normalizeSeedUrls([
      { url: "https://example.com" },
      { url: "https://example.com/about" },
    ]);
    expect(valid.length).toBe(2);
    expect(invalid.length).toBe(0);
  });

  it("rejects empty URLs", () => {
    const { valid, invalid } = normalizeSeedUrls([
      { url: "" },
      { url: "   " },
    ]);
    expect(valid.length).toBe(0);
    expect(invalid.length).toBe(2);
  });

  it("rejects non-http URLs", () => {
    const { valid, invalid } = normalizeSeedUrls([
      { url: "ftp://example.com" },
    ]);
    expect(valid.length).toBe(0);
    expect(invalid.length).toBe(1);
    expect(invalid[0].reason).toContain("http");
  });

  it("deduplicates by normalized URL", () => {
    const { valid } = normalizeSeedUrls([
      { url: "https://example.com" },
      { url: "https://www.example.com/" },
      { url: "https://EXAMPLE.COM" },
    ]);
    expect(valid.length).toBe(1);
  });

  it("preserves labels", () => {
    const { valid } = normalizeSeedUrls([
      { url: "https://example.com/about", label: "about" },
    ]);
    expect(valid[0].label).toBe("about");
  });
});

describe("isValidDomain", () => {
  it("accepts valid domains", () => {
    expect(isValidDomain("example.com")).toBe(true);
  });

  it("rejects empty domains", () => {
    expect(isValidDomain("")).toBe(false);
  });

  it("rejects domains without dots", () => {
    expect(isValidDomain("localhost")).toBe(false);
  });
});

describe("normalizeDomain", () => {
  it("strips www prefix", () => {
    expect(normalizeDomain("www.example.com")).toBe("example.com");
  });

  it("converts to lowercase", () => {
    expect(normalizeDomain("EXAMPLE.COM")).toBe("example.com");
  });
});

describe("isAllowedByRobotsTxt", () => {
  it("allows all when no robots.txt", () => {
    expect(
      isAllowedByRobotsTxt(null, "/anything", "*")
    ).toBe(true);
  });

  it("allows paths not in disallow list", () => {
    expect(
      isAllowedByRobotsTxt("User-agent: *\nDisallow: /private", "/public", "*")
    ).toBe(true);
  });

  it("disallows paths in disallow list", () => {
    expect(
      isAllowedByRobotsTxt("User-agent: *\nDisallow: /private", "/private", "*")
    ).toBe(false);
  });

  it("allows paths that match allow rules", () => {
    expect(
      isAllowedByRobotsTxt(
        "User-agent: *\nDisallow: /\nAllow: /public",
        "/public/page",
        "*"
      )
    ).toBe(true);
  });
});
