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
  const { lead_id, workspace_id } = body;

  if (!lead_id || !workspace_id) {
    return NextResponse.json(
      { error: "lead_id and workspace_id are required" },
      { status: 400 }
    );
  }

  // Fetch the lead with evidence
  const { data: lead } = await supabase
    .from("leads")
    .select(`
      *,
      lead_evidence (
        id, claim, source_url, source_type, confidence
      )
    `)
    .eq("id", lead_id)
    .eq("workspace_id", workspace_id)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch workspace settings for brand voice and approved claims
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("brand_voice, approved_claims, company_profile, services, icp, outreach_rules")
    .eq("id", workspace_id)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Check if model provider is configured
  const modelApiKey = process.env.MODEL_API_KEY;
  if (!modelApiKey) {
    return NextResponse.json(
      {
        error: "Model provider not configured",
        message: "Set MODEL_API_KEY in your environment variables to enable AI-powered outreach generation. Until then, draft emails manually.",
      },
      { status: 503 }
    );
  }

  // Build evidence citations for the prompt
  const evidenceCitations = (lead.lead_evidence || [] as Array<{ claim: string; source_url: string | null; confidence: number }>)
    .map((e: { claim: string; source_url: string | null; confidence: number }) => `- ${e.claim} (source: ${e.source_url || "unknown"}, confidence: ${(e.confidence * 100).toFixed(0)}%)`)
    .join("\n");

  const approvedClaims = (workspace.approved_claims || [] as string[]).join(", ");
  const brandVoice = workspace.brand_voice || {};
  const services = (workspace.services || [])
    .map((s: any) => `- ${s.name}: ${s.description} (starting at ${s.currency} ${s.starting_price_usd})`)
    .join("\n");

  const prompt = `You are a sales outreach assistant for ${workspace.company_profile?.company_name || "a company"}.

Write a personalized, concise outreach email to:
- Name: ${lead.name || "there"}
- Company: ${lead.company || "their company"}
- Title: ${lead.title || ""}
- Email: ${lead.email}

Evidence about this prospect (only use claims with high confidence):
${evidenceCitations || "No specific evidence available. Write based on publicly known information only."}

Approved claims you can make (do not make claims outside this list):
${approvedClaims || "No approved claims configured. Stick to general, verifiable statements only."}

Brand voice: Tone: ${brandVoice.tone || "professional"}, Formality: ${brandVoice.formality || "professional"}
Do not claim: ${(brandVoice.do_not_claim || []).join(", ") || "none"}

Our services:
${services || "No services configured."}

Requirements:
- Keep it under 150 words
- Personalize using the evidence above
- Cite evidence inline where relevant (e.g., "I saw that...")
- Include a clear, low-friction call to action
- Do not make claims not supported by evidence or approved claims
- Subject line should be short and relevant

Return ONLY a JSON object with "subject" and "body" fields. No markdown, no extra text.`;

  try {
    const modelProvider = process.env.MODEL_PROVIDER || "openai";
    const modelBaseURL = process.env.MODEL_BASE_URL || "https://api.openai.com/v1";
    const modelDefault = process.env.MODEL_DEFAULT || "gpt-4o-mini";

    let response;
    if (modelProvider === "openai") {
      response = await fetch(`${modelBaseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${modelApiKey}`,
        },
        body: JSON.stringify({
          model: modelDefault,
          messages: [
            { role: "system", content: "You write concise, personalized B2B outreach emails. Always return valid JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
    } else {
      return NextResponse.json(
        { error: `Model provider ${modelProvider} not yet implemented` },
        { status: 501 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Model provider error: ${errorText}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // If the model didn't return pure JSON, try to extract it
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { subject: "Introduction", body: content };
    }

    return NextResponse.json({
      subject: parsed.subject || "Introduction",
      body: parsed.body || "",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate outreach" },
      { status: 500 }
    );
  }
}
