import type { Workspace } from "@/lib/database.types";
import type { ReplyClassification } from "./message-classifier";

/**
 * Structured components of a suggested reply.
 */
export interface ReplyDraft {
  subject: string;
  body: string;
  confidence: number; // 0.0 to 1.0
  reasoning: string[];
  usesApprovedClaims: boolean;
}

/**
 * Extract approved claim text that is relevant to a given topic.
 */
function findApprovedClaim(
  workspace: Workspace,
  keywords: string[]
): string | null {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  for (const claim of workspace.approved_claims) {
    const lowerClaim = claim.toLowerCase();
    if (lowerKeywords.some((kw) => lowerClaim.includes(kw))) {
      return claim;
    }
  }
  return null;
}

/**
 * Build a pricing statement from workspace pricing data.
 * Never invent discounts or prices below the minimum project price.
 */
function buildPricingStatement(workspace: Workspace): string {
  const { minimum_project_usd, currency } = workspace.pricing;
  const currencySymbol = currency === "usd" ? "$" : currency;
  const services = workspace.services
    .map((s) => `${s.name} starting at ${currencySymbol}${s.starting_price_usd}`)
    .join("; ");
  return `Our services start at ${currencySymbol}${minimum_project_usd} ${currency.toUpperCase()}. ${services}.`;
}

function priceString(workspace: Workspace): string {
  const { minimum_project_usd, currency } = workspace.pricing;
  const currencySymbol = currency === "usd" ? "$" : currency;
  return `${currencySymbol}${minimum_project_usd} ${currency.toUpperCase()}`;
}

/**
 * Build a brand-voice-appropriate closing based on formality level.
 */
function buildClosing(brandVoice: WorkspaceBrandVoice): string {
  switch (brandVoice.formality) {
    case "formal":
      return `Sincerely,\nThe ${brandVoice.tone} Team`;
    case "professional":
      return `Best regards,\nThe ${brandVoice.tone} Team`;
    case "casual":
    default:
      return `Thanks,\nThe ${brandVoice.tone} Team`;
  }
}

/**
 * Generate a suggested reply for an inbound message.
 *
 * Uses ONLY approved workspace claims, service descriptions, pricing floors,
 * and brand voice configuration. Never invents claims, never promises
 * unapproved discounts, and never negotiates contracts autonomously.
 *
 * Returns a draft reply with confidence score and reasoning trace.
 */
