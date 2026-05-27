// hooks/usePossession.ts
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface PossessionOptions {
  onLogout:        () => void;
  onOpenStartMenu: () => void;
  onFocusLogoff:   () => void;
}

interface PossessionState {
  possessed:           boolean;
  gravityTarget:       { x: number; y: number } | null;
  gravitySpeed:        number;
  handlePossessionReach: () => void;
}

export function usePossession({
  onLogout,
  onOpenStartMenu,
  onFocusLogoff,
}: PossessionOptions): PossessionState {
  const [possessed,     setPossessed]     = useState(false);
  const [gravityTarget, setGravityTarget] = useState<{ x: number; y: number } | null>(null);
  const [gravitySpeed,  setGravitySpeed]  = useState(0);

  const possessionPhase = useRef<'idle' | 'toStart' | 'toLogoff'>('idle');
  const sessionStart    = useRef(Date.now());
  const speedTimer      = useRef<ReturnType<typeof setInterval> | null>(null);
  const gravityTargetRef = useRef<{ x: number; y: number } | null>(null);
  
  const triggerNow = useCallback(() => {
    const startBtn = document.querySelector<HTMLElement>('[data-possession="start"]');
    if (!startBtn) return;

    possessionPhase.current = 'toStart';
    setPossessed(true);
    const r = startBtn.getBoundingClientRect();
    updateGravityTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    setGravitySpeed(0.008);

    if (speedTimer.current) clearInterval(speedTimer.current);
    speedTimer.current = setInterval(() => {
      setGravitySpeed(s => Math.min(0.55, s + 0.022));
    }, 10_000);
  }, []);

  useEffect(() => {
    (window as any).triggerPossession = triggerNow;
    return () => {
      if ((window as any).triggerPossession === triggerNow) {
        delete (window as any).triggerPossession;
      }
    };
  }, [triggerNow]);

  // Start possession after 5 minutes idle
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - sessionStart.current) / 1000;
      if (elapsed < 300 || possessionPhase.current !== 'idle') return;

      const startBtn = document.querySelector<HTMLElement>('[data-possession="start"]');
      if (!startBtn) return;

      possessionPhase.current = 'toStart';
      setPossessed(true);
      const r = startBtn.getBoundingClientRect();
      updateGravityTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      setGravitySpeed(0.008);

      // Speed ramp — gets faster every 10s
      speedTimer.current = setInterval(() => {
        setGravitySpeed(s => Math.min(0.55, s + 0.022));
      }, 10_000);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  // Cleanup speed timer on unmount
  useEffect(() => () => {
    if (speedTimer.current) clearInterval(speedTimer.current);
  }, []);

  const updateGravityTarget = useCallback((val: { x: number; y: number } | null) => {
    gravityTargetRef.current = val;
    setGravityTarget(val);
  }, []);

  const handlePossessionReach = useCallback(() => {
    // First leg: reached the Start button
    if (possessionPhase.current === 'toStart') {
      possessionPhase.current = 'toLogoff';

      // Start menu should open now
      setGravitySpeed(0.25);
      onOpenStartMenu();

      // After the StartMenu is open, aim at the Log Off button
      setTimeout(() => {
        onFocusLogoff();
        const logoffBtn = document.querySelector<HTMLElement>('[data-possession="logoff"]');
        if (!logoffBtn) return;
        const r = logoffBtn.getBoundingClientRect();
        updateGravityTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }, 300);

      return;
    }

    // Second leg: reached the Log Off button
    if (possessionPhase.current === 'toLogoff') {
      if (!gravityTargetRef.current) return;

      possessionPhase.current = 'idle';
      if (speedTimer.current) clearInterval(speedTimer.current);
      setGravitySpeed(0);

      setTimeout(() => {
        updateGravityTarget(null);
        setPossessed(false);
        onLogout();
      }, 400);
    }
  }, [onLogout, onOpenStartMenu, onFocusLogoff]);

  return { possessed, gravityTarget, gravitySpeed, handlePossessionReach };
}
