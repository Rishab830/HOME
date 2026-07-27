'use client';

import { useState, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import styles from './Desktop.module.css';

import { type DesktopAction, ACTION, explorerAction, notepadAction } from './actions';

interface Props {
  corruptionLevel: number;
  onOpenApp: (action: DesktopAction) => void;   // ← was string
  allowJumpscares?: boolean;
  onOpenProperties: () => void;
  recycleHasItems?: boolean;
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
  iconSrc?: string;
  hidden?: boolean;
  kind?:   'folder' | 'app' | 'file';
}

type IconSort = 'modified' | 'name' | 'type' | 'size';
type IconSize = 'normal' | 'large';
type ContextMenuState =
  | { type: 'desktop'; x: number; y: number }
  | { type: 'icon'; x: number; y: number; icon: DesktopIcon };

const ADMIN_PASSWORD = 'letmefree';
const PROTECTED_ICON_LABELS = new Set([
  'My Documents',
  'My Computer',
  'Recycle Bin',
  'Internet Explorer',
  'Minesweeper',
  'Snake',
  'Camera',
  'Disk Image File',
  'Display',
  'Internet Properties',
  'FreeCell',
  'Hearts',
  'Pinball',
  'My Network Places',
  'User Accounts',
  'Sounds and Audio Devices',
  'System Properties',
  'system_log.txt',
]);

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

function buildDesktopIcons(corruption: number, recycleHasItems: boolean): DesktopIcon[] {
  const icons: DesktopIcon[] = [
    { label: 'My Documents',      emoji: '📁', action: explorerAction('My Documents'), iconSrc: '/icons/Folder%20Closed.ico' },
    { label: 'My Computer',       emoji: '🖥️', action: ACTION.MY_COMPUTER, iconSrc: '/icons/My%20Computer.ico' },
    {
      label: 'Recycle Bin',
      emoji: '🗑️',
      action: explorerAction('Recycle Bin'),
      iconSrc: recycleHasItems
        ? '/icons/recycle_bin_full_icon.png'
        : '/icons/recycle_bin_empty_icon.png',
    },
    { label: 'Internet Explorer', emoji: '🌐', action: ACTION.IE, iconSrc: '/icons/Earth%20(fixed).ico' },
    { label: 'Minesweeper',       emoji: '💣', action: ACTION.MINESWEEPER, iconSrc: '/icons/Minesweeper.ico' },
    { label: 'Snake',             emoji: '🐍', action: ACTION.SNAKE, iconSrc: '/icons/snake_icon.png' },
    { label: 'Camera',            emoji: '📷', action: ACTION.CAMERA, iconSrc: '/icons/Camera.ico' },
    { label: 'Disk Image File',   emoji: '💽', action: ACTION.STORAGE, iconSrc: '/icons/Disk%20Image%20File.ico' },
    { label: 'Display',           emoji: '🖥️', action: ACTION.DISPLAY, iconSrc: '/icons/Display.ico' },
    { label: 'Internet Properties', emoji: '🌐', action: ACTION.INTERNET_PROPERTIES, iconSrc: '/icons/Internet%20Properties.ico' },
    { label: 'FreeCell',          emoji: '🂡', action: ACTION.FREECELL, iconSrc: '/icons/Freecell.ico' },
    { label: 'Hearts',            emoji: '♥', action: ACTION.HEARTS, iconSrc: '/icons/Hearts.ico' },
    { label: 'Pinball',           emoji: '●', action: ACTION.PINBALL, iconSrc: '/icons/Pinball.ico' },
    { label: 'My Network Places', emoji: '🌐', action: ACTION.NETWORK, iconSrc: '/icons/My%20Network%20Places.ico' },
    { label: 'User Accounts',     emoji: '👤', action: ACTION.USER_ACCOUNTS, iconSrc: '/icons/User%20Accounts.ico' },
    { label: 'Sounds and Audio Devices', emoji: '🔊', action: ACTION.SOUND, iconSrc: '/icons/Sounds%2C%20Speech%2C%20and%20Audio%20Devices.ico' },
    { label: 'System Properties', emoji: '⚙️', action: ACTION.SYSTEM_PROPERTIES, iconSrc: '/icons/System%20Properties.ico' },
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
  recycleHasItems = false,
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
  const [deletedDesktopIcons, setDeletedDesktopIcons] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem('xp_deleted_desktop_icons') ?? '[]'));
    } catch {
      return new Set();
    }
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [desktopMessage, setDesktopMessage] = useState('');
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRecycleHasItems = recycleHasItems || deletedDesktopIcons.size > 0;
  const icons = useMemo(
    () => sortIcons(
      [...buildDesktopIcons(corruptionLevel, visibleRecycleHasItems), ...customIcons]
        .filter(icon => !deletedDesktopIcons.has(icon.label)),
      sortMode
    ),
    [corruptionLevel, customIcons, deletedDesktopIcons, sortMode, visibleRecycleHasItems]
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

  useEffect(() => () => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
  }, []);

  useEffect(() => {
    localStorage.setItem('xp_deleted_desktop_icons', JSON.stringify([...deletedDesktopIcons]));
  }, [deletedDesktopIcons]);

  const runMenuAction = (action: () => void) => {
    action();
    setContextMenu(null);
  };

  const showDesktopMessage = (message: string) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setDesktopMessage(message);
    messageTimer.current = setTimeout(() => setDesktopMessage(''), 1800);
  };

  const addDesktopIcon = (
    baseLabel: string,
    emoji: string,
    action: DesktopAction,
    kind: DesktopIcon['kind'],
    iconSrc?: string
  ) => {
    setCustomIcons(prev => {
      const existing = new Set([...buildDesktopIcons(corruptionLevel, visibleRecycleHasItems), ...prev].map(icon => icon.label));
      let label = baseLabel;
      let n = 2;
      while (existing.has(label)) {
        label = `${baseLabel} (${n})`;
        n++;
      }
      return [...prev, { label, emoji, action, kind, iconSrc }];
    });
  };

  const refreshDesktop = () => {
    setRefreshing(true);
    setSelected(null);
    setTimeout(() => setRefreshing(false), 350);
  };

  const createShortcut = (icon: DesktopIcon) => {
    addDesktopIcon(`Shortcut to ${icon.label}`, icon.emoji, icon.action, iconKind(icon), icon.iconSrc);
    showDesktopMessage('Shortcut created.');
  };

  const deleteIcon = (icon: DesktopIcon) => {
    if (PROTECTED_ICON_LABELS.has(icon.label)) {
      const password = window.prompt('Administrator password required to delete this desktop item:');
      if (password !== ADMIN_PASSWORD) {
        showDesktopMessage('Access is denied.');
        return;
      }
    }

    const isCustomIcon = customIcons.some(customIcon => customIcon.label === icon.label);
    if (isCustomIcon) {
      setCustomIcons(prev => prev.filter(customIcon => customIcon.label !== icon.label));
    } else {
      setDeletedDesktopIcons(prev => new Set(prev).add(icon.label));
    }
    setSelected(null);
    showDesktopMessage('Item deleted.');
  };

  const positionMenu = (
    e: ReactMouseEvent<HTMLElement>,
    menuWidth: number,
    menuHeight: number
  ) => ({
    x: Math.max(4, Math.min(e.clientX, window.innerWidth - menuWidth - 8)),
    y: Math.max(4, Math.min(e.clientY, window.innerHeight - menuHeight - 38)),
  });

  const handleContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setSelected(null);
    setContextMenu({
      type: 'desktop',
      ...positionMenu(e, 210, 248),
    });
  };

  const handleIconContextMenu = (e: ReactMouseEvent<HTMLButtonElement>, icon: DesktopIcon) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(icon.label);
    setContextMenu({
      type: 'icon',
      icon,
      ...positionMenu(e, 190, 126),
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

      {(refreshing || desktopMessage) && (
        <div className={styles.refreshFlash}>{desktopMessage || 'Refreshing...'}</div>
      )}

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
            onContextMenu={e      => handleIconContextMenu(e, icon)}
          >
            {icon.iconSrc ? (
              <span
                className={styles.iconImage}
                style={{ backgroundImage: `url(${icon.iconSrc})` }}
                aria-hidden
              />
            ) : (
              <span className={styles.iconEmoji} aria-hidden>{icon.emoji}</span>
            )}
            <span className={styles.iconLabel}>{icon.label}</span>
          </button>
        ))}
      </div>

      {contextMenu?.type === 'desktop' && (
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
          <button className={styles.menuButton} onClick={() => runMenuAction(() => addDesktopIcon('Shortcut to Internet Explorer', '🌐', ACTION.IE, 'app', '/icons/internet_explorer_icon.png'))}>Paste Shortcut</button>
          <div className={styles.separator} />
          <div className={styles.menuItem} role="menuitem">
            New
            <span className={styles.arrow}>▶</span>
            <div className={styles.submenu}>
              <button onClick={() => runMenuAction(() => addDesktopIcon('New Folder', '📁', explorerAction('Desktop'), 'folder'))}>Folder</button>
              <button onClick={() => runMenuAction(() => addDesktopIcon('New Shortcut', '🌐', ACTION.IE, 'app', '/icons/internet_explorer_icon.png'))}>Shortcut</button>
              <button onClick={() => runMenuAction(() => addDesktopIcon('New Text Document.txt', '📄', notepadAction('new'), 'file'))}>Text Document</button>
            </div>
          </div>
          <div className={styles.separator} />
          <button className={styles.menuButton} onClick={() => runMenuAction(onOpenProperties)}>Properties</button>
        </div>
      )}

      {contextMenu?.type === 'icon' && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={e => e.stopPropagation()}
          role="menu"
        >
          <button
            className={`${styles.menuButton} ${styles.defaultMenuButton}`}
            onClick={() => runMenuAction(() => onOpenApp(contextMenu.icon.action))}
          >
            Open
          </button>
          <button
            className={styles.menuButton}
            onClick={() => runMenuAction(() => createShortcut(contextMenu.icon))}
          >
            Create Shortcut
          </button>
          <div className={styles.separator} />
          <button
            className={styles.menuButton}
            onClick={() => runMenuAction(() => deleteIcon(contextMenu.icon))}
          >
            Delete
          </button>
          <div className={styles.separator} />
          <button className={styles.menuButton} onClick={() => runMenuAction(onOpenProperties)}>Properties</button>
        </div>
      )}
    </div>
  );
}
