"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Menu, X, ArrowRight, LayoutDashboard, Zap } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Product", href: "#solution" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "AI Assistant", href: "#ai-assistant" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 bg-white ${
        isScrolled
          ? "border-b border-neutral-200 shadow-xs"
          : "border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white shadow-xs">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <span className="font-bold text-lg sm:text-xl tracking-tight text-black">
            SendPilot
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-neutral-600 hover:text-black transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Auth CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {session?.user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-black hover:bg-neutral-800 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-black transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 bg-white px-4 pt-3 pb-6 space-y-4">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-neutral-600 hover:text-black transition-colors py-1"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2.5">
            {session?.user ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black text-white py-2.5 text-xs font-semibold"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-neutral-200 text-center py-2.5 text-xs font-semibold text-neutral-800"
                >
                  Log In
                </Link>
                <Link
                  href="/get-started"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-black text-white py-2.5 text-xs font-semibold shadow-xs"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
