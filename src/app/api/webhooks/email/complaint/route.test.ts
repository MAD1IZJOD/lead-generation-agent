import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
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

describe("Complaint webhook", () => {
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
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  it("returns 401 when webhook signature is missing", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/webhooks/email/complaint", {
      method: "POST",
      headers: {},
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 when webhook signature is invalid", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/webhooks/email/complaint", {
      method: "POST",
      headers: { "x-webhook-signature": "invalid-signature" },
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
