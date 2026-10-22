import { describe, it, expect, beforeEach } from "vitest";
import {
  MockCalendarAdapter,
  createCalendarAdapter,
  type CalendarAdapter,
  type CalendarEvent,
} from "./adapter";

describe("MockCalendarAdapter", () => {
  let adapter: CalendarAdapter;

  beforeEach(() => {
    adapter = new MockCalendarAdapter();
  });

  describe("checkAvailability", () => {
    it("returns available for empty calendar", async () => {
      const availability = await adapter.checkAvailability(
        "2026-01-15T09:00:00Z",
        "2026-01-15T10:00:00Z",
        ["alice@example.com"]
      );
      expect(availability.length).toBe(1);
      expect(availability[0].available).toBe(true);
    });

    it("returns unavailable when conflicting with existing event", async () => {
      await adapter.createMeeting(
        "Existing Meeting",
        "Existing description",
        "2026-01-15T09:00:00Z",
        "2026-01-15T10:00:00Z",
        ["bob@example.com"]
      );

      const availability = await adapter.checkAvailability(
        "2026-01-15T09:30:00Z",
        "2026-01-15T10:30:00Z",
        ["alice@example.com"]
      );
      expect(availability.some((a) => !a.available)).toBe(true);
    });

    it("returns available for non-overlapping time", async () => {
      await adapter.createMeeting(
        "Existing Meeting",
        "Existing description",
        "2026-01-15T09:00:00Z",
        "2026-01-15T10:00:00Z",
        ["bob@example.com"]
      );

      const availability = await adapter.checkAvailability(
        "2026-01-15T10:30:00Z",
        "2026-01-15T11:30:00Z",
        ["alice@example.com"]
      );
      expect(availability.some((a) => a.available)).toBe(true);
    });
  });

  describe("createMeeting", () => {
    it("creates a confirmed meeting", async () => {
      const event = await adapter.createMeeting(
        "Discovery Call",
        "Discuss requirements",
        "2026-01-15T14:00:00Z",
        "2026-01-15T14:30:00Z",
        ["alice@example.com", "bob@example.com"]
      );

      expect(event.id).toBeDefined();
      expect(event.title).toBe("Discovery Call");
      expect(event.status).toBe("confirmed");
      expect(event.attendees).toContain("alice@example.com");
      expect(event.attendees).toContain("bob@example.com");
      expect(event.meetingUrl).toBeDefined();
    });

    it("throws when time slot is not available", async () => {
      await adapter.createMeeting(
        "Existing Meeting",
        null,
        "2026-01-15T14:00:00Z",
        "2026-01-15T14:30:00Z",
        ["alice@example.com"]
      );

      await expect(
        adapter.createMeeting(
          "Conflicting Meeting",
          null,
          "2026-01-15T14:15:00Z",
          "2026-01-15T14:45:00Z",
          ["charlie@example.com"]
        )
      ).rejects.toThrow();
    });

    it("does not create a meeting when unavailable", async () => {
      await adapter.createMeeting(
        "Existing Meeting",
        null,
        "2026-01-15T14:00:00Z",
        "2026-01-15T14:30:00Z",
        ["alice@example.com"]
      );

      const eventsBefore = adapter.getEvents().length;
      await expect(
        adapter.createMeeting(
          "Conflicting Meeting",
          null,
          "2026-01-15T14:15:00Z",
          "2026-01-15T14:45:00Z",
          ["charlie@example.com"]
        )
      ).rejects.toThrow();
      expect(adapter.getEvents().length).toBe(eventsBefore);
    });
  });

  describe("cancelMeeting", () => {
    it("cancels an existing meeting", async () => {
      const event = await adapter.createMeeting(
        "Meeting to Cancel",
        null,
        "2026-01-15T14:00:00Z",
        "2026-01-15T14:30:00Z",
        ["alice@example.com"]
      );

      const result = await adapter.cancelMeeting(event.id);
      expect(result).toBe(true);

      const cancelledEvent = adapter.getEvents().find((e) => e.id === event.id);
      expect(cancelledEvent?.status).toBe("cancelled");
    });

    it("returns false for non-existent meeting", async () => {
      const result = await adapter.cancelMeeting("nonexistent-id");
      expect(result).toBe(false);
    });
  });

  describe("createCalendarAdapter factory", () => {
    it("creates a mock adapter by default", () => {
      const adapter = createCalendarAdapter();
      expect(adapter.name).toBe("mock");
    });

    it("creates a mock adapter when explicitly requested", () => {
      const adapter = createCalendarAdapter("mock");
      expect(adapter.name).toBe("mock");
    });

    it("throws for unsupported providers", () => {
      expect(() => createCalendarAdapter("google" as any)).toThrow();
    });
  });
});
