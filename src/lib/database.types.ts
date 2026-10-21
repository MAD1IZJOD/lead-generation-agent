export interface Workspace {
  id: string;
  name: string;
  slug: string;
  company_profile: WorkspaceCompanyProfile;
  services: WorkspaceService[];
  pricing: WorkspacePricing;
  target_markets: string[];
  icp: WorkspaceICP;
  approved_claims: string[];
  brand_voice: WorkspaceBrandVoice;
  outreach_rules: WorkspaceOutreachRules;
  paused: boolean;
  paused_at: string | null;
  pause_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCompanyProfile {
  company_name: string;
  website: string;
  contact_email: string;
  description: string;
}

export interface WorkspaceService {
  name: string;
  description: string;
  starting_price_usd: number;
  currency: string;
}

export interface WorkspacePricing {
  minimum_project_usd: number;
  currency: string;
}

export interface WorkspaceICP {
  industries: string[];
  company_sizes: string[];
  job_titles: string[];
  pain_points: string[];
}

export interface WorkspaceBrandVoice {
  tone: string;
  formality: "casual" | "professional" | "formal";
  do_not_claim: string[];
}

export interface WorkspaceOutreachRules {
  max_emails_per_day: number;
  follow_up_limit: number;
  days_between_follow_ups: number;
  dry_run: boolean;
  autonomous: boolean;
}

export interface Lead {
  id: string;
  workspace_id: string;
  email: string;
  name: string | null;
  company: string | null;
  title: string | null;
  linkedin_url: string | null;
  website: string | null;
  source: string | null;
  raw_data: Record<string, unknown>;
  qualification_score: number;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
  lead_evidence?: LeadEvidence[];
}

export type LeadStatus = "new" | "qualified" | "contacted" | "replied" | "converted" | "opt_out";

export interface LeadEvidence {
  id: string;
  lead_id: string;
  workspace_id: string;
  claim: string;
  source_url: string | null;
  source_type: string | null;
  confidence: number;
  created_at: string;
}

export interface Outreach {
  id: string;
  workspace_id: string;
  lead_id: string;
  channel: string;
  subject: string | null;
  body: string;
  evidence_citations: string[];
  status: OutreachStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OutreachStatus = "draft" | "sent" | "delivered" | "opened" | "replied" | "bounced" | "failed";

export interface SuppressionEntry {
  id: string;
  workspace_id: string;
  email: string;
  reason: string;
  source: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RevenueRecord {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  amount_cents: number;
  currency: string;
  type: RevenueType;
  source: string;
  recorded_at: string;
}

export type RevenueType = "collected" | "projected" | "contract_signed";

export interface CostRecord {
  id: string;
  workspace_id: string;
  provider: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  recorded_at: string;
}
