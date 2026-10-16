/**
 * Server-side in-memory cache for MongoDB queries per user.
 * Ensures the database is NOT queried repeatedly on every request—
 * cached results are returned instantly and only invalidated when data changes.
 */

type CacheNamespace =
  | "settings"
  | "onboarding"
  | "overview"
  | "leads"
  | "campaigns"
  | "accounts";

interface CacheEntry<T = unknown> {
  data: T;
  updatedAt: number;
}

declare global {
  var __sendpilotDbCache: Map<string, CacheEntry> | undefined;
}

const cacheStore: Map<string, CacheEntry> =
  globalThis.__sendpilotDbCache ?? new Map<string, CacheEntry>();

if (!globalThis.__sendpilotDbCache) {
  globalThis.__sendpilotDbCache = cacheStore;
}

function makeKey(userId: string, namespace: CacheNamespace, subKey = "default"): string {
  return `${userId}:${namespace}:${subKey}`;
}

export function getDbCache<T>(
  userId: string,
  namespace: CacheNamespace,
  subKey = "default"
): T | null {
  const key = makeKey(userId, namespace, subKey);
  const entry = cacheStore.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function setDbCache<T>(
  userId: string,
  namespace: CacheNamespace,
  data: T,
  subKey = "default"
): void {
  const key = makeKey(userId, namespace, subKey);
  cacheStore.set(key, {
    data,
    updatedAt: Date.now(),
  });
}

/**
 * Invalidate specific namespaces (or all namespaces if omitted) for a user
 * whenever a database write/mutation occurs.
 */
export function invalidateDbCache(
  userId: string,
  namespaces?: CacheNamespace[]
): void {
  const prefix = `${userId}:`;
  for (const key of cacheStore.keys()) {
    if (!key.startsWith(prefix)) continue;
    if (!namespaces || namespaces.length === 0) {
      cacheStore.delete(key);
    } else {
      const parts = key.split(":");
      const ns = parts[1] as CacheNamespace;
      if (namespaces.includes(ns)) {
        cacheStore.delete(key);
      }
    }
  }
}
