export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  attendees: string[]; // email addresses
  location: string | null;
  meetingUrl: string | null;
  status: "confirmed" | "pending" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface CalendarAvailability {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface CalendarAdapter {
  name: string;
  checkAvailability(
    startTime: string,
    endTime: string,
    attendees: string[]
  ): Promise<CalendarAvailability[]>;
  createMeeting(
    title: string,
    description: string | null,
    startTime: string,
    endTime: string,
    attendees: string[]
  ): Promise<CalendarEvent>;
  cancelMeeting(meetingId: string): Promise<boolean>;
}

/**
 * Mock calendar adapter for tests. Never confirms a meeting unless
 * explicitly created through createMeeting. All operations are
 * in-memory and deterministic.
 */
export class MockCalendarAdapter implements CalendarAdapter {
  name = "mock";
  private events: Map<string, CalendarEvent> = new Map();
  private counter = 0;

  async checkAvailability(
    startTime: string,
    endTime: string,
    attendees: string[]
  ): Promise<CalendarAvailability[]> {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check for conflicts with existing confirmed events
    const conflicts: CalendarAvailability[] = [];
    for (const event of this.events.values()) {
      if (event.status !== "confirmed") continue;
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      if (start < eventEnd && end > eventStart) {
        conflicts.push({
          startTime: event.startTime,
          endTime: event.endTime,
          available: false,
        });
      }
    }

    if (conflicts.length > 0) {
      return conflicts;
    }

    return [
      { startTime, endTime, available: true },
    ];
  }

  async createMeeting(
    title: string,
    description: string | null,
    startTime: string,
    endTime: string,
    attendees: string[]
  ): Promise<CalendarEvent> {
    // Verify availability before creating
    const availability = await this.checkAvailability(startTime, endTime, attendees);
    if (!availability.some((a) => a.available)) {
      throw new Error("Time slot is not available");
    }

    const event: CalendarEvent = {
      id: `mock-meeting-${++this.counter}`,
      title,
      description,
      startTime,
      endTime,
      attendees,
      location: null,
      meetingUrl: `https://meet.example.com/${this.counter}`,
      status: "confirmed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.events.set(event.id, event);
    return event;
  }

  async cancelMeeting(meetingId: string): Promise<boolean> {
    const event = this.events.get(meetingId);
    if (!event) return false;
    event.status = "cancelled";
    event.updatedAt = new Date().toISOString();
    this.events.set(meetingId, event);
    return true;
  }

  /** Test helper: get all events */
  getEvents(): CalendarEvent[] {
    return Array.from(this.events.values());
  }

  /** Test helper: clear all events */
  clearEvents(): void {
    this.events.clear();
    this.counter = 0;
  }
}

/**
 * Create a calendar adapter based on configuration.
 * Returns a mock adapter when no provider is configured.
 */
export function createCalendarAdapter(
  provider: "mock" | "google" | "outlook" = "mock"
): CalendarAdapter {
  if (provider === "mock") {
    return new MockCalendarAdapter();
  }
  throw new Error(`Calendar provider "${provider}" is not implemented`);
}
