import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    resetCorruption: () => void;
  }
}

export interface CorruptionState {
  loginCount: number;
  corruptionLevel: number;          // 0–100, driven by exploration\
  username:            string;              // ← new
  setUsername:         (name: string) => void; // ← new
  recordLogin: () => number;        // returns the NEW login count
  incrementCorruption: (n: number) => void;
  resetAll: () => void;             // dev utility
}

export function useCorruption(): CorruptionState {
  const [loginCount, setLoginCount]       = useState(0);
  const [corruptionLevel, setCorruption]  = useState(0);
  const [username, setUsernameState] = useState('');

  useEffect(() => {
    setLoginCount(parseInt(localStorage.getItem('xp_logins')      ?? '0', 10));
    setCorruption(parseInt(localStorage.getItem('xp_corruption')  ?? '0', 10));
    setUsernameState(localStorage.getItem('xp_username') ?? '');  // ← new
  }, []);

  useEffect(() => {
    window.resetCorruption = () => {
      localStorage.removeItem('xp_logins');
      localStorage.removeItem('xp_corruption');
      localStorage.removeItem('xp_username');
      setLoginCount(0);
      setCorruption(0);
      setUsernameState('');
      console.log('%c[XP] Corruption reset. Reload the page.', 'color: #00ff00; font-family: monospace;');
    };

    return () => {
      delete (window as Window & { resetCorruption?: () => void }).resetCorruption;
    };
  }, []);

  const recordLogin = useCallback(() => {
    const next = loginCount + 1;
    setLoginCount(next);
    localStorage.setItem('xp_logins', String(next));
    return next;
  }, [loginCount]);

  const incrementCorruption = useCallback((n: number) => {
    setCorruption(prev => {
      const next = Math.min(100, prev + n);
      localStorage.setItem('xp_corruption', String(next));
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    localStorage.clear();
    setLoginCount(0);
    setCorruption(0);
  }, []);

  const setUsername = useCallback((name: string) => {
    const trimmed = name.trim();
    setUsernameState(trimmed);
    localStorage.setItem('xp_username', trimmed);
  }, []);

  return { loginCount, corruptionLevel, username, setUsername, recordLogin, incrementCorruption, resetAll };
}
