'use client';

import { useEffect, useRef } from 'react';
import styles from './StartMenu.module.css';

interface LeftItem {
  icon:    string;
  label:   string;
  sub?:    string;
  action:  string;
}

interface RightItem {
  icon?:      string;
  label?:     string;
  sub?:       string;
  action?:    string;
  arrow?:     boolean;
  separator?: true;
}

const BASE_LEFT_ITEMS: LeftItem[] = [
  { icon: '🌐', label: 'Internet',             sub: 'Internet Explorer',  action: 'ie'              },
  { icon: '📧', label: 'E-mail',               sub: 'Outlook Express',    action: 'error:mail'      },
  { icon: '⬛', label: 'Command Prompt',       sub: '',                   action: 'error:cmd'       },
  { icon: '💬', label: 'MSN',                  sub: '',                   action: 'ie'              },
  { icon: '🎵', label: 'Windows Media Player', sub: '',                   action: 'error:wmp'       },
  { icon: '💬', label: 'Windows Messenger',    sub: '',                   action: 'error:msg'       },
  { icon: '📝', label: 'Notepad',              sub: '',                   action: 'notepad:new'     },
  { icon: '🖥️', label: 'Tour Windows XP',      sub: '',                   action: 'ie'              },
];

const BASE_RIGHT_ITEMS: RightItem[] = [
  { icon: '📁', label: 'My Documents',                   action: 'explorer:My Documents', arrow: false },
  { icon: '📄', label: 'My Recent Documents',             action: 'explorer:My Documents', arrow: true  },
  { icon: '🖼️', label: 'My Pictures',                    action: 'explorer:My Documents', arrow: false },
  { icon: '🎵', label: 'My Music',                       action: 'explorer:My Documents', arrow: false },
  { icon: '🖥️', label: 'My Computer',                    action: 'mycomputer',            arrow: false },
  { separator: true },
  { icon: '⚙️', label: 'Control Panel',                  action: 'error:cp',              arrow: false },
  { icon: '🔧', label: 'Set Program Access and Defaults', action: 'error:cp',             arrow: false },
  { icon: '🖨️', label: 'Printers and Faxes',             action: 'error:cp',              arrow: false },
  { separator: true },
  { icon: '❓', label: 'Help and Support',               action: 'error:help',            arrow: false },
  { icon: '🔍', label: 'Search',                         action: 'error:search',          arrow: false },
  { icon: '▶️', label: 'Run...',                         action: 'error:run',             arrow: false },
];

// Horror: items mutate at high corruption
function corruptLeftItems(items: LeftItem[], c: number): LeftItem[] {
  if (c < 52) return items;
  return items.map((item, i) => {
    if (c >= 78 && i === 6) return { ...item, label: 'Notepad', sub: '1 unread message' };
    if (c >= 65 && i === 3) return { ...item, label: 'MSN', sub: 'someone is typing...' };
    if (c >= 52 && i === 0) return { ...item, sub: 'connection established' };
    return item;
  });
}

function corruptRightItems(items: RightItem[], c: number): RightItem[] {
  if (c < 60) return items;
  const result = [...items];
  if (c >= 60) {
    // Replace "My Recent Documents" arrow label
    const idx = result.findIndex(r => r.label === 'My Recent Documents');
    if (idx >= 0) result[idx] = { ...result[idx], label: 'My Recent Documents', sub: '(1 item)' };
  }
  if (c >= 78) {
    // Inject a creepy item before the last separator
    const lastSep = [...result].reverse().findIndex(r => r.separator);
    if (lastSep >= 0) {
      const insertAt = result.length - lastSep - 1;
      result.splice(insertAt, 0, { icon: '🚪', label: 'Exit', action: 'error:exit', arrow: false });
    }
  }
  return result;
}

interface Props {
  corruptionLevel: number;
  onClose:         () => void;
  onOpenApp:       (action: string) => void;
  onLogoff:        () => void;
  onTurnOff:       () => void;
}

