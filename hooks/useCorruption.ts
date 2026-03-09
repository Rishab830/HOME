'use client';

import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window { resetCorruption?: () => void; }
}

export interface CorruptionState {
  loginCount:          number;
  corruptionLevel:     number;
  username:            string;
  recordLogin:         () => number;
  incrementCorruption: (n: number) => void;
  triggerOnce:         (key: string, gain: number) => void;  // ← ADD
  setUsername:         (name: string) => void;
  resetAll:            () => void;
}

// ─── Module-level singleton ────────────────────────────────────────────────
// All hook instances share ONE store. Eliminates stale state across
// LoginScreen, DesktopOS, Notepad etc. calling useCorruption separately.
interface Store { loginCount: number; corruptionLevel: number; username: string; triggered: Set<string>; }

let _store: Store = { loginCount: 0, corruptionLevel: 0, username: '', triggered: new Set<string>(), };
const _listeners  = new Set<(s: Store) => void>();

// Hydrate synchronously on module load — no useEffect delay
if (typeof window !== 'undefined') {
  const rawTriggered = localStorage.getItem('xp_triggered');  // ← declare BEFORE _store
  _store = {
    loginCount:      parseInt(localStorage.getItem('xp_logins')      ?? '0', 10),
    corruptionLevel: parseInt(localStorage.getItem('xp_corruption')  ?? '0', 10),
    username:        localStorage.getItem('xp_username') ?? '',
    triggered:       new Set(rawTriggered ? JSON.parse(rawTriggered) : []),  // ← ADD
  };
}

function _set(partial: Partial<Store>) {
  _store = { ..._store, ...partial };
  if (partial.triggered) {
    localStorage.setItem(
      'xp_triggered',
      JSON.stringify([..._store.triggered])
    );
  }
  _listeners.forEach(fn => fn({ ..._store }));
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useCorruption(): CorruptionState {
  const [state, setState] = useState<Store>({ ..._store });

  useEffect(() => {
    // Subscribe to module-level changes
    const listener = (s: Store) => setState({ ...s });
    _listeners.add(listener);
    // Sync in case store changed between module load and mount
    setState({ ..._store });
    return () => { _listeners.delete(listener); };
  }, []);

  // Dev utility exposed on window
  useEffect(() => {
    window.resetCorruption = () => {
      localStorage.clear();
      _set({ loginCount: 0, corruptionLevel: 0, username: '' });
      console.log('%c[XP] Reset.', 'color:#0f0;font-family:monospace');
    };
    return () => { delete window.resetCorruption; };
  }, []);

  const recordLogin = useCallback(() => {
    const next = _store.loginCount + 1;
    localStorage.setItem('xp_logins', String(next));
    _set({ loginCount: next });
    return next;
  }, []);

  const incrementCorruption = useCallback((n: number) => {
    const next = Math.min(100, _store.corruptionLevel + n);
    localStorage.setItem('xp_corruption', String(next));
    _set({ corruptionLevel: next });
  }, []);

  const triggerOnce = useCallback((key: string, gain: number) => {
    if (_store.triggered.has(key)) return;        // already fired — do nothing
    const next     = Math.min(100, _store.corruptionLevel + gain);
    const updated  = new Set(_store.triggered).add(key);
    localStorage.setItem('xp_corruption', String(next));
    _set({ corruptionLevel: next, triggered: updated });
  }, []);

  const setUsername = useCallback((name: string) => {
    const trimmed = name.trim();
    localStorage.setItem('xp_username', trimmed);
    _set({ username: trimmed });
  }, []);

  const resetAll = useCallback(() => {
    localStorage.clear();
    _set({ loginCount: 0, corruptionLevel: 0, username: '', triggered: new Set() });
  }, []);

  return {
    loginCount:          state.loginCount,
    corruptionLevel:     state.corruptionLevel,
    username:            state.username,
    recordLogin,
    incrementCorruption,
    triggerOnce,
    setUsername,
    resetAll,
  };
}
