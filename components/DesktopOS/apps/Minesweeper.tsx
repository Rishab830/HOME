'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './apps.module.css';

const ROWS  = 9;
const COLS  = 9;
const MINES = 10;
const HS_KEY = 'xp_minesweeper_hs';

type Phase = 'idle' | 'playing' | 'won' | 'lost';

interface Cell {
  isMine:   boolean;
  revealed: boolean;
  flagged:  boolean;
  adjacent: number;
}

interface Props {
  triggerOnce:  (key: string, gain: number) => void;
  onUnlockFile: (filename: string) => void;
}

const NUM_COLORS: Record<number, string> = {
  1: '#0000ff', 2: '#008000', 3: '#ff0000', 4: '#000080',
  5: '#800000', 6: '#008080', 7: '#000000', 8: '#808080',
};

// ── Pure helpers ──────────────────────────────────────────────────────────────
function emptyGrid(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () =>
      ({ isMine: false, revealed: false, flagged: false, adjacent: 0 })
    )
  );
}

function LCD({ value }: { value: number }) {
  const display = String(Math.max(-99, Math.min(999, value))).padStart(3, '0');
  return (
    <div className={styles.mswLcd}>
      <span className={styles.mswLcdGhost}>888</span>
      <span className={styles.mswLcdVal}>{display}</span>
    </div>
  );
}

function placeMines(grid: Cell[][], safeR: number, safeC: number): Cell[][] {
  const g = grid.map(r => r.map(c => ({ ...c })));
  let n = 0;
  while (n < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!g[r][c].isMine && !(Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1)) {
      g[r][c].isMine = true;
      n++;
    }
  }
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (g[r][c].isMine) continue;
      let cnt = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && g[nr][nc].isMine) cnt++;
        }
      g[r][c].adjacent = cnt;
    }
  return g;
}

function floodReveal(grid: Cell[][], startR: number, startC: number): Cell[][] {
  const g = grid.map(r => r.map(c => ({ ...c })));
  const stack = [[startR, startC]];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (g[r][c].revealed || g[r][c].flagged)        continue;
    g[r][c].revealed = true;
    if (g[r][c].adjacent === 0 && !g[r][c].isMine)
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (dr !== 0 || dc !== 0) stack.push([r + dr, c + dc]);
  }
  return g;
}

function isWon(grid: Cell[][]): boolean {
  return grid.every(row => row.every(cell => cell.isMine || cell.revealed));
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Minesweeper({ triggerOnce, onUnlockFile }: Props) {
  const [grid,      setGrid]      = useState<Cell[][]>(emptyGrid());
  const [phase,     setPhase]     = useState<Phase>('idle');
  const [time,      setTime]      = useState(0);
  const [flagCount, setFlagCount] = useState(MINES);
  const [highScore, setHighScore] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const s = localStorage.getItem(HS_KEY);
    return s !== null ? parseInt(s, 10) : null;
  });
  const [newRecord, setNewRecord] = useState(false);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const wonFired   = useRef(false);

  // ── Timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => setTime(t => Math.min(999, t + 1)), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Win handler ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'won' || wonFired.current) return;
    wonFired.current = true;

    triggerOnce('minesweeper:win', 5);

    if (highScore === null || time < highScore) {
      setHighScore(time);
      setNewRecord(true);
      localStorage.setItem(HS_KEY, String(time));
      onUnlockFile('minesweeper_scores.txt');
    }
  }, [phase, time, highScore, triggerOnce, onUnlockFile]);

  // ── Reset ──────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setGrid(emptyGrid());
    setPhase('idle');
    setTime(0);
    setFlagCount(MINES);
    setNewRecord(false);
    wonFired.current = false;
  }, []);

  // ── Reveal ─────────────────────────────────────────────────────────
  const handleReveal = useCallback((r: number, c: number) => {
    if (phase === 'won' || phase === 'lost') return;
    if (grid[r][c].revealed || grid[r][c].flagged) return;

    let g = grid;
    let nextPhase: Phase = phase;

    if (phase === 'idle') {
      g         = placeMines(grid, r, c);
      nextPhase = 'playing';
    }

    if (g[r][c].isMine) {
      // Reveal all mines on loss
      const blown = g.map(row => row.map(cell => ({
        ...cell,
        revealed: cell.isMine ? true : cell.revealed,
      })));
      setGrid(blown);
      setPhase('lost');
      return;
    }

    const next = floodReveal(g, r, c);
    setGrid(next);

    if (isWon(next)) {
      setPhase('won');
    } else {
      setPhase(nextPhase);
    }
  }, [phase, grid]);

  // ── Flag ───────────────────────────────────────────────────────────
  const handleFlag = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (phase !== 'playing') return;
    if (grid[r][c].revealed) return;

    const g = grid.map(row => row.map(cell => ({ ...cell })));
    g[r][c].flagged = !g[r][c].flagged;
    setGrid(g);
    setFlagCount(f => g[r][c].flagged ? f - 1 : f + 1);
  }, [phase, grid]);

  // ── Face emoji ─────────────────────────────────────────────────────
  const face = phase === 'won' ? '😎' : phase === 'lost' ? '😵' : '🙂';

  return (
    <div className={styles.mswWrap}>

      {/* Menu bar */}
      <div className={styles.mswMenuBar}>
        <button className={styles.mswMenuItem}>Game</button>
        <button className={styles.mswMenuItem}>Help</button>
      </div>

      {/* Inner panel */}
      <div className={styles.mswInner}>

        {/* Header */}
        <div className={styles.mswHeader}>
          <LCD value={flagCount} />
          <button className={styles.mswFace} onClick={reset} title="New game">
            {face}
          </button>
          <LCD value={time} />
        </div>

        {/* Grid */}
        <div className={styles.mswGrid}>
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const content = cell.revealed
                ? cell.isMine
                  ? '💣'
                  : cell.adjacent > 0 ? String(cell.adjacent) : ''
                : cell.flagged ? '🚩' : '';

              return (
                <button
                  key={`${r}-${c}`}
                  className={[
                    styles.mswCell,
                    cell.revealed ? styles.mswCellOpen : '',
                    cell.revealed && cell.isMine ? styles.mswMine : '',
                  ].join(' ')}
                  style={
                    cell.revealed && !cell.isMine && cell.adjacent > 0
                      ? { color: NUM_COLORS[cell.adjacent] }
                      : undefined
                  }
                  onClick={() => handleReveal(r, c)}
                  onContextMenu={e => handleFlag(e, r, c)}
                >
                  {content}
                </button>
              );
            })
          )}
        </div>

        {/* Status */}
        <div className={styles.mswStatus}>
          {phase === 'won'     && <span>You win! {time}s {newRecord ? '🏆 New best!' : highScore !== null ? `(Best: ${highScore}s)` : ''}</span>}
          {phase === 'lost'    && <span>Game over. Click 🙂 to retry.</span>}
          {phase === 'idle'    && <span>Click any square to begin.</span>}
          {phase === 'playing' && highScore !== null && <span>Best: {highScore}s</span>}
        </div>

      </div>
    </div>
  );
}
