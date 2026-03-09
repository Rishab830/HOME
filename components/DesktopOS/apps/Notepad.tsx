'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './apps.module.css';
import type { CorruptionAppend } from '../horror/filesystem';

interface Props {
  filename:          string;
  instanceId:        string;       // unique window id — used as localStorage key
  corruptionLevel:   number;
  baseContent:       string;
  corruptionAppends?: CorruptionAppend[];
}

const SAVE_DELAY  = 500;           // ms debounce before writing to localStorage
const APPEND_DELAY = 900;          // ms delay before corruption text appears (feels typed)

export default function Notepad({
  filename,
  instanceId,
  corruptionLevel,
  baseContent,
  corruptionAppends = [],
}: Props) {
  const contentKey = `xp_note_${instanceId}`;
  const tiersKey   = `xp_note_tiers_${instanceId}`;

  // ── Initialize content from localStorage or baseContent ─────────────
  const [content, setContent] = useState<string>(() => {
    if (typeof window === 'undefined') return baseContent;
    const saved = localStorage.getItem(contentKey);
    return saved !== null ? saved : baseContent;
  });

  const [appliedTiers, setAppliedTiers] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(tiersKey) ?? '[]'); }
    catch { return []; }
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Debounced save on every keystroke ───────────────────────────────
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(contentKey, val);
    }, SAVE_DELAY);
  }, [contentKey]);

  // ── Flush save on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // Use ref to get latest content without adding it to deps
      const ta = textareaRef.current;
      if (ta) localStorage.setItem(contentKey, ta.value);
    };
  }, [contentKey]);

  // ── Append corruption text when thresholds are newly crossed ────────
  useEffect(() => {
    if (!corruptionAppends.length) return;

    const pending = corruptionAppends.filter(
      a => corruptionLevel >= a.threshold && !appliedTiers.includes(a.threshold)
    );
    if (!pending.length) return;

    // Slight delay so it feels like the text appeared on its own
    const id = setTimeout(() => {
      setContent(prev => {
        const next = pending.reduce(
          (acc, a) => acc + '\n\n' + a.text,
          prev
        );
        localStorage.setItem(contentKey, next);
        return next;
      });

      setAppliedTiers(prev => {
        const next = [...prev, ...pending.map(a => a.threshold)];
        localStorage.setItem(tiersKey, JSON.stringify(next));
        return next;
      });
    }, APPEND_DELAY);

    return () => clearTimeout(id);
  }, [corruptionLevel, corruptionAppends, appliedTiers, contentKey, tiersKey]);

  // ── Cursor position for status bar ──────────────────────────────────
  const [cursor, setCursor] = useState({ ln: 1, col: 1 });
  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const before = ta.value.slice(0, ta.selectionStart ?? 0);
    const lines  = before.split('\n');
    setCursor({ ln: lines.length, col: (lines.at(-1)?.length ?? 0) + 1 });
  }, []);

  const isGlitched = corruptionLevel >= 60 &&
    (filename.includes('diary') || filename.includes('README'));

  return (
    <div className={styles.notepadWrap}>
      {/* Menu bar */}
      <div className={styles.menuBar}>
        {['File', 'Edit', 'Format', 'View', 'Help'].map(m => (
          <button key={m} className={styles.menuItem}>{m}</button>
        ))}
      </div>

      {/* Editable textarea */}
      <textarea
        ref={textareaRef}
        className={[styles.textArea, isGlitched ? styles.glitchedText : ''].join(' ')}
        value={content}
        onChange={handleChange}
        onSelect={handleSelect}
        onClick={handleSelect}
        onKeyUp={handleSelect}
        spellCheck={false}
        aria-label={`Contents of ${filename}`}
      />

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span>{filename}</span>
        <span>Ln {cursor.ln}, Col {cursor.col}</span>
      </div>
    </div>
  );
}
