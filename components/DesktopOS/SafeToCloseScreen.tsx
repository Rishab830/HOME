'use client';

import { useState, useEffect } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const ORIGINAL_TEXT = 'It is now safe to close this window.';
const PAUSE_BEFORE  = 6000;
const MOVE_SPEED    = 100;
const TYPE_SPEED    = 100;
const DELETE_SPEED  = 100;

// ─── Script type ──────────────────────────────────────────────────────────────
type ScriptOp =
  | { op: 'pause';         ms: number }
  | { op: 'showCursor'                }
  | { op: 'removeCursor'              }
  | { op: 'backspace'                 }
  | { op: 'deleteForward'             }
  | { op: 'type';          char: string }
  | { op: 'moveCursor';    delta: -1 | 1 };

// ─── Script ───────────────────────────────────────────────────────────────────
const SAFE_SCRIPT: ScriptOp[] = [
  { op: 'pause',      ms: PAUSE_BEFORE },
  { op: 'showCursor'                   },
  { op: 'pause',      ms: 400          },

  // 1. Replace '.' with '?'
  { op: 'backspace'                    },
  { op: 'type',       char: '?'        },
  { op: 'pause',      ms: 700          },

  // 2. Travel cursor left to position 0
  ...Array.from({ length: 36 }, (): ScriptOp => ({ op: 'moveCursor', delta: -1 })),
  { op: 'pause',      ms: 350          },

  // 3. Delete 'It '
  { op: 'deleteForward' },
  { op: 'deleteForward' },
  { op: 'deleteForward' },

  // 4. Capitalise 'i' of 'is'
  { op: 'deleteForward'                },
  { op: 'type',       char: 'I'        },

  // 5. Move to position 3
  { op: 'moveCursor', delta: 1         },
  { op: 'moveCursor', delta: 1         },

  // 6. Type 'it '
  { op: 'type',       char: 'i'        },
  { op: 'type',       char: 't'        },
  { op: 'type',       char: ' '        },
  { op: 'removeCursor'                 },
];

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  active: boolean;
}

export default function SafeToCloseScreen({ active }: Props) {
  const [safeText,      setSafeText]      = useState(ORIGINAL_TEXT);
  const [safeCursorPos, setSafeCursorPos] = useState(ORIGINAL_TEXT.length);
  const [safeCursorVis, setSafeCursorVis] = useState(false);

  useEffect(() => {
    if (!active) return;

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
  }, [active]);

  if (!active) return null;

  return (
    <div className="safeToClose">
      <p className="safeText">
        {safeText.slice(0, safeCursorPos)}
        {safeCursorVis && (
          <span className="crt-cursor" aria-hidden>▋</span>
        )}
        {safeText.slice(safeCursorPos)}
      </p>
    </div>
  );
}
