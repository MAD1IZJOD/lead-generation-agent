"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: supabaseError } = await signIn(email, password);
      if (supabaseError) {
        setError(supabaseError.message);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 p-8 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Sign in to your workspace
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Access your lead generation agent workspace
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-2 px-4 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm bg-white dark:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.79 3.28-8.09"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.27-1.93-6.08-4.67H3.57v3.24C3.57 22.02 6.13 23 9.5 23c1.48 0 2.82-.4 3.92-1.16l3.57-2.77C17.46 22.02 14.97 23 12 23"
              />
              <path
                fill="currentColor"
                d="M12 8.62h5.92c.13-.72.2-1.47.2-2.25s-.07-1.53-.2-2.25H12v-4.27C7.37 2.09 4.53 0 2 0 0.94 0 0 .94 0 2c0 3.31 1.35 6.2 3.57 8.25l3.57 2.77c.81.62 1.26 1.58 1.26 2.67 0 1.09-.45 2.05-1.26 2.67l-3.57 2.77C4.53 21.06 7.37 23 12 23c7.44 0 12-5.91 12-13.2 0-.84-.07-1.66-.2-2.25H12z"
              />
            </svg>
            Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-2 px-4 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm bg-white dark:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385.6.11.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C-4.42 18.07-3 17.87-3 17.87c-2.36-1.65-1.79-2.73-1.79-2.73-2.01-1.2 1.46-1.44 1.46-1.44 2.34 0.16 3.42 2.57 3.42 2.57 2.25 2.51 5.39 1.78 5.39 1.78 3.68 0.96 5.58 3.45 5.58 3.45 1.44-0.71 1.79-1.25 1.79-1.25-0.48-0.6-0.83-1.02-1.23-1.35-2.31-0.43-4.76-1.18-4.76-1.18-1.74-0.52-2.37-1.63-2.37-1.63-1.95-0.88-1.33-1.37-1.33-1.37-0.64-0.86-0.77-1.47-0.77-1.47C1.69 11.91 3.6 10.28 3.6 10.28c2.17 0 3.33 1.46 3.33 1.46 1.45 0.85 2.32 1.27 2.32 1.27 1.3 0.52 2.37 1.2 2.37 1.2 1.86 1.26 3.86 1.26 3.86 1.26 4.35 0 7.12-2.82 7.12-2.82s1.23-0.92 1.23-2.15c0-1.18-0.67-2.28-2.17-2.77 0-0.42-0.1-0.81-0.27-1.17 1.57 0.23 3.04 0.99 3.04 0.99 0.78 0.99 1.58 1.61 2.21 2.27 2.47 0.31 5 0.55 7.37 0.22 1.87-0.26 3.66-1.09 3.66-1.09 1.09-0.78 1.34-1.78 1.34-1.78 0.19-0.32 0.25-0.76 0.25-1.39 0-3.73-3.02-6.77-6.77-6.77"
              />
            </svg>
            GitHub
          </button>
        </div>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
