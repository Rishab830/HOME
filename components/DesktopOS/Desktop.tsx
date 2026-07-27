'use client';

import { useState, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import styles from './Desktop.module.css';

import { type DesktopAction, ACTION, explorerAction, notepadAction } from './actions';

interface Props {
  corruptionLevel: number;
  onOpenApp: (action: DesktopAction) => void;   // ← was string
  allowJumpscares?: boolean;
  onOpenProperties: () => void;
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
  action:  DesktopAction;   // ← was string
  hidden?: boolean;
  kind?:   'folder' | 'app' | 'file';
}

type IconSort = 'modified' | 'name' | 'type' | 'size';
type IconSize = 'normal' | 'large';

function iconKind(icon: DesktopIcon): NonNullable<DesktopIcon['kind']> {
  if (icon.kind) return icon.kind;
  if (icon.action.startsWith('explorer:') || icon.action === ACTION.MY_COMPUTER) return 'folder';
  if (icon.action.startsWith('notepad:') || icon.label.includes('.')) return 'file';
  return 'app';
}

function sortIcons(icons: DesktopIcon[], sort: IconSort): DesktopIcon[] {
  const order: Record<NonNullable<DesktopIcon['kind']>, number> = { folder: 0, app: 1, file: 2 };
  const sorted = [...icons];
  if (sort === 'modified') return sorted;
  if (sort === 'name') return sorted.sort((a, b) => a.label.localeCompare(b.label));
  if (sort === 'size') return sorted.sort((a, b) => a.label.length - b.label.length || a.label.localeCompare(b.label));
  return sorted.sort((a, b) => order[iconKind(a)] - order[iconKind(b)] || a.label.localeCompare(b.label));
}

function buildDesktopIcons(corruption: number): DesktopIcon[] {
  const icons: DesktopIcon[] = [
    { label: 'My Documents',      emoji: '📁', action: explorerAction('My Documents') },
    { label: 'My Computer',       emoji: '🖥️', action: ACTION.MY_COMPUTER             },
    { label: 'Recycle Bin',       emoji: '🗑️', action: explorerAction('Recycle Bin')  },
    { label: 'Internet Explorer', emoji: '🌐', action: ACTION.IE                       },
    { label: 'Minesweeper',       emoji: '💣', action: ACTION.MINESWEEPER              },
    { label: 'Snake',             emoji: '🐍', action: ACTION.SNAKE                    },
  ];
  if (corruption >= 50) {
    icons.push({ label: 'system_log.txt', emoji: '📄', action: notepadAction('system_log.txt') });
  }
  return icons;
}

export default function Desktop({
  corruptionLevel,
  onOpenApp,
  allowJumpscares = true,
  onOpenProperties,
}: Props) {
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
        allowJumpscares &&
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
  }, [corruptionLevel, allowJumpscares]);

  // ── Icons ──────────────────────────────────────────────────────────
  const [sortMode, setSortMode] = useState<IconSort>('modified');
  const [iconSize, setIconSize] = useState<IconSize>('normal');
  const [customIcons, setCustomIcons] = useState<DesktopIcon[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const icons = useMemo(
    () => sortIcons([...buildDesktopIcons(corruptionLevel), ...customIcons], sortMode),
    [corruptionLevel, customIcons, sortMode]
  );
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);

  const runMenuAction = (action: () => void) => {
    action();
    setContextMenu(null);
  };

  const addDesktopIcon = (baseLabel: string, emoji: string, action: DesktopAction, kind: DesktopIcon['kind']) => {
    setCustomIcons(prev => {
      const existing = new Set([...buildDesktopIcons(corruptionLevel), ...prev].map(icon => icon.label));
      let label = baseLabel;
      let n = 2;
      while (existing.has(label)) {
        label = `${baseLabel} (${n})`;
        n++;
      }
      return [...prev, { label, emoji, action, kind }];
    });
  };

  const refreshDesktop = () => {
    setRefreshing(true);
    setSelected(null);
    setTimeout(() => setRefreshing(false), 350);
  };

  const handleContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setSelected(null);
    const menuWidth = 210;
    const menuHeight = 248;
    setContextMenu({
      x: Math.max(4, Math.min(e.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(4, Math.min(e.clientY, window.innerHeight - menuHeight - 38)),
    });
  };

  return (
    <div className={styles.desktop} onContextMenu={handleContextMenu}>

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

      {refreshing && <div className={styles.refreshFlash}>Refreshing...</div>}

      {/* ── Desktop icons ──────────────────────────────────────── */}
      <div className={[styles.iconGrid, iconSize === 'large' ? styles.largeIcons : ''].join(' ')}>
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

      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={e => e.stopPropagation()}
          role="menu"
        >
          <div className={styles.menuItem} role="menuitem">
            Arrange Icons By
            <span className={styles.arrow}>▶</span>
            <div className={styles.submenu}>
              <button onClick={() => runMenuAction(() => setSortMode('name'))}>Name</button>
              <button onClick={() => runMenuAction(() => setSortMode('size'))}>Size</button>
              <button onClick={() => runMenuAction(() => setSortMode('type'))}>Type</button>
              <button onClick={() => runMenuAction(() => setSortMode('modified'))}>Modified</button>
            </div>
          </div>
          <div className={styles.menuItem} role="menuitem">
            View
            <span className={styles.arrow}>▶</span>
            <div className={styles.submenu}>
              <button onClick={() => runMenuAction(() => setIconSize('large'))}>Large Icons</button>
              <button onClick={() => runMenuAction(() => setIconSize('normal'))}>Classic Icons</button>
            </div>
          </div>
          <button className={styles.menuButton} onClick={() => runMenuAction(refreshDesktop)}>Refresh</button>
          <div className={styles.separator} />
          <button className={styles.menuButton} onClick={() => runMenuAction(() => addDesktopIcon('Pasted Text Document.txt', '📄', notepadAction('new'), 'file'))}>Paste</button>
          <button className={styles.menuButton} onClick={() => runMenuAction(() => addDesktopIcon('Shortcut to Internet Explorer', '🌐', ACTION.IE, 'app'))}>Paste Shortcut</button>
          <div className={styles.separator} />
          <div className={styles.menuItem} role="menuitem">
            New
            <span className={styles.arrow}>▶</span>
            <div className={styles.submenu}>
              <button onClick={() => runMenuAction(() => addDesktopIcon('New Folder', '📁', explorerAction('Desktop'), 'folder'))}>Folder</button>
              <button onClick={() => runMenuAction(() => addDesktopIcon('New Shortcut', '🌐', ACTION.IE, 'app'))}>Shortcut</button>
              <button onClick={() => runMenuAction(() => addDesktopIcon('New Text Document.txt', '📄', notepadAction('new'), 'file'))}>Text Document</button>
            </div>
          </div>
          <div className={styles.separator} />
          <button className={styles.menuButton} onClick={() => runMenuAction(onOpenProperties)}>Properties</button>
        </div>
      )}
    </div>
  );
}
