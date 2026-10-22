import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createEmailProvider, type EmailProviderConfig } from "@/lib/email/adapter";
import {
  classifyReply,
  requiresHumanReview,
  shouldStopFollowUps,
  type ClassificationResult,
  type ReplyClassification,
} from "@/lib/discovery/message-classifier";
import { generateReply } from "@/lib/discovery/reply-generator";
import type { Workspace } from "@/lib/database.types";

/**
 * Handle inbound email reply webhook.
 *
 * Classifies the reply, generates a suggested response using approved
 * workspace facts, routes uncertain/high-risk cases to human review,
 * and stops follow-ups when appropriate (unsubscribe, complaint,
 * bounce, not_interested).
 *
 * DRY RUN: No real emails are sent. All actions are recorded in the
 * audit log.
 */
export async function POST(request: Request) {
  // Verify webhook signature
  const signature = request.headers.get("x-webhook-signature");
  const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
  }

  const payload = await request.text();

  const config: EmailProviderConfig = {
    provider: "smtp",
    fromAddress: process.env.EMAIL_FROM_ADDRESS || "noreply@example.com",
    fromName: process.env.EMAIL_FROM_NAME || "Lead Generation Agent",
    testMode: false,
    webhookSecret,
  };

  const provider = createEmailProvider(config);
  const isValid = await provider.verifyWebhook(payload, signature);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let replyEvent;
  try {
    replyEvent = await provider.handleReply(JSON.parse(payload));
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!replyEvent) {
    return NextResponse.json({ error: "No reply event found" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
      },
    }
  );

  // Find outreach records for this email
  const { data: outreachRecords, error: outreachError } = await supabase
    .from("outreach")
    .select("*, leads (email, name, company), workspaces (*, outreach_rules, company_profile, brand_voice, approved_claims, pricing, services)")
    .eq("leads.email", replyEvent.email)
    .in("status", ["sent", "delivered", "opened"]);

  if (outreachError) {
    return NextResponse.json({ error: outreachError.message }, { status: 500 });
  }

  if (!outreachRecords || outreachRecords.length === 0) {
    return NextResponse.json({ error: "No active outreach found for this email" }, { status: 404 });
  }

  const results = [];

  for (const outreach of outreachRecords) {
    const workspaceId = (outreach.leads as { workspace_id: string }).workspace_id;
    const leadId = (outreach.leads as { id: string }).id;
    const leadName = (outreach.leads as { name: string | null }).name;
    const leadCompany = (outreach.leads as { company: string | null }).company;
    const workspace = outreach.workspaces as Workspace;

    // Classify the reply using the reply text content
    const classification = classifyReply(replyEvent.text ?? "", replyEvent.email);

    // Generate suggested reply if appropriate
    // Skip reply generation for unsubscribe, bounce, and complaint
    let suggestedReply;
    if (
      classification.category !== "bounce" &&
      classification.category !== "complaint" &&
      classification.category !== "unsubscribe"
    ) {
      suggestedReply = generateReply(
        classification.category,
        leadName,
        leadCompany,
        workspace,
        replyEvent.email
      );
    }

    // Determine if follow-ups should be stopped
    const stopFollowUps = shouldStopFollowUps(classification.category);

    // Determine if human review is required
    const needsReview = requiresHumanReview(classification.category);

    // Update outreach record
    const updateData: Record<string, unknown> = {
      status: "replied",
    };

    await supabase
      .from("outreach")
      .update(updateData)
      .eq("id", outreach.id);

    // Stop follow-ups when appropriate
    if (stopFollowUps) {
      await supabase
        .from("outreach")
        .update({ status: "cancelled", next_follow_up_at: null })
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .in("status", ["draft", "pending_approval"]);
    }

    // Audit log with classification details
    await supabase.from("audit_logs").insert({
      workspace_id: workspaceId,
      actor_id: null,
      action: "outreach.replied",
      target_type: "outreach",
      target_id: outreach.id,
      metadata: {
        email: replyEvent.email,
        classification: classification.category,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        requiresHumanReview: needsReview,
        stopFollowUps,
        suggestedReply: suggestedReply
          ? {
              subject: suggestedReply.subject,
              bodyPreview: suggestedReply.body.slice(0, 200),
              confidence: suggestedReply.confidence,
              usesApprovedClaims: suggestedReply.usesApprovedClaims,
            }
          : null,
      },
    });

    results.push({
      outreachId: outreach.id,
      workspaceId,
      leadId,
      classification: {
        category: classification.category,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        matchedPatterns: classification.matchedPatterns,
      },
      suggestedReply: suggestedReply
        ? {
            subject: suggestedReply.subject,
            body: suggestedReply.body,
            confidence: suggestedReply.confidence,
            usesApprovedClaims: suggestedReply.usesApprovedClaims,
          }
        : null,
      requiresHumanReview: needsReview,
      stopFollowUps,
    });
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}
