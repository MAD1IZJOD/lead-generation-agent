import { describe, it, expect } from "vitest";
import {
  deduplicateCompanies,
  isDuplicateDomain,
  filterDuplicates,
  profileToLeadRawData,
} from "./deduplicator";
import type { CompanyProfile } from "./types";

function makeProfile(
  domain: string,
  companyName: string | null = null,
  confidence: number = 0.5
): CompanyProfile {
  return {
    domain,
    companyName,
    description: null,
    industry: null,
    location: null,
    contactEmail: null,
    phone: null,
    services: [],
    sourceUrls: [`https://${domain}`],
    fetchedAt: "2026-01-01T00:00:00Z",
    confidence,
  };
}

describe("deduplicateCompanies", () => {
  it("keeps unique domains unchanged", () => {
    const profiles = [
      makeProfile("example.com", "Example Co"),
      makeProfile("other.com", "Other Co"),
    ];

    const result = deduplicateCompanies(profiles);
    expect(result.merged).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it("merges multiple pages from same domain", () => {
    const profiles = [
      makeProfile("example.com", "Example Co", 0.5),
      makeProfile("example.com", null, 0.8),
    ];

    const result = deduplicateCompanies(profiles);
    expect(result.merged).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.merged[0].companyName).toBe("Example Co");
    expect(result.merged[0].confidence).toBe(0.8);
  });

  it("tracks domain counts", () => {
    const profiles = [
      makeProfile("example.com", "Example Co"),
      makeProfile("example.com", null),
      makeProfile("other.com", "Other Co"),
    ];

    const result = deduplicateCompanies(profiles);
    expect(result.domainCounts.get("example.com")).toBe(2);
    expect(result.domainCounts.get("other.com")).toBe(1);
  });
});

describe("isDuplicateDomain", () => {
  it("returns true for duplicate domain", () => {
    const existing = [makeProfile("example.com", "Example Co")];
    expect(isDuplicateDomain("EXAMPLE.COM", existing)).toBe(true);
    expect(isDuplicateDomain("www.example.com", existing)).toBe(true);
  });

  it("returns false for unique domain", () => {
    const existing = [makeProfile("example.com", "Example Co")];
    expect(isDuplicateDomain("other.com", existing)).toBe(false);
  });
});

describe("filterDuplicates", () => {
  it("separates new from duplicate profiles", () => {
    const existing = [makeProfile("example.com", "Example Co")];
    const profiles = [
      makeProfile("example.com", "Duplicate Co"),
      makeProfile("new.com", "New Co"),
    ];

    const result = filterDuplicates(profiles, existing);
    expect(result.newProfiles).toHaveLength(1);
    expect(result.newProfiles[0].domain).toBe("new.com");
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].domain).toBe("example.com");
  });
});

describe("profileToLeadRawData", () => {
  it("maps profile fields to lead raw_data", () => {
    const profile: CompanyProfile = {
      domain: "example.com",
      companyName: "Acme Corp",
      description: "A tech company",
      industry: "Technology",
      location: "US",
      contactEmail: "info@example.com",
      phone: null,
      services: ["Web Design"],
      sourceUrls: ["https://example.com"],
      fetchedAt: "2026-01-01T00:00:00Z",
      confidence: 0.8,
    };

    const rawData = profileToLeadRawData(profile);
    expect(rawData.industry).toBe("Technology");
    expect(rawData.country).toBe("US");
    expect(rawData.company_name).toBe("Acme Corp");
    expect(rawData.email).toBe("info@example.com");
  });

  it("omits null fields", () => {
    const profile: CompanyProfile = {
      domain: "example.com",
      companyName: null,
      description: null,
      industry: null,
      location: null,
      contactEmail: null,
      phone: null,
      services: [],
      sourceUrls: [],
      fetchedAt: "2026-01-01T00:00:00Z",
      confidence: 0.1,
    };

    const rawData = profileToLeadRawData(profile);
    expect(rawData.industry).toBeUndefined();
    expect(rawData.country).toBeUndefined();
    expect(rawData.company_name).toBeUndefined();
    expect(rawData.email).toBeUndefined();
  });
});
