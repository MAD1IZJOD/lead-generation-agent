export interface ProspectDiscoveryProvider {
  name: string;
  discoverProspects(params: DiscoverProspectsParams): Promise<DiscoverProspectsResult>;
  enrichProspect(params: EnrichProspectParams): Promise<EnrichProspectResult>;
}

export interface DiscoverProspectsParams {
  workspaceId: string;
  targetMarkets: string[];
  industries: string[];
  jobTitles: string[];
  companySizes: string[];
  limit: number;
}

export interface DiscoverProspectsResult {
  prospects: DiscoveredProspect[];
  provider: string;
  totalFound: number;
}

export interface DiscoveredProspect {
  email: string;
  name: string | null;
  company: string | null;
  title: string | null;
  linkedinUrl: string | null;
  website: string | null;
  source: string;
  rawData: Record<string, unknown>;
}

export interface EnrichProspectParams {
  email: string;
  workspaceId: string;
}

export interface EnrichProspectResult {
  email: string;
  name: string | null;
  company: string | null;
  title: string | null;
  linkedinUrl: string | null;
  website: string | null;
  source: string;
  rawData: Record<string, unknown>;
}

export interface ProspectDiscoveryConfig {
  provider: "mock" | "api";
  apiKey?: string;
  apiBaseUrl?: string;
  testMode: boolean;
}

/**
 * Create a prospect discovery provider based on configuration.
 * Returns a mock provider when no credentials are configured
 * or when testMode is enabled.
 */
export function createProspectDiscoveryProvider(
  config: ProspectDiscoveryConfig
): ProspectDiscoveryProvider {
  if (config.testMode || config.provider === "mock") {
    return createMockProvider(config);
  }

  if (config.provider === "api" && config.apiKey && config.apiBaseUrl) {
    return createApiProvider(config);
  }

  // Fall back to mock if no valid credentials
  return createMockProvider(config);
}

function createMockProvider(_config: ProspectDiscoveryConfig): ProspectDiscoveryProvider {
  return {
    name: "mock",
    async discoverProspects(params: DiscoverProspectsParams): Promise<DiscoverProspectsResult> {
      // Mock provider: returns no prospects. Real discovery requires
      // API credentials configured in environment variables.
      console.log("[MOCK PROSPECT DISCOVERY] Would discover prospects:", {
        targetMarkets: params.targetMarkets,
        industries: params.industries,
        jobTitles: params.jobTitles,
        limit: params.limit,
      });
      return {
        prospects: [],
        provider: "mock",
        totalFound: 0,
      };
    },
    async enrichProspect(params: EnrichProspectParams): Promise<EnrichProspectResult> {
      console.log("[MOCK PROSPECT DISCOVERY] Would enrich prospect:", {
        email: params.email,
      });
      return {
        email: params.email,
        name: null,
        company: null,
        title: null,
        linkedinUrl: null,
        website: null,
        source: "mock",
        rawData: {},
      };
    },
  };
}

function createApiProvider(config: ProspectDiscoveryConfig): ProspectDiscoveryProvider {
  return {
    name: "api",
    async discoverProspects(params: DiscoverProspectsParams): Promise<DiscoverProspectsResult> {
      // Real API provider: calls external prospect discovery service.
      // Credentials are kept server-side only.
      try {
        const response = await fetch(`${config.apiBaseUrl}/discover`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            target_markets: params.targetMarkets,
            industries: params.industries,
            job_titles: params.jobTitles,
            company_sizes: params.companySizes,
            limit: params.limit,
          }),
        });

        if (!response.ok) {
          return {
            prospects: [],
            provider: "api",
            totalFound: 0,
          };
        }

        const data = await response.json();
        const rawProspects = (data.prospects ?? []) as Array<{
          email: string;
          name?: string | null;
          company?: string | null;
          title?: string | null;
          linkedin_url?: string | null;
          website?: string | null;
          source?: string;
          raw_data?: Record<string, unknown>;
          total_found?: number;
        }>;
        return {
          prospects: rawProspects.map((p) => ({
            email: p.email,
            name: p.name ?? null,
            company: p.company ?? null,
            title: p.title ?? null,
            linkedinUrl: p.linkedin_url ?? null,
            website: p.website ?? null,
            source: p.source ?? "api",
            rawData: p.raw_data ?? {},
          })),
          provider: "api",
          totalFound: data.total_found ?? 0,
        };
      } catch (err) {
        console.error("Prospect discovery API error:", err);
        return {
          prospects: [],
          provider: "api",
          totalFound: 0,
        };
      }
    },
    async enrichProspect(params: EnrichProspectParams): Promise<EnrichProspectResult> {
      try {
        const response = await fetch(`${config.apiBaseUrl}/enrich`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({ email: params.email }),
        });

        if (!response.ok) {
          return {
            email: params.email,
            name: null,
            company: null,
            title: null,
            linkedinUrl: null,
            website: null,
            source: "api",
            rawData: {},
          };
        }

        const data = await response.json();
        return {
          email: data.email || params.email,
          name: data.name || null,
          company: data.company || null,
          title: data.title || null,
          linkedinUrl: data.linkedin_url || null,
          website: data.website || null,
          source: data.source || "api",
          rawData: data.raw_data || {},
        };
      } catch (err) {
        console.error("Prospect enrichment API error:", err);
        return {
          email: params.email,
          name: null,
          company: null,
          title: null,
          linkedinUrl: null,
          website: null,
          source: "api",
          rawData: {},
        };
      }
    },
  };
}
