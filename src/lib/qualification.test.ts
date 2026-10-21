import { describe, it, expect } from "vitest";
import { qualifyLead, formatScoreBreakdown, type QualificationResult } from "./qualification";
import type { Lead, Workspace } from "./database.types";

const baseWorkspace: Workspace = {
  id: "ws-1",
  name: "Test Workspace",
  slug: "test-workspace",
  company_profile: {
    company_name: "Test Co",
    website: "https://test.co",
    contact_email: "test@test.co",
    description: "A test company",
  },
  services: [
    {
      name: "Websites",
      description: "Professional websites",
      starting_price_usd: 800,
      currency: "usd",
    },
  ],
  pricing: { minimum_project_usd: 800, currency: "usd" },
  target_markets: ["US", "UK", "Canada"],
  icp: {
    industries: ["Technology", "Retail"],
    company_sizes: ["1-10", "11-50"],
    job_titles: ["CEO", "Founder", "CTO"],
    pain_points: ["outdated website", "low conversion"],
  },
  approved_claims: ["We build websites starting at $800"],
  brand_voice: {
    tone: "professional",
    formality: "professional",
    do_not_claim: ["guaranteed results"],
  },
  outreach_rules: {
    max_emails_per_day: 50,
    follow_up_limit: 3,
    days_between_follow_ups: 7,
    dry_run: true,
    autonomous: false,
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const baseLead: Lead = {
  id: "lead-1",
  workspace_id: "ws-1",
  email: "test@example.com",
  name: "Test User",
  company: "Test Company",
  title: "CEO",
  linkedin_url: null,
  website: "https://testcompany.com",
  source: "linkedin",
  raw_data: { industry: "Technology", country: "US" },
  qualification_score: 0,
  status: "new",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("qualifyLead", () => {
  it("scores a high-quality lead with all fields", () => {
    const result = qualifyLead(baseLead, baseWorkspace);
    expect(result.totalScore).toBeGreaterThanOrEqual(75);
    expect(result.tier).toBe("hot");
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it("scores lower when email is missing", () => {
    const leadWithoutEmail: Lead = { ...baseLead, email: "" };
    const result = qualifyLead(leadWithoutEmail, baseWorkspace);
    const emailFactor = result.breakdown.find((f) => f.name === "Has contact email");
    expect(emailFactor?.score).toBe(0);
  });

  it("scores lower when company is missing", () => {
    const leadWithoutCompany: Lead = { ...baseLead, company: null };
    const result = qualifyLead(leadWithoutCompany, baseWorkspace);
    const companyFactor = result.breakdown.find((f) => f.name === "Has company information");
    expect(companyFactor?.score).toBe(0);
  });

  it("gives cold tier for leads missing key fields", () => {
    const poorLead: Lead = {
      ...baseLead,
      email: "",
      company: null,
      title: null,
      website: null,
      raw_data: {},
    };
    const result = qualifyLead(poorLead, baseWorkspace);
    expect(result.tier).toBe("cold");
    expect(result.totalScore).toBeLessThan(50);
  });

  it("matches ICP industry when raw_data industry matches", () => {
    const result = qualifyLead(baseLead, baseWorkspace);
    const industryFactor = result.breakdown.find((f) => f.name === "ICP industry match");
    expect(industryFactor?.score).toBe(100);
  });

  it("does not match ICP industry when raw_data is empty", () => {
    const leadNoIndustry: Lead = { ...baseLead, raw_data: {} };
    const result = qualifyLead(leadNoIndustry, baseWorkspace);
    const industryFactor = result.breakdown.find((f) => f.name === "ICP industry match");
    expect(industryFactor?.score).toBe(40);
  });

  it("matches ICP job title when lead title matches", () => {
    const result = qualifyLead(baseLead, baseWorkspace);
    const titleFactor = result.breakdown.find((f) => f.name === "ICP job title match");
    expect(titleFactor?.score).toBe(100);
  });

  it("returns warm tier for medium-quality leads", () => {
    const mediumLead: Lead = {
      ...baseLead,
      website: null,
      raw_data: { industry: "Unknown", country: "Unknown" },
    };
    const result = qualifyLead(mediumLead, baseWorkspace);
    expect(result.tier).toBe("warm");
  });
});

describe("formatScoreBreakdown", () => {
  it("returns a formatted string with score and breakdown", () => {
    const result: QualificationResult = {
      totalScore: 85,
      tier: "hot",
      breakdown: [
        {
          name: "Has contact email",
          score: 100,
          weight: 0.25,
          reason: "Email address is available for outreach",
        },
      ],
    };
    const output = formatScoreBreakdown(result);
    expect(output).toContain("85/100");
    expect(output).toContain("hot");
    expect(output).toContain("Has contact email");
  });
});
