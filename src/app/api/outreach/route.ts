import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
  const { workspace_id, lead_id, channel, subject, body, evidence_citations } = requestBody;

  if (!workspace_id || !lead_id || !body) {
    return NextResponse.json(
      { error: "workspace_id, lead_id, and body are required" },
      { status: 400 }
    );
  }

  // Check suppression list - do not outreach to opted-out contacts
  const { data: suppression } = await supabase
    .from("suppression_list")
    .select("id")
    .eq("workspace_id", workspace_id)
    .eq("email", (await supabase.from("leads").select("email").eq("id", lead_id).maybeSingle()).data?.email)
    .maybeSingle();

  if (suppression) {
    return NextResponse.json(
      { error: "This lead is on the suppression list and cannot be contacted" },
      { status: 409 }
    );
  }

  // Check for existing outreach to this lead (deduplication)
  const { data: existingOutreach } = await supabase
    .from("outreach")
    .select("id, status")
    .eq("workspace_id", workspace_id)
    .eq("lead_id", lead_id)
    .in("status", ["draft", "sent", "delivered", "opened"])
    .maybeSingle();

  if (existingOutreach) {
    return NextResponse.json(
      { error: "Outreach already exists for this lead" },
      { status: 409 }
    );
  }

  // Get workspace outreach rules for DRY RUN check
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("outreach_rules")
    .eq("id", workspace_id)
    .single();

  const isDryRun = workspace?.outreach_rules?.dry_run ?? true;

  // Determine initial status based on DRY RUN mode
  const initialStatus = isDryRun ? "draft" : "draft";

  const { data: outreachRecord, error } = await supabase
    .from("outreach")
    .insert({
      workspace_id,
      lead_id,
      channel: channel || "email",
      subject: subject || null,
      body,
      evidence_citations: evidence_citations || [],
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
    metadata: { lead_id, channel, dry_run: isDryRun },
  });

  return NextResponse.json(
    { outreach: outreachRecord, dry_run: isDryRun },
    { status: 201 }
  );
}
