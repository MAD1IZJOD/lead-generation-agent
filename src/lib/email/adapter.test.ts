import { describe, it, expect } from "vitest";
import { createEmailProvider } from "./adapter";

describe("createEmailProvider", () => {
  it("returns mock provider when testMode is true", () => {
    const provider = createEmailProvider({
      provider: "smtp",
      smtpHost: "smtp.example.com",
      smtpUser: "user",
      smtpPass: "pass",
      fromAddress: "test@example.com",
      fromName: "Test",
      testMode: true,
    });
    expect(provider.name).toBe("mock");
  });

  it("returns mock provider when no SMTP credentials are configured", () => {
    const provider = createEmailProvider({
      provider: "smtp",
      fromAddress: "test@example.com",
      fromName: "Test",
      testMode: false,
    });
    expect(provider.name).toBe("mock");
  });

  it("returns SMTP provider when credentials are configured and not in test mode", () => {
    const provider = createEmailProvider({
      provider: "smtp",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpUser: "user",
      smtpPass: "pass",
      fromAddress: "test@example.com",
      fromName: "Test",
      testMode: false,
    });
    expect(provider.name).toBe("smtp");
  });

  it("mock provider sendEmail returns success without sending", async () => {
    const provider = createEmailProvider({
      provider: "mock",
      fromAddress: "test@example.com",
      fromName: "Test",
      testMode: true,
    });
    const result = await provider.sendEmail({
      to: "recipient@example.com",
      from: "sender@example.com",
      subject: "Test",
      body: "Hello",
    });
    expect(result.success).toBe(true);
    expect(result.providerMessageId).toContain("mock-");
  });

  it("mock provider verifyWebhook returns true", async () => {
    const provider = createEmailProvider({
      provider: "mock",
      fromAddress: "test@example.com",
      fromName: "Test",
      testMode: true,
    });
    const result = await provider.verifyWebhook("payload", "signature");
    expect(result).toBe(true);
  });

  it("mock provider handleBounce returns null", async () => {
    const provider = createEmailProvider({
      provider: "mock",
      fromAddress: "test@example.com",
      fromName: "Test",
      testMode: true,
    });
    const result = await provider.handleBounce({});
    expect(result).toBeNull();
  });

  it("mock provider handleReply returns null", async () => {
    const provider = createEmailProvider({
      provider: "mock",
      fromAddress: "test@example.com",
      fromName: "Test",
      testMode: true,
    });
    const result = await provider.handleReply({});
    expect(result).toBeNull();
  });

  it("mock provider handleComplaint returns null", async () => {
    const provider = createEmailProvider({
      provider: "mock",
      fromAddress: "test@example.com",
      fromName: "Test",
      testMode: true,
    });
    const result = await provider.handleComplaint({});
    expect(result).toBeNull();
  });
});
