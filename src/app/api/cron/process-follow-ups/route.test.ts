import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("Process follow-ups cron", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when cron secret is missing", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/cron/process-follow-ups", {
      method: "GET",
      headers: {},
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 when cron secret is invalid", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/cron/process-follow-ups", {
      method: "GET",
      headers: { "x-cron-secret": "invalid-secret" },
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
