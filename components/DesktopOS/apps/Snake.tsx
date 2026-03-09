'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './apps.module.css';

const COLS       = 20;
const ROWS       = 20;
const CELL       = 16;
const TICK_START = 150;    // ms per frame at start
const TICK_MIN   = 60;     // fastest speed
const HS_KEY     = 'xp_snake_hs';
const GLITCH_THRESHOLD = 50;    // score before glitch food can appear
const GLITCH_CHANCE    = 0.30;

type Dir  = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Phase = 'idle' | 'playing' | 'dead';

interface Pt { x: number; y: number; }

interface Props {
  triggerOnce:  (key: string, gain: number) => void;
  onUnlockFile: (filename: string) => void;
  onCrash:      () => void;
}

function randFood(snake: Pt[]): Pt {
  let pt: Pt;
  do {
    pt = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pt.x && s.y === pt.y));
  return pt;
}

const INIT_SNAKE: Pt[] = [
  { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 },
];

export default function Snake({ triggerOnce, onUnlockFile, onCrash }: Props) {
  const [phase,     setPhase]     = useState<Phase>('idle');
  const [snake,     setSnake]     = useState<Pt[]>(INIT_SNAKE);
  const [food,      setFood]      = useState<Pt>({ x: 15, y: 10 });
  const [score,     setScore]     = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(HS_KEY) ?? '0', 10);
  });
  const [newRecord, setNewRecord] = useState(false);
  const [glitchFood, setGlitchFood] = useState<Pt | null>(null);

  const dirRef      = useRef<Dir>('RIGHT');
  const nextDirRef  = useRef<Dir>('RIGHT');
  const phaseRef    = useRef<Phase>('idle');
  const snakeRef    = useRef<Pt[]>(INIT_SNAKE);
  const foodRef     = useRef<Pt>({ x: 15, y: 10 });
  const scoreRef    = useRef(0);
  const tickRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hsFiredRef  = useRef(false);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const glitchFoodRef  = useRef<Pt | null>(null);
  const glitchFrameRef = useRef(0);
  const glitchAnimRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const crashedRef     = useRef(false);

  // ── Draw ────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s  = snakeRef.current;
    const f  = foodRef.current;
    const gf = glitchFoodRef.current;
    const ph = phaseRef.current;

    // Background grid
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#a8d8a8' : '#98c898';
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }

    // Normal food
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.arc(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00aa00';
    ctx.fillRect(f.x * CELL + CELL / 2, f.y * CELL + 1, 2, 5);

    // Glitch food — RGB-split flicker
    if (gf) {
      const fr  = glitchFrameRef.current;
      const ox  = ((Math.sin(fr * 2.3) * 4) | 0);
      const oy  = ((Math.cos(fr * 1.8) * 3) | 0);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(gf.x * CELL + ox, gf.y * CELL,      CELL - 1, CELL - 1);
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(gf.x * CELL - ox, gf.y * CELL + oy, CELL - 1, CELL - 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('?', gf.x * CELL + CELL / 2, gf.y * CELL + CELL / 2 + 4);
    }

    // Snake
    s.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#1a7a1a' : '#2a9a2a';
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, isHead ? 4 : 3);
      ctx.fill();
      if (isHead) {
        ctx.fillStyle = '#fff';
        const d = dirRef.current;
        const eyes: [number, number][] =
          d === 'RIGHT' ? [[10, 4], [10, 10]] :
          d === 'LEFT'  ? [[4,  4], [4,  10]] :
          d === 'UP'    ? [[4,  4], [10,  4]] :
                          [[4, 10], [10, 10]];
        eyes.forEach(([ex, ey]) => {
          ctx.beginPath();
          ctx.arc(seg.x * CELL + ex, seg.y * CELL + ey, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });

    // Crash screen — BSOD style
    if (crashedRef.current) {
      ctx.fillStyle = '#0000aa';
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'left';
      const lines = [
        'A fatal exception has occurred at',
        '0028:C0034B21. The current application',
        'will be terminated.',
        '',
        '* Press any key to terminate.',
        '* Press CTRL+ALT+DEL to restart.',
        '',
        'If you see this screen again, your',
        'snake may be corrupted.',
      ];
      lines.forEach((line, i) => {
        ctx.fillText(line, 14, 36 + i * 18);
      });
      return;
    }

    // Idle / dead overlays
    if (ph === 'dead' || ph === 'idle') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      if (ph === 'dead') {
        ctx.font = 'bold 18px Tahoma';
        ctx.fillText('GAME OVER', (COLS * CELL) / 2, (ROWS * CELL) / 2 - 10);
        ctx.font = '13px Tahoma';
        ctx.fillText(`Score: ${scoreRef.current}`, (COLS * CELL) / 2, (ROWS * CELL) / 2 + 12);
      } else {
        ctx.font = 'bold 16px Tahoma';
        ctx.fillText('Press any arrow key', (COLS * CELL) / 2, (ROWS * CELL) / 2 - 6);
        ctx.font = '12px Tahoma';
        ctx.fillText('to start', (COLS * CELL) / 2, (ROWS * CELL) / 2 + 14);
      }
    }
  }, []);

  useEffect(() => {
    if (!glitchFood) {
      if (glitchAnimRef.current) clearInterval(glitchAnimRef.current);
      return;
    }
    glitchAnimRef.current = setInterval(() => {
      glitchFrameRef.current++;
      draw();
    }, 80);
    return () => { if (glitchAnimRef.current) clearInterval(glitchAnimRef.current); };
  }, [glitchFood, draw]);

  // ── Tick ────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (phaseRef.current !== 'playing') return;

    dirRef.current = nextDirRef.current;
    const head = snakeRef.current[0];
    const d    = dirRef.current;
    const next: Pt = {
      x: head.x + (d === 'RIGHT' ? 1 : d === 'LEFT' ? -1 : 0),
      y: head.y + (d === 'DOWN'  ? 1 : d === 'UP'   ? -1 : 0),
    };

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      phaseRef.current = 'dead'; setPhase('dead'); draw(); return;
    }
    if (snakeRef.current.some(s => s.x === next.x && s.y === next.y)) {
      phaseRef.current = 'dead'; setPhase('dead'); draw(); return;
    }

    // Glitch food eaten → crash
    if (glitchFoodRef.current &&
        next.x === glitchFoodRef.current.x &&
        next.y === glitchFoodRef.current.y) {
      crashedRef.current = true;
      phaseRef.current   = 'dead';
      glitchFoodRef.current = null;
      setGlitchFood(null);
      setPhase('dead');
      draw();    // draw BSOD
      onCrash(); // tell DesktopOS
      return;
    }

    const ate = next.x === foodRef.current.x && next.y === foodRef.current.y;
    const newSnake = ate
      ? [next, ...snakeRef.current]
      : [next, ...snakeRef.current.slice(0, -1)];
    snakeRef.current = newSnake;

    if (ate) {
      const newScore = scoreRef.current + 10;
      scoreRef.current = newScore;
      setScore(newScore);

      // Decide next food — glitched or normal
      const newFood     = randFood(newSnake);
      const spawnGlitch =
        newScore >= GLITCH_THRESHOLD &&
        Math.random() < GLITCH_CHANCE &&
        !glitchFoodRef.current;     // only one glitch food at a time

      if (spawnGlitch) {
        const gf = randFood([...newSnake, newFood]);  // not on snake or normal food
        glitchFoodRef.current = gf;
        setGlitchFood(gf);
      }

      foodRef.current = newFood;
      setFood(newFood);

      const hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10);
      if (newScore > hs && !hsFiredRef.current) {
        hsFiredRef.current = true;
        localStorage.setItem(HS_KEY, String(newScore));
        setHighScore(newScore);
        setNewRecord(true);
        triggerOnce('snake:highscore', 5);
        onUnlockFile('snake_highscore.txt');
      }
    }

    setSnake([...newSnake]);
    draw();

    const speed = Math.max(TICK_MIN, TICK_START - Math.floor(scoreRef.current / 50) * 10);
    tickRef.current = setTimeout(tick, speed);
  }, [draw, triggerOnce, onUnlockFile, onCrash]);

  // ── Keyboard ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();

      // Start game on first arrow press
      if (phaseRef.current === 'idle') {
        phaseRef.current = 'playing';
        setPhase('playing');
        nextDirRef.current = d;
        dirRef.current     = d;
        tickRef.current    = setTimeout(tick, TICK_START);
        return;
      }

      // Prevent reversing
      const opposites: Record<Dir, Dir> = {
        UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
      };
      if (d !== opposites[dirRef.current]) nextDirRef.current = d;
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tick]);

  // ── Draw on mount and snake change ──────────────────────────────────
  useEffect(() => { draw(); }, [draw, snake, food]);

  // ── Reset ────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (tickRef.current)    clearTimeout(tickRef.current);
    if (glitchAnimRef.current) clearInterval(glitchAnimRef.current);
    const initSnake = [...INIT_SNAKE];
    const initFood  = { x: 15, y: 10 };
    snakeRef.current      = initSnake;
    foodRef.current       = initFood;
    glitchFoodRef.current = null;
    scoreRef.current      = 0;
    dirRef.current        = 'RIGHT';
    nextDirRef.current    = 'RIGHT';
    phaseRef.current      = 'idle';
    hsFiredRef.current    = false;
    crashedRef.current    = false;
    setSnake(initSnake);
    setFood(initFood);
    setGlitchFood(null);
    setScore(0);
    setPhase('idle');
    setNewRecord(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (tickRef.current) clearTimeout(tickRef.current); }, []);

  const hsDisplay = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10);

  return (
    <div className={styles.snakeWrap}>
      {/* Menu bar */}
      <div className={styles.mswMenuBar}>
        <button className={styles.mswMenuItem}>Game</button>
        <button className={styles.mswMenuItem}>Help</button>
      </div>

      <div className={styles.snakeInner}>
        {/* Score strip */}
        <div className={styles.snakeScoreBar}>
          <div className={styles.snakeScoreBox}>
            <span className={styles.snakeScoreLabel}>Score</span>
            <span className={styles.snakeScoreVal}>{score}</span>
          </div>
          <button className={styles.mswFace} onClick={reset} title="New game">
            {phase === 'dead' ? '😵' : '🙂'}
          </button>
          <div className={styles.snakeScoreBox}>
            <span className={styles.snakeScoreLabel}>Best</span>
            <span className={styles.snakeScoreVal}>
              {newRecord ? <span className={styles.snakeRecord}>{score}</span> : hsDisplay}
            </span>
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          className={styles.snakeCanvas}
        />

        {/* Status */}
        <div className={styles.mswStatus}>
          {phase === 'idle'    && <span>Use arrow keys to start</span>}
          {phase === 'playing' && <span>Speed: {Math.max(1, Math.floor(score / 50) + 1)}</span>}
          {phase === 'dead'    && <span>Press 🙂 to play again</span>}
        </div>
      </div>
    </div>
  );
}
