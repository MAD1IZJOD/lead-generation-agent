import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { crawlPages } from "./page-fetcher";
import type { CompanyProfile, DiscoveryConfig, DiscoveryInput, DiscoveryError, SeedUrl } from "./types";
import {
  detectPageLabel,
  extractCompanyProfile,
} from "./page-parser";
import { normalizeSeedUrls } from "./url-utils";
import { deduplicateCompanies, profileToLeadRawData } from "./deduplicator";
import { qualifyLead } from "@/lib/qualification";
import type { Lead, Workspace } from "@/lib/database.types";

/**
 * Run the zero-cost discovery workflow for a workspace.
 *
 * Process:
 * 1. Authenticate user and verify workspace membership
 * 2. Normalize and validate seed URLs
 * 3. Crawl pages with rate limiting and robots.txt respect
 * 4. Parse pages into company profiles
 * 5. Deduplicate by domain
 * 6. Create leads in Supabase with evidence records
 * 7. Log audit events
 *
 * DRY RUN: This workflow never sends emails or contacts prospects.
 * It only reads public web pages and creates lead records internally.
 *
 * @param input - Discovery input with workspaceId and seed URLs
 * @param supabaseClient - Optional Supabase client for testing
 */
export async function runDiscovery(
  input: DiscoveryInput,
  supabaseClient?: any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<{
  success: boolean;
  result?: {
    companies: CompanyProfile[];
    leadsCreated: number;
    deduplicatedCount: number;
    totalPagesFetched: number;
    errors: DiscoveryError[];
  };
  error?: string;
}> {
  // Step 1: Authenticate and verify workspace membership
  const supabase = supabaseClient || (await createClient());
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership) {
    return {
      success: false,
      error: "Not a member of this workspace",
    };
  }

  // Fetch workspace configuration for qualification scoring
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", input.workspaceId)
    .single();

  if (workspaceError || !workspace) {
    return { success: false, error: "Workspace not found" };
  }

  // Step 2: Normalize and validate seed URLs
  const { valid, invalid } = normalizeSeedUrls(input.seedUrls);

  if (valid.length === 0) {
    return {
      success: false,
      error: "No valid seed URLs provided",
    };
  }

  const config: DiscoveryConfig = {
    maxPagesPerDomain: input.maxPagesPerDomain ?? 3,
    maxTotalPages: input.maxTotalPages ?? 10,
    requestTimeoutMs: 10000,
    maxRetries: 2,
    retryDelayMs: 2000,
    rateLimitDelayMs: 1000,
    userAgent: "LeadGenerationAgent/1.0 (discovery; contact: admin@example.com)",
    respectRobotsTxt: true,
  };

  // Step 3: Crawl pages
  const urls = valid.map((s) => s.url);
  const { pages, errors: crawlErrors } = await crawlPages(urls, config);

  if (pages.length === 0) {
    return {
      success: false,
      error: "No pages could be fetched",
    };
  }

  // Step 4: Parse pages into company profiles
  const pageProfiles = pages.map((page) => {
    const profile = extractCompanyProfile(page);
    return {
      ...profile,
      pageLabel: detectPageLabel(page.url, page.html),
    };
  });

  // Step 5: Deduplicate by domain
  const { merged: mergedProfiles, duplicatesRemoved } =
    deduplicateCompanies(pageProfiles as CompanyProfile[]);

  // Step 6: Create leads in Supabase with evidence
  const leadsCreated: string[] = [];

  for (const profile of mergedProfiles) {
    // Check for duplicate lead by email (if we have one)
    if (profile.contactEmail) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("workspace_id", input.workspaceId)
        .eq("email", profile.contactEmail)
        .maybeSingle();

      if (existing) {
        continue; // Skip duplicate lead
      }
    }

    // Create the lead
    const rawData = profileToLeadRawData(profile);
    const qualification = qualifyLead(
      {
        id: "",
        workspace_id: input.workspaceId,
        email: profile.contactEmail || "",
        name: profile.companyName,
        company: profile.companyName,
        title: null,
        linkedin_url: null,
        website: `https://${profile.domain}`,
        source: "discovery",
        raw_data: rawData,
        qualification_score: 0,
        status: "new",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      workspace as Workspace
    );

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        workspace_id: input.workspaceId,
        email: profile.contactEmail || null,
        name: profile.companyName,
        company: profile.companyName,
        title: null,
        linkedin_url: null,
        website: `https://${profile.domain}`,
        source: "discovery",
        raw_data: rawData,
        qualification_score: qualification.totalScore,
        status: "new",
      })
      .select()
      .single();

    if (leadError || !lead) {
      continue;
    }

    leadsCreated.push(lead.id);

    // Create evidence records for each source URL
    const evidenceRecords = profile.sourceUrls.map((sourceUrl) => ({
      workspace_id: input.workspaceId,
      lead_id: lead.id,
      claim: `Company profile discovered from ${sourceUrl}`,
      source_url: sourceUrl,
      source_type: "website",
      confidence: profile.confidence,
    }));

    if (evidenceRecords.length > 0) {
      await supabase.from("lead_evidence").insert(evidenceRecords);
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      workspace_id: input.workspaceId,
      actor_id: user.id,
      action: "lead.created",
      target_type: "lead",
      target_id: lead.id,
      metadata: {
        source: "discovery",
        domain: profile.domain,
        qualification_score: qualification.totalScore,
        tier: qualification.tier,
      },
    });
  }

  return {
    success: true,
    result: {
      companies: mergedProfiles,
      leadsCreated: leadsCreated.length,
      deduplicatedCount: duplicatesRemoved,
      totalPagesFetched: pages.length,
      errors: crawlErrors,
    },
  };
}
