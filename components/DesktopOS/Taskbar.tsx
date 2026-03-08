'use client';

import { useState, useEffect } from 'react';
import styles from './Taskbar.module.css';

interface TaskbarWindow {
  id:        string;
  title:     string;
  iconEmoji?: string;
  minimized: boolean;
}

interface Props {
  windows:           TaskbarWindow[];
  activeWindowId:    string | null;
  corruptionLevel:   number;
  isStartOpen:       boolean;
  onWindowClick:     (id: string) => void;
  onStartClick:      () => void;
}

export default function Taskbar({
  windows, activeWindowId, corruptionLevel, isStartOpen,
  onWindowClick, onStartClick,
}: Props) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.taskbar}>
      {/* ── Start button ──────────────────────────────────────────── */}
      <button
        className={`${styles.startBtn} ${isStartOpen ? styles.startActive : ''}`}
        onClick={onStartClick}
        aria-label="Start"
      >
        <span className={styles.startFlag} aria-hidden>
          <span className={`${styles.fp} ${styles.fpR}`} />
          <span className={`${styles.fp} ${styles.fpG}`} />
          <span className={`${styles.fp} ${styles.fpB}`} />
          <span className={`${styles.fp} ${styles.fpY}`} />
        </span>
        <span className={styles.startText}>start</span>
      </button>

      {/* ── Separator ─────────────────────────────────────────────── */}
      <div className={styles.sep} />

      {/* ── Open windows ──────────────────────────────────────────── */}
      <div className={styles.windowList}>
        {windows.map(w => (
          <button
            key={w.id}
            className={[
              styles.winBtn,
              activeWindowId === w.id && !w.minimized ? styles.winActive : '',
            ].join(' ')}
            onClick={() => onWindowClick(w.id)}
            title={w.title}
          >
            {w.iconEmoji && <span aria-hidden>{w.iconEmoji}</span>}
            <span className={styles.winLabel}>{w.title}</span>
          </button>
        ))}
      </div>

      {/* ── System tray ───────────────────────────────────────────── */}
      <div className={styles.tray}>
        {/* At high corruption, a small red dot pulses in the tray */}
        {corruptionLevel >= 60 && (
          <span className={styles.trayWarning} title="System error detected" aria-label="Warning" />
        )}
        <span className={styles.clock} aria-label="Current time">{time}</span>
      </div>
    </div>
  );
}
