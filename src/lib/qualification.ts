import type { Lead, Workspace } from "@/lib/database.types";

export interface QualificationFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  reason: string;
}

export interface QualificationResult {
  totalScore: number; // 0-100
  breakdown: QualificationFactor[];
  tier: "cold" | "warm" | "hot";
}

export function qualifyLead(
  lead: Lead,
  workspace: Workspace
): QualificationResult {
  const factors: QualificationFactor[] = [];

  // Factor 1: Has email (essential)
  const hasEmailScore = lead.email ? 100 : 0;
  factors.push({
    name: "Has contact email",
    score: hasEmailScore,
    weight: 0.25,
    reason: lead.email
      ? "Email address is available for outreach"
      : "No email address - cannot contact",
  });

  // Factor 2: Has company information
  const hasCompanyScore = lead.company ? 100 : 0;
  factors.push({
    name: "Has company information",
    score: hasCompanyScore,
    weight: 0.2,
    reason: lead.company
      ? `Company ${lead.company} is identified`
      : "No company information",
  });

  // Factor 3: Website presence (indicates business maturity)
  const hasWebsiteScore = lead.website ? 100 : 0;
  factors.push({
    name: "Has website",
    score: hasWebsiteScore,
    weight: 0.15,
    reason: lead.website
      ? "Website found - business has online presence"
      : "No website found",
  });

  // Factor 4: ICP industry match
  const industryMatch = workspace.icp.industries.some((ind) =>
    (lead.raw_data as Record<string, unknown> | undefined)?.industry
      ? String((lead.raw_data as Record<string, unknown>).industry)
        .toLowerCase()
        .includes(ind.toLowerCase())
      : false
  );
  const industryScore = industryMatch ? 100 : 40;
  factors.push({
    name: "ICP industry match",
    score: industryScore,
    weight: 0.15,
    reason: industryMatch
      ? "Industry matches ideal customer profile"
      : "Industry does not match ICP or is unknown",
  });

  // Factor 5: ICP job title match
  const titleMatch = workspace.icp.job_titles.some((title) =>
    lead.title
      ? lead.title.toLowerCase().includes(title.toLowerCase())
      : false
  );
  const titleScore = titleMatch ? 100 : 50;
  factors.push({
    name: "ICP job title match",
    score: titleScore,
    weight: 0.15,
    reason: titleMatch
      ? `Title "${lead.title}" matches ICP`
      : lead.title
        ? `Title "${lead.title}" does not match ICP`
        : "No title information",
  });

  // Factor 6: Target market match
  const countryMatch = workspace.target_markets.some((market) =>
    (lead.raw_data as Record<string, unknown> | undefined)?.country
      ? String((lead.raw_data as Record<string, unknown>).country)
        .toLowerCase()
        .includes(market.toLowerCase())
      : false
  );
  const countryScore = countryMatch ? 100 : 30;
  factors.push({
    name: "Target market match",
    score: countryScore,
    weight: 0.1,
    reason: countryMatch
      ? "Country is in target markets"
      : "Country not in target markets or unknown",
  });

  // Calculate weighted total
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + (f.score / 100) * f.weight, 0) * 100
  );

  // Determine tier
  let tier: "cold" | "warm" | "hot";
  if (totalScore >= 75) {
    tier = "hot";
  } else if (totalScore >= 50) {
    tier = "warm";
  } else {
    tier = "cold";
  }

  return {
    totalScore,
    breakdown: factors,
    tier,
  };
}

export function formatScoreBreakdown(result: QualificationResult): string {
  const lines = [`Qualification score: ${result.totalScore}/100 (${result.tier})`];
  for (const factor of result.breakdown) {
    const weighted = Math.round((factor.score / 100) * factor.weight * 100);
    lines.push(
      `  - ${factor.name}: ${factor.score}/100 (weight ${Math.round(factor.weight * 100)}%) = ${weighted} points`
    );
    lines.push(`    ${factor.reason}`);
  }
  return lines.join("\n");
}
