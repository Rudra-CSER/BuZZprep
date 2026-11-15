import type { ThemePreference } from '@buzzprep/shared';
import { create } from 'zustand';

const KEY = 'bp-theme';
// The navigation's ink (--chrome in styles.css), used for the browser and OS bars.
const LIGHT_BAR = '#161828';
const DARK_BAR = '#06070b';
const media =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readPref(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && !!media?.matches);
  document.documentElement.classList.toggle('dark', dark);
  // Keep the browser and Android status bars in step with the chosen theme.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    if (pref === 'system') {
      meta.content = meta.media.includes('dark') ? DARK_BAR : LIGHT_BAR;
    } else {
      meta.content = dark ? DARK_BAR : LIGHT_BAR;
    }
  }
}

interface ThemeState {
  pref: ThemePreference;
  setPref: (pref: ThemePreference) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  pref: readPref(),
  setPref: (pref) => {
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      /* ignore */
    }
    applyTheme(pref);
    set({ pref });
  },
}));

media?.addEventListener('change', () => {
  if (useTheme.getState().pref === 'system') applyTheme('system');
});
