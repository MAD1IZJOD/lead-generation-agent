"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then(() => {
      if (mounted) {
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Workspace Dashboard
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Manage your lead generation workflow
            </p>
          </div>
          <Link
            href="/workspaces"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Configure workspace
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Total leads</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">0</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Outreach sent</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">0</p>
          </div>
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Revenue (collected)</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">$0</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Quick actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/workspaces"
              className="flex items-center gap-3 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-200 font-medium transition-colors"
            >
              <span>🏢</span>
              <span>Configure your workspace</span>
            </Link>
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-200 font-medium cursor-not-allowed opacity-60">
              <span>📊</span>
              <span>View leads pipeline</span>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h2 className="font-bold text-zinc-900 dark:text-white mb-4">Getting started</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            To begin using the lead generation agent:
          </p>
          <ul className="list-disc list-inside text-zinc-500 dark:text-zinc-400 mt-4 space-y-2">
            <li>
              Set up your Supabase database using the schema in
              <code className="font-mono text-sm">supabase/schema.sql</code>
            </li>
            <li>
              Configure your workspace with company profile, services, pricing,
              and target markets
            </li>
            <li>
              Set your environment variables (see <code className="font-mono text-sm">.env.example</code>)
            </li>
            <li>
              Enable DRY RUN mode to test outreach without sending real emails
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
