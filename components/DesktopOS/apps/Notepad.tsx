'use client';

import { useMemo } from 'react';
import styles from './apps.module.css';

interface Props {
  filename:        string;
  corruptionLevel: number;
  getContent:      (corruption: number) => string;
}

export default function Notepad({ filename, corruptionLevel, getContent }: Props) {
  const content = useMemo(
    () => getContent(corruptionLevel),
    [corruptionLevel, getContent]
  );

  const isGlitched = corruptionLevel >= 60 &&
    (filename === 'my_diary.txt' || filename === 'README.txt');

  return (
    <div className={styles.notepadWrap}>
      {/* Menu bar */}
      <div className={styles.menuBar}>
        {['File', 'Edit', 'Format', 'View', 'Help'].map(m => (
          <button key={m} className={styles.menuItem}>{m}</button>
        ))}
      </div>
      {/* Text area */}
      <textarea
        className={[styles.textArea, isGlitched ? styles.glitchedText : ''].join(' ')}
        value={content}
        readOnly
        spellCheck={false}
        aria-label={`Contents of ${filename}`}
      />
      {/* Status bar */}
      <div className={styles.statusBar}>
        <span>{filename}</span>
        <span>Ln 1, Col 1</span>
      </div>
    </div>
  );
}
