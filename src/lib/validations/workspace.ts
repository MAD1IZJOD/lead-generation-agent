import { z } from "zod";

export const WorkspaceCompanyProfileSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  website: z.string().url("Enter a valid website URL"),
  contact_email: z.string().email("Enter a valid contact email"),
  description: z.string().min(1, "Company description is required"),
});

export const WorkspaceServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().min(1, "Service description is required"),
  starting_price_usd: z
    .number()
    .positive("Starting price must be greater than zero"),
  currency: z.string().min(1, "Currency is required"),
});

export const WorkspacePricingSchema = z.object({
  minimum_project_usd: z
    .number()
    .nonnegative("Minimum project price must be zero or greater"),
  currency: z.string().min(1, "Currency is required"),
});

export const WorkspaceICPSchema = z.object({
  industries: z.array(z.string()).min(1, "At least one industry is required"),
  company_sizes: z
    .array(z.string())
    .min(1, "At least one company size is required"),
  job_titles: z.array(z.string()).min(1, "At least one job title is required"),
  pain_points: z
    .array(z.string())
    .min(1, "At least one pain point is required"),
});

export const WorkspaceBrandVoiceSchema = z.object({
  tone: z.string().min(1, "Tone is required"),
  formality: z.enum(["casual", "professional", "formal"]),
  do_not_claim: z.array(z.string()).default([]),
});

export const WorkspaceOutreachRulesSchema = z.object({
  max_emails_per_day: z
    .number()
    .int()
    .positive("Max emails per day must be a positive integer"),
  follow_up_limit: z
    .number()
    .int()
    .nonnegative("Follow-up limit must be zero or greater"),
  days_between_follow_ups: z
    .number()
    .int()
    .positive("Days between follow-ups must be a positive integer"),
  dry_run: z.boolean().default(true),
  autonomous: z.boolean().default(false),
});

export const WorkspaceSettingsSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  company_profile: WorkspaceCompanyProfileSchema,
  services: z.array(WorkspaceServiceSchema).min(1, "At least one service is required"),
  pricing: WorkspacePricingSchema,
  target_markets: z.array(z.string()).min(1, "At least one target market is required"),
  icp: WorkspaceICPSchema,
  approved_claims: z.array(z.string()).default([]),
  brand_voice: WorkspaceBrandVoiceSchema,
  outreach_rules: WorkspaceOutreachRulesSchema,
});

export type WorkspaceCompanyProfileInput = z.infer<
  typeof WorkspaceCompanyProfileSchema
>;
export type WorkspaceServiceInput = z.infer<typeof WorkspaceServiceSchema>;
export type WorkspacePricingInput = z.infer<typeof WorkspacePricingSchema>;
export type WorkspaceICPInput = z.infer<typeof WorkspaceICPSchema>;
export type WorkspaceBrandVoiceInput = z.infer<typeof WorkspaceBrandVoiceSchema>;
export type WorkspaceOutreachRulesInput = z.infer<
  typeof WorkspaceOutreachRulesSchema
>;
export type WorkspaceSettingsInput = z.infer<typeof WorkspaceSettingsSchema>;
