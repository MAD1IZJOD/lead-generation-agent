import { describe, it, expect } from "vitest";
import { createProspectDiscoveryProvider } from "./adapter";

describe("createProspectDiscoveryProvider", () => {
  it("returns mock provider when testMode is true", () => {
    const provider = createProspectDiscoveryProvider({
      provider: "api",
      apiKey: "test-key",
      apiBaseUrl: "https://api.example.com",
      testMode: true,
    });
    expect(provider.name).toBe("mock");
  });

  it("returns mock provider when no API credentials are configured", () => {
    const provider = createProspectDiscoveryProvider({
      provider: "api",
      fromAddress: "test@example.com",
      testMode: false,
    });
    expect(provider.name).toBe("mock");
  });

  it("returns API provider when credentials are configured and not in test mode", () => {
    const provider = createProspectDiscoveryProvider({
      provider: "api",
      apiKey: "test-key",
      apiBaseUrl: "https://api.example.com",
      testMode: false,
    });
    expect(provider.name).toBe("api");
  });

  it("mock provider discoverProspects returns empty list", async () => {
    const provider = createProspectDiscoveryProvider({
      provider: "mock",
      testMode: true,
    });
    const result = await provider.discoverProspects({
      workspaceId: "ws-1",
      targetMarkets: ["US"],
      industries: ["Technology"],
      jobTitles: ["CEO"],
      companySizes: ["1-10"],
      limit: 10,
    });
    expect(result.prospects).toEqual([]);
    expect(result.provider).toBe("mock");
    expect(result.totalFound).toBe(0);
  });

  it("mock provider enrichProspect returns null fields", async () => {
    const provider = createProspectDiscoveryProvider({
      provider: "mock",
      testMode: true,
    });
    const result = await provider.enrichProspect({
      email: "test@example.com",
      workspaceId: "ws-1",
    });
    expect(result.email).toBe("test@example.com");
    expect(result.name).toBeNull();
    expect(result.company).toBeNull();
    expect(result.source).toBe("mock");
  });
});
