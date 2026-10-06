import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { User, Mail, ShieldCheck, LogOut, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              Dashboard
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Welcome back, {user.name || "User"}!
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </form>
        </div>

        {/* User Card */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-xl">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {user.name}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {user.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800">
              <User className="h-5 w-5 text-neutral-400" />
              <div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                  User ID
                </span>
                <span className="text-xs font-mono text-neutral-900 dark:text-neutral-100 truncate block max-w-[200px]">
                  {user.id || "N/A"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800">
              <Mail className="h-5 w-5 text-neutral-400" />
              <div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                  Email
                </span>
                <span className="text-xs text-neutral-900 dark:text-neutral-100 truncate block max-w-[200px]">
                  {user.email}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Auth status banner */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 flex items-start gap-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
              Authenticated Session Active
            </h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              This route is protected by NextAuth v5 session checks. You are currently logged in with a valid JWT token.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
