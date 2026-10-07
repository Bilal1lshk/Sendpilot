"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Bell,
  Menu,
  Send,
  Upload,
  UserPlus,
  CheckCircle2,
  Sparkles,
  Command,
  X,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface TopBarProps {
  onMenuClick: () => void;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Overview",
    subtitle: "Monitor real-time outreach metrics, queue tasks, and account health.",
  },
  "/dashboard/accounts": {
    title: "LinkedIn Accounts",
    subtitle: "Manage connected LinkedIn sender profiles, daily caps, and warm-up cycles.",
  },
  "/dashboard/campaigns": {
    title: "Outreach Campaigns",
    subtitle: "Multi-touch connection request and message sequences powered by AI.",
  },
  "/dashboard/extractor": {
    title: "Lead Extractor",
    subtitle: "Find verified prospects with email, LinkedIn, and company data.",
  },
  "/dashboard/leads": {
    title: "Lead Database",
    subtitle: "Unified CRM contacts, conversation stages, and qualification scores.",
  },
  "/dashboard/ai": {
    title: "AI Outreach Assistant",
    subtitle: "Generate hyper-personalized icebreakers and contextual follow-ups.",
  },
  "/dashboard/inbound": {
    title: "Inbound Automation",
    subtitle: "Auto-respond to profile visits, post interactions, and connection acceptances.",
  },
  "/dashboard/settings": {
    title: "Workspace Settings",
    subtitle: "Configure workspace members, billing, API keys, and safety throttles.",
  },
};

