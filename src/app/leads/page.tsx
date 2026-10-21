"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LeadsTable from "@/components/leads-table";
import LeadEvidence from "@/components/lead-evidence";
import { qualifyLead, formatScoreBreakdown } from "@/lib/qualification";
import type { Lead } from "@/lib/database.types";
import type { Workspace } from "@/lib/database.types";

interface LeadsPageProps {
  workspace: Workspace | null;
}

export default function LeadsPage({ workspace }: LeadsPageProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const workspaceId = workspace?.id;
      const url = workspaceId
        ? `/api/leads?workspace_id=${workspaceId}`
        : "/api/leads";
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setLeads(result.leads || []);
      }
    } catch (err) {
      console.error("Failed to load leads", err);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleCreateLead = () => {
    router.push("/leads/new");
  };

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    setSelectedLead(updatedLead);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Leads Pipeline
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Manage your prospects and track qualification progress
            </p>
          </div>
          <button
            onClick={handleCreateLead}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Add lead
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <LeadsTable initialLeads={leads} />
              </div>
              <div className="flex flex-col gap-4">
                {selectedLead ? (
                  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-lg">
                          {selectedLead.name || selectedLead.email}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {selectedLead.company || "No company"}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedLead(null)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                          Email
                        </p>
                        <p className="text-sm text-zinc-900 dark:text-white">
                          {selectedLead.email}
                        </p>
                      </div>
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                          Title
                        </p>
                        <p className="text-sm text-zinc-900 dark:text-white">
                          {selectedLead.title || "—"}
                        </p>
                      </div>
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                          Source
                        </p>
                        <p className="text-sm text-zinc-900 dark:text-white">
                          {selectedLead.source || "—"}
                        </p>
                      </div>

                      {workspace && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                            Qualification score
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                              {qualifyLead(selectedLead, workspace).totalScore}
                            </span>
                            <span className="text-sm text-zinc-500 dark:text-zinc-400">
                              /100 - {qualifyLead(selectedLead, workspace).tier.toUpperCase()}
                            </span>
                          </div>
                          <pre className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 whitespace-pre-wrap">
                            {formatScoreBreakdown(qualifyLead(selectedLead, workspace))}
                          </pre>
                        </div>
                      )}

                      <LeadEvidence
                        leadId={selectedLead.id}
                        initialEvidence={selectedLead.lead_evidence || []}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                    <p className="text-zinc-500 dark:text-zinc-400">
                      Select a lead to view details, evidence, and qualification
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
