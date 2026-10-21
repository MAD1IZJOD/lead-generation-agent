"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    company: "",
    title: "",
    linkedin_url: "",
    website: "",
    source: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.status === 409) {
        const result = await response.json();
        setError(result.error || "A lead with this email already exists");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || "Failed to create lead");
        setLoading(false);
        return;
      }

      const result = await response.json();
      router.push(`/leads`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 sm:p-6 lg:p-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Add lead
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Add a new prospect to your pipeline
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email address *
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Company
              </label>
              <input
                id="company"
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Job title
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="linkedin_url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                LinkedIn URL
              </label>
              <input
                id="linkedin_url"
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Website
              </label>
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="source" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Source
              </label>
              <input
                id="source"
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="e.g. LinkedIn, referral, cold outreach"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? "Creating..." : "Create lead"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/leads")}
                className="px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
