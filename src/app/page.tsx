import Link from "next/link";
import { auth } from "@/auth";
import { Database, ShieldCheck, Zap, Layers, ArrowRight, UserCheck } from "lucide-react";

export default async function Home() {
  const session = await auth();

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
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      {/* Navigation */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">
            SendPilot
          </Link>

          <div className="flex items-center gap-3">
            {session?.user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500 hidden sm:inline">
                  Signed in as <strong>{session.user.name}</strong>
                </span>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-24">
        <div className="w-full max-w-4xl space-y-12">
          {/* Header */}
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              NextAuth v5 + MongoDB Ready
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

          {/* Action Card */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-1">
              <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                Ready to authenticate?
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Register a new account or log in with your credentials to test protected session routing.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2.5 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Go to Sign In <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
