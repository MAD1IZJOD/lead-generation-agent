import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue({ value: undefined }),
    set: vi.fn(),
    remove: vi.fn(),
  }),
}));

type MockSupabaseFrom = {
  select: () => {
    lte: () => {
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
    lte: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
  insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  update: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
});

describe("Cron authentication", () => {
  const mockCreateClient = vi.mocked(createClient);

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "test-cron-secret-do-not-commit";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    mockCreateClient.mockResolvedValue(mockSupabase as any);
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns 401 when cron secret is missing from request", async () => {
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
      headers: { "x-cron-secret": "wrong-secret" },
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
