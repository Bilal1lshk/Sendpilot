"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Sync with localStorage on client mount
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("sendpilot_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    };
    handleStorage();

    // Listen to changes in case user toggles sidebar
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(handleStorage, 500);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col antialiased">
      {/* Fixed Left Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        user={user}
      />

      {/* Main Content Area: dynamically offset based on collapsed desktop state */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"
        }`}
      >
        {/* Sticky Top Bar */}
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          user={user}
        />

        {/* Page Container: max width 1280px (max-w-7xl) with soft padding */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
