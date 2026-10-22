import { describe, it, expect } from "vitest";
import {
  classifyReply,
  requiresHumanReview,
  shouldStopFollowUps,
  type ClassificationResult,
  type ReplyClassification,
} from "./message-classifier";

describe("classifyReply", () => {
  describe("safety overrides (highest priority)", () => {
    it("classifies unsubscribe requests", () => {
      const result = classifyReply("Please unsubscribe me from all emails", "Re: Hello");
      expect(result.category).toBe("unsubscribe");
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.matchedPatterns.length).toBeGreaterThan(0);
    });

    it("classifies opt-out requests", () => {
      const result = classifyReply("I want to opt out of your mailing list", "Re: Follow-up");
      expect(result.category).toBe("unsubscribe");
    });

    it("classifies stop emailing requests", () => {
      const result = classifyReply("Stop emailing me", "Re: Hi");
      expect(result.category).toBe("unsubscribe");
    });

    it("classifies complaints", () => {
      const result = classifyReply("This is spam and I want to file a complaint", "Re: Offer");
      expect(result.category).toBe("complaint");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("classifies hard bounces", () => {
      const result = classifyReply("Undeliverable: mail returned to sender", "Delivery Status Notification");
      expect(result.category).toBe("bounce");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("classifies out-of-office replies", () => {
      const result = classifyReply("I am out of the office until next week", "Re: Hello");
      expect(result.category).toBe("out_of_office");
    });

    it("safety override beats interested keywords", () => {
      // Even if "interested" appears, unsubscribe wins
      const result = classifyReply("I'm interested but please unsubscribe me", "Re: Demo");
      expect(result.category).toBe("unsubscribe");
    });
  });

  describe("interest classification", () => {
    it("classifies interested replies", () => {
      const result = classifyReply("I'm interested in learning more about your services", "Re: Introduction");
      expect(result.category).toBe("interested");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("classifies demo requests", () => {
      const result = classifyReply("Can we schedule a demo?", "Re: Hello");
      expect(result.category).toBe("interested");
    });

    it("classifies pricing inquiries as interested", () => {
      const result = classifyReply("What is your pricing?", "Re: Hello");
      expect(result.category).toBe("interested");
    });

    it("classifies yes responses as interested", () => {
      const result = classifyReply("Yes, I'd like to talk", "Re: Follow-up");
      expect(result.category).toBe("interested");
    });
  });

  describe("not_interested classification", () => {
    it("classifies not interested replies", () => {
      const result = classifyReply("I'm not interested", "Re: Hello");
      expect(result.category).toBe("not_interested");
    });

    it("classifies decline replies", () => {
      const result = classifyReply("No thanks, we're all set", "Re: Offer");
      expect(result.category).toBe("not_interested");
    });
  });

  describe("objection classification", () => {
    it("classifies price objections", () => {
      const result = classifyReply("This is too expensive for us", "Re: Pricing");
      expect(result.category).toBe("objection");
    });

    it("classifies budget objections", () => {
      const result = classifyReply("We don't have budget for this", "Re: Hello");
      expect(result.category).toBe("objection");
    });

    it("classifies competitor objections", () => {
      const result = classifyReply("We already use a competitor", "Re: Introduction");
      expect(result.category).toBe("objection");
    });
  });

  describe("question classification", () => {
    it("classifies question replies with question marks", () => {
      const result = classifyReply("How does this work?", "Re: Hello");
      expect(result.category).toBe("question");
    });

    it("classifies how/what/why questions", () => {
      const result = classifyReply("How do I get started?", "Re: Hello");
      expect(result.category).toBe("question");
    });
  });

  describe("uncertain classification", () => {
    it("returns uncertain for unmatched text", () => {
      const result = classifyReply("blah blah blah random text", "Re: Hello");
      expect(result.category).toBe("uncertain");
      expect(result.confidence).toBeLessThan(0.5);
    });

    it("returns uncertain for very short text", () => {
      const result = classifyReply("hi", "Re: Hello");
      expect(result.category).toBe("uncertain");
    });
  });
});

describe("requiresHumanReview", () => {
  it("returns true for uncertain", () => {
    expect(requiresHumanReview("uncertain")).toBe(true);
  });

  it("returns true for complaint", () => {
    expect(requiresHumanReview("complaint")).toBe(true);
  });

  it("returns true for objection", () => {
    expect(requiresHumanReview("objection")).toBe(true);
  });

  it("returns false for interested", () => {
    expect(requiresHumanReview("interested")).toBe(false);
  });

  it("returns false for not_interested", () => {
    expect(requiresHumanReview("not_interested")).toBe(false);
  });

  it("returns false for unsubscribe", () => {
    expect(requiresHumanReview("unsubscribe")).toBe(false);
  });

  it("returns false for out_of_office", () => {
    expect(requiresHumanReview("out_of_office")).toBe(false);
  });

  it("returns false for bounce", () => {
    expect(requiresHumanReview("bounce")).toBe(false);
  });
});

describe("shouldStopFollowUps", () => {
  it("returns true for unsubscribe", () => {
    expect(shouldStopFollowUps("unsubscribe")).toBe(true);
  });

  it("returns true for complaint", () => {
    expect(shouldStopFollowUps("complaint")).toBe(true);
  });

  it("returns true for bounce", () => {
    expect(shouldStopFollowUps("bounce")).toBe(true);
  });

  it("returns true for not_interested", () => {
    expect(shouldStopFollowUps("not_interested")).toBe(true);
  });

  it("returns false for interested", () => {
    expect(shouldStopFollowUps("interested")).toBe(false);
  });

  it("returns false for question", () => {
    expect(shouldStopFollowUps("question")).toBe(false);
  });

  it("returns false for objection", () => {
    expect(shouldStopFollowUps("objection")).toBe(false);
  });

  it("returns false for out_of_office", () => {
    expect(shouldStopFollowUps("out_of_office")).toBe(false);
  });

  it("returns false for uncertain", () => {
    expect(shouldStopFollowUps("uncertain")).toBe(false);
  });
});
