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

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const NAV_ITEMS = [
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
    badge: "2 Active",
  },
  {
    name: "Campaigns",
    href: "/dashboard/campaigns",
    icon: Send,
    badge: "4 Active",
  },
  {
    name: "Lead Extractor",
    href: "/dashboard/extractor",
    icon: Target,
    badge: "New",
  },
  {
    name: "Lead Database",
    href: "/dashboard/leads",
    icon: Database,
    badge: null,
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

export function Sidebar({ mobileOpen, setMobileOpen, user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState("SendPilot HQ");

  useEffect(() => {
    const saved = localStorage.getItem("sendpilot_sidebar_collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("sendpilot_sidebar_collapsed", String(nextState));
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const workspaces = [
    { name: "SendPilot HQ", plan: "Growth Plan", leads: "2,480 leads" },
    { name: "Personal Workspace", plan: "Free Trial", leads: "45 leads" },
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
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-palm-leaf-600 text-white font-bold text-xs tracking-tight shadow-xs">
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
                              ? "bg-palm-leaf-50 dark:bg-palm-leaf-950/40 text-palm-leaf-900 dark:text-palm-leaf-300 font-semibold"
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
                            <Check className="h-3.5 w-3.5 text-palm-leaf-600 shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                      <Link
                        href="/get-started"
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
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-palm-leaf-600 text-white font-bold text-xs shadow-xs">
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
          {NAV_ITEMS.map((item) => {
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
                    ? "text-palm-leaf-950 dark:text-palm-leaf-200 font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 font-normal"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                {/* Active Background Pill + Sliding Green Left Bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 rounded-lg bg-palm-leaf-50/90 dark:bg-palm-leaf-950/40 border-l-2 border-palm-leaf-600"
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
                        ? "text-palm-leaf-600 dark:text-palm-leaf-400"
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
                          ? "bg-palm-leaf-200/60 dark:bg-palm-leaf-900 text-palm-leaf-800 dark:text-palm-leaf-300"
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
          {/* Usage Meter: [PLACEHOLDER DATA] */}
          {!collapsed ? (
            <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 p-2.5">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Credits used
                </span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  420 of 800
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "52.5%" }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-palm-leaf-500"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-neutral-400">
                Resets in 14 days
              </p>
            </div>
          ) : (
            <div
              className="flex justify-center"
              title="Credits used: 420 / 800 (52%)"
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
                ? "text-palm-leaf-800 dark:text-palm-leaf-300 font-semibold"
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
                ? "text-palm-leaf-800 dark:text-palm-leaf-300 font-semibold"
                : ""
            } ${collapsed ? "justify-center px-0" : ""}`}
          >
            <Settings className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">Settings</span>}
          </Link>

          {/* User profile & Sign out */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className={`flex items-center gap-2 min-w-0 ${collapsed ? "justify-center w-full" : ""}`}>
              <div className="h-6 w-6 rounded-md bg-palm-leaf-100 dark:bg-palm-leaf-950 text-palm-leaf-800 dark:text-palm-leaf-300 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 border border-palm-leaf-300/40">
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
