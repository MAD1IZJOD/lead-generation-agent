"use server";

import { createProviderFromEnv } from "@/lib/prospect-discovery/adapter";
import type {
  DiscoverProspectsParams,
  EnrichProspectParams,
} from "@/lib/prospect-discovery/adapter";

/**
 * Discover prospects using the configured provider.
 * Returns an error if the provider is not configured with credentials.
 * Never sends real emails or makes outbound contact.
 */
export async function discoverProspects(
  params: DiscoverProspectsParams
): Promise<{
  success: boolean;
  prospects?: import("@/lib/prospect-discovery/adapter").DiscoveredProspect[];
  totalFound?: number;
  provider?: string;
  error?: string;
  isMock?: boolean;
}> {
  const provider = createProviderFromEnv();

  try {
    const result = await provider.discoverProspects(params);
    return {
      success: true,
      prospects: result.prospects,
      totalFound: result.totalFound,
      provider: result.provider,
      isMock: result.provider === "mock",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Discovery failed",
    };
  }
}

/**
 * Enrich a single prospect with additional data.
 * Returns an error if the provider is not configured with credentials.
 */
export async function enrichProspect(
  params: EnrichProspectParams
): Promise<{
  success: boolean;
  prospect?: import("@/lib/prospect-discovery/adapter").EnrichProspectResult;
  error?: string;
  isMock?: boolean;
}> {
  const provider = createProviderFromEnv();

  try {
    const result = await provider.enrichProspect(params);
    return {
      success: true,
      prospect: result,
      isMock: result.source === "mock",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Enrichment failed",
    };
  }
}
