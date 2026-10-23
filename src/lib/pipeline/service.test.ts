import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createDeal,
  getDeal,
  updateDeal,
  updateDealStage,
  listDeals,
  deleteDeal,
} from "./service";
import type { Deal, DealInput } from "./types";

const mockDeal: Deal = {
  id: "deal-1",
  workspace_id: "ws-1",
  lead_id: "lead-1",
  stage: "lead",
  amount_cents: 800,
  currency: "usd",
  expected_close_date: "2026-12-31",
  actual_close_date: null,
  next_action: "Follow up",
  notes: "Initial contact",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { workspace_id: "ws-1", role: "owner" } }),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
        }),
      }),
    }),
  }),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe("createDeal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a deal successfully", async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockDeal, error: null }),
        }),
      }),
    });

    const input: DealInput = {
      workspace_id: "ws-1",
      lead_id: "lead-1",
      stage: "lead",
      amount_cents: 800,
      currency: "usd",
      expected_close_date: "2026-12-31",
      next_action: "Follow up",
      notes: "Initial contact",
    };

    const result = await createDeal(input);
    expect(result).toEqual(mockDeal);
  });

  it("throws on insert error", async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
        }),
      }),
    });

    const input: DealInput = {
      workspace_id: "ws-1",
      lead_id: "lead-1",
      stage: "lead",
      amount_cents: 800,
      currency: "usd",
      expected_close_date: "2026-12-31",
      next_action: "Follow up",
      notes: "Initial contact",
    };

    await expect(createDeal(input)).rejects.toThrow("DB error");
  });
});

describe("getDeal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns a deal when found", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockDeal, error: null }),
          }),
        }),
      }),
    });

    const result = await getDeal("deal-1", "ws-1");
    expect(result).toEqual(mockDeal);
  });

  it("returns null when deal not found", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    const result = await getDeal("deal-nonexistent", "ws-1");
    expect(result).toBeNull();
  });

  it("throws on query error", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
          }),
        }),
      }),
    });

    await expect(getDeal("deal-1", "ws-1")).rejects.toThrow("DB error");
  });
});

describe("updateDealStage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates stage successfully", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockDeal, error: null }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { ...mockDeal, stage: "qualified" }, error: null }),
            }),
          }),
        }),
      }),
    });

    const result = await updateDealStage("deal-1", "ws-1", "qualified");
    expect(result.stage).toBe("qualified");
  });

  it("throws on invalid transition", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockDeal, error: null }),
          }),
        }),
      }),
    });

    await expect(updateDealStage("deal-1", "ws-1", "won")).rejects.toThrow("Cannot transition from lead to won");
  });
});

describe("listDeals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns all deals for a workspace", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [mockDeal], error: null }),
        }),
      }),
    });

    const result = await listDeals("ws-1");
    expect(result).toEqual([mockDeal]);
  });

  it("filters by stage", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [mockDeal], error: null }),
          }),
        }),
      }),
    });

    const result = await listDeals("ws-1", "lead");
    expect(result).toEqual([mockDeal]);
  });
});

describe("deleteDeal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("deletes a deal successfully", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockDeal, error: null }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    await expect(deleteDeal("deal-1", "ws-1")).resolves.toBeUndefined();
  });

  it("throws when deal not found", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    await expect(deleteDeal("deal-nonexistent", "ws-1")).rejects.toThrow("Deal not found");
  });
});
