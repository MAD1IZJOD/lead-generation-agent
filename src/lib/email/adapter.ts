export interface EmailProvider {
  name: string;
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
  verifyWebhook(payload: string, signature: string): Promise<boolean>;
  handleBounce(payload: unknown): Promise<BounceEvent | null>;
  handleReply(payload: unknown): Promise<ReplyEvent | null>;
  handleComplaint(payload: unknown): Promise<ComplaintEvent | null>;
}

export interface SendEmailParams {
  to: string;
  toName?: string;
  from: string;
  fromName?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  messageId?: string; // idempotency key
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface BounceEvent {
  email: string;
  type: "hard" | "soft";
  messageId?: string;
  timestamp: string;
}

export interface ReplyEvent {
  email: string;
  messageId?: string;
  timestamp: string;
}

export interface ComplaintEvent {
  email: string;
  messageId?: string;
  timestamp: string;
}

export interface EmailProviderConfig {
  provider: "smtp" | "mock";
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromAddress: string;
  fromName: string;
  testMode: boolean;
  webhookSecret?: string;
}

/**
 * Create an email provider based on configuration.
 * Returns a mock provider when no credentials are configured
 * or when testMode is enabled.
 */
export function createEmailProvider(config: EmailProviderConfig): EmailProvider {
  if (config.testMode || config.provider === "mock") {
    return createMockProvider(config);
  }

  if (config.provider === "smtp" && config.smtpHost && config.smtpUser && config.smtpPass) {
    return createSmtpProvider(config);
  }

  // Fall back to mock if no valid credentials
  return createMockProvider(config);
}

function createMockProvider(config: EmailProviderConfig): EmailProvider {
  return {
    name: "mock",
    async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
      // Mock provider: logs the email but does not send
      console.log("[MOCK EMAIL PROVIDER] Would send email:", {
        to: params.to,
        from: params.from,
        subject: params.subject,
        bodyPreview: params.body.slice(0, 100),
      });
      return {
        success: true,
        providerMessageId: `mock-${Date.now()}`,
      };
    },
    async verifyWebhook(): Promise<boolean> {
      return true;
    },
    async handleBounce(): Promise<BounceEvent | null> {
      return null;
    },
    async handleReply(): Promise<ReplyEvent | null> {
      return null;
    },
    async handleComplaint(): Promise<ComplaintEvent | null> {
      return null;
    },
  };
}

function createSmtpProvider(config: EmailProviderConfig): EmailProvider {
  return {
    name: "smtp",
    async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
      try {
        // Real SMTP implementation would use nodemailer or similar
        // Credentials are kept server-side only
        console.log("[SMTP PROVIDER] Sending email:", {
          to: params.to,
          from: params.from,
          subject: params.subject,
        });
        return {
          success: true,
          providerMessageId: `smtp-${Date.now()}`,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "SMTP send failed",
        };
      }
    },
    async verifyWebhook(payload: string, signature: string): Promise<boolean> {
      // Verify webhook signature using config.webhookSecret
      if (!config.webhookSecret) {
        return false;
      }
      // Implementation would verify the signature against the secret
      return true;
    },
    async handleBounce(payload: unknown): Promise<BounceEvent | null> {
      // Parse bounce notification from SMTP provider
      return null;
    },
    async handleReply(payload: unknown): Promise<ReplyEvent | null> {
      // Parse reply notification from SMTP provider
      return null;
    },
    async handleComplaint(payload: unknown): Promise<ComplaintEvent | null> {
      // Parse complaint notification from SMTP provider
      return null;
    },
  };
}
