import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { authorizeSend } from "./send-authorization";
import { isDryRunEnabled, isAutonomousEnabled } from "./rules";
import type { Workspace, Lead } from "./database.types";
import type { SuppressionEntry } from "./rules";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockCreateClient = vi.mocked(createClient);

const mockSupabase = {
  from: vi.fn(),
};

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
    follow_up_limit: 2,
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
  email: "test@example.com",
  name: "Test User",
  company: "Test Company",
  title: "CEO",
  linkedin_url: null,
  website: "https://testcompany.com",
  source: "linkedin",
  raw_data: {},
  qualification_score: 0,
  status: "new",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const baseSuppression: SuppressionEntry[] = [];

function setupKillSwitch(enabled: boolean) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { value: { enabled, reason: enabled ? "Emergency stop" : null } },
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  mockSupabase.from.mockReturnValue({ select });
  mockCreateClient.mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

describe("isDryRunEnabled", () => {
  it("returns true when dry_run is true", () => {
    expect(isDryRunEnabled(baseWorkspace)).toBe(true);
  });

  it("returns false when dry_run is false", () => {
    const ws: Workspace = {
      ...baseWorkspace,
      outreach_rules: { ...baseWorkspace.outreach_rules, dry_run: false },
    };
    expect(isDryRunEnabled(ws)).toBe(false);
  });
});

describe("isAutonomousEnabled", () => {
  it("returns false when autonomous is false", () => {
    expect(isAutonomousEnabled(baseWorkspace)).toBe(false);
  });

  it("returns true when autonomous is true", () => {
    const ws: Workspace = {
      ...baseWorkspace,
      outreach_rules: { ...baseWorkspace.outreach_rules, autonomous: true },
    };
    expect(isAutonomousEnabled(ws)).toBe(true);
  });
});

describe("authorizeSend", () => {
  const baseContext = {
    workspace: baseWorkspace,
    lead: baseLead,
    suppressionList: baseSuppression,
    todaysSentCount: 0,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    setupKillSwitch(false);
  });

  it("authorizes a send when all checks pass", async () => {
    const result = await authorizeSend(baseContext);
    expect(result.authorized).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("blocks send when kill switch is active", async () => {
    setupKillSwitch(true);
    const result = await authorizeSend(baseContext);
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe("Global kill switch is active");
    const killSwitchCheck = result.checks.find((c) => c.name === "Global kill switch");
    expect(killSwitchCheck?.passed).toBe(false);
  });

  it("blocks send when workspace is paused", async () => {
    const pausedContext = {
      ...baseContext,
      workspace: { ...baseWorkspace, paused: true, pause_reason: "Compliance review" },
    };
    const result = await authorizeSend(pausedContext);
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe("Workspace is paused");
    const pauseCheck = result.checks.find((c) => c.name === "Workspace pause");
    expect(pauseCheck?.passed).toBe(false);
  });

  it("blocks send when contact is on suppression list", async () => {
    const suppressedContext = {
      ...baseContext,
      suppressionList: [{ email: "test@example.com", reason: "opt_out" }],
    };
    const result = await authorizeSend(suppressedContext);
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe("Contact is on the suppression list");
    const suppressionCheck = result.checks.find((c) => c.name === "Suppression list");
    expect(suppressionCheck?.passed).toBe(false);
  });

  it("blocks send when daily limit reached", async () => {
    const limitContext = {
      ...baseContext,
      todaysSentCount: 50,
    };
    const result = await authorizeSend(limitContext);
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe("Daily send limit reached");
    const limitCheck = result.checks.find((c) => c.name === "Daily send limit");
    expect(limitCheck?.passed).toBe(false);
  });

  it("allows send when under daily limit", async () => {
    const limitContext = {
      ...baseContext,
      todaysSentCount: 10,
    };
    const result = await authorizeSend(limitContext);
    expect(result.authorized).toBe(true);
    const limitCheck = result.checks.find((c) => c.name === "Daily send limit");
    expect(limitCheck?.passed).toBe(true);
  });

  it("returns DRY RUN mode as true by default", async () => {
    const result = await authorizeSend(baseContext);
    expect(result.dryRun).toBe(true);
  });

  it("returns DRY RUN mode as false when workspace has dry_run disabled", async () => {
    const contextNoDryRun = {
      ...baseContext,
      workspace: { ...baseWorkspace, outreach_rules: { ...baseWorkspace.outreach_rules, dry_run: false } },
    };
    const result = await authorizeSend(contextNoDryRun);
    expect(result.dryRun).toBe(false);
  });
});
