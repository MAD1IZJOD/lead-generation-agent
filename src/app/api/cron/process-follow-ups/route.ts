import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized invocation
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || !cronSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const now = new Date().toISOString();

  // Find outreach records with due follow-ups
  const { data: dueOutreach, error: queryError } = await supabase
    .from("outreach")
    .select(`
      *,
      leads (email, name, company, title),
      workspaces (outreach_rules, company_profile)
    `)
    .lte("next_follow_up_at", now)
    .in("status", ["sent", "delivered", "opened"]);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!dueOutreach || dueOutreach.length === 0) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  // Filter in code: follow_up_count < max_follow_ups
  const eligibleForFollowUp = dueOutreach.filter((outreach) => {
    const workspace = outreach.workspaces as {
      outreach_rules: Record<string, unknown>;
    };
    const maxFollowUps = (workspace.outreach_rules?.follow_up_limit as number) ?? 2;
    return (outreach.follow_up_count ?? 0) < maxFollowUps;
  });

  let processed = 0;
  let failed = 0;

  for (const outreach of eligibleForFollowUp) {
    try {
      const workspace = outreach.workspaces as {
        outreach_rules: Record<string, unknown>;
        company_profile: Record<string, unknown>;
      };

      const maxFollowUps = (workspace.outreach_rules?.follow_up_limit as number) ?? 2;
      const daysBetween = (workspace.outreach_rules?.days_between_follow_ups as number) ?? 7;
      const dryRun = workspace.outreach_rules?.dry_run !== false;

      // Create background job record
      const { data: job, error: jobError } = await supabase
        .from("background_jobs")
        .insert({
          workspace_id: outreach.workspace_id,
          job_type: "follow_up",
          status: "running",
          payload: {
            original_outreach_id: outreach.id,
            lead_id: outreach.lead_id,
            follow_up_count: outreach.follow_up_count + 1,
          },
          scheduled_at: now,
          started_at: now,
          max_retries: 3,
        })
        .select()
        .single();

      if (jobError) {
        throw jobError;
      }

      // Create the follow-up outreach record
      const nextFollowUpAt = new Date();
      nextFollowUpAt.setDate(nextFollowUpAt.getDate() + daysBetween);

      const { data: followUp, error: followUpError } = await supabase
        .from("outreach")
        .insert({
          workspace_id: outreach.workspace_id,
          lead_id: outreach.lead_id,
          channel: "email",
          subject: null,
          body: null,
          evidence_citations: [],
          idempotency_key: null,
          status: dryRun ? "draft" : "pending_approval",
          follow_up_count: outreach.follow_up_count + 1,
          original_outreach_id: outreach.id,
          next_follow_up_at: nextFollowUpAt.toISOString(),
          max_follow_ups: maxFollowUps,
        })
        .select()
        .single();

      if (followUpError) {
        throw followUpError;
      }

      // Update the original outreach's next_follow_up_at
      await supabase
        .from("outreach")
        .update({ next_follow_up_at: nextFollowUpAt.toISOString() })
        .eq("id", outreach.id);

      // Mark job as completed
      await supabase
        .from("background_jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", job.id);

      // Audit log
      await supabase.from("audit_logs").insert({
        workspace_id: outreach.workspace_id,
        actor_id: null,
        action: "follow_up.scheduled",
        target_type: "outreach",
        target_id: followUp.id,
        metadata: {
          original_outreach_id: outreach.id,
          follow_up_count: followUp.follow_up_count,
          dry_run: dryRun,
        },
      });

      processed++;
    } catch (err) {
      failed++;
      console.error("Failed to process follow-up for outreach", outreach.id, err);
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    failed,
    total: dueOutreach.length,
  });
}
