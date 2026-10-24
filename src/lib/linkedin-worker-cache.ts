const SESSION_CACHE_TTL_MS = 10 * 60 * 1000;

export function shouldReuseCachedLinkedInSession(input: {
  cachedAt: number;
  now?: number;
  verificationCode?: string;
  pendingChallengeToken?: string;
}): boolean {
  return (
    (input.now ?? Date.now()) - input.cachedAt < SESSION_CACHE_TTL_MS &&
    !input.verificationCode?.trim() &&
    !input.pendingChallengeToken?.trim()
  );
}
