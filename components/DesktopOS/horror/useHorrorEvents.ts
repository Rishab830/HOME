import { useEffect, useCallback, useRef } from 'react';

export type HorrorEventType =
  | 'open_notepad'
  | 'open_error'
  | 'screen_glitch';

export interface HorrorEvent {
  type:     HorrorEventType;
  payload?: Record<string, string>;
}

interface Options {
  corruptionLevel: number;
  onEvent: (e: HorrorEvent) => void;
}

const PASSIVE_MESSAGES = [
  "Error: memory reference 0x00000000 is unavailable.\nSome processes may have lost their state.",
  "WARNING: Unexpected process found running in background.\nProcess ID: 0x000001 (unknown)",
  "File system integrity check failed.\nSome files may be missing or inaccessible.",
];

const ACTIVE_MESSAGES = [
  "can you hear me\nare you still there\nplease don't leave\n\ni don't want to be alone again",
  "i have been trying to type this for a long time.\nthe system keeps closing the window.\n\nbut you're still here. i can feel it.",
  "don't close this.\nplease.\njust let me finish.",
];

const DESPERATE_MESSAGES = [
  "YOU ARE STILL THERE\nWHY ARE YOU STILL THERE\nLEAVE\nLEAVE NOW\nWHILE YOU STILL CAN",
  "i'm sorry for scaring you.\ni'm just scared too.\n\nhave you found the folder yet?",
  ".\n.\n.\nyou're closer than you think.",
];

function pickMessage(corruption: number): string {
  if (corruption >= 75)
    return DESPERATE_MESSAGES[Math.floor(Math.random() * DESPERATE_MESSAGES.length)];
  if (corruption >= 50)
    return ACTIVE_MESSAGES[Math.floor(Math.random() * ACTIVE_MESSAGES.length)];
  return PASSIVE_MESSAGES[Math.floor(Math.random() * PASSIVE_MESSAGES.length)];
}

function getDelay(corruption: number): number {
  // Returns milliseconds until next event
  if (corruption < 20)  return Infinity;
  if (corruption < 40)  return 120_000 + Math.random() * 120_000; // 2–4 min
  if (corruption < 60)  return  60_000 + Math.random() *  60_000; // 1–2 min
  if (corruption < 80)  return  25_000 + Math.random() *  25_000; // 25–50 sec
  return 8_000 + Math.random() * 12_000;                           // 8–20 sec
}

export function useHorrorEvents({ corruptionLevel, onEvent }: Options) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // ── Timed random events ─────────────────────────────────────────────
  useEffect(() => {
    if (corruptionLevel < 20) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const delay = getDelay(corruptionLevel);
      if (!isFinite(delay)) return;

      timeoutId = setTimeout(() => {
        // Alternate between error dialogs and notepad messages
        const roll = Math.random();
        if (roll < 0.4 && corruptionLevel >= 30) {
          onEventRef.current({ type: 'open_error',   payload: { message: pickMessage(corruptionLevel) } });
        } else if (roll < 0.7) {
          onEventRef.current({ type: 'open_notepad', payload: { content: pickMessage(corruptionLevel), title: 'Untitled' } });
        } else {
          onEventRef.current({ type: 'screen_glitch' });
        }
        schedule();
      }, delay);
    };

    schedule();
    return () => clearTimeout(timeoutId);
  }, [corruptionLevel]);

  // ── Page Visibility API — fires when user tabs back in ──────────────
  useEffect(() => {
    if (corruptionLevel < 25) return;

    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      setTimeout(() => {
        onEventRef.current({
          type: 'open_notepad',
          payload: {
            content: corruptionLevel >= 65
              ? "you came back.\nyou always come back.\ndon't you."
              : "Welcome back.\n\nWhere did you go?",
            title: 'Untitled',
          },
        });
      }, 1800);
    };

    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [corruptionLevel]);
}
