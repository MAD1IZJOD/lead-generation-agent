"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { WorkspaceSettingsSchema, type WorkspaceSettingsInput } from "@/lib/validations/workspace";

export async function saveWorkspaceSettings(
  input: WorkspaceSettingsInput
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const validated = WorkspaceSettingsSchema.safeParse(input);
  if (!validated.success) {
    return { error: "Validation failed", issues: validated.error.flatten() };
  }

  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership) {
    return { error: "No workspace found for this user" };
  }

  const { data: workspace, error: updateError } = await supabase
    .from("workspaces")
    .update({
      name: validated.data.name,
      slug: validated.data.slug,
      company_profile: validated.data.company_profile,
      services: validated.data.services,
      pricing: validated.data.pricing,
      target_markets: validated.data.target_markets,
      icp: validated.data.icp,
      approved_claims: validated.data.approved_claims,
      brand_voice: validated.data.brand_voice,
      outreach_rules: validated.data.outreach_rules,
    })
    .eq("id", membership.workspace_id)
    .select()
    .single();

  if (updateError) {
    return { error: "Failed to save workspace settings" };
  }

  await supabase.from("audit_logs").insert({
    workspace_id: membership.workspace_id,
    actor_id: user.id,
    action: "workspace.settings.updated",
    target_type: "workspace",
    target_id: workspace.id,
    metadata: { fields: Object.keys(validated.data) },
  });

  return { success: true, workspace };
}

export async function getWorkspaceSettings() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership) {
    return { error: "No workspace found for this user" };
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", membership.workspace_id)
    .single();

  if (error) {
    return { error: "Failed to load workspace settings" };
  }

  return { success: true, workspace };
}