export function generateReply(
  classification: ReplyClassification,
  prospectName: string | null,
  prospectCompany: string | null,
  workspace: Workspace,
  originalMessage: string
): ReplyDraft {
  const reasoning: string[] = [];
  let usesApprovedClaims = false;
  let confidence = 0.5;

  const { company_profile, services, pricing, icp, brand_voice, outreach_rules } =
    workspace;

  const prospectNameStr = prospectName || "there";
  const prospectCompanyStr = prospectCompany ? ` at ${prospectCompany}` : "";
  const companyName = company_profile.company_name;
  const contactEmail = company_profile.contact_email;

  // Build the base reply based on classification
  switch (classification) {
    case "interested": {
      confidence = 0.85;
      usesApprovedClaims = true;

      // Find an approved claim relevant to interest
      const interestClaim = findApprovedClaim(workspace, [
        "interested",
        "services",
        "website",
        "company",
      ]);
      if (interestClaim) {
        usesApprovedClaims = true;
        reasoning.push(`Used approved claim: "${interestClaim}"`);
      }

      const pricingStatement = buildPricingStatement(workspace);
      reasoning.push("Included pricing statement from workspace configuration");

      return {
        subject: `Re: Next steps with ${companyName}`,
        body: `Hi ${prospectNameStr},\n\nThank you for your interest in ${companyName}${prospectCompanyStr ? ` at ${prospectCompanyStr}` : ""}.\n\n${interestClaim ? interestClaim + " " : ""}${pricingStatement}\n\nWould you like to schedule a brief call to discuss your needs?\n\n${buildClosing(brand_voice)}\n`,
        confidence,
        reasoning,
        usesApprovedClaims,
      };
    }

    case "not_interested": {
      confidence = 0.9;
      reasoning.push("Acknowledged prospect is not interested");
      return {
        subject: `Re: ${originalMessage.substring(0, 50)}`,
        body: `Hi ${prospectNameStr},\n\nThank you for your response. We'll respect your decision and won't contact you again regarding this.\n\nIf your needs change in the future, please don't hesitate to reach out at ${contactEmail}.\n\n${buildClosing(brand_voice)}\n`,
        confidence,
        reasoning,
        usesApprovedClaims,
      };
    }

    case "objection": {
      confidence = 0.7;
      const objectionClaim = findApprovedClaim(workspace, [
        "price",
        "cost",
        "value",
        "roi",
      ]);
      if (objectionClaim) {
        usesApprovedClaims = true;
        reasoning.push(`Used approved claim: "${objectionClaim}"`);
      } else {
        reasoning.push("Addressed objection using workspace pricing floor");
      }

      return {
        subject: `Re: ${originalMessage.substring(0, 50)}`,
        body: `Hi ${prospectNameStr},\n\nThank you for sharing your concerns. ${objectionClaim ? objectionClaim + " " : ""}We work with companies of various sizes and budgets, and our pricing starts at ${priceString(workspace)}.\n\nIf you'd like to explore options that fit your budget, please let us know.\n\n${buildClosing(brand_voice)}\n`,
        confidence,
        reasoning,
        usesApprovedClaims,
      };
    }

    case "question": {
      confidence = 0.75;
      const questionClaim = findApprovedClaim(workspace, [
        "services",
        "company",
        "website",
      ]);
      if (questionClaim) {
        usesApprovedClaims = true;
        reasoning.push(`Used approved claim: "${questionClaim}"`);
      }

      return {
        subject: `Re: Your question`,
        body: `Hi ${prospectNameStr},\n\nThank you for your question. ${questionClaim ? questionClaim + " " : ""}\n\n${company_profile.company_name} offers ${services.map((s) => s.name).join(", ")} starting at ${priceString(workspace)}.\n\nFor more specific questions, please contact us at ${contactEmail}.\n\n${buildClosing(brand_voice)}\n`,
        confidence,
        reasoning,
        usesApprovedClaims,
      };
    }

    case "out_of_office": {
      confidence = 0.95;
      return {
        subject: `Re: ${originalMessage.substring(0, 50)}`,
        body: `Hi ${prospectNameStr},\n\nThank you for your auto-reply. We'll follow up when you're back in the office.\n\n${buildClosing(brand_voice)}\n`,
        confidence,
        reasoning: ["Out-of-office detected; no action needed"],
        usesApprovedClaims,
      };
    }

    case "unsubscribe": {
      confidence = 1.0;
      reasoning.push("Unsubscribe requested; no further contact");
      return {
        subject: `Re: ${originalMessage.substring(0, 50)}`,
        body: `Hi ${prospectNameStr},\n\nYou have been unsubscribed from our mailing list. You will not receive further emails from us.\n\n${buildClosing(brand_voice)}\n`,
        confidence,
        reasoning,
        usesApprovedClaims,
      };
    }

    case "bounce": {
      confidence = 1.0;
      reasoning.push("Bounce detected; no reply sent");
      return {
        subject: "",
        body: "",
        confidence,
        reasoning,
        usesApprovedClaims,
      };
    }

    case "complaint": {
      confidence = 1.0;
      reasoning.push("Complaint detected; escalated to human review");
      return {
        subject: "",
        body: "",
        confidence,
        reasoning,
        usesApprovedClaims,
      };
    }

    case "uncertain": {
      confidence = 0.4;
      reasoning.push("Uncertain classification; escalated to human review");
      return {
        subject: `Re: ${originalMessage.substring(0, 50)}`,
        body: `Hi ${prospectNameStr},\n\nThank you for your message. A member of our team will review your inquiry and respond shortly.\n\n${buildClosing(brand_voice)}\n`,
        confidence,
        reasoning,
        usesApprovedClaims,
      };
    }
  }
}
