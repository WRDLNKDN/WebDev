/**
 * Syncs signed-out home hero state with Layout so the shell can stay matte during
 * video playback and restore the brand grid only after copy is revealed.
 * Pairs with `HomeHeroUiMode` in `homeHeroUiMode.ts` (`video` ↔ `video`, `compact` ↔ `reveal`).
 */
export type HomeHeroPhase = 'video' | 'reveal';

let phase: HomeHeroPhase = 'video';
const listeners = new Set<() => void>();

export function subscribeHomeHeroPhase(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getHomeHeroPhaseSnapshot(): HomeHeroPhase {
  return phase;
}

export function setHomeHeroPhase(next: HomeHeroPhase) {
  if (phase === next) return;
  phase = next;
  listeners.forEach((l) => {
    l();
  });
}

export function resetHomeHeroPhase() {
  phase = 'video';
  listeners.forEach((l) => {
    l();
  });
}
