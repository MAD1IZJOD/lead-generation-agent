import { describe, it, expect } from "vitest";
import {
  isEmailSuppressed,
  isDuplicateLead,
  checkPricingFloor,
  checkClaimApproved,
  isDryRunEnabled,
  isAutonomousEnabled,
  isSendLimitReached,
  canFollowUp,
} from "./rules";
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
  target_markets: ["US", "UK"],
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
  paused: false,
  paused_at: null,
  pause_reason: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const baseLead: Lead = {
  id: "lead-1",
  workspace_id: "ws-1",
  email: "existing@example.com",
  name: "Existing User",
  company: "Existing Co",
  title: "CEO",
  linkedin_url: null,
  website: null,
  source: "linkedin",
  raw_data: {},
  qualification_score: 50,
  status: "new",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("isEmailSuppressed", () => {
  it("returns true when email is on suppression list", () => {
    const suppression: { email: string; reason: string }[] = [
      { email: "optedout@example.com", reason: "opt_out" },
    ];
    expect(isEmailSuppressed("optedout@example.com", suppression)).toBe(true);
  });

  it("returns false when email is not on suppression list", () => {
    const suppression: { email: string; reason: string }[] = [
      { email: "optedout@example.com", reason: "opt_out" },
    ];
    expect(isEmailSuppressed("new@example.com", suppression)).toBe(false);
  });

  it("is case insensitive", () => {
    const suppression: { email: string; reason: string }[] = [
      { email: "OptedOut@Example.com", reason: "opt_out" },
    ];
    expect(isEmailSuppressed("optedout@example.com", suppression)).toBe(true);
  });

  it("trims whitespace", () => {
    const suppression: { email: string; reason: string }[] = [
      { email: "optedout@example.com", reason: "opt_out" },
    ];
    expect(isEmailSuppressed("  optedout@example.com  ", suppression)).toBe(true);
  });
});

describe("isDuplicateLead", () => {
  it("returns the existing lead when email matches", () => {
    const leads: Lead[] = [baseLead];
    const result = isDuplicateLead("existing@example.com", leads);
    expect(result).toEqual(baseLead);
  });

  it("returns null when email does not match", () => {
    const leads: Lead[] = [baseLead];
    const result = isDuplicateLead("new@example.com", leads);
    expect(result).toBeNull();
  });

  it("is case insensitive", () => {
    const leads: Lead[] = [baseLead];
    const result = isDuplicateLead("EXISTING@EXAMPLE.COM", leads);
    expect(result).toEqual(baseLead);
  });

  it("returns null for empty leads list", () => {
    const result = isDuplicateLead("any@example.com", []);
    expect(result).toBeNull();
  });
});

describe("checkPricingFloor", () => {
  it("allows price at or above minimum", () => {
    const result = checkPricingFloor(800, baseWorkspace);
    expect(result.allowed).toBe(true);
  });

  it("allows price above minimum", () => {
    const result = checkPricingFloor(1500, baseWorkspace);
    expect(result.allowed).toBe(true);
  });

  it("rejects price below minimum", () => {
    const result = checkPricingFloor(500, baseWorkspace);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("below the minimum project price");
  });

  it("includes currency in rejection reason", () => {
    const result = checkPricingFloor(500, baseWorkspace);
    expect(result.reason).toContain("USD");
  });
});

describe("checkClaimApproved", () => {
  it("approves claims in the approved list", () => {
    const result = checkClaimApproved("We build websites starting at $800", baseWorkspace);
    expect(result.approved).toBe(true);
  });

  it("rejects claims not in the approved list", () => {
    const result = checkClaimApproved("Guaranteed #1 Google ranking", baseWorkspace);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain("not in the approved claims list");
  });

  it("is case insensitive", () => {
    const result = checkClaimApproved("WE BUILD WEBSITES STARTING AT $800", baseWorkspace);
    expect(result.approved).toBe(true);
  });

  it("trims whitespace", () => {
    const result = checkClaimApproved("  We build websites starting at $800  ", baseWorkspace);
    expect(result.approved).toBe(true);
  });
});

describe("isDryRunEnabled", () => {
  it("returns true when dry_run is true", () => {
    expect(isDryRunEnabled(baseWorkspace)).toBe(true);
  });

  it("returns false when dry_run is false", () => {
    const ws: Workspace = { ...baseWorkspace, outreach_rules: { ...baseWorkspace.outreach_rules, dry_run: false } };
    expect(isDryRunEnabled(ws)).toBe(false);
  });
});

describe("isAutonomousEnabled", () => {
  it("returns false when autonomous is false", () => {
    expect(isAutonomousEnabled(baseWorkspace)).toBe(false);
  });

  it("returns true when autonomous is true", () => {
    const ws: Workspace = { ...baseWorkspace, outreach_rules: { ...baseWorkspace.outreach_rules, autonomous: true } };
    expect(isAutonomousEnabled(ws)).toBe(true);
  });
});

describe("isSendLimitReached", () => {
  it("returns false when under limit", () => {
    expect(isSendLimitReached(10, baseWorkspace)).toBe(false);
  });

  it("returns true when at limit", () => {
    expect(isSendLimitReached(50, baseWorkspace)).toBe(true);
  });

  it("returns true when over limit", () => {
    expect(isSendLimitReached(51, baseWorkspace)).toBe(true);
  });
});

describe("canFollowUp", () => {
  it("allows follow-up when under limit and enough days passed", () => {
    expect(canFollowUp(1, 10, baseWorkspace)).toBe(true);
  });

  it("rejects follow-up when limit reached", () => {
    expect(canFollowUp(3, 10, baseWorkspace)).toBe(false);
  });

  it("rejects follow-up when not enough days passed", () => {
    expect(canFollowUp(1, 3, baseWorkspace)).toBe(false);
  });

  it("allows follow-up when exactly at days_between threshold", () => {
    expect(canFollowUp(1, 7, baseWorkspace)).toBe(true);
  });
});
