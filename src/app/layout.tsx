import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lead Generation Agent",
  description: "Multi-tenant lead generation and sales agent for growing businesses",
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then((u) => {
      if (mounted) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
        <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">LGA</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300 text-sm hidden sm:inline">
                  Lead Generation Agent
                </span>
              </div>
              <div className="flex items-center gap-4">
                {user ? (
                  <>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-xs">
                      {user.email}
                    </span>
                    <button
                      onClick={() => {
                        signOut().then(() => {
                          router.push("/login");
                        });
                      }}
                      className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      href="/login"
                      className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition-colors"
                    >
                      Get started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
