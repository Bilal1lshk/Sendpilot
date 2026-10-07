"use client";

import { ShieldCheck, ShieldAlert, KeyRound, Info } from "lucide-react";

interface ConsentPanelProps {
  onAgree?: () => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

export function ConsentPanel({ onAgree, onCancel }: ConsentPanelProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-7 shadow-xs space-y-6">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Privacy & Permissions Transparency
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            We value your trust. Here is exactly what happens when you link your account.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* What we store */}
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-950/50 bg-emerald-50/30 dark:bg-emerald-950/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>What we store</span>
          </div>
          <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1.5 list-disc list-inside">
            <li>Your public name & headline</li>
            <li>Verified email address</li>
            <li>Profile photo URL</li>
          </ul>
        </div>

        {/* What we never do */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span>What we never do</span>
          </div>
          <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1.5 list-disc list-inside">
            <li>Never store or ask for passwords</li>
            <li>No unsolicited auto-messaging</li>
            <li>Never share data with third parties</li>
          </ul>
        </div>

        {/* How to disconnect */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            <KeyRound className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            <span>How to disconnect</span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            You can remove your account at any moment with 1 click from your workspace settings or directly from LinkedIn app permissions.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/70 dark:border-neutral-800/80 text-xs text-neutral-600 dark:text-neutral-400">
        <Info className="h-4 w-4 text-neutral-500 shrink-0" />
        <span>
          Authentication is verified via LinkedIn&apos;s official OpenID Connect protocol.
        </span>
      </div>

      {(onAgree || onCancel) && (
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Cancel
            </button>
          )}
          {onAgree && (
            <button
              type="button"
              onClick={onAgree}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>I understand & continue</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
