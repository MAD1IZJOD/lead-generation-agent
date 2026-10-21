import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
  const { outreachId, action } = body;

  if (!outreachId || !action) {
    return NextResponse.json(
      { error: "outreachId and action are required" },
      { status: 400 }
    );
  }

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: 'action must be "approve" or "reject"' },
      { status: 400 }
    );
  }

  // Fetch the outreach record and verify workspace membership
  const { data: outreach, error: outreachError } = await supabase
    .from("outreach")
    .select(`
      *,
      workspaces (
        id, outreach_rules
      )
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

  // Verify the outreach is in pending_approval status
  if (outreach.status !== "pending_approval") {
    return NextResponse.json(
      { error: `Outreach is not pending approval (current status: ${outreach.status})` },
      { status: 400 }
    );
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  const { data: updated, error: updateError } = await supabase
    .from("outreach")
    .update({ status: newStatus })
    .eq("id", outreachId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    workspace_id: outreach.workspace_id,
    actor_id: user.id,
    action: action === "approve" ? "outreach.approved" : "outreach.rejected",
    target_type: "outreach",
    target_id: outreachId,
    metadata: { lead_id: outreach.lead_id, previous_status: "pending_approval" },
  });

  return NextResponse.json({
    success: true,
    outreach: updated,
    action,
  });
}
