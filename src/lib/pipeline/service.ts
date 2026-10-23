import { createClient } from "@/lib/supabase/server";
import { canTransition } from "./types";
import type { Deal, DealInput, PipelineStage } from "./types";

export async function createDeal(input: DealInput): Promise<Deal> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .insert({
      workspace_id: input.workspace_id,
      lead_id: input.lead_id,
      stage: input.stage,
      amount_cents: input.amount_cents,
      currency: input.currency,
      expected_close_date: input.expected_close_date,
      next_action: input.next_action,
      notes: input.notes,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create deal");
  }
  return data as Deal;
}

export async function getDeal(dealId: string, workspaceId: string): Promise<Deal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? null) as Deal | null;
}

export async function updateDealStage(
  dealId: string,
  workspaceId: string,
  stage: PipelineStage,
): Promise<Deal> {
  const supabase = await createClient();

  const existing = await getDeal(dealId, workspaceId);
  if (!existing) {
    throw new Error("Deal not found");
  }

  if (!canTransition(existing.stage, stage)) {
    throw new Error(
      `Cannot transition from ${existing.stage} to ${stage}`,
    );
  }

  const { data, error } = await supabase
    .from("deals")
    .update({
      stage,
      updated_at: new Date().toISOString(),
      ...(stage === "won" || stage === "lost"
        ? { actual_close_date: new Date().toISOString() }
        : {}),
    })
    .eq("id", dealId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update deal stage");
  }
  return data as Deal;
}

export async function updateDeal(
  dealId: string,
  workspaceId: string,
  updates: Partial<
    Pick<
      Deal,
      "stage" | "amount_cents" | "currency" | "expected_close_date" | "next_action" | "notes"
    >
  >,
): Promise<Deal> {
  const supabase = await createClient();

  const existing = await getDeal(dealId, workspaceId);
  if (!existing) {
    throw new Error("Deal not found");
  }

  if (updates.stage && updates.stage !== existing.stage) {
    if (!canTransition(existing.stage, updates.stage)) {
      throw new Error(
        `Cannot transition from ${existing.stage} to ${updates.stage}`,
      );
    }
  }

  const { data, error } = await supabase
    .from("deals")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      ...(updates.stage === "won" || updates.stage === "lost"
        ? { actual_close_date: new Date().toISOString() }
        : {}),
    })
    .eq("id", dealId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update deal");
  }
  return data as Deal;
}

export async function listDeals(
  workspaceId: string,
  stage?: PipelineStage,
): Promise<Deal[]> {
  const supabase = await createClient();
  let query = supabase
    .from("deals")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (stage) {
    query = query.eq("stage", stage);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Deal[];
}

export async function deleteDeal(dealId: string, workspaceId: string): Promise<void> {
  const supabase = await createClient();

  const existing = await getDeal(dealId, workspaceId);
  if (!existing) {
    throw new Error("Deal not found");
  }

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", dealId)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }
}
