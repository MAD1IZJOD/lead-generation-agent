"use client";

import { useState, useEffect, useCallback } from "react";
import type { Lead } from "@/lib/database.types";

interface LeadsTableProps {
  initialLeads: Lead[];
}

export default function LeadsTable({ initialLeads }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Lead>>({});

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !search ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      (lead.name && lead.name.toLowerCase().includes(search.toLowerCase())) ||
      (lead.company && lead.company.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleStatusFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setEditData({ email: lead.email, name: lead.name, company: lead.company, title: lead.title, status: lead.status });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSaveEdit = async (leadId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (response.ok) {
        const result = await response.json();
        setLeads((prev) => prev.map((l) => (l.id === leadId ? result.lead : l)));
        setEditingId(null);
        setEditData({});
      } else {
        alert("Failed to save changes");
      }
    } catch (err) {
      alert("Error saving changes");
    }
  };

  const handleArchive = async (leadId: string) => {
    if (!confirm("Archive this lead? It will be marked as opted out.")) return;
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
      } else {
        alert("Failed to archive lead");
      }
    } catch (err) {
      alert("Error archiving lead");
    }
  };

  const statusColors: Record<string, string> = {
    new: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
    qualified: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    contacted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    replied: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    opt_out: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search leads by email, name, or company..."
            value={search}
            onChange={handleSearch}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={handleStatusFilter}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="qualified">Qualified</option>
          <option value="contacted">Contacted</option>
          <option value="replied">Replied</option>
          <option value="converted">Converted</option>
          <option value="opt_out">Opted out</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Email</th>
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Company</th>
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Title</th>
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Score</th>
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Source</th>
              <th className="p-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredLeads.map((lead) => {
              const isEditing = editingId === lead.id;
              return (
                <tr key={lead.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  {isEditing ? (
                    <td className="p-3">
                      <input
                        type="text"
                        value={editData.email || ""}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                  ) : (
                    <td className="p-3 text-sm text-zinc-900 dark:text-white truncate max-w-xs">
                      {lead.email}
                    </td>
                  )}
                  {isEditing ? (
                    <td className="p-3">
                      <input
                        type="text"
                        value={editData.company || ""}
                        onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                  ) : (
                    <td className="p-3 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-xs">
                      {lead.company || "—"}
                    </td>
                  )}
                  <td className="p-3 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-xs">
                    {lead.title || "—"}
                  </td>
                  <td className="p-3 text-sm font-medium text-zinc-900 dark:text-white">
                    {lead.qualification_score}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || statusColors.new}`}
                    >
                      {lead.status.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-xs">
                    {lead.source || "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <button
                          onClick={() => handleEdit(lead)}
                          className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
                          </svg>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSaveEdit(lead.id)}
                            className="p-1.5 text-green-600 hover:text-green-800 dark:hover:text-green-400 transition-colors"
                            title="Save"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleArchive(lead.id)}
                        className="p-1.5 text-red-600 hover:text-red-800 dark:hover:text-red-400 transition-colors"
                        title="Archive"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredLeads.length === 0 && (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
          No leads found.
        </div>
      )}
    </div>
  );
}
