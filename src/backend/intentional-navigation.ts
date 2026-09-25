// intentional-navigation.ts — one-shot unload bypass for field-owned hard navigation.
//
// This is deliberately tiny and stateful. `leaveBuilderTo()` arms it only AFTER
// the project has been persisted successfully; autosave consumes it exactly once
// from beforeunload. The TTL prevents a failed/non-started navigation from
// suppressing an unrelated later tab close.

let armedUntil = 0;
const DEFAULT_TTL_MS = 2000;

export function armIntentionalNavigationBypass(
  now = Date.now(),
  ttlMs = DEFAULT_TTL_MS,
): void {
  armedUntil = now + Math.max(0, ttlMs);
}

export function consumeIntentionalNavigationBypass(now = Date.now()): boolean {
  if (armedUntil <= 0 || now > armedUntil) {
    armedUntil = 0;
    return false;
  }
  armedUntil = 0;
  return true;
}

export function resetIntentionalNavigationBypassForTests(): void {
  armedUntil = 0;
}