export default function StartMenu({
  corruptionLevel, onClose, onOpenApp, onLogoff, onTurnOff,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Slight delay so the start-button click that opened it doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  const leftItems  = corruptLeftItems(BASE_LEFT_ITEMS, corruptionLevel);
  const rightItems = corruptRightItems(BASE_RIGHT_ITEMS, corruptionLevel);

  const handleAction = (action: string) => {
    onClose();
    if (!action) return;

    if (action.startsWith('error:')) {
      const key = action.replace('error:', '');
      const messages: Record<string, string> = {
        mail:   'Outlook Express is not installed on this computer.',
        cmd:    'This feature has been disabled by an administrator.',
        wmp:    'Windows Media Player cannot open this file.',
        msg:    'Windows Messenger could not connect.\nThe service may be unavailable.',
        cp:     'Control Panel items are unavailable at this time.',
        help:   'Help and Support Center could not load.\nPlease try again later.',
        search: 'Search is not available.\nThe indexing service is not running.',
        run:    'The Run dialog is unavailable in this session.',
        exit:   corruptionLevel >= 78
          ? 'you can\'t leave.\n\nyou know that.'
          : 'This action is not available.',
      };
      onOpenApp(`_error:${messages[key] ?? 'An error occurred.'}`);
      return;
    }

    onOpenApp(action);
  };

  const username = corruptionLevel >= 78 ? '█████' : 'User';

  return (
    <div className={styles.menu} ref={menuRef} role="menu" aria-label="Start Menu">

      {/* ── Two-column body ─────────────────────────────────────────── */}
      <div className={styles.body}>

        {/* LEFT COLUMN */}
        <div className={styles.left}>

          {/* User panel */}
          <div className={styles.userPanel}>
            <div className={styles.userAvatar}>
              <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden>
                <circle  cx="20" cy="14" r="9"   fill={corruptionLevel >= 65 ? '#cc3333' : '#9DB8D2'} />
                <ellipse cx="20" cy="37" rx="15" ry="10" fill={corruptionLevel >= 65 ? '#cc3333' : '#9DB8D2'} />
              </svg>
            </div>
            <span className={[
              styles.username,
              corruptionLevel >= 78 ? styles.corruptedText : '',
            ].join(' ')}>
              {username}
            </span>
          </div>

          {/* Pinned apps */}
          <div className={styles.pinnedSection}>
            {leftItems.map((item, i) => (
              <button
                key={i}
                className={styles.leftItem}
                onClick={() => handleAction(item.action)}
                role="menuitem"
              >
                <span className={styles.itemIcon} aria-hidden>{item.icon}</span>
                <span className={styles.itemTextWrap}>
                  <span className={styles.itemLabel}>{item.label}</span>
                  {item.sub && (
                    <span className={[
                      styles.itemSub,
                      item.sub.includes('typing') || item.sub.includes('unread') || item.sub.includes('established')
                        ? styles.itemSubCreepy
                        : '',
                    ].join(' ')}>
                      {item.sub}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* All Programs */}
          <div className={styles.allProgramsSep} />
          <button className={styles.allPrograms} role="menuitem">
            <span className={styles.allProgramsIcon} aria-hidden>▶</span>
            All Programs
          </button>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.right}>
          {rightItems.map((item, i) => {
            if (item.separator) {
              return <div key={i} className={styles.rightSep} role="separator" />;
            }
            return (
              <button
                key={i}
                className={[
                  styles.rightItem,
                  item.label === 'Exit' ? styles.exitItem : '',
                ].join(' ')}
                onClick={() => handleAction(item.action ?? '')}
                role="menuitem"
              >
                <span className={styles.rightIcon} aria-hidden>{item.icon}</span>
                <span className={styles.rightTextWrap}>
                  <span className={styles.rightLabel}>{item.label}</span>
                  {item.sub && <span className={styles.rightSub}>{item.sub}</span>}
                </span>
                {item.arrow && <span className={styles.rightArrow} aria-hidden>▶</span>}
              </button>
            );
          })}
        </div>

      </div>

      {/* ── Bottom action bar ────────────────────────────────────────── */}
      <div className={styles.bottomBar}>
        <button className={styles.bottomBtn} onClick={() => { onClose(); onLogoff(); }}>
          <span className={styles.bottomBtnIcon} aria-hidden>🔒</span>
          Log Off
        </button>
        <button className={styles.bottomBtn} onClick={() => { onClose(); onTurnOff(); }}>
          <span className={styles.bottomBtnIconPower} aria-hidden>⏻</span>
          Turn Off Computer
        </button>
      </div>
    </div>
  );
}
