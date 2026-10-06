import { Database, ShieldCheck, Zap, Layers, ArrowRight } from "lucide-react";

export default function Home() {
  const stackItems = [
    {
      title: "MongoDB & Mongoose",
      description: "Cached database connection and pre-configured User schema model.",
      icon: Database,
    },
    {
      title: "NextAuth.js v5",
      description: "Secure authentication setup with credentials provider & JWT sessions.",
      icon: ShieldCheck,
    },
    {
      title: "Tailwind CSS & Lucide",
      description: "Modern UI utilities, responsive design system, and clean icons.",
      icon: Zap,
    },
    {
      title: "Validation & Forms",
      description: "Type-safe schemas and form handling with Zod and React Hook Form.",
      icon: Layers,
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Full-Stack Next.js Ready
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            SendPilot
          </h1>
          <p className="max-w-xl mx-auto text-base sm:text-lg text-neutral-600 dark:text-neutral-400">
            A production-ready full-stack foundation powered by Next.js App Router, MongoDB, NextAuth, and Tailwind CSS.
          </p>
        </div>

        {/* Stack Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stackItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {item.title}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Action Info */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
              Configure your environment
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Set <code className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded">MONGODB_URI</code> and <code className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded">AUTH_SECRET</code> in <code className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded">.env.local</code>.
            </p>
          </div>
          <a
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2.5 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Auth Endpoint <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </main>
  );
}
