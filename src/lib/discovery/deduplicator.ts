import type { CompanyProfile } from "./types";
import { mergeCompanyProfiles } from "./page-parser";
import { normalizeDomain as normalizeDomainUtil } from "./url-utils";

/**
 * Deduplicate company profiles by normalized domain.
 * Multiple pages from the same domain are merged into one profile.
 */
export function deduplicateCompanies(
  profiles: CompanyProfile[]
): {
  merged: CompanyProfile[];
  duplicatesRemoved: number;
  domainCounts: Map<string, number>;
} {
  const domainCounts = new Map<string, number>();
  const byDomain = new Map<string, CompanyProfile[]>();

  for (const profile of profiles) {
    const domain = normalizeDomainUtil(profile.domain);
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);

    if (!byDomain.has(domain)) {
      byDomain.set(domain, []);
    }
    byDomain.get(domain)!.push(profile);
  }

  const merged: CompanyProfile[] = [];
  let duplicatesRemoved = 0;

  for (const [domain, domainProfiles] of byDomain) {
    if (domainProfiles.length === 1) {
      merged.push(domainProfiles[0]);
    } else {
      merged.push(mergeCompanyProfiles(domainProfiles));
      duplicatesRemoved += domainProfiles.length - 1;
    }
  }

  return { merged, duplicatesRemoved, domainCounts };
}

/**
 * Check if a company profile already exists in a list by domain.
 */
export function isDuplicateDomain(
  domain: string,
  existing: CompanyProfile[]
): boolean {
  const normalized = normalizeDomainUtil(domain);
  return existing.some((p) => normalizeDomainUtil(p.domain) === normalized);
}

/**
 * Filter out profiles that are duplicates of existing ones by domain.
 */
export function filterDuplicates(
  profiles: CompanyProfile[],
  existing: CompanyProfile[]
): {
  newProfiles: CompanyProfile[];
  duplicates: CompanyProfile[];
} {
  const newProfiles: CompanyProfile[] = [];
  const duplicates: CompanyProfile[] = [];

  for (const profile of profiles) {
    if (isDuplicateDomain(profile.domain, existing)) {
      duplicates.push(profile);
    } else {
      newProfiles.push(profile);
    }
  }

  return { newProfiles, duplicates };
}

/**
 * Compute a confidence-adjusted qualification input from a company profile.
 * Maps company profile fields to lead raw_data for qualification scoring.
 */
export function profileToLeadRawData(
  profile: CompanyProfile
): Record<string, unknown> {
  const rawData: Record<string, unknown> = {};

  if (profile.industry) {
    rawData.industry = profile.industry;
  }
  if (profile.location) {
    rawData.country = profile.location;
    rawData.city = profile.location;
  }
  if (profile.companyName) {
    rawData.company_name = profile.companyName;
  }
  if (profile.contactEmail) {
    rawData.email = profile.contactEmail;
  }

  return rawData;
}
