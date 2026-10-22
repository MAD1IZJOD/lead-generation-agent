import { describe, it, expect } from "vitest";
import {
  PIPELINE_STAGE_ORDER,
  PIPELINE_TRANSITIONS,
  canTransition,
  type DealInput,
  validateDeal,
} from "./types";

describe("PIPELINE_STAGE_ORDER", () => {
  it("defines all 8 pipeline stages in order", () => {
    expect(PIPELINE_STAGE_ORDER).toEqual([
      "lead",
      "qualified",
      "contacted",
      "replied",
      "meeting",
      "proposal",
      "won",
      "lost",
    ]);
  });
});

describe("PIPELINE_TRANSITIONS", () => {
  it("allows lead -> qualified and lost", () => {
    expect(PIPELINE_TRANSITIONS["lead"]).toContain("qualified");
    expect(PIPELINE_TRANSITIONS["lead"]).toContain("lost");
  });

  it("allows qualified -> contacted and lost", () => {
    expect(PIPELINE_TRANSITIONS["qualified"]).toContain("contacted");
    expect(PIPELINE_TRANSITIONS["qualified"]).toContain("lost");
  });

  it("allows contacted -> replied and lost", () => {
    expect(PIPELINE_TRANSITIONS["contacted"]).toContain("replied");
    expect(PIPELINE_TRANSITIONS["contacted"]).toContain("lost");
  });

  it("allows replied -> meeting and lost", () => {
    expect(PIPELINE_TRANSITIONS["replied"]).toContain("meeting");
    expect(PIPELINE_TRANSITIONS["replied"]).toContain("lost");
  });

  it("allows meeting -> proposal and lost", () => {
    expect(PIPELINE_TRANSITIONS["meeting"]).toContain("proposal");
    expect(PIPELINE_TRANSITIONS["meeting"]).toContain("lost");
  });

  it("allows proposal -> won and lost", () => {
    expect(PIPELINE_TRANSITIONS["proposal"]).toContain("won");
    expect(PIPELINE_TRANSITIONS["proposal"]).toContain("lost");
  });

  it("allows won -> nothing (terminal)", () => {
    expect(PIPELINE_TRANSITIONS["won"]).toEqual([]);
  });

  it("allows lost -> nothing (terminal)", () => {
    expect(PIPELINE_TRANSITIONS["lost"]).toEqual([]);
  });
});

describe("canTransition", () => {
  it("returns true for valid transitions", () => {
    expect(canTransition("lead", "qualified")).toBe(true);
    expect(canTransition("proposal", "won")).toBe(true);
    expect(canTransition("proposal", "lost")).toBe(true);
  });

  it("returns false for invalid transitions", () => {
    expect(canTransition("lead", "proposal")).toBe(false);
    expect(canTransition("won", "lost")).toBe(false);
    expect(canTransition("lost", "won")).toBe(false);
    expect(canTransition("qualified", "proposal")).toBe(false);
  });
});

describe("validateDeal", () => {
  const baseInput: DealInput = {
    workspace_id: "ws-1",
    lead_id: "lead-1",
    stage: "lead",
    amount_cents: 800,
    currency: "usd",
    expected_close_date: "2026-12-31",
    next_action: "Follow up",
    notes: "Initial contact",
  };

  it("accepts valid deal input", () => {
    const result = validateDeal(baseInput);
    expect(result.valid).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = validateDeal({ ...baseInput, amount_cents: -100 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("non-negative");
  });

  it("rejects missing workspace_id", () => {
    const result = validateDeal({ ...baseInput, workspace_id: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("workspace_id");
  });
});
