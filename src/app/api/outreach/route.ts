import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorizeSend, checkIdempotencyKey, getSuppressionList, getTodaysSentCount } from "@/lib/send-authorization";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const workspace_id = searchParams.get("workspace_id") || "";
  const status = searchParams.get("status") || "";
  const lead_id = searchParams.get("lead_id") || "";

  let query = supabase
    .from("outreach")
    .select("*, leads (email, name, company)")
    .order("created_at", { ascending: false });

  if (workspace_id) {
    query = query.eq("workspace_id", workspace_id);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (lead_id) {
    query = query.eq("lead_id", lead_id);
  }

  const { data: outreach, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ outreach: outreach || [] });
}

export async function POST(request: Request) {
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

  const requestBody = await request.json();
  const { workspace_id, lead_id, channel, subject, body, evidence_citations, idempotency_key } = requestBody;

  if (!workspace_id || !lead_id || !body) {
    return NextResponse.json(
      { error: "workspace_id, lead_id, and body are required" },
      { status: 400 }
    );
  }

  // Check idempotency key - prevent duplicate sends
  if (idempotency_key) {
    const { exists, outreachId } = await checkIdempotencyKey(workspace_id, idempotency_key);
    if (exists) {
      return NextResponse.json({
        error: "Outreach with this idempotency key already exists",
        outreach_id: outreachId,
      }, { status: 409 });
    }
  }

  // Fetch lead and workspace
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", lead_id)
    .eq("workspace_id", workspace_id)
    .maybeSingle();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspace_id)
    .single();

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Get suppression list and today's sent count
  const suppressionList = await getSuppressionList(workspace_id);
  const todaysSentCount = await getTodaysSentCount(workspace_id);

  // Run send authorization
  const authorization = await authorizeSend({
    workspace,
    lead,
    suppressionList,
    todaysSentCount,
    idempotencyKey: idempotency_key,
  });

  if (!authorization.authorized) {
    return NextResponse.json(
      { error: authorization.reason, checks: authorization.checks },
      { status: 403 }
    );
  }

  // Determine initial status: DRY RUN creates drafts, SUPERVISED
  // requires approval before sending. AUTONOMOUS is not available.
  const initialStatus = authorization.dryRun ? "draft" : "pending_approval";

  const { data: outreachRecord, error } = await supabase
    .from("outreach")
    .insert({
      workspace_id,
      lead_id,
      channel: channel || "email",
      subject: subject || null,
      body,
      evidence_citations: evidence_citations || [],
      idempotency_key: idempotency_key || null,
      status: initialStatus,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    workspace_id,
    actor_id: user.id,
    action: "outreach.created",
    target_type: "outreach",
    target_id: outreachRecord.id,
    metadata: { lead_id, channel, dry_run: authorization.dryRun, idempotency_key },
  });

  return NextResponse.json(
    { outreach: outreachRecord, dry_run: authorization.dryRun, authorized: true },
    { status: 201 }
  );
}
