"use client";

import { RefreshCw, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { LinkedInAccount } from "@/types/onboarding";

interface ProfileCardProps {
  account: LinkedInAccount;
  onReconnect?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function ProfileCard({
  account,
  onReconnect,
  onRemove,
}: ProfileCardProps) {
  const isActive = account.status === "Active";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-base overflow-hidden border border-neutral-200 dark:border-neutral-700">
          {account.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.photo}
              alt={account.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            account.name.charAt(0).toUpperCase()
          )}
          <span
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-neutral-900 ${
              isActive ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {account.name}
            </h4>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40"
              }`}
            >
              {isActive ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {account.status}
            </span>
          </div>

          {account.headline && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
              {account.headline}
            </p>
          )}

          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Connected on {account.connectedAt}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <button
          type="button"
          onClick={() => onReconnect?.(account.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5 text-neutral-400" />
          <span>Reconnect</span>
        </button>

        <button
          type="button"
          onClick={() => onRemove?.(account.id)}
          aria-label={`Remove account ${account.name}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
}
