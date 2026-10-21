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
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const workspace_id = searchParams.get("workspace_id") || "";

  let query = supabase
    .from("leads")
    .select(`
      *,
      lead_evidence (
        id, claim, source_url, source_type, confidence, created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (workspace_id) {
    query = query.eq("workspace_id", workspace_id);
  }

  if (search) {
    query = query.ilike("email", `%${search}%`).or(`email.ilike.%${search}%,name.ilike.%${search}%,company.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: leads || [] });
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

  const body = await request.json();
  const { email, name, company, title, linkedin_url, website, source, workspace_id } = body;

  if (!email || !workspace_id) {
    return NextResponse.json({ error: "Email and workspace_id are required" }, { status: 400 });
  }

  // Check for duplicate lead within the workspace
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("workspace_id", workspace_id)
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "A lead with this email already exists in this workspace" },
      { status: 409 }
    );
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      workspace_id,
      email,
      name: name || null,
      company: company || null,
      title: title || null,
      linkedin_url: linkedin_url || null,
      website: website || null,
      source: source || null,
      raw_data: {},
      qualification_score: 0,
      status: "new",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    workspace_id,
    actor_id: user.id,
    action: "lead.created",
    target_type: "lead",
    target_id: lead.id,
    metadata: { email },
  });

  return NextResponse.json({ lead }, { status: 201 });
}
