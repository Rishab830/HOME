import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outFile = path.join(root, 'docs', 'CORRUPTION.md');

const sources = {
  filesystem: 'components/DesktopOS/horror/filesystem.ts',
  commandPrompt: 'components/DesktopOS/apps/CommandPrompt.tsx',
  desktop: 'components/DesktopOS/Desktop.tsx',
  desktopOS: 'components/DesktopOS/index.tsx',
  horrorEvents: 'components/DesktopOS/horror/useHorrorEvents.ts',
  cursor: 'hooks/useCorruptedCursor.ts',
  login: 'components/LoginScreen/index.tsx',
  startMenu: 'components/DesktopOS/StartMenu.tsx',
  taskbar: 'components/DesktopOS/Taskbar.tsx',
  notepad: 'components/DesktopOS/apps/Notepad.tsx',
  errorDialog: 'components/DesktopOS/apps/ErrorDialog.tsx',
  minesweeper: 'components/DesktopOS/apps/Minesweeper.tsx',
  snake: 'components/DesktopOS/apps/Snake.tsx',
  story: 'hooks/useStoryState.ts',
  safeToClose: 'components/DesktopOS/SafeToCloseScreen.tsx',
};

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function esc(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function table(headers, rows) {
  if (!rows.length) return '_None found._\n';
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.map(esc).join(' | ')} |`),
  ].join('\n') + '\n';
}

function extractFilesystem() {
  const text = read(sources.filesystem);
  const lines = text.split(/\r?\n/);
  const gains = [];
  const hidden = [];
  const locked = [];
  const appends = [];
  let current = 'Desktop';
  let currentType = 'folder';

  for (const line of lines) {
    const name = line.match(/name:\s*'([^']+)'/);
    if (name) current = name[1];
    const type = line.match(/type:\s*'([^']+)'/);
    if (type) currentType = type[1];
    const gain = line.match(/corruptionGain:\s*(\d+)/);
    if (gain) gains.push([current, currentType, `+${gain[1]}`, 'First folder/file open only', sources.filesystem]);
    const h = line.match(/hiddenThreshold:\s*(\d+)/);
    if (h) hidden.push([current, currentType, h[1], sources.filesystem]);
    const l = line.match(/lockedThreshold:\s*(\d+)/);
    if (l) locked.push([current, currentType, l[1], sources.filesystem]);
    const append = line.match(/threshold:\s*(\d+)/);
    if (append) appends.push([current, append[1], 'Append extra text when this file is open/rendered', sources.filesystem]);
  }

  return { gains, hidden, locked, appends };
}

function extractCommandChoices() {
  const text = read(sources.commandPrompt);
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.includes('corruption:')) continue;
    const label = line.match(/label:\s*(['"])(.*?)\1,\s*next:/);
    const next = line.match(/next:\s*['"]([^'"]+)['"]/);
    const corruption = line.match(/corruption:\s*(\d+)/);
    if (label && next && corruption) {
      rows.push([label[2], next[1], `+${corruption[1]}`, 'First time per destination key', sources.commandPrompt]);
    }
  }
  const findBody = text.match(/triggerOnce\('cmd:find_my_body',\s*(\d+)\)/);
  if (findBody) rows.push(['Run find_my_body.exe', 'start', `+${findBody[1]}`, 'First time only', sources.commandPrompt]);
  return rows;
}

function extractDirectGains() {
  const rows = [];
  const desktopOS = read(sources.desktopOS);
  const crash = desktopOS.match(/incrementCorruption\((\d+)\)/);
  if (crash) rows.push(['Snake glitch-food crash', `+${crash[1]}`, 'Can happen after eating glitch food in Snake', sources.desktopOS]);
  const mines = read(sources.minesweeper).match(/triggerOnce\('minesweeper:win',\s*(\d+)\)/);
  if (mines) rows.push(['Minesweeper win', `+${mines[1]}`, 'First win only', sources.minesweeper]);
  const snake = read(sources.snake).match(/triggerOnce\('snake:highscore',\s*(\d+)\)/);
  if (snake) rows.push(['Snake high score', `+${snake[1]}`, 'First high-score event only', sources.snake]);
  return rows;
}

function extractLoginMessages() {
  const text = read(sources.login);
  const rows = [];
  const regex = /\{\s*minCorruption:\s*(\d+),\s*greeting:\s*(['"])(.*?)\2(?:,\s*subtext:\s*(['"])(.*?)\4)?([^}]*)\}/gs;
  for (const match of text.matchAll(regex)) {
    const flags = [
      match[6]?.includes('glitched') ? 'glitched' : '',
      match[6]?.includes('aggressive') ? 'aggressive' : '',
    ].filter(Boolean).join(', ');
    rows.push([match[1], match[3], match[5] ?? '', flags || 'normal']);
  }
  return rows;
}

function extractDesktopThresholds() {
  const text = read(sources.desktop);
  const wallpapers = [...text.matchAll(/if \(corruption >= (\d+)\) return '([^']+)'/g)]
    .map(match => [match[1], match[2], sources.desktop]);
  wallpapers.push(['0', '/wallpapers/bliss_0.jpg', sources.desktop]);
  const jumpscares = text.match(/JUMPSCARE_THRESHOLDS = \[([^\]]+)\]/)?.[1]
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .map(v => [v, '160ms broken-screen flash', 'Only when `story.canShowHardHorror` is true', sources.desktop]) ?? [];
  return { wallpapers, jumpscares };
}

function generate() {
  const fsData = extractFilesystem();
  const commandChoices = extractCommandChoices();
  const directGains = extractDirectGains();
  const loginMessages = extractLoginMessages();
  const desktop = extractDesktopThresholds();
  const now = new Date().toISOString();

  const md = `# Corruption System Reference

_Generated ${now} by \`npm run docs:corruption\`._

Run \`npm run docs:corruption:watch\` while editing corruption logic to keep this file updated live. The watcher monitors the source files listed in the appendix and rewrites this markdown whenever they change.

## Core Rules

- Corruption is stored in \`localStorage.xp_corruption\` and capped at \`100\`.
- \`triggerOnce(key, gain)\` applies a gain only once per key, tracked in \`localStorage.xp_triggered\`.
- \`incrementCorruption(n)\` always adds immediately, capped at \`100\`.
- During the innocent opening, raw corruption may still increase, but visible corruption is forced to \`0\`.
- Visible horror is gated by story state:
  - \`canShowHorror = introGraceComplete && chapter !== ending\`
  - \`canShowHardHorror = introGraceComplete && chapter >= breach && chapter !== ending\`
- The intro grace completes after 7 minutes, 8 meaningful interactions, or opening/running Command Prompt.

## Corruption Increases

### Files And Folders
${table(['Item', 'Type', 'Gain', 'When', 'Source'], fsData.gains)}

### Command Prompt / find_my_body.exe Choices
${table(['Choice', 'Next node', 'Gain', 'When', 'Source'], commandChoices)}

### Direct App Events
${table(['Event', 'Gain', 'When', 'Source'], directGains)}

## Unlocks And Visibility Thresholds

### Hidden Items
${table(['Item', 'Type', 'Visible at corruption', 'Source'], fsData.hidden)}

### Locked Items
${table(['Item', 'Type', 'Unlock/access at corruption', 'Source'], fsData.locked)}

### Notepad Corruption Appends
${table(['File', 'Threshold', 'Effect', 'Source'], fsData.appends)}

## Display And Event Thresholds

### Login Screen Messages
${table(['Min corruption', 'Greeting', 'Subtext', 'Style'], loginMessages)}

### Desktop Wallpaper Ladder
${table(['Min corruption', 'Wallpaper', 'Source'], desktop.wallpapers)}

### Desktop Jumpscare Flashes
${table(['Threshold crossed', 'Effect', 'Gate', 'Source'], desktop.jumpscares)}

### Passive Horror Events
| Corruption range | Delay | Possible event |
| --- | --- | --- |
| <20 | none | no timed passive event |
| 20-29 | 2-4 minutes | Notepad message or screen glitch |
| 30-39 | 2-4 minutes | Error dialog, Notepad message, or screen glitch |
| 40-59 | 1-2 minutes | Error dialog, Notepad message, or screen glitch |
| 60-79 | 25-50 seconds | Error dialog, Notepad message, or screen glitch |
| 80-100 | 8-20 seconds | Error dialog, Notepad message, or screen glitch |

Message pools:

- <50: passive system-looking warnings.
- 50-74: active Michael/contact messages.
- >=75: desperate/aggressive messages.

Visibility-return event:

- At >=25, leaving the tab/window arms a one-time return check.
- When the user returns, a random roll decides whether a Notepad message appears. Default chance: 35%.
- If a Notepad/Error popup is already open, the return popup is skipped.
- If the user returns without first leaving, no return popup is considered.
- At >=65, that message changes to the harsher "you came back" variant.

### Cursor Corruption
| Min corruption | Cursor behavior |
| --- | --- |
| <52 | Custom ghost cursor can show, but snaps to the real cursor without lag |
| 52 | Cursor lag begins; horror GIF cursor events every ~18s + random 0-6s |
| 75 | Horror GIF interval drops to ~10s + random 0-6s |
| 90 | Horror GIF interval drops to ~5s + random 0-6s |
| 52-100 | Cursor lag lerp speed decreases toward 0.04 by corruption 100 |

### Other UI Thresholds
| Threshold | Effect |
| --- | --- |
| 25 | Desktop wallpaper changes to \`bliss_1.jpg\`; \`beach_005.jpg\` can appear |
| 35 | Recycle Bin \`message_for_you.txt\` can appear |
| 40 | Internet Explorer error can say "You are not supposed to leave"; \`beach_006.jpg\` can appear |
| 50 | \`system_log.txt\` desktop icon/file appears |
| 52 | Login/start UI begins visible corruption; wallpaper changes to \`bliss_2.jpg\`; Start Menu Internet subtitle becomes "connection established"; cursor lag/GIF system can begin |
| 60 | Notepad diary/README text gets glitched styling; Taskbar red tray dot appears; Start Menu recent documents shows "(1 item)" |
| 65 | Login becomes aggressive; Start Menu avatar turns red; MSN subtitle becomes "someone is typing..."; \`beach_007.jpg\` can appear |
| 68 | Desktop hard-horror jumpscare threshold |
| 70 | Late diary and system-log appends can appear |
| 75 | Passive messages switch to desperate pool |
| 78 | Chromatic overlay; wallpaper changes to \`bliss_3.jpg\`; Start Menu username redacts; Start Menu adds Exit item; Login "trapped" copy appears |
| 80 | \`DO_NOT_OPEN\` can be accessed; Command Prompt \`dir\` may randomly corrupt names |
| 88 | Login "i've been waiting" copy; desktop hard-horror jumpscare threshold |
| 90 | Cursor GIF interval becomes fastest |
| 96 | Final login message and \`bliss_4.jpg\` wallpaper |

## Hard-Horror Gates

- Desktop jumpscare flashes require both crossing one of \`40, 68, 88\` and \`story.canShowHardHorror\`.
- Snake glitch-food crash overlay/audio adds corruption immediately, but it only becomes part of the breach/hard-horror path after story state allows it.
- The beach_007 close trap only runs when \`story.canShowHardHorror\` is true.
- Possession/logoff cursor control only starts when \`story.canShowHardHorror\` is true.
- Shutdown safe-to-close text rewrite only runs when \`story.canShowHorror\` is true.

## Source Appendix

Watched source files:

${Object.values(sources).map(source => `- \`${source}\``).join('\n')}
`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, md, 'utf8');
  return outFile;
}

function watch() {
  const write = () => {
    const written = generate();
    console.log(`[corruption-doc] wrote ${path.relative(root, written)} at ${new Date().toLocaleTimeString()}`);
  };
  write();
  for (const rel of Object.values(sources)) {
    const abs = path.join(root, rel);
    fs.watchFile(abs, { interval: 500 }, write);
  }
  console.log('[corruption-doc] watching for corruption-related source changes...');
}

if (process.argv.includes('--watch')) {
  watch();
} else {
  const written = generate();
  console.log(`Wrote ${path.relative(root, written)}`);
}
