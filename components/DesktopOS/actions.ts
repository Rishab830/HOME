// ─── Typed action constants ───────────────────────────────────────────────────
// Import this wherever action strings are constructed or matched.
// Typos will now be caught at compile time.

// Explorer folders that can appear in action strings
export type ExplorerFolder =
  | 'My Documents'
  | 'Recycle Bin'
  | 'My Computer'
  | 'Desktop';

// Notepad filenames that can appear in action strings
export type NotepadFile = 'new' | 'system_log.txt' | (string & {});
// `string & {}` keeps it open for dynamic filenames (e.g. from the filesystem)
// while still accepting the known literals above with autocomplete

// Prefix-based action constructors
export const explorerAction = (folder: ExplorerFolder | string): `explorer:${string}` =>
  `explorer:${folder}`;

export const notepadAction = (file: NotepadFile): `notepad:${string}` =>
  `notepad:${file}`;

// Simple literal actions — use these instead of bare strings
export const ACTION = {
  IE:          'ie',
  MINESWEEPER: 'minesweeper',
  SNAKE:       'snake',
  CMD:         'cmd',
  MY_COMPUTER: 'mycomputer',
} as const;

export type SimpleAction  = typeof ACTION[keyof typeof ACTION];
export type DesktopAction =
  | SimpleAction
  | `explorer:${string}`
  | `notepad:${string}`;
