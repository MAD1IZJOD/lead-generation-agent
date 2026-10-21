import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-black">
      <section className="flex-1 bg-zinc-50 dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white sm:text-5xl sm:tracking-tight mb-6">
              Lead generation for growing businesses
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-xl mx-auto leading-relaxed">
              Configure your services, pricing, and target markets. The agent
              finds qualified leads, researches them with evidence, and helps
              you close more international clients.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/signup"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Start your workspace
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-semibold rounded-lg transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8 text-center">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-3">Configure your workspace</h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                Set your company profile, services, pricing, target markets,
                ICP, approved claims, and brand voice. No source code changes
                needed.
              </p>
            </div>
            <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-3">Find and research leads</h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                Discover prospects in your target markets. Each lead gets
                evidence-backed research with confidence scores and source
                citations.
              </p>
            </div>
            <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-3">Reach out safely</h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                Generate personalized outreach with evidence citations. Built-in
                deduplication, opt-outs, suppression lists, and send limits keep
                you compliant.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to grow?</h2>
          <p className="text-zinc-400 mb-6">
            Build your lead generation workflow today. Target $5,000/month from
            6-8 international clients.
          </p>
          <Link
            href="/signup"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Get started free
          </Link>
        </div>
      </section>
    </div>
  );
}
