"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  Database,
  AlertTriangle,
  UserCheck,
  MessageSquare,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchLeadsIfNeeded,
  fetchCampaignsIfNeeded,
  fetchAccountsIfNeeded,
} from "@/store/slices/databaseSlice";

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

  const dispatch = useAppDispatch();
  const leads = useAppSelector((state) => state.database.leads.items);
  const campaigns = useAppSelector((state) => state.database.campaigns.items);
  const accounts = useAppSelector((state) => state.database.accounts.items);

  const [allRead, setAllRead] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch real database records on mount
  useEffect(() => {
    dispatch(fetchLeadsIfNeeded());
    dispatch(fetchCampaignsIfNeeded());
    dispatch(fetchAccountsIfNeeded());
  }, [dispatch]);

  // Build real searchable items from database records
  const searchableItems = useMemo(() => {
    const items: Array<{
      type: "Campaign" | "Lead" | "Account";
      title: string;
      link: string;
      hint: string;
    }> = [];

    // Real campaigns
    campaigns.forEach((c) => {
      items.push({
        type: "Campaign",
        title: c.name,
        link: "/dashboard/campaigns",
        hint: `${c.status} • ${c.leadsCount || 0} leads`,
      });
    });

    // Real leads
    leads.forEach((l) => {
      const name =
        l.fullName ||
        [l.firstName, l.lastName].filter(Boolean).join(" ") ||
        l.name ||
        "Lead";
      const meta = [l.title || l.jobTitle, l.company].filter(Boolean).join(" @ ");
      const displayTitle = meta ? `${name} (${meta})` : name;
      const hint = [
        l.status || "New lead",
        l.group ? `Group: ${l.group}` : null,
      ]
        .filter(Boolean)
        .join(" • ");

      items.push({
        type: "Lead",
        title: displayTitle,
        link: "/dashboard/leads",
        hint,
      });
    });

    // Real sender accounts
    accounts.forEach((a) => {
      items.push({
        type: "Account",
        title: `${a.name} (LinkedIn)`,
        link: "/dashboard/accounts",
        hint: `${a.status}${a.headline ? ` • ${a.headline}` : ""}`,
      });
    });

    return items;
  }, [campaigns, leads, accounts]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return searchableItems.slice(0, 8);
    }
    const q = searchQuery.toLowerCase().trim();
    return searchableItems.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.hint.toLowerCase().includes(q)
    );
  }, [searchableItems, searchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, searchModalOpen]);

  // Real notifications generated from active accounts, campaigns, and imported leads
  const notifications = useMemo(() => {
    if (allRead) return [];

    const notifs: Array<{
      id: string;
      title: string;
      time: string;
      read: boolean;
      desc: string;
      type: "lead" | "campaign" | "account" | "warning" | "reply";
      href: string;
    }> = [];

    // 1. Account status alerts & activated accounts
    accounts.forEach((acc) => {
      const statusLower = (acc.status || "").toLowerCase();
      if (statusLower === "expired" || statusLower === "disconnected") {
        const id = `acc-warn-${acc.id}`;
        notifs.push({
          id,
          title: `Re-auth Required: ${acc.name}`,
          time: "Action required",
          read: readIds.includes(id),
          desc: "Sender session expired. Reconnect in LinkedIn Accounts to resume outreach.",
          type: "warning",
          href: "/dashboard/accounts",
        });
      } else if (statusLower === "active") {
        const id = `acc-active-${acc.id}`;
        notifs.push({
          id,
          title: `Account Activated: ${acc.name}`,
          time: "Active Sender",
          read: readIds.includes(id),
          desc: `LinkedIn session verified. Ready to dispatch ${acc.dailyCap || 25} requests daily.`,
          type: "account",
          href: "/dashboard/accounts",
        });
      }
    });

    // 2. Real campaign notifications (started & drafts)
    campaigns.forEach((camp) => {
      if (camp.status === "Active") {
        const id = `camp-active-${camp.id}`;
        notifs.push({
          id,
          title: `Campaign Started: "${camp.name}"`,
          time: "Running",
          read: readIds.includes(id),
          desc: `${camp.leadsCount || 0} leads enrolled. Automated Playwright outreach sequence active.`,
          type: "campaign",
          href: "/dashboard/campaigns",
        });
      } else {
        const id = `camp-draft-${camp.id}`;
        notifs.push({
          id,
          title: `Campaign Ready: "${camp.name}"`,
          time: "Draft",
          read: true,
          desc: `${camp.leadsCount || 0} leads selected. Sequence configured and ready to launch.`,
          type: "campaign",
          href: "/dashboard/campaigns",
        });
      }
    });

    // 3. Real leads imported notifications
    if (leads.length > 0) {
      const summaryId = "notif-leads-imported-summary";
      notifs.push({
        id: summaryId,
        title: `${leads.length} New Leads Imported`,
        time: "Database Synced",
        read: readIds.includes(summaryId),
        desc: `${leads.length} verified prospect profiles imported to database and ready for campaigns.`,
        type: "lead",
        href: "/dashboard/leads",
      });

      // Individual lead imports for latest records
      leads.slice(0, 2).forEach((l, idx) => {
        const leadName = l.fullName || l.name || `${l.firstName || "Prospect"} ${l.lastName || ""}`.trim();
        const id = `lead-imported-${l.id || l._id || idx}`;
        notifs.push({
          id,
          title: `Lead Imported: ${leadName}`,
          time: l.company || "New Prospect",
          read: readIds.includes(id),
          desc: `${l.jobTitle || l.title || "Target Persona"} at ${l.company || "Enterprise"}. Ready for outreach.`,
          type: "lead",
          href: "/dashboard/leads",
        });
      });
    }

    // 4. Inbound prospect replies
    const repliedLeads = leads.filter((l) => l.status === "replied" || l.status === "interested");
    repliedLeads.slice(0, 2).forEach((l, idx) => {
      const leadName = l.fullName || l.name || "Prospect";
      const id = `reply-${l.id || l._id || idx}`;
      notifs.push({
        id,
        title: `New Reply from ${leadName}`,
        time: "Inbound Reply",
        read: readIds.includes(id),
        desc: `"${l.notes || "Thanks for connecting! Let's set up a quick 10-minute overview call."}"`,
        type: "reply",
        href: "/dashboard/inbound",
      });
    });

    return notifs;
  }, [accounts, campaigns, leads, allRead, readIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
            className="group flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 dark:hover:border-neutral-700 hover:bg-white dark:hover:bg-neutral-900 transition-colors shadow-2xs"
          >
            <Search className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200" />
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors"
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
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
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
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    <Upload className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="block font-semibold">Import Leads</span>
                    <span className="block text-[10px] text-neutral-400 font-normal">Upload CSV or LinkedIn Search</span>
                  </div>
                </Link>

                <Link
                  href="/dashboard/leads"
                  onClick={() => setNewDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
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
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 transition-colors"
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
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Notifications
                  </h4>
                  {notifications.length > 0 && (
                    <span
                      onClick={() => setReadIds(notifications.map((n) => n.id))}
                      className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 cursor-pointer hover:underline"
                    >
                      Mark all read
                    </span>
                  )}
                </div>

                <div className="mt-2 space-y-2 max-h-80 overflow-y-auto pr-0.5">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => {
                          setReadIds((prev) => (prev.includes(n.id) ? prev : [...prev, n.id]));
                          setBellOpen(false);
                        }}
                        className={`block p-2.5 rounded-xl border text-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer ${
                          !n.read
                            ? "bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 shadow-2xs"
                            : "bg-neutral-50/60 dark:bg-neutral-950/40 border-neutral-100 dark:border-neutral-800 opacity-80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 font-semibold text-neutral-900 dark:text-neutral-100">
                            {n.type === "lead" && (
                              <div className="h-5 w-5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <Database className="h-3 w-3" />
                              </div>
                            )}
                            {n.type === "campaign" && (
                              <div className="h-5 w-5 rounded-md bg-palm-leaf-100 dark:bg-palm-leaf-950/60 text-palm-leaf-700 dark:text-palm-leaf-400 flex items-center justify-center shrink-0">
                                <Send className="h-3 w-3" />
                              </div>
                            )}
                            {n.type === "account" && (
                              <div className="h-5 w-5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                            )}
                            {n.type === "warning" && (
                              <div className="h-5 w-5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-3 w-3" />
                              </div>
                            )}
                            {n.type === "reply" && (
                              <div className="h-5 w-5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <MessageSquare className="h-3 w-3" />
                              </div>
                            )}
                            <span className="truncate">{n.title}</span>
                            {!n.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-400 shrink-0 font-medium">
                            {n.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 pl-7 leading-relaxed">
                          {n.desc}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <div className="py-7 px-3 text-center">
                      <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500/80 mb-2" />
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">All caught up</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">No unread alerts or notices.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar Menu */}
          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              onClick={() => setAvatarOpen(!avatarOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-xs ring-1 ring-neutral-200 dark:ring-neutral-700 overflow-hidden hover:opacity-90 transition-opacity"
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
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      Get Started Checklist
                    </span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200/60">
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
              <Search className="h-4 w-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredItems.length - 1)));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredItems[selectedIndex]) {
                      setSearchModalOpen(false);
                      router.push(filteredItems[selectedIndex].link);
                    }
                  }
                }}
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
                {searchQuery ? "Matching Results" : "Recent Records & Quick Jumps"}
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
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                      idx === selectedIndex
                        ? "bg-neutral-100 dark:bg-neutral-800"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    } group`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
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
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors" />
                  </button>
                ))
              ) : searchQuery ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  No matching leads, campaigns, or accounts found.
                </div>
              ) : (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-neutral-400">No campaigns or leads found in this workspace yet.</p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchModalOpen(false);
                        router.push("/dashboard/extractor");
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
                    >
                      Import Leads
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchModalOpen(false);
                        router.push("/dashboard/campaigns");
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-palm-leaf-600 hover:bg-palm-leaf-700 text-white font-medium cursor-pointer"
                    >
                      New Campaign
                    </button>
                  </div>
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
