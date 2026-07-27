'use client';

import {
  useState, useEffect, useCallback, useRef, memo
} from 'react';

import { type DesktopAction, ACTION, explorerAction, notepadAction } from './actions';

import styles          from './DesktopOS.module.css';
import Window, { WindowConfig } from './Window';
import Desktop         from './Desktop';
import Taskbar         from './Taskbar';
import GlitchOverlay      from './GlitchOverlay';
import SafeToCloseScreen  from './SafeToCloseScreen';
import Notepad         from './apps/Notepad';
import FileExplorer    from './apps/FileExplorer';
import ErrorDialog     from './apps/ErrorDialog';
import ImageViewer from './apps/ImageViewer';
import Minesweeper from './apps/Minesweeper';
import Snake from './apps/Snake';
import CommandPrompt from './apps/CommandPrompt';

import { useCorruption }    from '@/hooks/useCorruption';
import { useHorrorEvents }  from './horror/useHorrorEvents';
import { FILESYSTEM, FSFile, type CorruptionAppend, type FSNode } from './horror/filesystem';
import { useCorruptedCursor } from '@/hooks/useCorruptedCursor';
import { usePossession }      from '@/hooks/usePossession';
import { useStoryState, type StoryFlag } from '@/hooks/useStoryState';
import StartMenu from './StartMenu';

const JUMPSCARE_DURATION = 1000;

function findFileByName(name: string, nodes: FSNode[] = FILESYSTEM.children): FSFile | null {
  for (const node of nodes) {
    if (node.type === 'folder') {
      const found = findFileByName(name, node.children);
      if (found) return found;
    } else if (node.name === name) {
      return node;
    }
  }
  return null;
}

// ─── Per-app prop shapes ──────────────────────────────────────────────────────
export interface NotepadProps {
  filename:          string;
  instanceId:        string;
  baseContent:       string;
  corruptionAppends: CorruptionAppend[];
}
export interface ExplorerProps {
  initialPath: string[];
}
export interface ErrorProps {
  message: string;
}
export interface ImageProps {
  src:      string;
  filename: string;
}
export interface MinesweeperProps { [key: string]: never }
export interface SnakeProps       { [key: string]: never }
export interface CmdProps         { [key: string]: never }

// Map from discriminant literal → its props type
// Used to make openWindow() generic without repetition
export type AppPropsMap = {
  notepad:     NotepadProps;
  explorer:    ExplorerProps;
  error:       ErrorProps;
  image:       ImageProps;
  minesweeper: MinesweeperProps;
  snake:       SnakeProps;
  cmd:         CmdProps;
};

export type AppType = keyof AppPropsMap;

// ─── Shared window fields (everything except the discriminant pair) ───────────
interface WindowBase {
  id:              string;
  config:          WindowConfig;
  minimized:       boolean;
  maximized:       boolean;
  closeAttempts:   number;
  forceFullscreen: boolean;
}

// Discriminated union — appType narrows appProps automatically
type OpenWindow = {
  [K in AppType]: WindowBase & { appType: K; appProps: AppPropsMap[K] }
}[AppType];

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  onLogout: () => void;
  onTurnOff: () => void;
}

interface AppContentProps {
  win:             OpenWindow;
  corruptionLevel: number;
  onOpenFile:      (file: FSFile) => void;
  triggerOnce:     (key: string, gain: number) => void;
  deletedFiles:    Set<string>;
  unlockedFiles:   Set<string>;
  onSnakeCrash:    () => void;
  onCmdGlitch:     (ms: number) => void;
  onUnlockFile:    (filename: string) => void;
  onClose:         (id: string) => void;
  onStoryFlag:     (flag: string) => void;
  onMeaningfulInteraction: () => void;
}

