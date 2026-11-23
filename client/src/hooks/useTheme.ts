import { useEffect, useSyncExternalStore } from 'react';
import { useSettings } from '@/store/settings';

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function subscribe(cb: () => void) {
  media?.addEventListener('change', cb);
  return () => media?.removeEventListener('change', cb);
}

function useSystemDark() {
  return useSyncExternalStore(subscribe, () => media?.matches ?? false, () => false);
}

export function useResolvedTheme(): 'light' | 'dark' {
  const mode = useSettings((s) => s.theme);
  const systemDark = useSystemDark();
  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
}

/** Applies the `dark` class to <html> for the workspace (the landing page is always dark). */
export function useApplyTheme(enabled: boolean) {
  const resolved = useResolvedTheme();
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
    return () => {
      root.classList.remove('dark');
      root.style.colorScheme = '';
    };
  }, [enabled, resolved]);
}
