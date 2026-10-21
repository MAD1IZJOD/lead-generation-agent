import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await params;
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
  const { claim, source_url, source_type, confidence } = body;

  if (!claim) {
    return NextResponse.json({ error: "Claim is required" }, { status: 400 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("workspace_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { data: evidence, error } = await supabase
    .from("lead_evidence")
    .insert({
      lead_id: leadId,
      workspace_id: lead.workspace_id,
      claim,
      source_url: source_url || null,
      source_type: source_type || null,
      confidence: confidence || 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    workspace_id: lead.workspace_id,
    actor_id: user.id,
    action: "evidence.added",
    target_type: "lead_evidence",
    target_id: evidence.id,
    metadata: { lead_id: leadId, claim },
  });

  return NextResponse.json({ evidence }, { status: 201 });
}
