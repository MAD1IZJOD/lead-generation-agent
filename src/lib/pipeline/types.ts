export type PipelineStage =
  | "lead"
  | "qualified"
  | "contacted"
  | "replied"
  | "meeting"
  | "proposal"
  | "won"
  | "lost";

export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  "lead",
  "qualified",
  "contacted",
  "replied",
  "meeting",
  "proposal",
  "won",
  "lost",
];

export interface PipelineStageRule {
  stage: PipelineStage;
  allowed_next: PipelineStage[];
}

export const PIPELINE_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  lead: ["qualified", "lost"],
  qualified: ["contacted", "lost"],
  contacted: ["replied", "lost"],
  replied: ["meeting", "lost"],
  meeting: ["proposal", "lost"],
  proposal: ["won", "lost"],
  won: [],
  lost: [],
};

export function canTransition(from: PipelineStage, to: PipelineStage): boolean {
  return PIPELINE_TRANSITIONS[from].includes(to);
}

export interface Deal {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  stage: PipelineStage;
  amount_cents: number;
  currency: string;
  expected_close_date: string | null;
  actual_close_date: string | null;
  next_action: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealInput {
  workspace_id: string;
  lead_id: string | null;
  stage: PipelineStage;
  amount_cents: number;
  currency: string;
  expected_close_date: string | null;
  next_action: string | null;
  notes: string | null;
}

export function validateDeal(input: DealInput): { valid: boolean; error?: string } {
  if (input.amount_cents < 0) {
    return { valid: false, error: "Amount must be non-negative" };
  }
  if (!input.workspace_id) {
    return { valid: false, error: "workspace_id is required" };
  }
  return { valid: true };
}
