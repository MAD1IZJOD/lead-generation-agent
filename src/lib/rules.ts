import type { Lead } from "./database.types";
import type { Workspace } from "./database.types";

export interface SuppressionEntry {
  email: string;
  reason: string;
}

export interface PricingCheck {
  allowed: boolean;
  reason?: string;
}

export interface ClaimCheck {
  approved: boolean;
  reason?: string;
}

/**
 * Check if an email is on the suppression list.
 */
export function isEmailSuppressed(
  email: string,
  suppressionList: SuppressionEntry[]
): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  return suppressionList.some(
    (entry) => entry.email.toLowerCase().trim() === normalizedEmail
  );
}

/**
 * Check if a lead email already exists within the workspace (deduplication).
 */
export function isDuplicateLead(
  email: string,
  existingLeads: Lead[]
): Lead | null {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = existingLeads.find(
    (lead) => lead.email.toLowerCase().trim() === normalizedEmail
  );
  return existing || null;
}

/**
 * Validate that a price meets the workspace pricing floor.
 */
export function checkPricingFloor(
  priceUsd: number,
  workspace: Workspace
): PricingCheck {
  const minimum = workspace.pricing.minimum_project_usd;
  if (priceUsd < minimum) {
    return {
      allowed: false,
      reason: `Price $${priceUsd} is below the minimum project price of $${minimum} ${workspace.pricing.currency.toUpperCase()}`,
    };
  }
  return { allowed: true };
}

/**
 * Check if a claim is in the workspace's approved claims list.
 */
export function checkClaimApproved(
  claim: string,
  workspace: Workspace
): ClaimCheck {
  const normalizedClaim = claim.toLowerCase().trim();
  const approved = workspace.approved_claims.some(
    (c) => c.toLowerCase().trim() === normalizedClaim
  );
  if (!approved) {
    return {
      approved: false,
      reason: `Claim "${claim}" is not in the approved claims list`,
    };
  }
  return { approved: true };
}

/**
 * Check if DRY RUN mode is enabled for a workspace.
 */
export function isDryRunEnabled(workspace: Workspace): boolean {
  return workspace.outreach_rules.dry_run !== false;
}

/**
 * Check if autonomous mode is enabled for a workspace.
 */
export function isAutonomousEnabled(workspace: Workspace): boolean {
  return workspace.outreach_rules.autonomous === true;
}

/**
 * Check if the daily send limit has been reached.
 */
export function isSendLimitReached(
  todaysSentCount: number,
  workspace: Workspace
): boolean {
  return todaysSentCount >= workspace.outreach_rules.max_emails_per_day;
}

/**
 * Check if a follow-up is allowed based on the follow-up limit and days between.
 */
export function canFollowUp(
  followUpCount: number,
  daysSinceLastContact: number,
  workspace: Workspace
): boolean {
  if (followUpCount >= workspace.outreach_rules.follow_up_limit) {
    return false;
  }
  if (daysSinceLastContact < workspace.outreach_rules.days_between_follow_ups) {
    return false;
  }
  return true;
}
