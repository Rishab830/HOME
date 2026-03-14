'use client';

import { useRef, useEffect } from 'react';

export default function GlitchOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx)   return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const CW    = 12;
    const CH    = 16;
    const CHARS = '█▓▒░╬╫╪═║╔╗╚╝@#$%&?~01░▒▓';
    const COLS  = Math.ceil(canvas.width  / CW);
    const ROWS  = Math.ceil(canvas.height / CH);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0,0,0,0.88)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${CH - 2}px "Courier New", monospace`;

      for (let r = 0; r < ROWS; r++) {
        if (Math.random() > 0.35) continue;
        const len    = Math.floor(Math.random() * COLS * 0.7) + 1;
        const startC = Math.floor(Math.random() * (COLS - len));
        const y      = r * CH + CH - 3;

        const rr = Math.floor(Math.random() * 256);
        const gg = Math.floor(Math.random() * 80);
        const bb = Math.floor(Math.random() * 256);
        ctx.fillStyle = `rgba(${rr},${gg},${bb},0.85)`;

        for (let c = startC; c < startC + len; c++) {
          ctx.fillText(
            CHARS[Math.floor(Math.random() * CHARS.length)],
            c * CW, y
          );
        }
      }
    };

    const id = setInterval(draw, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        9000,
        pointerEvents: 'none',
        width:         '100vw',
        height:        '100vh',
        animation:     'glitchOverlayFade 0.82s ease-out forwards',
      }}
    />
  );
}
