import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

type MockSupabaseFrom = {
  select: () => {
    eq: () => {
      in: () => Promise<{ data: unknown; error: unknown }>;
    };
  };
  insert: () => Promise<{ data: unknown; error: unknown }>;
  update: () => {
    eq: () => Promise<{ data: unknown; error: unknown }>;
  };
};

const mockSupabase: {
  from: () => MockSupabaseFrom;
  auth: {
    getUser: () => Promise<{ data: { user: unknown }; error: unknown }>;
  };
} = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
  },
};

vi.mocked(mockSupabase.from).mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
  insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  update: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("Complaint webhook signature validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.EMAIL_WEBHOOK_SECRET = "test-webhook-secret-do-not-commit";
  });

  afterEach(() => {
    delete process.env.EMAIL_WEBHOOK_SECRET;
  });

  it("returns 401 when webhook secret is not configured", async () => {
    delete process.env.EMAIL_WEBHOOK_SECRET;
    const { POST } = await import("./route");
    const request = new Request("http://localhost/webhooks/email/complaint", {
      method: "POST",
      headers: { "x-webhook-signature": "some-signature" },
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("proceeds past auth when webhook secret is configured", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/webhooks/email/complaint", {
      method: "POST",
      headers: { "x-webhook-signature": "any-signature" },
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).not.toBe(401);
    expect(response.status).toBe(400);
  });
});
