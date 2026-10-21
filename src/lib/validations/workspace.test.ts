import { describe, it, expect } from "vitest";
import {
  WorkspaceSettingsSchema,
  WorkspaceCompanyProfileSchema,
  WorkspaceServiceSchema,
  WorkspacePricingSchema,
  WorkspaceICPSchema,
  WorkspaceBrandVoiceSchema,
  WorkspaceOutreachRulesSchema,
} from "./workspace";

describe("WorkspaceCompanyProfileSchema", () => {
  it("accepts valid company profile", () => {
    const result = WorkspaceCompanyProfileSchema.safeParse({
      company_name: "Orcades",
      website: "https://orcades.vercel.app",
      contact_email: "hello@orcades.vercel.app",
      description: "Professional websites starting at $800",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing company name", () => {
    const result = WorkspaceCompanyProfileSchema.safeParse({
      company_name: "",
      website: "https://example.com",
      contact_email: "hello@example.com",
      description: "A company",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("company_name"))).toBe(true);
    }
  });

  it("rejects invalid URL", () => {
    const result = WorkspaceCompanyProfileSchema.safeParse({
      company_name: "Test",
      website: "not-a-url",
      contact_email: "hello@example.com",
      description: "A company",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = WorkspaceCompanyProfileSchema.safeParse({
      company_name: "Test",
      website: "https://example.com",
      contact_email: "not-an-email",
      description: "A company",
    });
    expect(result.success).toBe(false);
  });
});

describe("WorkspaceServiceSchema", () => {
  it("accepts valid service", () => {
    const result = WorkspaceServiceSchema.safeParse({
      name: "Professional Websites",
      description: "Custom websites for businesses",
      starting_price_usd: 800,
      currency: "usd",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero or negative price", () => {
    const result = WorkspaceServiceSchema.safeParse({
      name: "Test",
      description: "Test",
      starting_price_usd: 0,
      currency: "usd",
    });
    expect(result.success).toBe(false);
  });
});

describe("WorkspacePricingSchema", () => {
  it("accepts valid pricing", () => {
    const result = WorkspacePricingSchema.safeParse({
      minimum_project_usd: 800,
      currency: "usd",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative minimum price", () => {
    const result = WorkspacePricingSchema.safeParse({
      minimum_project_usd: -100,
      currency: "usd",
    });
    expect(result.success).toBe(false);
  });
});

describe("WorkspaceICPSchema", () => {
  it("accepts valid ICP", () => {
    const result = WorkspaceICPSchema.safeParse({
      industries: ["Technology"],
      company_sizes: ["1-10"],
      job_titles: ["CEO"],
      pain_points: ["outdated website"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty industries", () => {
    const result = WorkspaceICPSchema.safeParse({
      industries: [],
      company_sizes: ["1-10"],
      job_titles: ["CEO"],
      pain_points: ["outdated website"],
    });
    expect(result.success).toBe(false);
  });
});

describe("WorkspaceBrandVoiceSchema", () => {
  it("accepts valid brand voice", () => {
    const result = WorkspaceBrandVoiceSchema.safeParse({
      tone: "professional",
      formality: "professional",
      do_not_claim: ["guaranteed results"],
    });
    expect(result.success).toBe(true);
  });

  it("defaults do_not_claim to empty array", () => {
    const result = WorkspaceBrandVoiceSchema.safeParse({
      tone: "casual",
      formality: "casual",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.do_not_claim).toEqual([]);
    }
  });
});

describe("WorkspaceOutreachRulesSchema", () => {
  it("accepts valid outreach rules", () => {
    const result = WorkspaceOutreachRulesSchema.safeParse({
      max_emails_per_day: 50,
      follow_up_limit: 3,
      days_between_follow_ups: 7,
      dry_run: true,
      autonomous: false,
    });
    expect(result.success).toBe(true);
  });

  it("defaults dry_run to true", () => {
    const result = WorkspaceOutreachRulesSchema.safeParse({
      max_emails_per_day: 50,
      follow_up_limit: 3,
      days_between_follow_ups: 7,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dry_run).toBe(true);
    }
  });

  it("defaults autonomous to false", () => {
    const result = WorkspaceOutreachRulesSchema.safeParse({
      max_emails_per_day: 50,
      follow_up_limit: 3,
      days_between_follow_ups: 7,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.autonomous).toBe(false);
    }
  });

  it("rejects zero max emails per day", () => {
    const result = WorkspaceOutreachRulesSchema.safeParse({
      max_emails_per_day: 0,
      follow_up_limit: 3,
      days_between_follow_ups: 7,
    });
    expect(result.success).toBe(false);
  });
});

describe("WorkspaceSettingsSchema", () => {
  const validSettings = {
    name: "Orcades",
    slug: "orcades",
    company_profile: {
      company_name: "Orcades",
      website: "https://orcades.vercel.app",
      contact_email: "hello@orcades.vercel.app",
      description: "Professional websites starting at $800",
    },
    services: [
      {
        name: "Professional Websites",
        description: "Custom websites for businesses",
        starting_price_usd: 800,
        currency: "usd",
      },
    ],
    pricing: { minimum_project_usd: 800, currency: "usd" },
    target_markets: ["US", "UK", "Canada"],
    icp: {
      industries: ["Technology"],
      company_sizes: ["1-10"],
      job_titles: ["CEO"],
      pain_points: ["outdated website"],
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
  };

  it("accepts valid workspace settings", () => {
    const result = WorkspaceSettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it("rejects empty workspace name", () => {
    const result = WorkspaceSettingsSchema.safeParse({
      ...validSettings,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug format", () => {
    const result = WorkspaceSettingsSchema.safeParse({
      ...validSettings,
      slug: "Invalid Slug!",
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one service", () => {
    const result = WorkspaceSettingsSchema.safeParse({
      ...validSettings,
      services: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one target market", () => {
    const result = WorkspaceSettingsSchema.safeParse({
      ...validSettings,
      target_markets: [],
    });
    expect(result.success).toBe(false);
  });
});
