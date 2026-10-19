"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Send,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronsUpDown,
  Building2,
  Check,
  CreditCard,
  X,
  Target,
  Database,
  Flame,
  Palette,
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { signOut } from "next-auth/react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchOverviewIfNeeded,
  fetchWorkspaceSettingsIfNeeded,
} from "@/store/slices/databaseSlice";

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function Sidebar({ mobileOpen, setMobileOpen, user }: SidebarProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const overviewMetrics = useAppSelector((state) => state.database.overview.metrics);
  const storeWorkspaceName = useAppSelector((state) => state.database.settings.data?.workspaceName);

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sendpilot_sidebar_collapsed") === "true";
    }
    return false;
  });
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [localWorkspaceOverride, setLocalWorkspaceOverride] = useState<string | null>(null);

  const currentWorkspace =
    localWorkspaceOverride ||
    storeWorkspaceName ||
    (typeof window !== "undefined"
      ? localStorage.getItem("sendpilot_current_workspace") || "SendPilot HQ"
      : "SendPilot HQ");

  const setCurrentWorkspace = (name: string) => {
    setLocalWorkspaceOverride(name);
    if (typeof window !== "undefined") {
      localStorage.setItem("sendpilot_current_workspace", name);
    }
  };

  const totalLeads = overviewMetrics.totalLeads;
  const accountsCount = overviewMetrics.connectedAccountsCount;
  const campaignsCount = overviewMetrics.campaignsCount;

  useEffect(() => {
    dispatch(fetchOverviewIfNeeded());
    dispatch(fetchWorkspaceSettingsIfNeeded());

    const handleWorkspaceUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ name?: string }>;
      if (custom.detail?.name) {
        setLocalWorkspaceOverride(custom.detail.name);
      }
    };
    window.addEventListener("sendpilot:workspace-updated", handleWorkspaceUpdated);
    return () => {
      window.removeEventListener("sendpilot:workspace-updated", handleWorkspaceUpdated);
    };
  }, [dispatch]);

  const navItems = [
    {
      name: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "LinkedIn Accounts",
      href: "/dashboard/accounts",
      icon: LinkedInIcon,
      badge: accountsCount > 0 ? `${accountsCount} Active` : null,
    },
    {
      name: "Campaigns",
      href: "/dashboard/campaigns",
      icon: Send,
      badge: campaignsCount > 0 ? `${campaignsCount} Active` : null,
    },
    {
      name: "Lead Extractor",
      href: "/dashboard/extractor",
      icon: Target,
      badge: "Scraper",
    },
    {
      name: "Lead Database",
      href: "/dashboard/leads",
      icon: Database,
      badge: totalLeads > 0 ? `${totalLeads}` : null,
    },
    {
      name: "AI Assistant",
      href: "/dashboard/ai",
      icon: Sparkles,
      badge: "GPT-4o",
    },
    {
      name: "Inbound Automation",
      href: "/dashboard/inbound",
      icon: Flame,
      badge: null,
    },
  ];

  const toggleCollapsed = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("sendpilot_sidebar_collapsed", String(nextState));
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const workspaces = [
    { name: "SendPilot HQ", plan: "Active Workspace", leads: `${totalLeads} leads` },
    { name: "Personal Workspace", plan: "Demo Mode", leads: "0 leads" },
  ];

  return (
    <>
      {/* Mobile Backdrop with subtle fade */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-xs lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all duration-250 ease-out ${
          collapsed ? "lg:w-[72px]" : "lg:w-[240px]"
        } ${
          mobileOpen
            ? "translate-x-0 w-[270px] shadow-xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top: Logo & Workspace Switcher */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/80 px-4">
          {!collapsed ? (
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setSwitcherOpen(!switcherOpen)}
                className="group flex w-full items-center justify-between rounded-xl p-1 text-left hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-xs tracking-tight shadow-xs">
                    SP
                  </div>
                  <div className="truncate">
                    <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
                      {currentWorkspace}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-normal leading-none mt-0.5">
                      Pro Workspace
                    </p>
                  </div>
                </div>
                <ChevronsUpDown className="h-3 w-3 text-neutral-400 group-hover:text-neutral-600 shrink-0" />
              </button>

              {/* Workspace Switcher Dropdown */}
              <AnimatePresence>
                {switcherOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setSwitcherOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 top-12 z-30 w-56 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1.5 shadow-lg"
                    >
                      <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                        Workspaces
                      </div>
                      {workspaces.map((ws) => (
                        <button
                          key={ws.name}
                          onClick={() => {
                            setCurrentWorkspace(ws.name);
                            setSwitcherOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                            currentWorkspace === ws.name
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-semibold"
                              : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80"
                          }`}
                        >
                          <div className="truncate">
                            <span className="block truncate">{ws.name}</span>
                            <span className="block text-[10px] text-neutral-400 font-normal">
                              {ws.plan} • {ws.leads}
                            </span>
                          </div>
                          {currentWorkspace === ws.name && (
                            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                      <Link
                        href="/get-started/workspace"
                        onClick={() => setSwitcherOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                        <span>Create Workspace</span>
                      </Link>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-xs shadow-xs">
              SP
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1 text-neutral-400 hover:text-neutral-700 lg:hidden rounded-lg"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Middle: Navigation with Sliding Active Pill */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                  isActive
                    ? "text-neutral-900 dark:text-white font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 font-normal"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                {/* Active Background Pill + Left Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 border-l-2 border-neutral-900 dark:border-white"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                  />
                )}

                <div className="relative z-10 flex items-center gap-2.5 w-full">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive
                        ? "text-neutral-900 dark:text-white"
                        : "text-neutral-400"
                    }`}
                  />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.name}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span
                      className={`ml-auto text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-semibold"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="shrink-0 border-t border-neutral-200/60 dark:border-neutral-800 p-2.5 space-y-2">
          {/* Real CRM Storage Capacity Meter */}
          {!collapsed ? (
            <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 p-2.5">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Leads in CRM
                </span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {totalLeads} of 1,000
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(totalLeads > 0 ? 4 : 0, Math.round((totalLeads / 1000) * 100)))}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-neutral-400">
                Live MongoDB storage
              </p>
            </div>
          ) : (
            <div
              className="flex justify-center"
              title={`Leads in CRM: ${totalLeads} / 1,000`}
            >
              <div className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
            </div>
          )}

          {/* Style Guide preview link */}
          <Link
            href="/dashboard/style-guide"
            title={collapsed ? "Style Guide" : undefined}
            className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors ${
              pathname === "/dashboard/style-guide"
                ? "text-neutral-900 dark:text-white font-semibold"
                : ""
            } ${collapsed ? "justify-center px-0" : ""}`}
          >
            <Palette className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">Style Guide</span>}
          </Link>

          {/* Settings link */}
          <Link
            href="/dashboard/settings"
            title={collapsed ? "Settings" : undefined}
            className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors ${
              pathname.startsWith("/dashboard/settings")
                ? "text-neutral-900 dark:text-white font-semibold"
                : ""
            } ${collapsed ? "justify-center px-0" : ""}`}
          >
            <Settings className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">Settings</span>}
          </Link>

          {/* User profile & Sign out */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className={`flex items-center gap-2 min-w-0 ${collapsed ? "justify-center w-full" : ""}`}>
              <div className="h-6 w-6 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
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
              </div>
              {!collapsed && (
                <div className="truncate min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    {user?.name || "Account"}
                  </p>
                  <p className="truncate text-[10px] text-neutral-400">
                    {user?.email || "user@sendpilot.io"}
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-1 rounded-md text-neutral-400 hover:text-rose-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="hidden lg:block absolute -right-3 top-20 z-10">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 shadow-2xs hover:shadow-xs transition-all"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
