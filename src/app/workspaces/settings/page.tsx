"use client";

import { useState, useEffect } from "react";
import { saveWorkspaceSettings, getWorkspaceSettings } from "@/lib/actions/workspace";
import type { WorkspaceSettingsInput } from "@/lib/validations/workspace";

export default function WorkspaceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState<WorkspaceSettingsInput | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSettings() {
      setLoading(true);
      try {
        const result = await getWorkspaceSettings();
        if (!cancelled) {
          if (result.error) {
            setMessage({ type: "error", text: result.error });
          } else if (result.workspace) {
            setFormData(result.workspace as unknown as WorkspaceSettingsInput);
          }
        }
      } catch {
        if (!cancelled) {
          setMessage({ type: "error", text: "Failed to load settings" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (formData: WorkspaceSettingsInput) => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveWorkspaceSettings(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Workspace settings saved successfully" });
        setLoading(true);
        try {
          const result = await getWorkspaceSettings();
          if (result.workspace) {
            setFormData(result.workspace as unknown as WorkspaceSettingsInput);
          }
        } catch {
          setMessage({ type: "error", text: "Failed to reload settings" });
        } finally {
          setLoading(false);
        }
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" });
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

  if (!formData) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
        <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Workspace Settings</h1>
          {message && (
            <div className={`p-3 rounded-md mb-4 ${
              message.type === "error" ? "bg-red-50 text-red-600 dark:bg-red-900 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-900 dark:text-green-400"
            }`}>
              {message.text}
            </div>
          )}
          <p className="text-zinc-500 dark:text-zinc-400">Unable to load workspace settings. Please sign in again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Workspace Settings</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Configure your company profile, services, pricing, and outreach rules.
            </p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-md mb-6 ${
            message.type === "error" ? "bg-red-50 border border-red-200 text-red-600" : "bg-green-50 border border-green-200 text-green-600"
          }`}>
            {message.text}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data: WorkspaceSettingsInput = {
              name: formData.get("name") as string,
              slug: formData.get("slug") as string,
              company_profile: {
                company_name: formData.get("company_name") as string,
                website: formData.get("website") as string,
                contact_email: formData.get("contact_email") as string,
                description: formData.get("description") as string,
              },
              services: [
                {
                  name: formData.get("service_name") as string,
                  description: formData.get("service_description") as string,
                  starting_price_usd: parseFloat(formData.get("service_price") as string) || 0,
                  currency: formData.get("service_currency") as string || "usd",
                },
              ],
              pricing: {
                minimum_project_usd: parseFloat(formData.get("minimum_project_price") as string) || 0,
                currency: formData.get("pricing_currency") as string || "usd",
              },
              target_markets: (formData.get("target_markets") as string).split(",").map(s => s.trim()).filter(Boolean),
              icp: {
                industries: (formData.get("icp_industries") as string).split(",").map(s => s.trim()).filter(Boolean),
                company_sizes: (formData.get("icp_company_sizes") as string).split(",").map(s => s.trim()).filter(Boolean),
                job_titles: (formData.get("icp_job_titles") as string).split(",").map(s => s.trim()).filter(Boolean),
                pain_points: (formData.get("icp_pain_points") as string).split(",").map(s => s.trim()).filter(Boolean),
              },
              approved_claims: (formData.get("approved_claims") as string).split(",").map(s => s.trim()).filter(Boolean),
              brand_voice: {
                tone: formData.get("brand_tone") as string,
                formality: (formData.get("brand_formality") as string) as "casual" | "professional" | "formal",
                do_not_claim: (formData.get("brand_do_not_claim") as string).split(",").map(s => s.trim()).filter(Boolean),
              },
              outreach_rules: {
                max_emails_per_day: parseInt(formData.get("max_emails_per_day") as string) || 50,
                follow_up_limit: parseInt(formData.get("follow_up_limit") as string) || 3,
                days_between_follow_ups: parseInt(formData.get("days_between_follow_ups") as string) || 7,
                dry_run: formData.get("dry_run") === "true",
                autonomous: formData.get("autonomous") === "true",
              },
            };
            handleSave(data);
          }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Workspace basics</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Workspace name</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={formData.name}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Slug</label>
                <input
                  name="slug"
                  type="text"
                  defaultValue={formData.slug}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Company profile</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Company name</label>
                <input
                  name="company_name"
                  type="text"
                  defaultValue={formData.company_profile.company_name}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Website</label>
                <input
                  name="website"
                  type="url"
                  defaultValue={formData.company_profile.website}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Contact email</label>
                <input
                  name="contact_email"
                  type="email"
                  defaultValue={formData.company_profile.contact_email}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={formData.company_profile.description}
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Services &amp; pricing</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Service name</label>
                <input
                  name="service_name"
                  type="text"
                  defaultValue={formData.services[0]?.name || ""}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Starting price (USD)</label>
                <input
                  name="service_price"
                  type="number"
                  defaultValue={formData.services[0]?.starting_price_usd || 800}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Service description</label>
                <textarea
                  name="service_description"
                  defaultValue={formData.services[0]?.description || ""}
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Minimum project price (USD)</label>
                <input
                  name="minimum_project_price"
                  type="number"
                  defaultValue={formData.pricing.minimum_project_usd || 800}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Currency</label>
                <select
                  name="pricing_currency"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="usd">USD</option>
                  <option value="eur">EUR</option>
                  <option value="gbp">GBP</option>
                  <option value="cad">CAD</option>
                  <option value="aud">AUD</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Target markets &amp; ICP</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Target countries (comma-separated)</label>
                <input
                  name="target_markets"
                  type="text"
                  defaultValue={formData.target_markets.join(", ")}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">e.g. US, UK, Canada, Australia, Germany</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">ICP Industries (comma-separated)</label>
                <input
                  name="icp_industries"
                  type="text"
                  defaultValue={formData.icp.industries.join(", ")}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">ICP Company sizes (comma-separated)</label>
                <input
                  name="icp_company_sizes"
                  type="text"
                  defaultValue={formData.icp.company_sizes.join(", ")}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">ICP Job titles (comma-separated)</label>
                <input
                  name="icp_job_titles"
                  type="text"
                  defaultValue={formData.icp.job_titles.join(", ")}
                  className="w-full rounded-md border border-zinc-300 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">ICP Pain points (comma-separated)</label>
                <textarea
                  name="icp_pain_points"
                  defaultValue={formData.icp.pain_points.join(", ")}
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                ></textarea>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Approved claims (comma-separated)</label>
                <input
                  name="approved_claims"
                  type="text"
                  defaultValue={formData.approved_claims.join(", ")}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Claims your team is authorized to make in outreach</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Brand voice</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tone</label>
                <input
                  name="brand_tone"
                  type="text"
                  defaultValue={formData.brand_voice.tone}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Formality</label>
                <select
                  name="brand_formality"
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="casual">Casual</option>
                  <option value="professional">Professional</option>
                  <option value="formal">Formal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Do not claim (comma-separated)</label>
                <input
                  name="brand_do_not_claim"
                  type="text"
                  defaultValue={formData.brand_voice.do_not_claim.join(", ")}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Claims that must never be made about prospects</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Outreach rules</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Max emails per day</label>
                <input
                  name="max_emails_per_day"
                  type="number"
                  defaultValue={formData.outreach_rules.max_emails_per_day}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Follow-up limit</label>
                <input
                  name="follow_up_limit"
                  type="number"
                  defaultValue={formData.outreach_rules.follow_up_limit}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Days between follow-ups</label>
                <input
                  name="days_between_follow_ups"
                  type="number"
                  defaultValue={formData.outreach_rules.days_between_follow_ups}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  name="dry_run"
                  type="checkbox"
                  defaultChecked={formData.outreach_rules.dry_run}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-zinc-700 dark:text-zinc-300">DRY RUN mode (no real emails sent)</label>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <input
                  name="autonomous"
                  type="checkbox"
                  defaultChecked={formData.outreach_rules.autonomous}
                  disabled
                  className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-zinc-500 dark:text-zinc-400">Autonomous mode (requires verification)</label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