const AppContent = memo(function AppContent({
  win, corruptionLevel, onOpenFile, triggerOnce,
  deletedFiles, unlockedFiles, onSnakeCrash, onCmdGlitch, onUnlockFile, onClose,
  onStoryFlag, onMeaningfulInteraction,
}: AppContentProps) {
  // Stable callbacks for props that capture win.id.
  // win.id is a string that never changes for a given window,
  // and onClose is stable (empty deps), so these are effectively stable too.
  const handleClose    = useCallback(() => onClose(win.id),  [onClose, win.id]);
  const handleCmdExit  = useCallback(() => onClose(win.id),  [onClose, win.id]);

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
          onOpenFile=     {onOpenFile}
          triggerOnce=    {triggerOnce}
          deletedFiles=   {deletedFiles}
          unlockedFiles=  {unlockedFiles}
          onStoryFlag=    {onStoryFlag}
          onMeaningfulInteraction={onMeaningfulInteraction}
        />
      );

    case 'error':
      return (
        <ErrorDialog
          message=        {win.appProps.message as string}
          corruptionLevel={corruptionLevel}
          onClose=        {handleClose}
        />
      );

    case 'image':
      return (
        <ImageViewer
          src=     {win.appProps.src as string}
          filename={win.appProps.filename as string}
        />
      );

    case 'minesweeper':
      return (
        <Minesweeper
          triggerOnce= {triggerOnce}
          onUnlockFile={onUnlockFile}
        />
      );

    case 'snake':
      return (
        <Snake
          triggerOnce= {triggerOnce}
          onUnlockFile={onUnlockFile}
          onCrash=     {onSnakeCrash}
        />
      );

    case 'cmd':
      return (
        <CommandPrompt
          corruptionLevel={corruptionLevel}
          triggerOnce=    {triggerOnce}
          onUnlockFile=   {onUnlockFile}
          onGlitch=       {onCmdGlitch}
          unlockedFiles=  {unlockedFiles}
          onExit=         {handleCmdExit}
          onStoryFlag=    {onStoryFlag}
        />
      );

    default:
      return null;
  }
});

