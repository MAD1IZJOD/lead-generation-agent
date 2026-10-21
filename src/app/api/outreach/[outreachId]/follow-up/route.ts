import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  const { outreachId } = await params;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { delay_days } = body;

  // Fetch the outreach record with workspace info
  const { data: outreach, error: outreachError } = await supabase
    .from("outreach")
    .select(`
      *,
      workspaces (outreach_rules)
    `)
    .eq("id", outreachId)
    .maybeSingle();

  if (outreachError || !outreach) {
    return NextResponse.json({ error: "Outreach not found" }, { status: 404 });
  }

  // Verify workspace membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", outreach.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
  }

  const workspace = outreach.workspaces as { outreach_rules: Record<string, unknown> };
  const maxFollowUps = (workspace.outreach_rules?.follow_up_limit as number) ?? 2;

  // Check if we've reached the follow-up limit
  if (outreach.follow_up_count >= maxFollowUps) {
    return NextResponse.json(
      { error: `Follow-up limit of ${maxFollowUps} reached` },
      { status: 400 }
    );
  }

  // Calculate next follow-up time
  const delayDays = delay_days ?? (workspace.outreach_rules?.days_between_follow_ups as number) ?? 7;
  const nextFollowUpAt = new Date();
  nextFollowUpAt.setDate(nextFollowUpAt.getDate() + delayDays);

  // Create the follow-up outreach record
  const { data: followUp, error: createError } = await supabase
    .from("outreach")
    .insert({
      workspace_id: outreach.workspace_id,
      lead_id: outreach.lead_id,
      channel: "email",
      subject: null, // Will be filled when generating follow-up content
      body: null,
      evidence_citations: [],
      idempotency_key: null,
      status: "draft",
      follow_up_count: outreach.follow_up_count + 1,
      original_outreach_id: outreachId,
      next_follow_up_at: nextFollowUpAt.toISOString(),
      max_follow_ups: maxFollowUps,
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Update the original outreach's next_follow_up_at
  const { error: updateError } = await supabase
    .from("outreach")
    .update({ next_follow_up_at: nextFollowUpAt.toISOString() })
    .eq("id", outreachId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    workspace_id: outreach.workspace_id,
    actor_id: user.id,
    action: "follow_up.scheduled",
    target_type: "outreach",
    target_id: followUp.id,
    metadata: { original_outreach_id: outreachId, follow_up_count: followUp.follow_up_count, delay_days },
  });

  return NextResponse.json({
    success: true,
    follow_up: followUp,
    next_follow_up_at: nextFollowUpAt.toISOString(),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ outreachId: string }> }
) {
  const { outreachId } = await params;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch the outreach record
  const { data: outreach, error: outreachError } = await supabase
    .from("outreach")
    .select("*")
    .eq("id", outreachId)
    .maybeSingle();

  if (outreachError || !outreach) {
    return NextResponse.json({ error: "Outreach not found" }, { status: 404 });
  }

  // Verify workspace membership
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", outreach.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
  }

  // Cancel: set next_follow_up_at to null and mark as cancelled
  const { error: updateError } = await supabase
    .from("outreach")
    .update({ next_follow_up_at: null, status: "cancelled" })
    .eq("id", outreachId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Also cancel any pending follow-ups of this outreach
  await supabase
    .from("outreach")
    .update({ status: "cancelled", next_follow_up_at: null })
    .eq("original_outreach_id", outreachId)
    .eq("status", "draft");

  await supabase.from("audit_logs").insert({
    workspace_id: outreach.workspace_id,
    actor_id: user.id,
    action: "follow_up.cancelled",
    target_type: "outreach",
    target_id: outreachId,
    metadata: {},
  });

  return NextResponse.json({ success: true });
}
