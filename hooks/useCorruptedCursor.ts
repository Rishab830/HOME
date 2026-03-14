'use client';

import { useEffect, useRef, useCallback } from 'react';

const XP_CURSOR     = '/cursors/windows_xp_pointer.png';
const CLICKER_CURSOR = '/cursors/windows_xp_clicker.png';
const CURSOR_W    = 16;
const CURSOR_H    = 32;

const HORROR_GIFS = [
  '/cursors/Eye.gif',
  '/cursors/Eyes.gif',
];

const CLICKABLE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL']);

// Min ms between gif events at each corruption band
function gifInterval(corruption: number): number {
  if (corruption >= 90) return 5_000;
  if (corruption >= 75) return 10_000;
  if (corruption >= 52) return 18_000;
  return Infinity;             // no gifs below 60
}

function gifDuration(corruption: number): number {
  return 1_200 + Math.random() * 1_500 + (corruption / 100) * 800;
}

interface Options {
  active:      boolean;
  corruption:  number;
  onGifStart?: (src: string) => void;
  onGifEnd?:   () => void;
  gravityTarget?:  { x: number; y: number } | null;  // ← ADD
  gravitySpeed?:   number;                            // ← ADD 0–1
  forceShow?:      boolean;                           // ← ADD show even if !active
  onReachTarget?:  () => void;
}

function isClickableTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Element)) return false;
  // Walk up to 4 levels — handles icons nested inside buttons
  let node: Element | null = el;
  for (let i = 0; i < 4; i++) {
    if (!node) break;
    if (CLICKABLE_TAGS.has(node.tagName))              return true;
    if (node.getAttribute('role') === 'button')        return true;
    if (node.getAttribute('role') === 'menuitem')      return true;
    if (node.getAttribute('tabindex') === '0')         return true;
    node = node.parentElement;
  }
  return false;
}

export function useCorruptedCursor({ active, corruption, onGifStart, onGifEnd, gravityTarget, gravitySpeed, forceShow, onReachTarget, }: Options) {
  const imgRef     = useRef<HTMLImageElement | null>(null);
  const posRef     = useRef({ x: -200, y: -200 });
  const velRef     = useRef({ x: -200, y: -200 });
  const rafRef     = useRef<number>(0);
  const gifTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGif      = useRef(false);
  const gravityTargetRef = useRef(gravityTarget ?? null);
  const gravitySpeedRef  = useRef(gravitySpeed ?? 0);
  const reachedRef       = useRef(false);
  const onReachRef       = useRef(onReachTarget);

  useEffect(() => {
    gravityTargetRef.current = gravityTarget ?? null;
    reachedRef.current = false;   // reset reached flag on each new target
  }, [gravityTarget]);
  useEffect(() => { gravitySpeedRef.current = gravitySpeed ?? 0; }, [gravitySpeed]);
  useEffect(() => { onReachRef.current = onReachTarget; },         [onReachTarget]);

  // ── Stop gif scheduling ──────────────────────────────────────────────
  const clearGifTimers = useCallback(() => {
    if (gifTimer.current)  clearTimeout(gifTimer.current);
    if (restTimer.current) clearTimeout(restTimer.current);
    gifTimer.current  = null;
    restTimer.current = null;
  }, []);

  // ── Restore normal cursor after gif ─────────────────────────────────
  const restoreNormal = useCallback(() => {
    isGif.current = false;
    if (imgRef.current) {
      imgRef.current.src    = XP_CURSOR;
      imgRef.current.width  = CURSOR_W;
      imgRef.current.height = CURSOR_H;
      imgRef.current.style.transform = 'none';
    }
    onGifEnd?.();
  }, [onGifEnd]);

  // ── Schedule next gif event ──────────────────────────────────────────
  const scheduleGif = useCallback(() => {
    const interval = gifInterval(corruption);
    if (interval === Infinity) return;

    const delay = interval + Math.random() * 6_000;
    gifTimer.current = setTimeout(() => {
      if (!imgRef.current) return;

      const src = HORROR_GIFS[Math.floor(Math.random() * HORROR_GIFS.length)];
      isGif.current = true;
      imgRef.current.src    = src;
      imgRef.current.width  = 32;
      imgRef.current.height = 32;
      imgRef.current.style.transform = 'translate(-16px, -16px)'; // centre the gif
      onGifStart?.(src);

      restTimer.current = setTimeout(() => {
        restoreNormal();
        scheduleGif();
      }, gifDuration(corruption));
    }, delay);
  }, [corruption, onGifStart, restoreNormal]);

  // ── Main effect: mount/unmount the ghost image ───────────────────────
  useEffect(() => {
    if (!active && !forceShow) {          // ← was just `if (!active)`
      cancelAnimationFrame(rafRef.current);
      clearGifTimers();
      imgRef.current?.remove();
      imgRef.current = null;
      return;
    }

    // Create ghost cursor img
    const img = document.createElement('img');
    img.src    = XP_CURSOR;
    img.width  = CURSOR_W;
    img.height = CURSOR_H;
    img.setAttribute('aria-hidden', 'true');
    Object.assign(img.style, {
      position:      'fixed',
      left:          '-200px',
      top:           '-200px',
      pointerEvents: 'none',
      zIndex:        '99999',
      imageRendering: 'pixelated',
    });
    document.body.appendChild(img);
    imgRef.current = img;

    // Track real cursor
    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('mousemove', onMove);

    const onOver = (e: MouseEvent) => {
      if (isGif.current || !imgRef.current) return;   // don't override during gif
      imgRef.current.src = isClickableTarget(e.target)
        ? CLICKER_CURSOR
        : XP_CURSOR;
    };
    document.addEventListener('mouseover', onOver);

    // Lerp loop — speed drops as corruption rises
    const lerp = () => {
      const gt = gravityTargetRef.current;

      if (gt) {
        // Gravity mode — lerp toward fixed target at increasing speed
        const spd = Math.max(0.01, gravitySpeedRef.current);
        velRef.current.x += (gt.x - velRef.current.x) * spd;
        velRef.current.y += (gt.y - velRef.current.y) * spd;

        // Fire onReachTarget once when close enough
        const dx = gt.x - velRef.current.x;
        const dy = gt.y - velRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < 18 && !reachedRef.current) {
          reachedRef.current = true;
          onReachRef.current?.();
        }
      } else {
        // Below 52: ghost cursor snaps instantly — no visible lag
        // At 52+: lag progressively worsens, bottoming out at 0.04 by corruption 100
        const spd = corruption < 52
          ? 1.0
          : Math.max(0.04, 0.38 - ((corruption - 52) / 48) * 0.34);
        velRef.current.x += (posRef.current.x - velRef.current.x) * spd;
        velRef.current.y += (posRef.current.y - velRef.current.y) * spd;
      }

      if (imgRef.current) {
        imgRef.current.style.left = `${velRef.current.x}px`;
        imgRef.current.style.top  = `${velRef.current.y}px`;
      }
      rafRef.current = requestAnimationFrame(lerp);
    };
    lerp();

    // Start gif scheduling
    scheduleGif();

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      cancelAnimationFrame(rafRef.current);
      clearGifTimers();
      img.remove();
      imgRef.current = null;
    };
  }, [active, corruption, forceShow, scheduleGif, clearGifTimers]);
}
