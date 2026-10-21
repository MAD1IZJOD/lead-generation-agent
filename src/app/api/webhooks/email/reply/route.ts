import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createEmailProvider, type EmailProviderConfig } from "@/lib/email/adapter";

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
    .select("*, leads (email, workspace_id)")
    .eq("leads.email", replyEvent.email)
    .in("status", ["sent", "delivered", "opened"]);

  if (outreachError) {
    return NextResponse.json({ error: outreachError.message }, { status: 500 });
  }

  if (!outreachRecords || outreachRecords.length === 0) {
    return NextResponse.json({ error: "No active outreach found for this email" }, { status: 404 });
  }

  // Update each outreach record to replied and cancel pending follow-ups
  for (const outreach of outreachRecords) {
    const workspaceId = (outreach.leads as { workspace_id: string }).workspace_id;
    const leadId = (outreach.leads as { id: string }).id;

    await supabase
      .from("outreach")
      .update({ status: "replied" })
      .eq("id", outreach.id);

    // Stop follow-ups when a prospect replies
    await supabase
      .from("outreach")
      .update({ status: "cancelled", next_follow_up_at: null })
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .in("status", ["draft", "pending_approval"]);

    // Audit log
    await supabase.from("audit_logs").insert({
      workspace_id: workspaceId,
      actor_id: null,
      action: "outreach.replied",
      target_type: "outreach",
      target_id: outreach.id,
      metadata: { email: replyEvent.email },
    });
  }

  return NextResponse.json({ success: true, processed: outreachRecords.length });
}
