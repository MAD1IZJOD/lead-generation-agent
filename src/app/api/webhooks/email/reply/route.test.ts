import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => mockSupabase),
}));

const mockCreateEmailProvider = vi.fn(() => ({
  name: "mock",
  sendEmail: vi.fn().mockResolvedValue({ success: true, providerMessageId: "mock-1" }),
  verifyWebhook: vi.fn().mockResolvedValue(true),
  handleBounce: vi.fn().mockResolvedValue(null),
  handleReply: vi.fn().mockImplementation((payload) => {
    const email = payload.email || "";
    if (email.includes("unsub")) {
      return Promise.resolve({
        email,
        text: "Please unsubscribe me from all emails",
        messageId: "msg-unsub",
        timestamp: "2026-01-15T10:00:00Z",
      });
    }
    if (email.includes("complaint")) {
      return Promise.resolve({
        email,
        text: "This is spam and I want to file a complaint",
        messageId: "msg-complaint",
        timestamp: "2026-01-15T11:00:00Z",
      });
    }
    if (email.includes("uncertain")) {
      return Promise.resolve({
        email,
        text: "blah blah blah random text",
        messageId: "msg-uncertain",
        timestamp: "2026-01-15T12:00:00Z",
      });
    }
    return Promise.resolve({
      email,
      text: "I'm interested in learning more about your services",
      messageId: "msg-interested",
      timestamp: "2026-01-15T09:00:00Z",
    });
  }),
  handleComplaint: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/email/adapter", () => ({
  createEmailProvider: mockCreateEmailProvider,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: () => ({ value: "" }),
    set: vi.fn(),
    remove: vi.fn(),
    has: () => false,
    keys: () => [],
    getAll: () => [],
  })),
}));

const mockFrom = vi.fn();
const mockSupabase = {
  from: mockFrom,
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const mockWorkspace = {
  id: "ws-1",
  name: "Test Workspace",
  slug: "test-workspace",
  company_profile: {
    company_name: "Acme Corp",
    website: "https://acme.example.com",
    contact_email: "hello@acme.example.com",
    description: "Professional websites starting at $800",
  },
  services: [
    {
      name: "Web Design",
      description: "Custom website design",
      starting_price_usd: 800,
      currency: "usd",
    },
  ],
  pricing: { minimum_project_usd: 800, currency: "usd" },
  target_markets: ["US", "UK"],
  icp: {
    industries: ["Technology"],
    company_sizes: ["1-10"],
    job_titles: ["CEO", "CTO"],
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

describe("Reply webhook", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });
  });

  it("returns 401 when webhook signature is missing", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/webhooks/email/reply", {
      method: "POST",
      headers: {},
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 when webhook signature is invalid", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/webhooks/email/reply", {
      method: "POST",
      headers: { "x-webhook-signature": "invalid-signature" },
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("classifies interested reply and generates suggested reply", async () => {
    // Mock the workspace + outreach lookup
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              {
                id: "outreach-1",
                workspace_id: "ws-1",
                lead_id: "lead-1",
                status: "sent",
                leads: {
                  email: "prospect@example.com",
                  name: "Jane Doe",
                  company: "Acme Client",
                  workspace_id: "ws-1",
                },
                workspaces: mockWorkspace,
              },
            ],
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    process.env.EMAIL_WEBHOOK_SECRET = "test-webhook-secret-do-not-commit";

    const { POST } = await import("./route");
    const request = new Request("http://localhost/webhooks/email/reply", {
      method: "POST",
      headers: { "x-webhook-signature": "valid-signature" },
      body: JSON.stringify({
        email: "prospect@example.com",
        messageId: "msg-123",
        timestamp: "2026-01-15T10:00:00Z",
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.results[0].classification.category).toBe("interested");
    expect(body.results[0].suggestedReply).toBeDefined();
    expect(body.results[0].suggestedReply.body).toContain("Jane Doe");
    expect(body.results[0].requiresHumanReview).toBe(false);
    expect(body.results[0].stopFollowUps).toBe(false);

    delete process.env.EMAIL_WEBHOOK_SECRET;
  });

  it("classifies unsubscribe and stops follow-ups", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              {
                id: "outreach-2",
                workspace_id: "ws-1",
                lead_id: "lead-2",
                status: "sent",
                leads: {
                  email: "unsub@example.com",
                  name: null,
                  company: null,
                  workspace_id: "ws-1",
                },
                workspaces: mockWorkspace,
              },
            ],
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    process.env.EMAIL_WEBHOOK_SECRET = "test-webhook-secret-do-not-commit";

    const { POST } = await import("./route");
    const request = new Request("http://localhost/webhooks/email/reply", {
      method: "POST",
      headers: { "x-webhook-signature": "valid-signature" },
      body: JSON.stringify({
        email: "unsub@example.com",
        messageId: "msg-456",
        timestamp: "2026-01-15T11:00:00Z",
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0].classification.category).toBe("unsubscribe");
    expect(body.results[0].stopFollowUps).toBe(true);
    expect(body.results[0].requiresHumanReview).toBe(false);
    expect(body.results[0].suggestedReply).toBeNull();

    delete process.env.EMAIL_WEBHOOK_SECRET;
  });

  it("classifies complaint and routes to human review", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              {
                id: "outreach-3",
                workspace_id: "ws-1",
                lead_id: "lead-3",
                status: "sent",
                leads: {
                  email: "complaint@example.com",
                  name: null,
                  company: null,
                  workspace_id: "ws-1",
                },
                workspaces: mockWorkspace,
              },
            ],
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    process.env.EMAIL_WEBHOOK_SECRET = "test-webhook-secret-do-not-commit";

    const { POST } = await import("./route");
    const request = new Request("http://localhost/webhooks/email/reply", {
      method: "POST",
      headers: { "x-webhook-signature": "valid-signature" },
      body: JSON.stringify({
        email: "complaint@example.com",
        messageId: "msg-789",
        timestamp: "2026-01-15T12:00:00Z",
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0].classification.category).toBe("complaint");
    expect(body.results[0].requiresHumanReview).toBe(true);
    expect(body.results[0].stopFollowUps).toBe(true);
    expect(body.results[0].suggestedReply).toBeNull();

    delete process.env.EMAIL_WEBHOOK_SECRET;
  });

  it("classifies uncertain and routes to human review", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              {
                id: "outreach-4",
                workspace_id: "ws-1",
                lead_id: "lead-4",
                status: "sent",
                leads: {
                  email: "uncertain@example.com",
                  name: null,
                  company: null,
                  workspace_id: "ws-1",
                },
                workspaces: mockWorkspace,
              },
            ],
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    process.env.EMAIL_WEBHOOK_SECRET = "test-webhook-secret-do-not-commit";

    const { POST } = await import("./route");
    const request = new Request("http://localhost/webhooks/email/reply", {
      method: "POST",
      headers: { "x-webhook-signature": "valid-signature" },
      body: JSON.stringify({
        email: "uncertain@example.com",
        messageId: "msg-101",
        timestamp: "2026-01-15T13:00:00Z",
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0].classification.category).toBe("uncertain");
    expect(body.results[0].requiresHumanReview).toBe(true);
    expect(body.results[0].stopFollowUps).toBe(false);

    delete process.env.EMAIL_WEBHOOK_SECRET;
  });
});
