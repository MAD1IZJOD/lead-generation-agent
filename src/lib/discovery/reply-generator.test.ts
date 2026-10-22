import { describe, it, expect } from "vitest";
import {
  generateReply,
  type ReplyDraft,
} from "./reply-generator";
import type { ReplyClassification } from "./message-classifier";

const baseWorkspace = {
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
    {
      name: "SEO",
      description: "Search engine optimization",
      starting_price_usd: 500,
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
  approved_claims: [
    "We build websites starting at $800",
    "Custom websites for small businesses",
    "SEO services to improve search rankings",
  ],
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

describe("generateReply", () => {
  describe("interested classification", () => {
    it("generates a reply for interested prospects", () => {
      const result = generateReply(
        "interested",
        "Jane Doe",
        "Acme Client",
        baseWorkspace,
        "I'm interested in your services"
      );

      expect(result.subject).toContain("Next steps");
      expect(result.body).toContain("Jane Doe");
      expect(result.body).toContain("Acme Client");
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.usesApprovedClaims).toBe(true);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("includes approved claims in the reply", () => {
      const result = generateReply(
        "interested",
        null,
        null,
        baseWorkspace,
        "I want to learn more"
      );

      const hasApprovedClaim = baseWorkspace.approved_claims.some((claim) =>
        result.body.includes(claim)
      );
      expect(hasApprovedClaim).toBe(true);
    });

    it("includes pricing information", () => {
      const result = generateReply(
        "interested",
        null,
        null,
        baseWorkspace,
        "What are your prices?"
      );

      expect(result.body).toContain("$800");
      expect(result.body).toContain("USD");
    });

    it("does not invent claims outside approved list", () => {
      const result = generateReply(
        "interested",
        null,
        null,
        baseWorkspace,
        "I'm interested"
      );

      // Should not contain "guaranteed results" which is in do_not_claim
      expect(result.body).not.toContain("guaranteed results");
      // Should not contain invented discounts
      expect(result.body).not.toMatch(/discount/i);
      expect(result.body).not.toMatch(/free/i);
    });
  });

  describe("not_interested classification", () => {
    it("generates a polite opt-out reply", () => {
      const result = generateReply(
        "not_interested",
        "John Smith",
        null,
        baseWorkspace,
        "I'm not interested"
      );

      expect(result.body).toContain("respect your decision");
      expect(result.body).toContain("won't contact you again");
      expect(result.confidence).toBe(0.9);
    });
  });

  describe("objection classification", () => {
    it("generates a response to price objections", () => {
      const result = generateReply(
        "objection",
        null,
        null,
        baseWorkspace,
        "This is too expensive"
      );

      expect(result.body).toContain("$800");
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe("question classification", () => {
    it("generates a response to questions", () => {
      const result = generateReply(
        "question",
        null,
        null,
        baseWorkspace,
        "How does this work?"
      );

      expect(result.body).toContain("Acme Corp");
      expect(result.body).toContain("hello@acme.example.com");
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("out_of_office classification", () => {
    it("generates a brief acknowledgment", () => {
      const result = generateReply(
        "out_of_office",
        null,
        null,
        baseWorkspace,
        "I'm out of office"
      );

      expect(result.body).toContain("back in the office");
      expect(result.confidence).toBe(0.95);
    });
  });

  describe("unsubscribe classification", () => {
    it("generates an unsubscribe confirmation", () => {
      const result = generateReply(
        "unsubscribe",
        null,
        null,
        baseWorkspace,
        "Please unsubscribe me"
      );

      expect(result.body).toContain("unsubscribed");
      expect(result.confidence).toBe(1.0);
    });
  });

  describe("bounce classification", () => {
    it("returns an empty reply body", () => {
      const result = generateReply(
        "bounce",
        null,
        null,
        baseWorkspace,
        "Undeliverable"
      );

      expect(result.body).toBe("");
      expect(result.subject).toBe("");
      expect(result.confidence).toBe(1.0);
    });
  });

  describe("complaint classification", () => {
    it("returns an empty reply body", () => {
      const result = generateReply(
        "complaint",
        null,
        null,
        baseWorkspace,
        "This is spam"
      );

      expect(result.body).toBe("");
      expect(result.subject).toBe("");
      expect(result.confidence).toBe(1.0);
    });
  });

  describe("uncertain classification", () => {
    it("generates a generic response for uncertain messages", () => {
      const result = generateReply(
        "uncertain",
        null,
        null,
        baseWorkspace,
        "blah blah blah"
      );

      expect(result.body).toContain("review your inquiry");
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});

describe("reply draft structure", () => {
  it("has all required fields", () => {
    const result = generateReply(
      "interested",
      null,
      null,
      baseWorkspace,
      "I'm interested"
    ) as ReplyDraft;

    expect(typeof result.subject).toBe("string");
    expect(typeof result.body).toBe("string");
    expect(typeof result.confidence).toBe("number");
    expect(Array.isArray(result.reasoning)).toBe(true);
    expect(typeof result.usesApprovedClaims).toBe("boolean");
  });

  it("confidence is between 0 and 1", () => {
    const categories: ReplyClassification[] = [
      "interested",
      "not_interested",
      "objection",
      "question",
      "out_of_office",
      "unsubscribe",
      "bounce",
      "complaint",
      "uncertain",
    ];

    for (const category of categories) {
      const result = generateReply(
        category,
        null,
        null,
        baseWorkspace,
        "test message"
      );
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });
});
