'use client';

import {
  useState, useEffect, useCallback, useRef,
} from 'react';

import styles          from './DesktopOS.module.css';
import Window, { WindowConfig } from './Window';
import Desktop         from './Desktop';
import Taskbar         from './Taskbar';
import Notepad         from './apps/Notepad';
import FileExplorer    from './apps/FileExplorer';
import ErrorDialog     from './apps/ErrorDialog';

import { useCorruption }    from '@/hooks/useCorruption';
import { useHorrorEvents }  from './horror/useHorrorEvents';
import { FILESYSTEM, FSFile, FSFolder, type CorruptionAppend } from './horror/filesystem';
import { useCorruptedCursor } from '@/hooks/useCorruptedCursor';
import StartMenu from './StartMenu';
import ImageViewer from './apps/ImageViewer';
import Minesweeper from './apps/Minesweeper';
import Snake from './apps/Snake';

const ORIGINAL_TEXT = 'It is now safe to close this window.';
const PAUSE_BEFORE  = 6000;
const MOVE_SPEED    = 100;    // ms per cursor step while travelling
const TYPE_SPEED    = 100;    // ms per character typed
const DELETE_SPEED  = 100;    // ms per character deleted
const JUMPSCARE_DURATION = 1000;

type ScriptOp =
  | { op: 'pause';         ms: number }
  | { op: 'showCursor'                }
  | { op: 'removeCursor'              }
  | { op: 'backspace'                 }   // delete char BEFORE cursor
  | { op: 'deleteForward'             }   // delete char AT cursor
  | { op: 'type';          char: string }
  | { op: 'moveCursor';    delta: -1 | 1 };

// Defined outside the component — it's a pure constant
const SAFE_SCRIPT: ScriptOp[] = [
  { op: 'pause',      ms: PAUSE_BEFORE },
  { op: 'showCursor'                   },
  { op: 'pause',      ms: 400          },

  // ── 1. Replace '.' with '?' ───────────────────────────────────────
  { op: 'backspace'                    },   // remove '.'
  { op: 'type',       char: '?'        },   // add '?'
  { op: 'pause',      ms: 700          },

  // ── 2. Travel cursor left to position 0 ──────────────────────────
  // "It is now safe to close this window?" = 36 chars, cursor at 36
  ...Array.from({ length: 36 }, (): ScriptOp => ({ op: 'moveCursor', delta: -1 })),
  { op: 'pause',      ms: 350          },

  // ── 3. Delete 'It ' (3 chars forward) ────────────────────────────
  { op: 'deleteForward'                },   // 'I' → 't is now...'
  { op: 'deleteForward'                },   // 't' → ' is now...'
  { op: 'deleteForward'                },   // ' ' → 'is now...'

  // ── 4. Capitalise 'i' of 'is' ────────────────────────────────────
  { op: 'deleteForward'                },   // 'i' → 's now...'
  { op: 'type',       char: 'I'        },   // → 'Is now...'   cursor at 1

  // ── 5. Move cursor to position 3 (after 'Is ') ───────────────────
  { op: 'moveCursor', delta: 1         },   // cursor → 2 (after 's')
  { op: 'moveCursor', delta: 1         },   // cursor → 3 (after ' ')

  // ── 6. Type 'it ' — shifts 'now...' right ────────────────────────
  { op: 'type',       char: 'i'        },   // 'Is inow...'
  { op: 'type',       char: 't'        },   // 'Is itnow...'
  { op: 'type',       char: ' '        },
  { op: 'removeCursor'                   },
];

// ─── Types ───────────────────────────────────────────────────────────────────
type AppType = 'notepad' | 'explorer' | 'error' | 'image' | 'minesweeper' | 'snake';

