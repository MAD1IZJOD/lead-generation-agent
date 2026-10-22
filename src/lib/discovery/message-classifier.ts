export type ReplyClassification =
  | "interested"
  | "not_interested"
  | "objection"
  | "question"
  | "out_of_office"
  | "unsubscribe"
  | "bounce"
  | "complaint"
  | "uncertain";

export interface ClassificationResult {
  category: ReplyClassification;
  confidence: number; // 0.0 to 1.0
  matchedPatterns: string[];
  reasoning: string;
}

/**
 * Safety rules that override any classification.
 * These ensure critical categories can never be misclassified as something safer.
 */
const SAFETY_OVERRIDES: Array<{
  category: ReplyClassification;
  patterns: RegExp[];
  priority: number;
}> = [
  {
    category: "unsubscribe",
    patterns: [/unsubscribe/i, /opt.?out/i, /stop.?email/i, /remove.?me/i, /do.?not.?contact/i],
    priority: 10,
  },
  {
    category: "complaint",
    patterns: [/complaint/i, /spam/i, /report.?abuse/i, /harass/i],
    priority: 9,
  },
  {
    category: "bounce",
    patterns: [/undeliverable/i, /delivery.?failed/i, /bounce/i, /mail.?returned/i],
    priority: 8,
  },
  {
    category: "out_of_office",
    patterns: [
      /\bout\s*(?:of\s*)?(?:the\s*)?office/i,
      /ooo/i,
      /away.?from.?office/i,
      /vacation/i,
      /on.?leave/i,
    ],
    priority: 7,
  },
];

/**
 * Classification patterns mapped to categories.
 * Order matters: first match wins within the same priority tier.
 */
const CLASSIFICATION_PATTERNS: Array<{
  category: ReplyClassification;
  patterns: RegExp[];
}> = [
  {
    category: "not_interested",
    patterns: [
      /not.?interested/i,
      /no.?thanks/i,
      /no.?thank.?you/i,
      /not.?now/i,
      /pass/i,
      /decline/i,
    ],
  },
  {
    category: "objection",
    patterns: [
      /too.?expensive/i,
      /budget/i,
      /cost.?too/i,
      /can.?not.?afford/i,
      /not.?a.?good.?fit/i,
      /already.?have/i,
      /using.?competitor/i,
      /competit/i,
    ],
  },
  {
    category: "interested",
    patterns: [
      /interested/i,
      /learn.?more/i,
      /tell.?me.?more/i,
      /demo/i,
      /pricing/i,
      /schedule/i,
      /meeting/i,
      /call.?me/i,
      /contact.?me/i,
      /yes/i,
      /ready/i,
    ],
  },
  {
    category: "question",
    patterns: [/\?/, /how/i, /what/i, /why/i, /who/i, /when/i, /where/i, /can.?you/i],
  },
];

/**
 * Classify an incoming email reply into a category.
 *
 * Uses deterministic pattern matching first. Safety rules (unsubscribe,
 * complaint, bounce, out_of_office) always override other classifications
 * to prevent critical categories from being misclassified.
 *
 * Never uses a model for classification - all rules are deterministic
 * and auditable.
 */
export function classifyReply(
  emailBody: string,
  subjectLine?: string
): ClassificationResult {
  const text = `${subjectLine ?? ""} ${emailBody}`.toLowerCase();
  const matchedPatterns: string[] = [];

  // Step 1: Check safety overrides first (highest priority)
  for (const rule of SAFETY_OVERRIDES.sort((a, b) => b.priority - a.priority)) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        matchedPatterns.push(pattern.toString());
        return {
          category: rule.category,
          confidence: 0.95,
          matchedPatterns,
          reasoning: `Safety rule matched: "${pattern.toString()}"`,
        };
      }
    }
  }

  // Step 2: Check classification patterns in order
  for (const rule of CLASSIFICATION_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        matchedPatterns.push(pattern.toString());
        return {
          category: rule.category,
          confidence: 0.8,
          matchedPatterns,
          reasoning: `Pattern matched: "${pattern.toString()}"`,
        };
      }
    }
  }

  // Step 3: Default to uncertain
  return {
    category: "uncertain",
    confidence: 0.3,
    matchedPatterns: [],
    reasoning: "No classification pattern matched",
  };
}

/**
 * Determine if a classification requires human review.
 * Uncertain, complaint, objection, and pricing-related categories
 * always require human review before any reply is sent.
 */
export function requiresHumanReview(category: ReplyClassification): boolean {
  const highRiskCategories: ReplyClassification[] = [
    "uncertain",
    "complaint",
    "objection",
  ];
  return highRiskCategories.includes(category);
}

/**
 * Determine if a classification means the prospect should not be
 * contacted further (follow-ups should be stopped).
 */
export function shouldStopFollowUps(category: ReplyClassification): boolean {
  const stopCategories: ReplyClassification[] = [
    "unsubscribe",
    "complaint",
    "bounce",
    "not_interested",
  ];
  return stopCategories.includes(category);
}