export default function DesktopOS({ onLogout, onTurnOff }: Props) {
  const { corruptionLevel, incrementCorruption, triggerOnce } = useCorruption();
  const story = useStoryState();
  const displayCorruption = story.canShowHorror ? corruptionLevel : 0;

  const [windows, setWindows]             = useState<OpenWindow[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [isGlitching, setIsGlitching]     = useState(false);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [safeToClose, setSafeToClose]       = useState(false);
  const [gifCursorSrc, setGifCursorSrc] = useState<string | null>(null);
  const [crashBlocked,    setCrashBlocked]    = useState(false);
  const [showCrashScare,  setShowCrashScare]  = useState(false);
  const crashAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showCmdGlitch, setShowCmdGlitch] = useState(false);

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

  const windowCounterRef = useRef(0);

  const makeId = useCallback(() => {
    windowCounterRef.current += 1;
    return `wnd_${windowCounterRef.current}_${Date.now()}`;
  }, []);

  const openStartMenu = useCallback(() => {
    setShowStartMenu(true);
  }, []);

  const focusLogoffButton = useCallback(() => {
    // If you need any extra logic when the logoff button is targeted,
    // put it here; for now it's a no-op.
  }, []);

  const { possessed, gravityTarget, gravitySpeed, handlePossessionReach, } = usePossession({
    active: story.canShowHardHorror,
    onLogout,
    onOpenStartMenu: openStartMenu,
    onFocusLogoff: focusLogoffButton,
  });

  const handleSnakeCrash = useCallback(() => {
    story.markFlag('snake_crashed');
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
  }, [incrementCorruption, story]);

  useEffect(() => {
    return () => {
      if (crashAudioRef.current) {
        crashAudioRef.current.pause();
        crashAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isShuttingDown) return;
    document.body.style.cursor = 'none';
    return () => { document.body.style.cursor = ''; };
  }, [isShuttingDown]);

  const cursorActive = story.canShowHorror;
  useCorruptedCursor({
    active:        cursorActive,
    corruption:    displayCorruption,
    onGifStart:    useCallback((src: string) => setGifCursorSrc(src), []),
    onGifEnd:      useCallback(() => setGifCursorSrc(null),           []),
    gravityTarget,
    gravitySpeed,
    forceShow:     possessed,
    onReachTarget: handlePossessionReach,
  });

  // ── Window management helpers ───────────────────────────────────────
  const openWindow = useCallback(<T extends AppType>(
    appType:  T,
    config:   Omit<WindowConfig, 'id'>,
    appProps: AppPropsMap[T],
  ) => {
    const id = makeId();
    setWindows(prev => {
      const offset = (prev.length % 8) * 22;    // ← reads from updater argument
      const newWindow = {
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
        minimized:       false,
        maximized:       false,
        closeAttempts:   0,
        forceFullscreen: false,
      } satisfies WindowBase & { appType: T; appProps: AppPropsMap[T] } as OpenWindow;;
      return [...prev, newWindow];
    });
    setActiveId(id);
  }, [makeId]);      

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
    if (
      story.canShowHardHorror &&
      win.appType === 'image' &&
      (win.appProps.filename === 'beach_007.jpg' || win.appProps.src.includes('beach_007'))
    ) {
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
  }, [windows, closeWindow, story.canShowHardHorror]);

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
    story.markInteraction(file.setsFlag as StoryFlag | undefined);
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
  }, [story, triggerOnce, openWindow, makeId]);  // ← ADD THIS LINE

  const handleStoryFlag = useCallback((flag: string) => {
    story.markFlag(flag as StoryFlag);
  }, [story]);

  const handleMeaningfulInteraction = useCallback(() => {
    story.markInteraction();
  }, [story]);

  const handleCmdGlitch = useCallback((ms: number) => {
    setShowCmdGlitch(true);
    setTimeout(() => setShowCmdGlitch(false), ms);
  }, []);

  const handleOpenDisplayProperties = useCallback(() => {
    openWindow('error', {
      title:           'Display Properties',
      iconEmoji:       '🖥️',
      initialSize:     { width: 420, height: 230 },
      initialPosition: { x: 280, y: 160 },
    }, {
      message:
        'Display Properties\n\nTheme: Windows XP\nDesktop: Bliss\nScreen saver: None\nColor quality: Highest (32 bit)\n\nThese settings are managed by the current session.',
    });
  }, [openWindow]);

  // ── Desktop icon / action routing ───────────────────────────────────
  const handleOpenApp = useCallback((action: DesktopAction) => {
    // explorer:FolderName
    if (action.startsWith('explorer:')) {
      story.markInteraction();
      const folderName = action.replace('explorer:', '');
      const initialPath = folderName === 'Desktop' ? [] : [folderName];
      openWindow('explorer', {
        title:     `${folderName} - Windows Explorer`,
        iconEmoji: '📁',
        initialSize: { width: 680, height: 460 },
      }, { initialPath });
      return;
    }

    if (action === notepadAction('new')) {
      story.markInteraction();
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

    if (action.startsWith('notepad:')) {
      const filename = action.replace('notepad:', '');
      const file = findFileByName(filename);
      if (file) handleOpenFile(file);
      return;
    }

    if (action === ACTION.IE) {
      story.markInteraction();
      openWindow('error', {
        title:     'Internet Explorer',
        iconEmoji: '🌐',
        initialSize: { width: 420, height: 280 },
      }, {
        message: displayCorruption >= 40
          ? 'Internet Explorer cannot display this page.\n\nThe connection was refused.\n\nYou are not supposed to leave.'
          : 'Internet Explorer cannot display the webpage.\n\nPlease check your connection and try again.',
      });
      return;
    }

    if (action === ACTION.MY_COMPUTER) {
      story.markInteraction();
      openWindow('explorer', {
        title:     'My Computer',
        iconEmoji: '🖥️',
        initialSize: { width: 600, height: 420 },
      }, { initialPath: [] });
    }

    if (action === ACTION.MINESWEEPER) {
      story.markInteraction('minesweeper_played');
      openWindow('minesweeper', {
        title:       'Minesweeper',
        iconEmoji:   '💣',
        initialSize: { width: 260, height: 400 },
      }, {});
      return;
    }

    if (action === ACTION.SNAKE) {
      story.markInteraction('snake_played');
      openWindow('snake', {
        title:       'Snake',
        iconEmoji:   '🐍',
        initialSize: { width: 356, height: 500 },
      }, {});
      return;
    }
    
    if (action === ACTION.CMD) {
      story.markInteraction('opened_cmd');
      openWindow('cmd', {
        title:       'C:\\  Command Prompt',
        iconEmoji:   '⬛',
        initialSize: { width: 580, height: 400 },
      }, {});
      return;
    }

  }, [displayCorruption, openWindow, makeId, story, handleOpenFile]);

  const handleStartMenuApp = useCallback((action: string) => {
    if (action.startsWith('_error:')) {
      const message = action.replace('_error:', '');
      openWindow('error', {
        title:           'System Error',
        iconEmoji:       '⚠️',
        initialSize:     { width: 380, height: 200 },
        initialPosition: { x: 300, y: 200 },
      }, { message });
      return;
    }
    // All non-_error: actions from StartMenu are valid DesktopActions;
    // the _error: prefix is an internal-only convention not in the public type.
    handleOpenApp(action as DesktopAction);
  }, [handleOpenApp, openWindow]);

  const handleTurnOff = useCallback(() => {
    if (story.chapter !== 'ending') {
      story.markFlag('walked_away');
    }
    setShowStartMenu(false);
    setIsShuttingDown(true);
    setTimeout(() => {
      setSafeToClose(true);      // show the black screen
      window.close();            // silently fails in most browsers — safe-to-close is the fallback
    }, 1800);
  }, [story]);

  const handleUnlockFile = useCallback((filename: string) => {
    if (filename === 'minesweeper_scores.txt') story.markFlag('minesweeper_won');
    if (filename === 'snake_highscore.txt') story.markFlag('snake_highscore');
    setUnlockedFiles(prev => {
      const next = new Set(prev).add(filename);
      localStorage.setItem('xp_unlocked', JSON.stringify([...next]));
      return next;
    });
  }, [story]);

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
  }, [openWindow, makeId]);

  const popupOpen = windows.some(win => win.appType === 'notepad' || win.appType === 'error');

  useHorrorEvents({
    corruptionLevel: displayCorruption,
    onEvent: handleHorrorEvent,
    popupOpen,
  });

  // ────────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className={[
          styles.os,
          isGlitching                    ? styles.glitching       : '',
          displayCorruption >= 78        ? styles.chromatic       : '',
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
          corruptionLevel= {displayCorruption}
          onOpenApp=       {handleOpenApp}
          allowJumpscares= {story.canShowHardHorror}
          onOpenProperties={handleOpenDisplayProperties}
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
            <AppContent
              win=            {win}
              corruptionLevel={displayCorruption}
              onOpenFile=     {handleOpenFile}
              triggerOnce=    {triggerOnce}
              deletedFiles=   {deletedFiles}
              unlockedFiles=  {unlockedFiles}
              onSnakeCrash=   {handleSnakeCrash}
              onCmdGlitch=    {handleCmdGlitch}
              onUnlockFile=   {handleUnlockFile}
              onClose=        {closeWindow}
              onStoryFlag=    {handleStoryFlag}
              onMeaningfulInteraction={handleMeaningfulInteraction}
            />
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
          corruptionLevel={displayCorruption}
          isStartOpen={showStartMenu}
          onWindowClick={handleTaskbarWindowClick}
          onStartClick={() => setShowStartMenu(v => !v)}
        />

        {showStartMenu && (
          <StartMenu
            corruptionLevel= {displayCorruption}
            onClose=         {() => setShowStartMenu(false)}
            onOpenApp=       {handleStartMenuApp}
            onLogoff=        {onLogout}
            onTurnOff={handleTurnOff}
          />
        )}
      </div>

      <SafeToCloseScreen active={safeToClose} allowRewrite={story.canShowHorror} />

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

      {showCmdGlitch && <GlitchOverlay />}

      {isShuttingDown && (
        <div style={{
          position:      'fixed',
          inset:         0,
          zIndex:        9998,
          cursor:        'none',
          pointerEvents: 'none',
        }} />
      )}
    </>
  );
}