interface OpenWindow {
  id:         string;
  config:     WindowConfig;
  appType:    AppType;
  appProps:   Record<string, unknown>;
  minimized:  boolean;
  maximized:     boolean;        // ← ADD
  closeAttempts: number;         // ← ADD
  forceFullscreen: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _windowCounter = 0;
function makeId() { return `wnd_${++_windowCounter}_${Date.now()}`; }

function findFileInFS(name: string, folder: FSFolder): FSFile | null {
  for (const node of folder.children) {
    if (node.type !== 'folder' && node.name === name) return node as FSFile;
    if (node.type === 'folder') {
      const found = findFileInFS(name, node as FSFolder);
      if (found) return found;
    }
  }
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  onLogout: () => void;
  onTurnOff: () => void;
}

export default function DesktopOS({ onLogout, onTurnOff }: Props) {
  const { corruptionLevel, incrementCorruption, triggerOnce } = useCorruption();

  const [windows, setWindows]             = useState<OpenWindow[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [isGlitching, setIsGlitching]     = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [safeToClose, setSafeToClose]       = useState(false);
  const [safeText, setSafeText]             = useState(ORIGINAL_TEXT);                          // ← ADD
  const [safeCursorPos, setSafeCursorPos] = useState(ORIGINAL_TEXT.length);
  const [safeCursorVis, setSafeCursorVis] = useState(false);
  const [gifCursorSrc, setGifCursorSrc] = useState<string | null>(null);
  const [crashBlocked,    setCrashBlocked]    = useState(false);
  const [showCrashScare,  setShowCrashScare]  = useState(false);
  const crashAudioRef = useRef<HTMLAudioElement | null>(null);
  const [possessed,     setPossessed]     = useState(false);
  const [gravityTarget, setGravityTarget] = useState<{ x: number; y: number } | null>(null);
  const [gravitySpeed,  setGravitySpeed]  = useState(0);
  const possessionPhase = useRef<'idle' | 'toStart' | 'toLogoff'>('idle');
  const sessionStart    = useRef(Date.now());
  const speedTimer      = useRef<ReturnType<typeof setInterval> | null>(null);

  const [deletedFiles, setDeletedFiles] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem('xp_deleted') ?? '[]'));
    } catch { return new Set(); }
  });
  
  const [unlockedFiles, setUnlockedFiles] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try { return new Set(JSON.parse(localStorage.getItem('xp_unlocked') ?? '[]')); }
    catch { return new Set(); }
  });

  const handleSnakeCrash = useCallback(() => {
    setCrashBlocked(true);
    incrementCorruption(12);

    // Play breath.mpeg once in full
    const breath = new Audio('/sounds/breath.mpeg');
    breath.volume = 0.8;
    crashAudioRef.current = breath;

    breath.play().catch(() => {});

    // When breath finishes, wait 10s then jumpscare + glass
    breath.addEventListener('ended', () => {
      setTimeout(() => {
        // Play glass.mpeg
        const glass = new Audio('/sounds/glass.mpeg');
        glass.volume = 1.0;
        glass.play().catch(() => {});

        // Show jumpscare simultaneously
        setShowCrashScare(true);
        setTimeout(() => {
          setShowCrashScare(false);
          setCrashBlocked(false);
          crashAudioRef.current = null;
        }, JUMPSCARE_DURATION);
      }, 10_000);
    }, { once: true });   // once:true auto-removes the listener after firing
  }, [incrementCorruption]);

  useEffect(() => {
    return () => {
      if (crashAudioRef.current) {
        crashAudioRef.current.pause();
        crashAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - sessionStart.current) / 1000;
      if (elapsed < 300 || possessionPhase.current !== 'idle') return;

      // 2 minutes elapsed — begin possession
      const startBtn = document.querySelector<HTMLElement>('[data-possession="start"]');
      if (!startBtn) return;

      possessionPhase.current = 'toStart';
      setPossessed(true);
      const r = startBtn.getBoundingClientRect();
      setGravityTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      setGravitySpeed(0.008);

      // Speed ramp — gets faster every 10s
      speedTimer.current = setInterval(() => {
        setGravitySpeed(s => Math.min(0.55, s + 0.022));
      }, 10_000);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => () => {
    if (speedTimer.current) clearInterval(speedTimer.current);
  }, []);

  const handlePossessionReach = useCallback(() => {
    if (possessionPhase.current === 'toStart') {
      // Arrived at start button — open menu
      possessionPhase.current = 'toLogoff';
      setGravitySpeed(0.25);    // fast for second leg
      setShowStartMenu(true);

      // Wait one frame for StartMenu to mount, then target logoff
      setTimeout(() => {
        const logoffBtn = document.querySelector<HTMLElement>('[data-possession="logoff"]');
        if (!logoffBtn) return;
        const r = logoffBtn.getBoundingClientRect();
        setGravityTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }, 300);
      return;
    }

    if (possessionPhase.current === 'toLogoff') {
      // Arrived at logoff — clean up and log out
      possessionPhase.current = 'idle';
      if (speedTimer.current) clearInterval(speedTimer.current);
      setGravityTarget(null);
      setGravitySpeed(0);
      setPossessed(false);
      setShowStartMenu(false);
      setTimeout(() => onLogout(), 400);   // brief pause before transition
    }
  }, [onLogout]);

  // Cursor lag kicks in at corruption >= 52
  const cursorActive = corruptionLevel >= 0 ;
  useCorruptedCursor({
    active:        cursorActive,
    corruption:    corruptionLevel,
    onGifStart:    useCallback((src: string) => setGifCursorSrc(src), []),
    onGifEnd:      useCallback(() => setGifCursorSrc(null),           []),
    gravityTarget,                   // ← ADD
    gravitySpeed,                    // ← ADD
    forceShow:     possessed,        // ← ADD — show cursor even below corruption 52
    onReachTarget: handlePossessionReach,  // ← ADD
  });

  // ── Window management helpers ───────────────────────────────────────
  const openWindow = useCallback((
    appType:  AppType,
    config:   Omit<WindowConfig, 'id'>,
    appProps: Record<string, unknown>,
  ) => {
    const id: string = makeId();
    // Cascade position slightly for each new window
    const offset = (windows.length % 8) * 22;
    const newWindow: OpenWindow = {
      id,
      config: {
        ...config,
        id,
        initialPosition: {
          x: (config.initialPosition?.x ?? 120) + offset,
          y: (config.initialPosition?.y ??  60) + offset,
        },
      },
      appType,
      appProps,
      minimized: false,
      maximized:     false,      // ← ADD
      closeAttempts: 0,          // ← ADD
      forceFullscreen: false,
    };
    setWindows(prev => [...prev, newWindow]);
    setActiveId(id);
  }, [windows.length]);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
    setActiveId(prev => (prev === id ? null : prev));
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, minimized: !w.minimized } : w
    ));
    setActiveId(prev => prev === id ? null : prev);
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w =>
      w.id === id ? { ...w, maximized: !w.maximized, minimized: false } : w
    ));
    setActiveId(id);
  }, []);

  const handleCloseWindow = useCallback((id: string) => {
    const win = windows.find(w => w.id === id);
    if (!win) return;

    // Special behaviour for beach_007.jpg
    if (win.appProps.filename === 'beach_007.jpg' || win.appProps.src?.toString().includes('beach_007')) {
      if (win.closeAttempts === 0) {
        setWindows(prev => prev.map(w =>
          w.id === id
            ? { ...w, forceFullscreen: true, minimized: false, closeAttempts: 1 }
            : w
        ));
        setActiveId(id);
        return;
      }

      // Second close → delete file and close
      setDeletedFiles(prev => {
        const next = new Set(prev).add('beach_007.jpg');
        localStorage.setItem('xp_deleted', JSON.stringify([...next]));
        return next;
      });
      closeWindow(id);
      return;
    }

    closeWindow(id);
  }, [windows, closeWindow]);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => {
      // Move to top of render order
      const idx = prev.findIndex(w => w.id === id);
      if (idx < 0) return prev;
      const updated = [...prev];
      const [win] = updated.splice(idx, 1);
      updated.push({ ...win, minimized: false });
      return updated;
    });
    setActiveId(id);
  }, []);

  // ── Taskbar window click — toggle minimize/restore ──────────────────
  const handleTaskbarWindowClick = useCallback((id: string) => {
    const win = windows.find(w => w.id === id);
    if (!win) return;
    if (activeId === id && !win.minimized) {
      toggleMinimize(id);
    } else {
      focusWindow(id);
    }
  }, [windows, activeId, toggleMinimize, focusWindow]);

  // ── Open a file from the filesystem ────────────────────────────────
  const handleOpenFile = useCallback((file: FSFile) => {
    if (file.corruptionGain) triggerOnce(`file:${file.name}`, file.corruptionGain);

    if (file.type === 'img') {
      openWindow('image', {
        title:       `${file.name} - Windows Picture and Fax Viewer`,
        iconEmoji:   '🖼️',
        initialSize: { width: 640, height: 500 },
      }, {
        src:      file.baseContent,   // the /gallery/... path you set in filesystem.ts
        filename: file.name,
      });
      return;
    }

    const instanceId = makeId();     // ← rename for clarity
    openWindow('notepad', {
      title:       `${file.name} - Notepad`,
      iconEmoji:   '📄',
      initialSize: { width: 520, height: 380 },
    }, {
      filename:          file.name,
      instanceId,
      baseContent:       file.baseContent,
      corruptionAppends: file.corruptionAppends ?? [],
    });
  }, [corruptionLevel, incrementCorruption, openWindow]);  // ← ADD THIS LINE

  // ── Desktop icon / action routing ───────────────────────────────────
  const handleOpenApp = useCallback((action: string) => {
    // explorer:FolderName
    if (action.startsWith('explorer:')) {
      const folderName = action.replace('explorer:', '');
      const initialPath = folderName === 'Desktop' ? [] : [folderName];
      openWindow('explorer', {
        title:     `${folderName} - Windows Explorer`,
        iconEmoji: '📁',
        initialSize: { width: 680, height: 460 },
      }, { initialPath });
      return;
    }

    if (action === 'notepad:new') {
      const id = makeId();
      openWindow('notepad', {
        title:       'Untitled - Notepad',
        iconEmoji:   '📄',
        initialSize: { width: 520, height: 380 },
      }, {
        filename:          'Untitled',
        instanceId:        id,
        baseContent:       '',
        corruptionAppends: [],
      });
      return;
    }

    if (action === 'ie') {
      openWindow('error', {
        title:     'Internet Explorer',
        iconEmoji: '🌐',
        initialSize: { width: 420, height: 280 },
      }, {
        message: corruptionLevel >= 40
          ? 'Internet Explorer cannot display this page.\n\nThe connection was refused.\n\nYou are not supposed to leave.'
          : 'Internet Explorer cannot display the webpage.\n\nPlease check your connection and try again.',
      });
      return;
    }

    if (action === 'mycomputer') {
      openWindow('explorer', {
        title:     'My Computer',
        iconEmoji: '🖥️',
        initialSize: { width: 600, height: 420 },
      }, { initialPath: [] });
    }

    if (action === 'minesweeper') {
      openWindow('minesweeper', {
        title:       'Minesweeper',
        iconEmoji:   '💣',
        initialSize: { width: 260, height: 380 },
      }, {});
      return;
    }

    if (action === 'snake') {
      openWindow('snake', {
        title:       'Snake',
        iconEmoji:   '🐍',
        initialSize: { width: 356, height: 500 },
      }, {});
      return;
    }
  }, [corruptionLevel, openWindow, handleOpenFile]);

  const handleStartMenuApp = useCallback((action: string) => {
    if (action.startsWith('_error:')) {
      const message = action.replace('_error:', '');
      openWindow('error', {
        title:       'System Error',
        iconEmoji:   '⚠️',
        initialSize:     { width: 380, height: 200 },
        initialPosition: { x: 300, y: 200 },
      }, { message });
      return;
    }
    handleOpenApp(action);
  }, [handleOpenApp, openWindow]);

  const handleTurnOff = useCallback(() => {
    setShowStartMenu(false);
    setIsShuttingDown(true);
    setTimeout(() => {
      setIsShuttingDown(false);  // stop the CRT animation
      setSafeToClose(true);      // show the black screen
      window.close();            // silently fails in most browsers — safe-to-close is the fallback
    }, 1800);
  }, []);

  const handleUnlockFile = useCallback((filename: string) => {
    setUnlockedFiles(prev => {
      const next = new Set(prev).add(filename);
      localStorage.setItem('xp_unlocked', JSON.stringify([...next]));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!safeToClose) return;

    let cancelled = false;
    let step      = 0;
    let text      = ORIGINAL_TEXT;
    let cursor    = ORIGINAL_TEXT.length;

    const runStep = () => {
      if (cancelled || step >= SAFE_SCRIPT.length) return;

      const op = SAFE_SCRIPT[step++];
      let delay = 50;

      switch (op.op) {
        case 'pause':
          delay = op.ms;
          break;

        case 'showCursor':
          setSafeCursorVis(true);
          delay = 0;
          break;

        case 'removeCursor':
          setSafeCursorVis(false);
          delay = 0;
          break;

        case 'backspace':
          if (cursor > 0) {
            text   = text.slice(0, cursor - 1) + text.slice(cursor);
            cursor--;
            setSafeText(text);
            setSafeCursorPos(cursor);
          }
          delay = 120;
          break;

        case 'deleteForward':
          if (cursor < text.length) {
            text = text.slice(0, cursor) + text.slice(cursor + 1);
            setSafeText(text);
            setSafeCursorPos(cursor);
          }
          delay = DELETE_SPEED;
          break;

        case 'type':
          text   = text.slice(0, cursor) + op.char + text.slice(cursor);
          cursor++;
          setSafeText(text);
          setSafeCursorPos(cursor);
          delay = TYPE_SPEED;
          break;

        case 'moveCursor':
          cursor = Math.max(0, Math.min(text.length, cursor + op.delta));
          setSafeCursorPos(cursor);
          delay = MOVE_SPEED;
          break;
      }

      if (!cancelled) setTimeout(runStep, delay);
    };

    runStep();
    return () => { cancelled = true; };
  }, [safeToClose]);

  // ── Horror event handler ─────────────────────────────────────────────
  const handleHorrorEvent = useCallback((e: { type: string; payload?: Record<string, string> }) => {
    if (e.type === 'screen_glitch') {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 300);
      return;
    }

    if (e.type === 'open_notepad') {
      const ghostId = makeId();
      openWindow('notepad', {
        title:           'Untitled - Notepad',
        iconEmoji:       '📄',
        initialSize:     { width: 420, height: 280 },
        initialPosition: {
          x: 200 + Math.random() * 300,
          y: 80  + Math.random() * 200,
        },
      }, {
        filename:          'Untitled',
        instanceId:        ghostId,
        baseContent:       e.payload?.content ?? '',
        corruptionAppends: [],
      });
      return;
    }

    if (e.type === 'open_error') {
      openWindow('error', {
        title:     'System Error',
        iconEmoji: '⚠️',
        initialSize:     { width: 380, height: 280 },
        initialPosition: {
          x: 250 + Math.random() * 250,
          y: 100 + Math.random() * 180,
        },
      }, {
        message: e.payload?.message ?? 'An unexpected error occurred.',
      });
    }
  }, [openWindow]);

  useHorrorEvents({ corruptionLevel, onEvent: handleHorrorEvent });

  // ── Render window content based on appType ──────────────────────────
  const renderApp = (win: OpenWindow) => {
    switch (win.appType) {
      case 'notepad':
        return (
          <Notepad
            filename=         {win.appProps.filename as string}
            instanceId=       {win.appProps.instanceId as string}
            corruptionLevel=  {corruptionLevel}
            baseContent=      {win.appProps.baseContent as string}
            corruptionAppends={(win.appProps.corruptionAppends as CorruptionAppend[]) ?? []}
          />
        );

      case 'explorer':
        return (
          <FileExplorer
            initialPath=    {win.appProps.initialPath as string[]}
            corruptionLevel={corruptionLevel}
            onOpenFile=     {handleOpenFile}
            triggerOnce=    {triggerOnce}               // ← was incrementCorruption
            deletedFiles=    {deletedFiles}
            unlockedFiles=   {unlockedFiles} 
          />
        );

      case 'error':
        return (
          <ErrorDialog
            message=         {win.appProps.message as string}
            corruptionLevel= {corruptionLevel}
            onClose=         {() => closeWindow(win.id)}
          />
        );

      case 'image':
        return (
          <ImageViewer
            src=     {win.appProps.src      as string}
            filename={win.appProps.filename as string}
          />
        );

      case 'minesweeper':
        return (
          <Minesweeper
            triggerOnce=  {triggerOnce}
            onUnlockFile= {handleUnlockFile}
          />
        );

      case 'snake':
        return (
          <Snake
            triggerOnce=  {triggerOnce}
            onUnlockFile= {handleUnlockFile}
            onCrash=      {handleSnakeCrash}   // ← ADD
          />
        );

      default:
        return null;
    }
  };

  // ────────────────────────────────────────────────────────────────────
  return (
    <>
      {!safeToClose && (
        <div
          className={[
            styles.os,
            isGlitching                    ? styles.glitching       : '',
            corruptionLevel >= 78          ? styles.chromatic       : '',
            cursorActive                   ? styles.corruptedCursor : '',
            isShuttingDown                 ? 'crt-shutdown'         : '', 
          ].join(' ')}
          style={
            gifCursorSrc
              ? { cursor: `url(${gifCursorSrc}) 16 16, auto` }  // gif on real cursor best-effort
              : undefined
          }
        >
          {/* Desktop (wallpaper + icons) */}
          <Desktop
            corruptionLevel= {corruptionLevel}
            onOpenApp=       {handleOpenApp}
          />

          {/* Windows — rendered in z-order (last = topmost) */}
          {windows.map(win => (
            <Window
              key=             {win.id}
              config=          {win.config}
              isActive=        {activeId === win.id}
              isMinimized=     {win.minimized}
              isMaximized=     {win.maximized}
              forceFullscreen= {win.forceFullscreen}   // ← ADD
              onFocus=         {() => focusWindow(win.id)}
              onClose=         {() => handleCloseWindow(win.id)}
              onMinimize=      {() => toggleMinimize(win.id)}
              onMaximize=      {() => maximizeWindow(win.id)}
            >
              {renderApp(win)}
            </Window>
          ))}

          {/* Taskbar */}
          <Taskbar
            windows={windows.map(w => ({
              id:        w.id,
              title:     w.config.title,
              iconEmoji: w.config.iconEmoji,
              minimized: w.minimized,
            }))}
            activeWindowId={activeId}
            corruptionLevel={corruptionLevel}
            isStartOpen={showStartMenu}
            onWindowClick={handleTaskbarWindowClick}
            onStartClick={() => setShowStartMenu(v => !v)}
          />

          {showStartMenu && (
            <StartMenu
              corruptionLevel= {corruptionLevel}
              onClose=         {() => setShowStartMenu(false)}
              onOpenApp=       {handleStartMenuApp}
              onLogoff=        {onLogout}
              onTurnOff={handleTurnOff}
            />
          )}
        </div>
      )}

      {safeToClose && (
        <div className={styles.safeToClose}>
          <p className={styles.safeText}>
            {safeText.slice(0, safeCursorPos)}
            {safeCursorVis && (
              <span className={styles.crtCursor} aria-hidden>▋</span>
            )}
            {safeText.slice(safeCursorPos)}
          </p>
        </div>
      )}

      {crashBlocked && !showCrashScare && (
        <div
          style={{
            position:      'fixed',
            inset:         0,
            zIndex:        8000,
            cursor:        'none',
            pointerEvents: 'all',
          }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e     => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        />
      )}

      {/* Jumpscare — instant on, instant off */}
      {showCrashScare && (
        <div
          style={{
            position:           'fixed',
            inset:              0,
            zIndex:             9000,
            backgroundImage:    'url(/wallpapers/bliss_jumpscare.jpg)',
            backgroundSize:     'cover',
            backgroundPosition: 'center',
            pointerEvents:      'none',
          }}
        />
      )}
    </>
  );
}
