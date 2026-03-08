'use client';

import {
  useState, useEffect, useRef, useCallback, ReactNode,
} from 'react';
import styles from './Window.module.css';

export interface WindowConfig {
  id:               string;
  title:            string;
  iconEmoji?:       string;
  initialPosition?: { x: number; y: number };
  initialSize?:     { width: number; height: number };
}

interface Props {
  config:      WindowConfig;
  isActive:    boolean;
  isMinimized: boolean;
  onFocus:     () => void;
  onClose:     () => void;
  onMinimize:  () => void;
  children:    ReactNode;
}

export default function Window({
  config, isActive, isMinimized,
  onFocus, onClose, onMinimize, children,
}: Props) {
  const [pos,  setPos]  = useState(config.initialPosition ?? { x: 120, y: 60 });
  const [size, setSize] = useState(config.initialSize     ?? { width: 620, height: 440 });
  const [maximized, setMaximized] = useState(false);
  const savedState = useRef({ pos, size });

  // ── Dragging ─────────────────────────────────────────────────────────
  const dragging  = useRef(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if (maximized) return;
    e.preventDefault();
    onFocus();
    dragging.current = true;
    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  }, [maximized, pos, onFocus]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: dragOrigin.current.px + (e.clientX - dragOrigin.current.mx),
        y: Math.max(0, dragOrigin.current.py + (e.clientY - dragOrigin.current.my)),
      });
    };
    const up = () => { dragging.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',  up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',  up);
    };
  }, []);

  // ── Maximise toggle ──────────────────────────────────────────────────
  const toggleMax = () => {
    if (maximized) {
      setPos(savedState.current.pos);
      setSize(savedState.current.size);
    } else {
      savedState.current = { pos, size };
    }
    setMaximized(v => !v);
  };

  if (isMinimized) return null;

  return (
    <div
      className={[
        styles.window,
        isActive   ? styles.active   : styles.inactive,
        maximized  ? styles.maximized : '',
      ].join(' ')}
      style={maximized ? undefined : { left: pos.x, top: pos.y, width: size.width, height: size.height }}
      onMouseDown={onFocus}
    >
      {/* ── Title bar ──────────────────────────────────────────────── */}
      <div
        className={styles.titleBar}
        onMouseDown={onTitleMouseDown}
        onDoubleClick={toggleMax}
      >
        {config.iconEmoji && (
          <span className={styles.titleIcon} aria-hidden>{config.iconEmoji}</span>
        )}
        <span className={styles.titleText}>{config.title}</span>

        <div className={styles.controls} onMouseDown={e => e.stopPropagation()}>
          <button className={`${styles.btn} ${styles.btnMin}`} onClick={onMinimize} title="Minimize">
            <span className={styles.iconMin} />
          </button>
          <button className={`${styles.btn} ${styles.btnMax}`} onClick={toggleMax} title="Maximize">
            <span className={styles.iconMax} />
          </button>
          <button className={`${styles.btn} ${styles.btnClose}`} onClick={onClose} title="Close">
            ✕
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
