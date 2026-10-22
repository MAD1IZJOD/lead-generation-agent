import { describe, it, expect, vi, beforeEach } from "vitest";
import { runDiscovery } from "./workflow";

vi.mock("./page-fetcher", () => ({
  crawlPages: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

import { crawlPages } from "./page-fetcher";
import { getCurrentUser } from "@/lib/auth";

const mockCrawlPages = vi.mocked(crawlPages);
const mockGetCurrentUser = vi.mocked(getCurrentUser);

const mockWorkspace = {
  id: "ws-1",
  name: "Test Workspace",
  slug: "test-workspace",
  company_profile: {
    company_name: "Test Co",
    website: "https://test.co",
    contact_email: "test@test.co",
    description: "A test company",
  },
  services: [{ name: "Websites", description: "Custom sites", starting_price_usd: 800, currency: "usd" }],
  pricing: { minimum_project_usd: 800, currency: "usd" },
  target_markets: ["US", "UK"],
  icp: {
    industries: ["Technology"],
    company_sizes: ["1-10"],
    job_titles: ["CEO", "CTO"],
    pain_points: ["outdated website", "low conversion"],
  },
  approved_claims: [],
  brand_voice: { tone: "professional", formality: "professional", do_not_claim: [] },
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

function makeMockFrom() {
  const mf = {
    select: vi.fn(() => mf),
    insert: vi.fn(() => mf),
    eq: vi.fn(() => mf),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  return mf;
}

function buildSupabaseClient(mockFrom: ReturnType<typeof makeMockFrom>) {
  return {
    from: (_table: string) => mockFrom,
    auth: {
      getUser: vi.fn(),
    },
  };
}

let mockFrom: ReturnType<typeof makeMockFrom>;

describe("runDiscovery", () => {
  beforeEach(() => {
    mockFrom = makeMockFrom();
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("returns error when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await runDiscovery(
      { workspaceId: "ws-1", seedUrls: [{ url: "https://example.com" }] },
      buildSupabaseClient(mockFrom)
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when not a workspace member", async () => {
    mockFrom.single.mockResolvedValueOnce({ data: null, error: new Error("Not found") });

    const result = await runDiscovery(
      { workspaceId: "ws-1", seedUrls: [{ url: "https://example.com" }] },
      buildSupabaseClient(mockFrom)
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not a member of this workspace");
  });

  it("returns error when workspace not found", async () => {
    mockFrom.single
      .mockResolvedValueOnce({ data: { workspace_id: "ws-1", role: "owner" } })
      .mockResolvedValueOnce({ data: null, error: new Error("Not found") });
    const supabase = buildSupabaseClient(mockFrom);

    const result = await runDiscovery(
      { workspaceId: "ws-1", seedUrls: [{ url: "https://example.com" }] },
      supabase
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Workspace not found");
  });

  it("returns error when no valid seed URLs", async () => {
    const mf = makeMockFrom();
    mf.single
      .mockResolvedValueOnce({ data: { workspace_id: "ws-1", role: "owner" } })
      .mockResolvedValueOnce({ data: mockWorkspace, error: null });
    const supabase = buildSupabaseClient(mf);

    const result = await runDiscovery(
      { workspaceId: "ws-1", seedUrls: [{ url: "" }] },
      supabase
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("No valid seed URLs provided");
  });

  it("returns error when no pages fetched", async () => {
    const mf = makeMockFrom();
    mf.single
      .mockResolvedValueOnce({ data: { workspace_id: "ws-1", role: "owner" } })
      .mockResolvedValueOnce({ data: mockWorkspace, error: null });
    mockCrawlPages.mockResolvedValue({
      pages: [],
      errors: [{ url: "https://example.com", error: "Blocked by robots.txt" }],
      robotsCache: new Map(),
    });
    const supabase = buildSupabaseClient(mf);

    const result = await runDiscovery(
      { workspaceId: "ws-1", seedUrls: [{ url: "https://example.com" }] },
      supabase
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("No pages could be fetched");
  });

  it("successfully discovers and creates leads", async () => {
    const mf = makeMockFrom();
    mf.single
      .mockResolvedValueOnce({ data: { workspace_id: "ws-1", role: "owner" } })
      .mockResolvedValueOnce({ data: mockWorkspace, error: null })
      .mockResolvedValueOnce({ data: { id: "lead-1" }, error: null });
    mf.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockCrawlPages.mockResolvedValue({
      pages: [
        {
          url: "https://example.com/about",
          domain: "example.com",
          label: "about",
          html: '<title>Acme Corp</title><meta name="description" content="A tech company"><h1>Acme Corp</h1><a href="mailto:info@example.com">Email</a><h2>Web Design</h2>',
          status: 200,
          fetchedAt: "2026-01-01T00:00:00Z",
          fetchedFrom: "live",
        },
      ],
      errors: [],
      robotsCache: new Map(),
    });
    const supabase = buildSupabaseClient(mf);

    const result = await runDiscovery(
      { workspaceId: "ws-1", seedUrls: [{ url: "https://example.com/about" }] },
      supabase
    );

    expect(result.success).toBe(true);
    expect(result.result!.leadsCreated).toBe(1);
    expect(result.result!.deduplicatedCount).toBe(0);
    expect(result.result!.totalPagesFetched).toBe(1);
  });
});
