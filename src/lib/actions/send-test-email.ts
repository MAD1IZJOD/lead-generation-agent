"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { createEmailProvider, type EmailProviderConfig } from "@/lib/email/adapter";

/**
 * Send exactly one test email to a configured, explicitly authorized test address.
 *
 * This action is for verification purposes only. It:
 * - Requires authentication
 * - Requires an explicit confirmation token
 * - Sends to EMAIL_TEST_ADDRESS only (never to prospects)
 * - Respects DRY RUN mode (no real emails when enabled)
 * - Does not log email content or secrets
 *
 * @param confirmation - Must be the string "SEND_TEST_EMAIL" to proceed
 * @param testAddress - Optional override test address; if omitted, uses EMAIL_TEST_ADDRESS env var
 * @returns Result object with success flag and provider message ID (DRY RUN: mock ID)
 */
export async function sendTestEmail(
  confirmation: string,
  testAddress?: string
): Promise<{
  success: boolean;
  providerMessageId?: string;
  error?: string;
  dryRun?: boolean;
  sentTo?: string;
}> {
  // Require explicit confirmation token to prevent accidental sends
  if (confirmation !== "SEND_TEST_EMAIL") {
    return {
      success: false,
      error:
        'Confirmation token must be "SEND_TEST_EMAIL" to send a test email.',
    };
  }

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Determine the test address: prefer the explicit override, fall back to env
  const recipient =
    testAddress ?? process.env.EMAIL_TEST_ADDRESS;

  if (!recipient) {
    return {
      success: false,
      error:
        "No test address configured. Set EMAIL_TEST_ADDRESS or pass testAddress.",
    };
  }

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
  const isDryRun = config.testMode;

  try {
    const result = await provider.sendEmail({
      to: recipient,
      from: config.fromAddress,
      fromName: config.fromName,
      subject: "Lead Generation Agent — Test Email",
      body:
        "This is a test email from the Lead Generation Agent. " +
        "If you received this, your email provider integration is working. " +
        "No prospect data was included in this message.",
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Email send failed",
        dryRun: isDryRun,
        sentTo: recipient,
      };
    }

    // Audit log the test send (no email content or secrets)
    await supabase.from("audit_logs").insert({
      workspace_id: null,
      actor_id: user.id,
      action: "email.test.send",
      target_type: "system",
      target_id: null,
      metadata: {
        provider: provider.name,
        dry_run: isDryRun,
        recipient_domain: recipient.split("@")[1] ?? "unknown",
      },
    });

    return {
      success: true,
      providerMessageId: result.providerMessageId,
      dryRun: isDryRun,
      sentTo: recipient,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Test email send failed",
      dryRun: isDryRun,
      sentTo: recipient,
    };
  }
}
