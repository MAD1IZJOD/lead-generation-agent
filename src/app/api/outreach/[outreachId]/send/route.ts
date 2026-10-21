import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createEmailProvider, type EmailProviderConfig } from "@/lib/email/adapter";

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

  // Fetch the outreach record with lead and workspace info
  const { data: outreach, error: outreachError } = await supabase
    .from("outreach")
    .select(`
      *,
      leads (
        email, name, company, title
      ),
      workspaces (
        id, outreach_rules, company_profile
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

  // Verify the outreach is approved
  if (outreach.status !== "approved") {
    return NextResponse.json(
      { error: `Outreach is not approved (current status: ${outreach.status})` },
      { status: 400 }
    );
  }

  const lead = outreach.leads as { email: string; name: string | null; company: string | null };
  const outreachRules = (outreach.workspaces as { outreach_rules: Record<string, unknown> }).outreach_rules;
  const dryRun = outreachRules?.dry_run !== false;

  // Build email provider config from environment
  const config: EmailProviderConfig = {
    provider: (process.env.EMAIL_PROVIDER as "smtp" | "mock") || "mock",
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromAddress: process.env.EMAIL_FROM_ADDRESS || "noreply@example.com",
    fromName: process.env.EMAIL_FROM_NAME || "Lead Generation Agent",
    testMode: process.env.EMAIL_PROVIDER !== "smtp" || !process.env.SMTP_HOST,
    webhookSecret: process.env.EMAIL_WEBHOOK_SECRET,
  };

  const provider = createEmailProvider(config);

  // Check DRY RUN / test mode
  const isDryRun = dryRun || config.testMode;

  const sendParams = {
    to: lead.email,
    toName: lead.name ?? undefined,
    from: config.fromAddress,
    fromName: config.fromName,
    subject: outreach.subject || "Introduction",
    body: outreach.body,
    messageId: outreach.id,
  };

  let result;
  if (isDryRun) {
    // DRY RUN: don't actually send, just record
    result = {
      success: true,
      providerMessageId: `dry-run-${Date.now()}`,
    };
    console.log("[DRY RUN] Would send email:", sendParams);
  } else {
    result = await provider.sendEmail(sendParams);
  }

  if (!result.success) {
    await supabase.from("outreach").update({ status: "failed" }).eq("id", outreachId);
    await supabase.from("audit_logs").insert({
      workspace_id: outreach.workspace_id,
      actor_id: user.id,
      action: "outreach.send.failed",
      target_type: "outreach",
      target_id: outreachId,
      metadata: { error: result.error, lead_id: outreach.lead_id },
    });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Update outreach status
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("outreach")
    .update({
      status: isDryRun ? "draft" : "sent",
      sent_at: isDryRun ? null : now,
    })
    .eq("id", outreachId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    workspace_id: outreach.workspace_id,
    actor_id: user.id,
    action: isDryRun ? "outreach.send.dry_run" : "outreach.sent",
    target_type: "outreach",
    target_id: outreachId,
    metadata: {
      lead_id: outreach.lead_id,
      provider_message_id: result.providerMessageId,
      dry_run: isDryRun,
    },
  });

  return NextResponse.json({
    success: true,
    outreach: updated,
    dry_run: isDryRun,
    provider_message_id: result.providerMessageId,
  });
}