export function TopBar({ onMenuClick, user }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [newDropdownOpen, setNewDropdownOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const newRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Derive current page meta
  const currentMeta = PAGE_TITLES[pathname] || {
    title: "SendPilot CRM",
    subtitle: "AI-powered LinkedIn outreach and relationship management.",
  };

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearchModalOpen(false);
        setNewDropdownOpen(false);
        setBellOpen(false);
        setAvatarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (newRef.current && !newRef.current.contains(event.target as Node)) {
        setNewDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setBellOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // [PLACEHOLDER DATA] Searchable items
  const searchableItems = [
    { type: "Campaign", title: "SaaS Founders Series A", link: "/dashboard/campaigns", hint: "Active • 248 leads" },
    { type: "Campaign", title: "VP Sales Outreach Q4", link: "/dashboard/campaigns", hint: "Paused • 120 leads" },
    { type: "Lead", title: "Sarah Chen (Head of Growth @ Stripe)", link: "/dashboard/leads", hint: "Accepted • Message pending" },
    { type: "Lead", title: "Alex Rivera (Founder @ Acme AI)", link: "/dashboard/leads", hint: "Replied • Book meeting" },
    { type: "Lead", title: "Elena Rostova (Director of Sales @ Scale)", link: "/dashboard/leads", hint: "New lead" },
    { type: "Account", title: "Sarah Jenkins (LinkedIn Profile)", link: "/dashboard/accounts", hint: "Active • Warmup stage 2" },
  ];

  const filteredItems = searchableItems.filter((i) =>
    i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // [PLACEHOLDER DATA] Notifications
  const notifications = [
    {
      id: 1,
      title: "Sarah Chen accepted your invite",
      time: "12m ago",
      read: false,
      desc: "Ready to send follow-up step 1 in 'SaaS Founders' campaign.",
    },
    {
      id: 2,
      title: "Daily cap reached for Alex Rivera profile",
      time: "2h ago",
      read: false,
      desc: "Sent 20 of 20 invites today. Outreach resumes tomorrow at 9:00 AM.",
    },
    {
      id: 3,
      title: "New reply detected from Jordan Lee",
      time: "5h ago",
      read: true,
      desc: "'Sounds great, let's chat next Tuesday.'",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md px-4 sm:px-6">
        {/* Left: Mobile Menu + Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
                {currentMeta.title}
              </h1>
            </div>
            <p className="hidden md:block text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-md">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Global Search + "+ New" Dropdown + Notifications + Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search Button */}
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="group flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-500 hover:border-palm-leaf-400 dark:hover:border-palm-leaf-600 hover:bg-white dark:hover:bg-neutral-900 transition-all shadow-2xs"
          >
            <Search className="h-3.5 w-3.5 text-neutral-400 group-hover:text-palm-leaf-600" />
            <span className="hidden sm:inline text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300">
              Search leads, campaigns...
            </span>
            <span className="inline sm:hidden text-neutral-400">Search</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 px-1 text-[10px] font-mono text-neutral-400 group-hover:text-neutral-600">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          {/* "+ New" Dropdown */}
          <div className="relative" ref={newRef}>
            <button
              type="button"
              onClick={() => setNewDropdownOpen(!newDropdownOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs hover:shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>New</span>
            </button>

            {newDropdownOpen && (
              <div className="absolute right-0 top-11 z-40 w-52 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Quick Actions
                </div>
                <Link
                  href="/dashboard/campaigns"
                  onClick={() => setNewDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-palm-leaf-50 dark:hover:bg-palm-leaf-950/40 hover:text-palm-leaf-900 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-palm-leaf-100 text-palm-leaf-700 dark:bg-palm-leaf-900/60 dark:text-palm-leaf-300">
                    <Send className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="block font-semibold">New Campaign</span>
                    <span className="block text-[10px] text-neutral-400 font-normal">Create outreach sequence</span>
                  </div>
                </Link>

                <Link
                  href="/dashboard/extractor"
                  onClick={() => setNewDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-palm-leaf-50 dark:hover:bg-palm-leaf-950/40 hover:text-palm-leaf-900 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-palm-leaf-100 text-palm-leaf-700 dark:bg-palm-leaf-900/60 dark:text-palm-leaf-300">
                    <Upload className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="block font-semibold">Import Leads</span>
                    <span className="block text-[10px] text-neutral-400 font-normal">Upload CSV or Sales Nav</span>
                  </div>
                </Link>

                <Link
                  href="/dashboard/leads"
                  onClick={() => setNewDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-palm-leaf-50 dark:hover:bg-palm-leaf-950/40 hover:text-palm-leaf-900 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-palm-leaf-100 text-palm-leaf-700 dark:bg-palm-leaf-900/60 dark:text-palm-leaf-300">
                    <UserPlus className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="block font-semibold">Add Lead</span>
                    <span className="block text-[10px] text-neutral-400 font-normal">Single manual prospect</span>
                  </div>
                </Link>

                <Link
                  href="/dashboard/accounts"
                  onClick={() => setNewDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-palm-leaf-50 dark:hover:bg-palm-leaf-950/40 hover:text-palm-leaf-900 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0a66c2]/10 text-[#0a66c2] dark:bg-[#0a66c2]/20">
                    <span className="font-bold text-[10px]">in</span>
                  </div>
                  <div>
                    <span className="block font-semibold">Connect LinkedIn</span>
                    <span className="block text-[10px] text-neutral-400 font-normal">Link sender profile</span>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => setBellOpen(!bellOpen)}
              className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-palm-leaf-500 ring-2 ring-white dark:ring-neutral-900" />
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Notifications
                  </h4>
                  <span className="text-[10px] font-semibold text-palm-leaf-700 dark:text-palm-leaf-400 cursor-pointer hover:underline">
                    Mark all read
                  </span>
                </div>

                <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl border text-xs transition-colors ${
                        !n.read
                          ? "bg-palm-leaf-50/50 dark:bg-palm-leaf-950/20 border-palm-leaf-200/50 dark:border-palm-leaf-900/40"
                          : "bg-neutral-50/60 dark:bg-neutral-950/40 border-neutral-100 dark:border-neutral-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-200">
                          {n.title}
                        </p>
                        <span className="text-[10px] text-neutral-400 shrink-0">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                        {n.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar Menu */}
          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              onClick={() => setAvatarOpen(!avatarOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-palm-leaf-100 dark:bg-palm-leaf-950/80 text-palm-leaf-800 dark:text-palm-leaf-300 font-bold text-xs ring-1 ring-palm-leaf-300/40 overflow-hidden hover:opacity-90 transition-opacity"
              aria-label="User menu"
            >
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                user?.name?.charAt(0).toUpperCase() || "U"
              )}
            </button>

            {avatarOpen && (
              <div className="absolute right-0 top-11 z-40 w-56 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2 shadow-xl animate-in fade-in zoom-in-95">
                <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {user?.name || "SendPilot User"}
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {user?.email || "user@sendpilot.io"}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setAvatarOpen(false)}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <span>Profile & Settings</span>
                  </Link>
                  <Link
                    href="/get-started"
                    onClick={() => setAvatarOpen(false)}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-palm-leaf-600" />
                      Get Started Checklist
                    </span>
                    <span className="text-[9px] bg-palm-leaf-100 text-palm-leaf-800 dark:bg-palm-leaf-950 dark:text-palm-leaf-300 font-bold px-1.5 py-0.5 rounded-full">
                      Onboarding
                    </span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 px-4 py-3">
              <Search className="h-4 w-4 text-palm-leaf-600 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads, campaigns, sender accounts..."
                className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List */}
            <div className="p-2 max-h-80 overflow-y-auto space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {searchQuery ? "Matching Results" : "Recent Searches & Quick Jumps"}
              </div>

              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSearchModalOpen(false);
                      router.push(item.link);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-palm-leaf-50 dark:hover:bg-palm-leaf-950/40 group transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 group-hover:bg-palm-leaf-200/60 group-hover:text-palm-leaf-900">
                          {item.type}
                        </span>
                        <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 ml-1 mt-0.5 block">
                        {item.hint}
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-palm-leaf-600 transition-colors" />
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-neutral-500">
                  No matching leads or campaigns found.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60 px-4 py-2 text-[10px] text-neutral-400">
              <div className="flex items-center gap-2">
                <span>Navigate <kbd className="font-mono bg-white dark:bg-neutral-800 px-1 rounded border">↑</kbd><kbd className="font-mono bg-white dark:bg-neutral-800 px-1 rounded border">↓</kbd></span>
                <span>Select <kbd className="font-mono bg-white dark:bg-neutral-800 px-1 rounded border">↵</kbd></span>
              </div>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
