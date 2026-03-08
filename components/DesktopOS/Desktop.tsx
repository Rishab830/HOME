'use client';

import { useState } from 'react';
import styles from './Desktop.module.css';
import { FILESYSTEM, FSNode } from './horror/filesystem';

interface DesktopIcon {
  label:     string;
  emoji:     string;
  action:    string;       // key that DesktopOS/index listens to
  hidden?:   boolean;
}

interface Props {
  corruptionLevel:    number;
  onOpenApp:          (action: string, payload?: Record<string, unknown>) => void;
}

function buildDesktopIcons(corruption: number): DesktopIcon[] {
  const icons: DesktopIcon[] = [
    { label: 'My Documents', emoji: '📁', action: 'explorer:My Documents' },
    { label: 'My Computer',  emoji: '🖥️',  action: 'mycomputer'           },
    { label: 'Recycle Bin',  emoji: corruption >= 35 ? '🗑️' : '🗑️', action: 'explorer:Recycle Bin' },
    { label: 'Internet Explorer', emoji: '🌐', action: 'ie'              },
  ];

  if (corruption >= 50) {
    icons.push({ label: 'system_log.txt', emoji: '📄', action: 'notepad:system_log.txt', hidden: false });
  }

  return icons;
}

export default function Desktop({ corruptionLevel, onOpenApp }: Props) {
  const icons = buildDesktopIcons(corruptionLevel);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className={styles.desktop}>
      <div className={styles.iconGrid}>
        {icons.map(icon => (
          <button
            key={icon.label}
            className={[
              styles.icon,
              selected === icon.label ? styles.selected : '',
              icon.hidden ? styles.hiddenIcon : '',
            ].join(' ')}
            onClick={() => setSelected(icon.label)}
            onDoubleClick={() => { setSelected(icon.label); onOpenApp(icon.action); }}
            onKeyDown={e => e.key === 'Enter' && onOpenApp(icon.action)}
          >
            <span className={styles.iconEmoji} aria-hidden>{icon.emoji}</span>
            <span className={styles.iconLabel}>{icon.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
