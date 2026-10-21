"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/database.types";
import type { Workspace } from "@/lib/database.types";

interface OutreachPageProps {
  params: Promise<{ leadId: string }>;
}

export default function OutreachPage({ params }: OutreachPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [draft, setDraft] = useState({
    subject: "",
    body: "",
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    const { leadId } = await params;
    setLoading(true);
    try {
      const leadResponse = await fetch(`/api/leads/${leadId}`);
      if (leadResponse.ok) {
        const leadResult = await leadResponse.json();
        const leadData = leadResult.lead;
        setLead(leadData);

        if (leadData.workspace_id) {
          const wsResponse = await fetch(
            `/api/workspaces/${leadData.workspace_id}`
          );
          if (wsResponse.ok) {
            const wsResult = await wsResponse.json();
            setWorkspace(wsResult.workspace);
          }
        }
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load lead data" });
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dryRun = workspace?.outreach_rules?.dry_run ?? true;

  const handleGenerate = async () => {
    if (!lead) return;
    setGenerating(true);
    setMessage(null);
    try {
      const response = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          workspace_id: lead.workspace_id,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setDraft({
          subject: result.subject || "Introduction",
          body: result.body,
        });
        setMessage({ type: "success", text: "Draft generated successfully" });
      } else {
        const result = await response.json();
        setMessage({ type: "error", text: result.error || "Failed to generate draft" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to generate draft" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const response = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: lead.workspace_id,
          lead_id: lead.id,
          channel: "email",
          subject: draft.subject,
          body: draft.body,
          evidence_citations: (lead.lead_evidence || []).map((e) => e.id),
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setMessage({
          type: "success",
          text: result.dry_run
            ? "Draft saved (DRY RUN mode - no email sent)"
            : "Draft saved",
        });
        setDraft({ subject: "", body: "" });
      } else {
        const result = await response.json();
        setMessage({ type: "error", text: result.error || "Failed to save draft" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save draft" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
        <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Lead not found</h1>
          <button
            onClick={() => router.push("/leads")}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Back to leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Create outreach
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Generate a personalized message for {lead.name || lead.email}
            </p>
          </div>
          <button
            onClick={() => router.push("/leads")}
            className="px-4 py-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-lg text-sm"
          >
            Back to leads
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-lg">
                {lead.name || lead.email}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {lead.company || "No company"} • {lead.title || "No title"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                Score: {lead.qualification_score}/100
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm text-zinc-900 dark:text-white">{lead.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Source</p>
              <p className="text-sm text-zinc-900 dark:text-white">{lead.source || "—"}</p>
            </div>
          </div>

          {(lead.lead_evidence || []).length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Evidence</h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                {(lead.lead_evidence || []).map((ev) => (
                  <li key={ev.id} className="flex items-start gap-2">
                    <span className="text-zinc-400">•</span>
                    <span>{ev.claim}</span>
                    {ev.source_url && (
                      <span className="ml-2">
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 text-xs hover:underline"
                        >
                          [source]
                        </a>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {dryRun && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-blue-800">DRY RUN mode is active</h3>
                <p className="text-sm text-blue-700 mt-1">
                  No emails will be sent. Drafts are saved for review.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Message draft</h2>

          {message && (
            <div className={`mb-4 p-3 rounded-md ${
              message.type === "error" ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Subject</label>
              <input
                type="text"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">&nbsp;</label>
              <button
                onClick={handleGenerate}
                disabled={generating || !lead}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {generating ? "Generating..." : "Generate with AI"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Body</label>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={12}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
            />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={saving || !draft.body.trim()}
              className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {saving ? "Saving..." : "Save draft"}
            </button>
            <button
              onClick={() => router.push("/leads")}
              className="px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
