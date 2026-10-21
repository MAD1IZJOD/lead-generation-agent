"use client";

import { useState } from "react";

interface LeadEvidenceItem {
  id: string;
  claim: string;
  source_url: string | null;
  source_type: string | null;
  confidence: number;
  created_at: string;
}

interface LeadEvidenceProps {
  leadId: string;
  initialEvidence: LeadEvidenceItem[];
}

export default function LeadEvidence({ leadId, initialEvidence }: LeadEvidenceProps) {
  const [evidence, setEvidence] = useState<LeadEvidenceItem[]>(initialEvidence);
  const [claim, setClaim] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [confidence, setConfidence] = useState("0.80");
  const [adding, setAdding] = useState(false);

  // Evidence state is initialized from initialEvidence prop.
  // When a different lead is selected, the parent re-renders this
  // component with new props, and useState picks up the new value.

  const handleAddEvidence = async () => {
    if (!claim.trim()) return;

    setAdding(true);
    try {
      const response = await fetch(`/api/leads/${leadId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: claim.trim(),
          source_url: sourceUrl.trim() || null,
          source_type: sourceType.trim() || null,
          confidence: parseFloat(confidence) || 0,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setEvidence([...evidence, result.evidence]);
        setClaim("");
        setSourceUrl("");
        setSourceType("");
        setConfidence("0.80");
      } else {
        alert("Failed to add evidence");
      }
    } catch {
      alert("Error adding evidence");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveEvidence = async (evidenceId: string) => {
    if (!confirm("Remove this evidence?")) return;
    try {
      const response = await fetch(`/api/evidence/${evidenceId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setEvidence(evidence.filter((e) => e.id !== evidenceId));
      } else {
        alert("Failed to remove evidence");
      }
    } catch {
      alert("Error removing evidence");
    }
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "text-green-600 dark:text-green-400";
    if (c >= 0.6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="font-bold text-zinc-900 dark:text-white">Research Evidence</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Add evidence-backed observations about this lead. Every factual
          claim in outreach must trace to evidence or an approved workspace
          fact.
        </p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Claim</label>
            <input
              type="text"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder="e.g. Uses Shopify for e-commerce"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Source URL</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Source type</label>
            <input
              type="text"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              placeholder="website, linkedin, crm"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Confidence</label>
            <input
              type="number"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              min="0"
              max="1"
              step="0.01"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleAddEvidence}
          disabled={adding || !claim.trim()}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {adding ? "Adding..." : "Add evidence"}
        </button>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Claim</th>
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Source</th>
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Confidence</th>
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {evidence.map((item) => (
              <tr key={item.id}>
                <td className="p-3 text-sm text-zinc-900 dark:text-white truncate max-w-xs">
                  {item.claim}
                </td>
                <td className="p-3 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-xs">
                  {item.source_url ? (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                    >
                      {item.source_url}
                    </a>
                  ) : (
                    <span className="text-zinc-400 italic">—</span>
                  )}
                </td>
                <td className="p-3 text-sm">
                  <span className={`font-medium ${confidenceColor(item.confidence)}`}>
                    {(item.confidence * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleRemoveEvidence(item.id)}
                    className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {evidence.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-zinc-500 dark:text-zinc-400">
                  No evidence added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
