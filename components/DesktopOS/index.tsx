'use client';

import {
  useState, useEffect, useCallback, useRef, useId,
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
import { FILESYSTEM, FSFile, FSFolder } from './horror/filesystem';
import StartMenu from './StartMenu';

const ORIGINAL_TEXT = 'It is now safe to close this window.';
const MUTATED_TEXT  = 'Is it now safe to close this window?';
const ERASE_SPEED   = 100;    // ms per character erased
const TYPE_SPEED    = 100;    // ms per character typed
const PAUSE_BEFORE  = 6000;  // ms of silence before mutation begins

// ─── Types ───────────────────────────────────────────────────────────────────
type AppType = 'notepad' | 'explorer' | 'error';

interface OpenWindow {
  id:         string;
  config:     WindowConfig;
  appType:    AppType;
  appProps:   Record<string, unknown>;
  minimized:  boolean;
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

// ─── Cursor lag hook (corruption effect) ─────────────────────────────────────
function useCorruptedCursor(active: boolean, corruption: number) {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const pos    = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) { dotRef.current?.remove(); dotRef.current = null; return; }

    // Inject a custom cursor dot that lags behind the real cursor
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position:       'fixed',
      width:          '12px',
      height:         '12px',
      borderRadius:   '50%',
      background:     corruption >= 80 ? '#ff0000' : '#ffffff',
      pointerEvents:  'none',
      zIndex:         '99999',
      transform:      'translate(-50%, -50%)',
      mixBlendMode:   'difference',
      transition:     'background 1s',
    });
    document.body.appendChild(dot);
    dotRef.current = dot;

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('mousemove', onMove);

    // Lerp the dot toward the real cursor — lag worsens with corruption
    let raf: number;
    let vx = 0, vy = 0;
    const lerp = () => {
      const speed = Math.max(0.05, 0.35 - (corruption / 100) * 0.28);
      vx += (pos.current.x - vx) * speed;
      vy += (pos.current.y - vy) * speed;
      dot.style.left = `${vx}px`;
      dot.style.top  = `${vy}px`;
      raf = requestAnimationFrame(lerp);
    };
    lerp();

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      dot.remove();
      dotRef.current = null;
    };
  }, [active, corruption]);
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  onLogout: () => void;
  onTurnOff: () => void;
}

