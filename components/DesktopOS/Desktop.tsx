'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './Desktop.module.css';

interface Props {
  corruptionLevel: number;
  onOpenApp:       (action: string) => void;
}

// ── Wallpaper ladder ──────────────────────────────────────────────────────────
function getWallpaper(corruption: number): string {
  if (corruption >= 96) return '/wallpapers/bliss_4.jpg';
  if (corruption >= 78) return '/wallpapers/bliss_3.jpg';
  if (corruption >= 52) return '/wallpapers/bliss_2.jpg';
  if (corruption >= 25) return '/wallpapers/bliss_1.jpg';
  return '/wallpapers/bliss_0.jpg';
}

// Corruption levels that trigger the jumpscare flash
const JUMPSCARE_THRESHOLDS = [40, 68, 88];
const JUMPSCARE_DURATION   = 160;   // ms the broken screen is visible
const FADE_DURATION        = 30000; // 30s crossfade — imperceptibly slow

interface DesktopIcon {
  label:   string;
  emoji:   string;
  action:  string;
  hidden?: boolean;
}

function buildDesktopIcons(corruption: number): DesktopIcon[] {
  const icons: DesktopIcon[] = [
    { label: 'My Documents',     emoji: '📁', action: 'explorer:My Documents' },
    { label: 'My Computer',      emoji: '🖥️', action: 'mycomputer'            },
    { label: 'Recycle Bin',      emoji: '🗑️', action: 'explorer:Recycle Bin'  },
    { label: 'Internet Explorer',emoji: '🌐', action: 'ie'                    },
    { label: 'Minesweeper',      emoji: '💣', action: 'minesweeper'           },
    { label: 'Snake', emoji: '🐍', action: 'snake' },
  ];
  if (corruption >= 50) {
    icons.push({ label: 'system_log.txt', emoji: '📄', action: 'notepad:system_log.txt' });
  }
  return icons;
}

export default function Desktop({ corruptionLevel, onOpenApp }: Props) {
  // ── Wallpaper crossfade state ──────────────────────────────────────
  const currentWall   = getWallpaper(corruptionLevel);
  const [stableWall,  setStableWall]  = useState(currentWall);   // ← holds OLD image during fade
  const [fadingWall,  setFadingWall]  = useState<string | null>(null);
  const [fadeOpacity, setFadeOpacity] = useState(0);

  const prevWallRef   = useRef(currentWall);
  const fadeTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promoteTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpscareOuterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpscareInnerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentWall === prevWallRef.current) return;
    prevWallRef.current = currentWall;

    if (fadeTimer.current)    clearTimeout(fadeTimer.current);
    if (promoteTimer.current) clearTimeout(promoteTimer.current);

    // New wallpaper starts on top at opacity 0
    setFadingWall(currentWall);
    setFadeOpacity(0);

    // One frame later — begin the 60s fade-in
    fadeTimer.current = setTimeout(() => setFadeOpacity(1), 50);

    // After fade completes — promote new → stable, tear down fading layer
    promoteTimer.current = setTimeout(() => {
      setStableWall(currentWall);   // ← NOW update the bottom layer
      setFadingWall(null);
      setFadeOpacity(0);
    }, FADE_DURATION + 200);

    return () => {
      if (fadeTimer.current)    clearTimeout(fadeTimer.current);
      if (promoteTimer.current) clearTimeout(promoteTimer.current);
    };
  }, [currentWall]);

  // ── Jumpscare ──────────────────────────────────────────────────────
  const [showJumpscare, setShowJumpscare] = useState(false);
  const firedThresholds = useRef<number[]>([]);
  const prevCorruption  = useRef(corruptionLevel);

  useEffect(() => {
    const prev = prevCorruption.current;
    prevCorruption.current = corruptionLevel;

    for (const threshold of JUMPSCARE_THRESHOLDS) {
      if (
        prev < threshold &&
        corruptionLevel >= threshold &&
        !firedThresholds.current.includes(threshold)
      ) {
        firedThresholds.current.push(threshold);

        const delay = 600 + Math.random() * 1200;
        jumpscareOuterTimer.current = setTimeout(() => {
          setShowJumpscare(true);
          jumpscareInnerTimer.current = setTimeout(
            () => setShowJumpscare(false),
            JUMPSCARE_DURATION
          );
        }, delay);

        break;
      }
    }

    return () => {
      if (jumpscareOuterTimer.current) clearTimeout(jumpscareOuterTimer.current);
      if (jumpscareInnerTimer.current) clearTimeout(jumpscareInnerTimer.current);
    };
  }, [corruptionLevel]);

  // ── Icons ──────────────────────────────────────────────────────────
  const icons = buildDesktopIcons(corruptionLevel);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className={styles.desktop}>

      {/* ── Layer 1: current/old wallpaper ───────────────────── */}
      <div
        className={styles.wallpaperLayer}
        style={{ backgroundImage: `url(${stableWall})` }}
      />

      {/* ── Layer 2: incoming wallpaper, fades in over 60s ───── */}
      {fadingWall && (
        <div
          className={styles.wallpaperLayer}
          style={{
            backgroundImage: `url(${fadingWall})`,
            opacity:          fadeOpacity,
            transition:       `opacity ${FADE_DURATION}ms linear`,
          }}
        />
      )}

      {/* ── Jumpscare: no transition, appears and vanishes ────── */}
      {showJumpscare && (
        <div
          className={styles.jumpscareLayer}
          style={{ backgroundImage: 'url(/wallpapers/bliss_jumpscare.jpg)' }}
          aria-hidden
        />
      )}

      {/* ── Desktop icons ──────────────────────────────────────── */}
      <div className={styles.iconGrid}>
        {icons.map(icon => (
          <button
            key={icon.label}
            className={[
              styles.icon,
              selected === icon.label ? styles.selected : '',
            ].join(' ')}
            onClick={()           => setSelected(icon.label)}
            onDoubleClick={()     => { setSelected(icon.label); onOpenApp(icon.action); }}
            onKeyDown={e          => e.key === 'Enter' && onOpenApp(icon.action)}
          >
            <span className={styles.iconEmoji} aria-hidden>{icon.emoji}</span>
            <span className={styles.iconLabel}>{icon.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
