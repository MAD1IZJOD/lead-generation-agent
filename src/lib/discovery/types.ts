export interface SeedUrl {
  url: string;
  label?: string; // e.g., "about", "contact", "services", "home"
}

export interface DiscoveryInput {
  workspaceId: string;
  seedUrls: SeedUrl[];
  maxPagesPerDomain?: number;
  maxTotalPages?: number;
}

export interface CompanyProfile {
  domain: string;
  companyName: string | null;
  description: string | null;
  industry: string | null;
  location: string | null;
  contactEmail: string | null;
  phone: string | null;
  services: string[];
  sourceUrls: string[];
  fetchedAt: string;
  confidence: number; // 0.0 to 1.0
}

export interface DiscoveryResult {
  companies: CompanyProfile[];
  deduplicatedCount: number;
  totalPagesFetched: number;
  errors: DiscoveryError[];
}

export interface DiscoveryError {
  url: string;
  error: string;
}

export interface CrawledPage {
  url: string;
  domain: string;
  label: string;
  html: string;
  status: number;
  fetchedAt: string;
  fetchedFrom: "cache" | "live";
}

export interface DiscoveryConfig {
  maxPagesPerDomain: number;
  maxTotalPages: number;
  requestTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  rateLimitDelayMs: number;
  userAgent: string;
  respectRobotsTxt: boolean;
}

export const DEFAULT_DISCOVERY_CONFIG: DiscoveryConfig = {
  maxPagesPerDomain: 3,
  maxTotalPages: 10,
  requestTimeoutMs: 10000,
  maxRetries: 2,
  retryDelayMs: 2000,
  rateLimitDelayMs: 1000,
  userAgent: "LeadGenerationAgent/1.0 (discovery; contact: admin@example.com)",
  respectRobotsTxt: true,
};

export interface NormalizedDomain {
  domain: string;
  isValid: boolean;
  reason?: string;
}