export default function DesktopOS({ onLogout, onTurnOff }: Props) {
  const { corruptionLevel, incrementCorruption } = useCorruption();

  const [windows, setWindows]             = useState<OpenWindow[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [isGlitching, setIsGlitching]     = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [safeToClose, setSafeToClose]       = useState(false);
  const [safeText, setSafeText]             = useState(ORIGINAL_TEXT);                          // ← ADD
  const [safePhase, setSafePhase]           = useState<'idle'|'erasing'|'typing'>('idle');      // ← ADD

  // Cursor lag kicks in at corruption >= 52
  const cursorActive = corruptionLevel >= 52;
  useCorruptedCursor(cursorActive, corruptionLevel);

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
    if (file.corruptionGain) incrementCorruption(file.corruptionGain);

    if (file.type === 'img') {
      openWindow('error', {
        title:       `${file.name} - Windows Picture and Fax Viewer`,
        iconEmoji:   '🖼️',
        initialSize: { width: 400, height: 200 },
      }, {
        message:   corruptionLevel >= 50
          ? 'This image cannot be displayed.\n\nThe file may be corrupted or\ncontain content that cannot be rendered.'
          : 'Windows cannot open this image.\n\nThe file format is not supported.',
        isEntity: false,
      });
      return;
    }

    const handleStartMenuApp = useCallback((action: string) => {
      if (action.startsWith('_error:')) {
        const message = action.replace('_error:', '');
        openWindow('error', {
          title:     'System Error',
          iconEmoji: '⚠️',
          initialSize:     { width: 380, height: 200 },
          initialPosition: { x: 300, y: 200 },
        }, { message });
        return;
      }
      handleOpenApp(action);
    }, [handleOpenApp, openWindow]);

    openWindow('notepad', {
      title:     `${file.name} - Notepad`,
      iconEmoji: '📄',
      initialSize: { width: 520, height: 380 },
    }, {
      filename:   file.name,
      getContent: file.getContent,
    });
  }, [corruptionLevel, incrementCorruption, openWindow]);

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

    if (action.startsWith('notepad:')) {
      const filename = action.replace('notepad:', '');
      const file = findFileInFS(filename, FILESYSTEM);
      if (file) handleOpenFile(file);
      return;
    }

    if (action === 'ie') {
      openWindow('error', {
        title:     'Internet Explorer',
        iconEmoji: '🌐',
        initialSize: { width: 420, height: 180 },
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

  useEffect(() => {
    if (!safeToClose) return;
    // Wait in silence, then start erasing
    const id = setTimeout(() => setSafePhase('erasing'), PAUSE_BEFORE);
    return () => clearTimeout(id);
  }, [safeToClose]);

  useEffect(() => {
    if (safePhase === 'idle') return;

    if (safePhase === 'erasing') {
      if (safeText.length === 0) {
        setSafePhase('typing');
        return;
      }
      const id = setTimeout(() =>
        setSafeText(t => t.slice(0, -1))
      , ERASE_SPEED);
      return () => clearTimeout(id);
    }

    if (safePhase === 'typing') {
      if (safeText === MUTATED_TEXT) return;   // done
      const id = setTimeout(() =>
        setSafeText(MUTATED_TEXT.slice(0, safeText.length + 1))
      , TYPE_SPEED);
      return () => clearTimeout(id);
    }
  }, [safePhase, safeText]);

  // ── Horror event handler ─────────────────────────────────────────────
  const handleHorrorEvent = useCallback((e: { type: string; payload?: Record<string, string> }) => {
    if (e.type === 'screen_glitch') {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 300);
      return;
    }

    if (e.type === 'open_notepad') {
      openWindow('notepad', {
        title:     'Untitled - Notepad',
        iconEmoji: '📄',
        initialSize:     { width: 420, height: 280 },
        initialPosition: {
          // Appears slightly off-center — not where you'd expect
          x: 200 + Math.random() * 300,
          y: 80  + Math.random() * 200,
        },
      }, {
        filename:   'Untitled',
        getContent: () => e.payload?.content ?? '',
      });
      return;
    }

    if (e.type === 'open_error') {
      openWindow('error', {
        title:     'System Error',
        iconEmoji: '⚠️',
        initialSize:     { width: 380, height: 220 },
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
            filename=        {win.appProps.filename as string}
            corruptionLevel= {corruptionLevel}
            getContent=      {win.appProps.getContent as (c: number) => string}
          />
        );

      case 'explorer':
        return (
          <FileExplorer
            initialPath=         {win.appProps.initialPath as string[]}
            corruptionLevel=     {corruptionLevel}
            onOpenFile=          {handleOpenFile}
            incrementCorruption= {incrementCorruption}
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
        >
          {/* Desktop (wallpaper + icons) */}
          <Desktop
            corruptionLevel= {corruptionLevel}
            onOpenApp=       {handleOpenApp}
          />

          {/* Windows — rendered in z-order (last = topmost) */}
          {windows.map(win => (
            <Window
              key=         {win.id}
              config=      {win.config}
              isActive=    {activeId === win.id}
              isMinimized= {win.minimized}
              onFocus=     {() => focusWindow(win.id)}
              onClose=     {() => closeWindow(win.id)}
              onMinimize=  {() => toggleMinimize(win.id)}
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
            {safeText}
            <span className={
              safePhase === 'idle' ? '' : styles.crtCursor
            } aria-hidden>▋</span>
          </p>
        </div>
      )}
    </>
  );
}
