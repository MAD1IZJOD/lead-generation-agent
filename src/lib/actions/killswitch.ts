"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function getKillSwitchStatus() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: setting, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("key", "kill_switch")
    .maybeSingle();

  if (error) {
    return { error: "Failed to load kill switch status" };
  }

  return {
    success: true,
    enabled: setting?.value?.enabled ?? false,
    reason: setting?.value?.reason ?? null,
    activatedAt: setting?.value?.activated_at ?? null,
    activatedBy: setting?.value?.activated_by ?? null,
  };
}

export async function toggleKillSwitch(enabled: boolean, reason?: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const now = new Date().toISOString();
  const value = {
    enabled,
    reason: enabled ? (reason ?? "Emergency kill switch activated") : null,
    activated_at: enabled ? now : null,
    activated_by: enabled ? user.id : null,
  };

  const { error } = await supabase
    .from("system_settings")
    .upsert({ key: "kill_switch", value }, { onConflict: "key" });

  if (error) {
    return { error: "Failed to update kill switch" };
  }

  await supabase.from("audit_logs").insert({
    workspace_id: null, // global action, not workspace-specific
    actor_id: user.id,
    action: enabled ? "kill_switch.activated" : "kill_switch.deactivated",
    target_type: "system",
    target_id: null,
    metadata: { enabled, reason },
  });

  return { success: true, enabled };
}

export async function getWorkspacePauseStatus(workspaceId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, name, paused, paused_at, pause_reason")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    return { error: "Failed to load workspace pause status" };
  }

  if (!workspace) {
    return { error: "Workspace not found" };
  }

  return {
    success: true,
    paused: workspace.paused,
    pausedAt: workspace.paused_at,
    pauseReason: workspace.pause_reason,
  };
}

export async function toggleWorkspacePause(
  workspaceId: string,
  paused: boolean,
  reason?: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify workspace membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "Not a member of this workspace" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("workspaces")
    .update({
      paused,
      paused_at: paused ? now : null,
      pause_reason: paused ? (reason ?? "Workspace paused") : null,
    })
    .eq("id", workspaceId);

  if (error) {
    return { error: "Failed to update workspace pause status" };
  }

  await supabase.from("audit_logs").insert({
    workspace_id: workspaceId,
    actor_id: user.id,
    action: paused ? "workspace.paused" : "workspace.unpaused",
    target_type: "workspace",
    target_id: workspaceId,
    metadata: { paused, reason },
  });

  return { success: true, paused };
}
