import { createClient } from "@/lib/supabase/server";
import {
  isEmailSuppressed,
  isDuplicateLead,
  isSendLimitReached,
  isDryRunEnabled,
  type SuppressionEntry,
} from "./rules";
import type { Workspace, Lead } from "./database.types";

export interface SendAuthorizationResult {
  authorized: boolean;
  reason?: string;
  dryRun: boolean;
  checks: SendCheck[];
}

export interface SendCheck {
  name: string;
  passed: boolean;
  reason?: string;
}

export interface SendContext {
  workspace: Workspace;
  lead: Lead;
  suppressionList: SuppressionEntry[];
  todaysSentCount: number;
  idempotencyKey?: string;
}

/**
 * Authorize an outbound send against all compliance rules.
 * Returns detailed check results explaining why a send was
 * allowed or blocked.
 */
export async function authorizeSend(context: SendContext): Promise<SendAuthorizationResult> {
  const checks: SendCheck[] = [];
  let authorized = true;
  let blockReason: string | undefined;

  // Check 1: Global kill switch
  const supabase = await createClient();
  const { data: killSwitch } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "kill_switch")
    .maybeSingle();

  const killSwitchValue = killSwitch?.value as
    | { enabled?: boolean; reason?: string; activated_at?: string; activated_by?: string }
    | undefined;
  const killSwitchEnabled = killSwitchValue?.enabled ?? false;
  checks.push({
    name: "Global kill switch",
    passed: !killSwitchEnabled,
    reason: killSwitchEnabled
      ? `Global kill switch is active: ${killSwitchValue?.reason ?? "Emergency stop"}`
      : undefined,
  });

  if (killSwitchEnabled) {
    authorized = false;
    blockReason = "Global kill switch is active";
  }

  // Check 2: Workspace pause
  if (context.workspace.paused) {
    checks.push({
      name: "Workspace pause",
      passed: false,
      reason: `Workspace is paused: ${context.workspace.pause_reason ?? "No reason provided"}`,
    });
    authorized = false;
    blockReason = "Workspace is paused";
  } else {
    checks.push({
      name: "Workspace pause",
      passed: true,
    });
  }

  // Check 3: DRY RUN mode
  const dryRun = isDryRunEnabled(context.workspace);
  checks.push({
    name: "DRY RUN mode",
    passed: true,
    reason: dryRun ? "DRY RUN is active - no real emails will be sent" : undefined,
  });

  // Check 4: Suppression list
  const suppressed = isEmailSuppressed(context.lead.email, context.suppressionList);
  checks.push({
    name: "Suppression list",
    passed: !suppressed,
    reason: suppressed ? "Contact is on the suppression list" : undefined,
  });

  if (suppressed) {
    authorized = false;
    blockReason = "Contact is on the suppression list";
  }

  // Check 5: Daily send limit
  const limitReached = isSendLimitReached(context.todaysSentCount, context.workspace);
  checks.push({
    name: "Daily send limit",
    passed: !limitReached,
    reason: limitReached
      ? `Daily limit of ${context.workspace.outreach_rules.max_emails_per_day} emails reached`
      : undefined,
  });

  if (limitReached) {
    authorized = false;
    blockReason = "Daily send limit reached";
  }

  // Check 6: Duplicate send to same lead (already contacted today)
  const alreadyContacted = isDuplicateLead(context.lead.email, [context.lead]);
  checks.push({
    name: "Duplicate lead check",
    passed: !alreadyContacted,
    reason: alreadyContacted ? "Lead already exists in this workspace" : undefined,
  });

  return {
    authorized,
    reason: blockReason,
    dryRun,
    checks,
  };
}

export async function getTodaysSentCount(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: count } = await supabase
    .from("outreach")
    .select("id", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString())
    .eq("channel", "email")
    .in("status", ["sent", "delivered", "opened", "replied"]);

  return count?.length ?? 0;
}

export async function getSuppressionList(workspaceId: string): Promise<SuppressionEntry[]> {
  const supabase = await createClient();
  const { data: suppression } = await supabase
    .from("suppression_list")
    .select("email, reason")
    .eq("workspace_id", workspaceId);

  return (suppression ?? []).map((entry) => ({
    email: entry.email,
    reason: entry.reason,
  }));
}

export async function checkIdempotencyKey(
  workspaceId: string,
  idempotencyKey: string
): Promise<{ exists: boolean; outreachId?: string }> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("outreach")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("metadata->>idempotency_key", idempotencyKey)
    .maybeSingle();

  return {
    exists: !!existing,
    outreachId: existing?.id,
  };
}
