/** Session-storage key: the opening plays once per browser tab, not on every visit. */
const SEEN = 'buzzprep:welcome-intro';

/** Whether to play the opening animation: motion is welcome and this tab hasn't seen it yet. */
export function introWanted(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return window.sessionStorage.getItem(SEEN) !== '1';
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    window.sessionStorage.setItem(SEEN, '1');
  } catch {
    // Storage is off (private mode, blocked): the opening may play again, which is harmless.
  }
}
