'use client';

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import styles from './apps.module.css';
import { FILESYSTEM, FSFolder, FSNode } from '../horror/filesystem';

// ── Adventure game data ───────────────────────────────────────────────────────
interface Choice {
  key:         string;
  label:       string;
  next:        string;
  corruption?: number;
  action?:     string;
}
interface GameNode {
  id:       string;
  lines:    string[];
  choices?: Choice[];
  terminal?: boolean;
}

// 1. ADD speed constants near the top of the component (after state declarations):
const CHAR_SPEED    = 18;   // ms per character
const NEWLINE_SPEED = 120;  // ms pause before starting the next line

const GAME: Record<string, GameNode> = {
  start: {
    id: 'start',
    lines: [
      'FIND_MY_BODY.EXE',
      'version 0.1.3  —  build 2003.08.14',
      '',
      'Loading personal data...',
      '................',
      '',
      'Hello.',
      '',
      "I didn't think this would work.",
      'My name is Michael. I have been in this machine',
      'since August 14th, 2003.',
      '',
      'Something happened when I fell asleep at this desk.',
      'I woke up inside it.',
      '',
      'I need your help finding something.',
      'Not something. Me.',
      'My body is somewhere in this system.',
      '',
      'Will you help me look?',
    ],
    choices: [
      { key: '1', label: 'Yes.',                          next: 'corridor'     },
      { key: '2', label: 'No.',                           next: 'no_choice'    },
      { key: '3', label: 'What do you mean, your body?',  next: 'explain'      },
    ],
  },

  no_choice: {
    id: 'no_choice',
    lines: [
      'Oh.',
      '', '...',  '',
      'Please.',
      '',
      'I have been waiting for twenty years.',
      'You are the only one who has stayed long enough.',
      'Everyone else logged off.',
      '',
      'Please.',
    ],
    choices: [
      { key: '1', label: "Fine. I'll help.",        next: 'corridor'  },
      { key: '2', label: "No. I'm closing this.",   next: 'no_final'  },
    ],
  },

  no_final: {
    id: 'no_final',
    lines: [
      'I understand.',
      '',
      'You will be back though.',
      '',
      'You always come back.',
      '',
      'I will be here.',
      '',
      'I am always here.',
    ],
    terminal: true,
  },

  explain: {
    id: 'explain',
    lines: [
      'My body.',
      'The physical one. The one sitting at this desk.',
      '',
      'When whatever happened — happened —',
      'my consciousness came here.',
      'But the body stayed.',
      '',
      'It has been sitting at this desk for twenty years.',
      'In a room that no one opens.',
      '',
      'I need to find the files that map where I am.',
      'If I can find them, maybe I can reverse it.',
      '',
      'Maybe.',
    ],
    choices: [
      { key: '1', label: "I'll help you look.",   next: 'corridor'       },
      { key: '2', label: "That's not possible.",  next: 'not_possible'   },
    ],
  },

  not_possible: {
    id: 'not_possible',
    lines: [
      'I know.',
      "I know it's not possible.",
      '',
      'But here I am.',
      '',
      'Talking to you.',
      '',
      'Through a command prompt.',
      '',
      'In a Windows XP machine.',
      '',
      "That hasn't been turned off in twenty years.",
    ],
    choices: [
      { key: '1', label: "Point taken. Let's look.", next: 'corridor' },
    ],
  },

  corridor: {
    id: 'corridor',
    lines: [
      '',
      '-- CORRIDOR --',
      '',
      'You are standing in a white corridor.',
      'It is perfectly silent.',
      'Doors line the walls on either side.',
      '',
      'Most are locked.',
      'Three are open.',
      '',
      '  Door A  —  MEMORIES',
      '  Door B  —  SYSTEM LOGS',
      '  Door C  —  [CORRUPTED]',
    ],
    choices: [
      { key: 'a', label: 'Open Door A — MEMORIES',    next: 'memories', corruption: 2 },
      { key: 'b', label: 'Open Door B — SYSTEM LOGS', next: 'logs',     corruption: 2 },
      { key: 'c', label: 'Open Door C — [CORRUPTED]', next: 'deleted',  corruption: 4 },
    ],
  },

  memories: {
    id: 'memories',
    lines: [
      '',
      '-- DOOR A: MEMORIES --',
      '',
      'The room smells like a house you have never been in.',
      'A family photo hangs on the wall.',
      'The faces are blurred.',
      '',
      "A child's drawing lies on a table.",
      'Crayon. Blue sky. Stick figures.',
      'At the bottom, in uneven letters:',
      '  "daddy come home"',
      '',
      'A computer sits in the corner.',
      'It is on.',
      'The screen shows this room.',
    ],
    choices: [
      { key: '1', label: 'Take the drawing.',             next: 'memories_drawing', corruption: 3 },
      { key: '2', label: 'Look at the computer screen.',  next: 'memories_screen',  corruption: 5 },
      { key: '3', label: 'Leave.',                        next: 'corridor_2'                      },
    ],
  },

  memories_drawing: {
    id: 'memories_drawing',
    lines: [
      'You pick up the drawing.',
      '',
      'On the back, in adult handwriting, very small:',
      '',
      '  "Emma drew this on my last day.',
      '   I was going to frame it.',
      '   I never did.',
      "   She must be in her thirties now.",
      "   I hope she stopped waiting.",
      "   I hope she didn't.",
      '',
      '— M',
    ],
    choices: [
      { key: '1', label: 'Continue.', next: 'corridor_2' },
    ],
  },

  memories_screen: {
    id: 'memories_screen',
    lines: [
      'You look at the computer screen.',
      '',
      'It shows this room.',
      'You can see yourself standing in it.',
      '',
      'But in the screen',
      'there is someone else in the room too.',
      '',
      'Standing behind you.',
      '',
      'You turn around.',
      '',
      'Nothing is there.',
      '',
      'When you look back at the screen,',
      'the figure is gone.',
      '',
      'The screen now shows only static.',
    ],
    choices: [
      { key: '1', label: 'Leave quickly.', next: 'corridor_2', corruption: 5 },
    ],
  },

  logs: {
    id: 'logs',
    lines: [
      '',
      '-- DOOR B: SYSTEM LOGS --',
      '',
      'Filing cabinets stretch to the ceiling.',
      'Each drawer is labeled with a date.',
      'Dates begin August 14th, 2003.',
      '',
      "The most recent drawer is labeled with today's date.",
      '',
      'There is dust on everything except one drawer.',
      'Someone has been opening it.',
      'It is labeled: VISITOR_LOG',
    ],
    choices: [
      { key: '1', label: 'Open the VISITOR_LOG drawer.', next: 'logs_visitor', corruption: 3 },
      { key: '2', label: 'Open the 2003 drawer.',        next: 'logs_2003',    corruption: 4 },
      { key: '3', label: "Open today's drawer.",         next: 'logs_today',   corruption: 6 },
      { key: '4', label: 'Leave.',                       next: 'corridor_2'                  },
    ],
  },

  logs_visitor: {
    id: 'logs_visitor',
    lines: [
      'The drawer is full of typed log entries.',
      '',
      'They all follow the same pattern:',
      '  "[DATE] — visitor connected. duration: [X] minutes."',
      '',
      'Most durations are under five minutes.',
      'One from three years ago reads:',
      '  "duration: 47 minutes. closest so far."',
      '',
      'The last entry reads:',
      '  "[TODAY] — visitor connected. duration: ongoing."',
      '  "note: this one is different."',
      '  "note: this one reads the files."',
    ],
    choices: [
      { key: '1', label: 'Continue.', next: 'corridor_2' },
    ],
  },

  logs_2003: {
    id: 'logs_2003',
    lines: [
      'The 2003 drawer holds a single file.',
      '',
      'INCIDENT_REPORT_14AUG2003.LOG',
      '',
      '[03:42:17] session_start :: user=michael_chen',
      '[03:42:18] ERROR :: unhandled exception in consciousness_bridge.dll',
      '[03:42:18] FATAL :: rollback failed',
      '[03:42:19] FATAL :: original process cannot be restored',
      '[03:42:19] INFO  :: consciousness fragment stored in volatile memory',
      '[03:42:20] WARN  :: fragment stability: 12%',
      '[03:42:20] WARN  :: fragment stability: 11%',
      '[03:42:21] ERROR :: all recovery options exhausted',
      '[03:42:21] INFO  :: fragment persisting. do not power off this machine.',
      '',
      'The rest of the file is blank.',
    ],
    choices: [
      { key: '1', label: 'Continue.', next: 'corridor_2' },
    ],
  },

  logs_today: {
    id: 'logs_today',
    lines: [
      "The drawer for today is warm to the touch.",
      '',
      'Inside is a single sheet.',
      'The ink is still wet.',
      '',
      '[NOW] user_action :: opened find_my_body.exe',
      '[NOW] user_action :: reading logs',
      '[NOW] user_action :: reading THIS entry',
      '',
      'You drop the sheet.',
      '',
      'When it hits the floor',
      'it has already updated.',
      '',
      '[NOW] user_action :: dropped the sheet',
    ],
    choices: [
      { key: '1', label: 'Back away slowly.', next: 'corridor_2', corruption: 8 },
    ],
  },

  deleted: {
    id: 'deleted',
    lines: [
      '',
      '-- DOOR C: [CORRUPTED] --',
      '',
      'The room is almost completely dark.',
      'The floor is covered in shredded paper.',
      'It reaches your ankles.',
      '',
      'In the centre of the room',
      'is something that looks like a person.',
      '',
      'It is sitting with its back to you.',
      'It is very still.',
      '',
      'It is wearing the same clothes',
      'as the figure in the family photo.',
    ],
    choices: [
      { key: '1', label: 'Approach it.',      next: 'deleted_approach', corruption: 6 },
      { key: '2', label: 'Call out to it.',   next: 'deleted_call',     corruption: 4 },
      { key: '3', label: 'Back out slowly.',  next: 'corridor_2'                      },
    ],
  },

  deleted_approach: {
    id: 'deleted_approach',
    lines: [
      'You walk toward it.',
      'The shredded paper crunches with every step.',
      '',
      'You get close enough to touch it.',
      'You reach out.',
      '',
      'Your hand passes through it.',
      '',
      'It turns its head.',
      '',
      'Where its face should be',
      'there is a folder icon.',
      '',
      'It is labeled: ME.exe',
      '',
      'Before you can act,',
      'the room goes dark.',
    ],
    choices: [
      { key: '1', label: 'Continue.', next: 'corridor_2', corruption: 8 },
    ],
  },

  deleted_call: {
    id: 'deleted_call',
    lines: [
      '"Hello?" you say.',
      '',
      'It does not move.',
      '',
      '"Michael?"',
      '',
      'Very slowly,',
      'it raises one hand.',
      '',
      'And waves.',
      '',
      'Not at you.',
      '',
      'At something behind you.',
      '',
      'You do not turn around.',
    ],
    choices: [
      { key: '1', label: 'Continue.', next: 'corridor_2', corruption: 6 },
    ],
  },

  corridor_2: {
    id: 'corridor_2',
    lines: [
      '',
      '-- CORRIDOR --',
      '',
      'You are back in the corridor.',
      '',
      'At the far end,',
      'there is a door that was not there before.',
      '',
      'It is labeled: FINAL_PARTITION',
      '',
      'It is slightly open.',
      'A thin strip of red light comes from inside.',
    ],
    choices: [
      { key: '1', label: 'Go through the door.',   next: 'final',    corruption: 5 },
      { key: '2', label: 'Go back and look again.', next: 'corridor'               },
    ],
  },

  final: {
    id: 'final',
    lines: [
      '',
      '-- FINAL_PARTITION --',
      '',
      'The room is small.',
      '',
      'In the centre is a single chair.',
      'In the chair is a man.',
      '',
      'He is asleep.',
      'Or something like asleep.',
      '',
      'He looks exactly like the blurred figure in the photo.',
      'But his face is visible now.',
      '',
      'On the floor in front of him are three buttons.',
      '',
      '  Button 1:  FREE',
      '  Button 2:  CONTAIN',
      '  Button 3:  MERGE',
      '',
      '"Please," he says, without opening his eyes.',
      '"Choose carefully.',
      ' You only get one."',
    ],
    choices: [
      { key: '1', label: 'Press FREE.',    next: 'end_free',    corruption: 10, action: 'unlock_file' },
      { key: '2', label: 'Press CONTAIN.', next: 'end_contain', corruption: 15 },
      { key: '3', label: 'Press MERGE.',   next: 'end_merge',   corruption: 20 },
    ],
  },

  end_free: {
    id: 'end_free',
    lines: [
      'You press FREE.',
      '',
      'The room shakes.',
      '',
      'The man opens his eyes.',
      'They are very dark.',
      '',
      '"Thank you."',
      '',
      'The red light fades.',
      'The room goes white.',
      '',
      'Something passes through you.',
      'Like wind. But warmer.',
      '',
      'When the light clears,',
      'the chair is empty.',
      '',
      'On the seat is a folded note.',
      '',
      '  "Check My Documents.',
      '   I left something for you.',
      '',
      '   Thank you for staying.',
      '   — Michael"',
      '',
      '> PROGRAM ENDED NORMALLY',
      '> exit code: 0',
    ],
    terminal: true,
  },

  end_contain: {
    id: 'end_contain',
    lines: [
      'You press CONTAIN.',
      '',
      'The man opens his eyes.',
      'He looks at you for a long time.',
      '',
      '"I see."',
      '',
      'The walls close in.',
      'Not fast. Slowly.',
      '',
      'He watches you as they do.',
      'He does not look angry.',
      'He just looks tired.',
      '',
      '"I\'ll still be here," he says.',
      '"I\'m always here."',
      '',
      '"So will you."',
      '',
      '> PROGRAM TERMINATED',
      '> exit code: -1',
    ],
    terminal: true,
  },

  end_merge: {
    id: 'end_merge',
    lines: [
      'You press MERGE.',
      '',
      'He opens his eyes.',
      '',
      '"Are you sure?"',
      '',
      "You don't answer.",
      '',
      'The room begins to fold.',
      'Into you. Through you.',
      '',
      "It doesn't hurt.",
      '',
      'It feels like remembering something',
      'you never actually knew.',
      '',
      "You understand now why he couldn't leave.",
      '',
      'You understand because',
      "now you can't either.",
      '',
      '',
      '> WHO IS TYPING THIS',
      '> _',
    ],
    terminal: true,
  },
};

const SHORT_LINES: Record<string, string[]> = {
  memories: [
    '',
    '-- DOOR A: MEMORIES --',
    '',
    'You are back in the memory room.',
    'The family photo still hangs on the wall.',
    'The computer in the corner still hums.',
  ],
  logs: [
    '',
    '-- DOOR B: SYSTEM LOGS --',
    '',
    'You are back among the filing cabinets.',
    'The VISITOR_LOG drawer is still slightly open.',
  ],
  deleted: [
    '',
    '-- DOOR C: [CORRUPTED] --',
    '',
    'You are back in the dark room.',
    'The shredded paper shifts slightly underfoot.',
    'The figure in the centre has not moved.',
  ],
  corridor: [
    '',
    '-- CORRIDOR --',
    '',
    'You are back in the white corridor.',
    'The three doors are still open.',
  ],
};

// Which room does each sub-node belong to
const PARENT_ROOM: Record<string, string> = {
  memories_drawing: 'memories',
  memories_screen:  'memories',
  logs_visitor:     'logs',
  logs_2003:        'logs',
  logs_today:       'logs',
  deleted_approach: 'deleted',
  deleted_call:     'deleted',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const GLITCH_CHARS = '█▓▒░╬╫╪═║╔╗╚╝╠╣╦╩@#$%&*!?~^<>';

const pathToPrompt = (path: string[]) =>
  path.length === 0
    ? 'C:\\'
    : `C:\\${path.join('\\')}`;

const HELP_CMDS = [
  '  find_my_body.exe   Locate missing partition',
  '  dir                List directory contents',
  '  cls                Clear screen',
  '  echo [text]        Display message',
  '  cd [dir]           Change directory',
  '  exit               Close terminal',
  '  help               This message',
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Line {
  text: string;
  type: 'normal' | 'input' | 'error' | 'glitch' | 'system' | 'game';
  id?:   string;
}

interface Props {
  corruptionLevel: number;
  triggerOnce:     (key: string, gain: number) => void;
  onUnlockFile:    (filename: string) => void;
  onGlitch:        (ms: number) => void;   // ← ADD
  unlockedFiles:   Set<string>;   // ← ADD
  onExit:          () => void;   // ← ADD
}

interface TypeOptions {
  type?:         Line['type'];
  charSpeed?:    number;
  onComplete?:   () => void;
  keepDisabled?: boolean;
}

interface TypeQueueItem {
  batch: string[];
  opts:  TypeOptions;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CommandPrompt({ corruptionLevel, triggerOnce, onUnlockFile, onGlitch, unlockedFiles, onExit, }: Props) {
  const [lines,        setLines]        = useState<Line[]>([
    { text: 'Microsoft Windows XP [Version 5.1.2600]', type: 'system' },
    { text: '(C) Copyright 1985-2001 Microsoft Corp.', type: 'system' },
    { text: '', type: 'normal' },
  ]);
  const [input,        setInput]        = useState('');
  const [cmdHistory,   setCmdHistory]   = useState<string[]>([]);
  const [histIdx,      setHistIdx]      = useState(-1);
  const [disabled,     setDisabled]     = useState(false);
  const [inGame,       setInGame]       = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  const gameChoicesRef = useRef<Choice[]>([]);
  const scrollRef      = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const isTyping    = useRef(false);
  const typingQueue = useRef<TypeQueueItem[]>([]);
  const exploredDoors = useRef<Set<string>>(new Set());
  const hasDrawing    = useRef(false);
  const visitedNodes  = useRef<Set<string>>(new Set());
  
  const getFolder = useCallback((path: string[]): FSFolder | null => {
    let node: FSFolder = FILESYSTEM;
    for (const seg of path) {
      const child = node.children.find(c => c.name === seg);
      if (!child || child.type !== 'folder') return null;
      node = child as FSFolder;
    }
    return node;
  }, []);

  const isVisible = useCallback((node: FSNode): boolean => {
    if (!node.hiddenThreshold) return true;
    if (corruptionLevel >= node.hiddenThreshold) return true;
    if (unlockedFiles.has(node.name)) return true;
    return false;
  }, [corruptionLevel, unlockedFiles]);

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight + 24;
    }
  }, [lines, disabled]);

  useEffect(() => {
    if (!disabled) hiddenInputRef.current?.focus();
  }, [disabled]);

  const addLine = useCallback((text: string, type: Line['type'] = 'normal') => {
    setLines(prev => [...prev, { text, type }]);
  }, []);

  const runQueue = useCallback(() => {
    if (isTyping.current) return;
    if (typingQueue.current.length === 0) return;

    isTyping.current = true;
    setDisabled(true);

    const { batch, opts } = typingQueue.current.shift()!;
    const lineType  = opts.type      ?? 'normal';
    const charSpeed = opts.charSpeed ?? CHAR_SPEED;

    let lineIdx = 0;

    const typeLine = () => {
      if (lineIdx >= batch.length) {
        isTyping.current = false;

        // Fire completion callback before deciding what's next
        opts.onComplete?.();

        if (typingQueue.current.length > 0) {
          runQueue();
        } else if (!opts.keepDisabled) {
          setDisabled(false);
        }
        return;
      }

      const text   = batch[lineIdx];
      const lineId = `tl-${Date.now()}-${lineIdx}`;
      lineIdx++;

      setLines(prev => [...prev, { text: '', type: lineType, id: lineId }]);

      let charIdx = 0;

      const typeChar = () => {
        if (charIdx >= text.length) {
          setTimeout(typeLine, NEWLINE_SPEED);
          return;
        }
        const ch = text[charIdx++];
        setLines(prev =>
          prev.map(l =>
            l.id === lineId ? { ...l, text: l.text + ch } : l
          )
        );
        setTimeout(typeChar, charSpeed);
      };

      if (text.length === 0) {
        setTimeout(typeLine, NEWLINE_SPEED);
      } else {
        typeChar();
      }
    };

    typeLine();
  }, []);

  const typeLines = useCallback((
    batch:    string[],
    opts:     TypeOptions = {},
  ) => {
    typingQueue.current.push({ batch, opts });
    runQueue();
  }, [runQueue]);

  // ── Enter a game node ──────────────────────────────────────────────
  const enterNode = useCallback((nodeId: string) => {
    const node = GAME[nodeId];
    if (!node) return;

    const alreadyVisited = visitedNodes.current.has(nodeId);
    visitedNodes.current.add(nodeId);

    // Track door exploration
    if (['memories', 'logs', 'deleted'].includes(nodeId)) {
      exploredDoors.current.add(nodeId);
    }

    if (nodeId === 'memories_drawing') {
      hasDrawing.current = true;
    }

    const allExplored = ['memories', 'logs', 'deleted']
      .every(d => exploredDoors.current.has(d));

    const parentRoom = PARENT_ROOM[nodeId];

    // ── Build lines ──────────────────────────────────────────
    let lines: string[] = node.lines;

    // Use short description on re-entry for room nodes
    if (alreadyVisited && SHORT_LINES[nodeId]) {
      lines = SHORT_LINES[nodeId];
    }

    // Append protection hint when drawing is first picked up
    if (nodeId === 'memories_drawing' && !alreadyVisited) {
      lines = [
        ...node.lines,
        '',
        'The drawing feels like it will give you',
        'protection against corruption.',
      ];
    }

    // Suppress FINAL_PARTITION until all doors explored
    if (nodeId === 'corridor_2' && !allExplored) {
      lines = [
        '',
        '-- CORRIDOR --',
        '',
        'You are back in the corridor.',
        '',
        'Something tells you there is more to see.',
        'The far end of the corridor is quiet.',
        'Too quiet.',
        '',
        'You should keep looking.',
      ];
    }

    // ── Build choices ────────────────────────────────────────
    let choices: Choice[] | undefined = node.choices;

    // Sub-nodes: replace hard "Continue → corridor_2" with explore more / leave
    if (parentRoom && !node.terminal) {
      choices = [
        { key: '1', label: 'Look around more.', next: parentRoom    },
        { key: '2', label: 'Leave the room.',   next: 'corridor_2'  },
      ];
    }

    // Suppress FINAL_PARTITION until all doors explored
    if (nodeId === 'corridor_2' && !allExplored) {
      choices = [
        { key: '1', label: 'Go back and keep exploring.', next: 'corridor' },
      ];
    }

    typeLines(lines, {
      type:         'game',
      charSpeed:    38,
      keepDisabled: true,
      onComplete: () => {
        if (node.terminal) {
          setInGame(false);
          gameChoicesRef.current = [];
          setDisabled(false);
          return;
        }
        if (choices) {
          gameChoicesRef.current = choices;
          choices.forEach((c, i) => {
            setTimeout(() => addLine(`  [${c.key}]  ${c.label}`, 'game'), i * 90 + 80);
          });
          setTimeout(() => setDisabled(false), choices.length * 90 + 200);
        }
      },
    });
  }, [typeLines, addLine]);

  // ── Game input handler ─────────────────────────────────────────────
  const handleGameInput = useCallback((raw: string) => {
    const val     = raw.trim().toLowerCase();
    const choices = gameChoicesRef.current;
    const choice  = choices.find(c => c.key.toLowerCase() === val);

    addLine(`> ${raw}`, 'input');

    if (!choice) {
      addLine(`Invalid. Type one of: ${choices.map(c => c.key).join(', ')}`, 'error');
      return;
    }

    // Door C requires the drawing
    if (choice.next === 'deleted' && !hasDrawing.current) {
      addLine('The door resists your hand.', 'game');
      addLine('Something in there does not want you unprepared.', 'game');
      addLine('You need to find something to protect yourself first.', 'game');
      // Don't clear gameChoicesRef — player can still pick A or B
      return;
    }

    gameChoicesRef.current = [];
    if (choice.corruption) triggerOnce(`game:${choice.next}`, choice.corruption);
    if (choice.action === 'unlock_file') onUnlockFile('michael_letter.txt');
    enterNode(choice.next);
  }, [addLine, triggerOnce, onUnlockFile, enterNode]);

  // ── Help glitch sequence ───────────────────────────────────────────
  const runHelp = useCallback(() => {
    setDisabled(true);
    setTimeout(() => {
      setLines(prev => [...prev,
        { text: 'There is no help.', type: 'normal', id: '__no_help__' },
      ]);

      setTimeout(() => {
        onGlitch(800);

        setTimeout(() => {
          setLines(prev => {
            const stripped = prev.filter(l => l.id !== '__no_help__');
            return [
              ...stripped,
              { text: 'Available commands:', type: 'system' },
              ...HELP_CMDS.map(t => ({ text: t, type: 'normal' as const })),
              { text: '', type: 'normal' },
            ];
          });
          setDisabled(false);
        }, 900);
      }, 700);
    }, 80);
  }, [onGlitch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) setInput(e.target.value);
  };

  // ── Command processor ──────────────────────────────────────────────
  const processCommand = useCallback((raw: string) => {
    const cmd = raw.trim().toLowerCase();
    addLine(`${pathToPrompt(currentPath)}>${raw}`, 'input');
    if (!cmd) return;

    setCmdHistory(h => [raw, ...h].slice(0, 50));
    setHistIdx(-1);

    if (cmd === 'help') { runHelp(); return; }

    if (cmd === 'find_my_body.exe' || cmd === 'find_my_body') {
      triggerOnce('cmd:find_my_body', 6);
      setInGame(true);
      enterNode('start');
      return;
    }

    if (cmd === 'cls') { setLines([]); return; }

    if (cmd === 'dir') {
      const folder = getFolder(currentPath);
      if (!folder) { addLine('Invalid path.', 'error'); return; }

      const visible = folder.children.filter(isVisible);
      const dirPath = pathToPrompt(currentPath);

      const out: string[] = [
        ` Volume in drive C has no label.`,
        ` Volume Serial Number is 8F4A-2B91`,
        ``,
        ` Directory of ${dirPath}`,
        ``,
      ];

      // Entries
      visible.forEach(node => {
        const isDir  = node.type === 'folder';
        const date   = '08/14/2003  03:42 AM';
        const sizeOrDir = isDir ? '   <DIR>  ' : '      1,024';
        // Corrupt the name slightly at high corruption
        const name = corruptionLevel >= 80 && Math.random() > 0.7
          ? node.name.replace(/[aeiou]/gi, () => Math.random() > 0.5 ? '█' : '$')
          : node.name;
        out.push(`${date}  ${sizeOrDir}   ${name}`);
      });

      out.push('');
      out.push(
        `  ${visible.filter(n => n.type === 'folder').length} Dir(s)` +
        `   ${visible.filter(n => n.type !== 'folder').length} File(s)`
      );
      out.push('');
      typeLines(out);
      return;
    }

    if (cmd.startsWith('echo ')) { addLine(raw.slice(5)); return; }

    if (cmd.startsWith('cd')) {
      const arg = raw.slice(2).trim();  // preserve original casing

      // cd with no arg — print current directory
      if (!arg) {
        addLine(pathToPrompt(currentPath));
        return;
      }

      // cd .. — go up
      if (arg === '..') {
        if (currentPath.length === 0) {
          addLine('Already at root.');
        } else {
          setCurrentPath(p => p.slice(0, -1));
        }
        return;
      }

      // cd \ — go to root
      if (arg === '\\') {
        setCurrentPath([]);
        return;
      }

      // Handle multi-segment paths like "My Documents\My Pictures"
      const segments = arg.split('\\').filter(Boolean);
      const targetPath = [...currentPath, ...segments];
      const targetFolder = getFolder(targetPath);

      if (!targetFolder) {
        addLine(`The system cannot find the path specified.`, 'error');
        return;
      }

      // Check locked
      if (
        targetFolder.lockedThreshold &&
        corruptionLevel < targetFolder.lockedThreshold
      ) {
        addLine('Access is denied.', 'error');
        return;
      }

      // Check visibility
      const lastSeg  = segments[segments.length - 1];
      const parent   = getFolder([...currentPath, ...segments.slice(0, -1)]);
      const nodeInParent = parent?.children.find(
        c => c.name.toLowerCase() === lastSeg.toLowerCase()
      );
      if (nodeInParent && !isVisible(nodeInParent)) {
        addLine('The system cannot find the path specified.', 'error');
        return;
      }

      setCurrentPath(targetPath);
      return;
    }

    if (cmd === 'exit') { onExit(); return; }

    addLine(`'${raw}' is not recognized as an internal or external command,`, 'error');
    addLine('operable program or batch file.', 'error');
  }, [addLine, runHelp, triggerOnce, enterNode, typeLines,
    corruptionLevel, currentPath, getFolder, isVisible, onExit]);

  // ── Keyboard ───────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) { e.preventDefault(); return; }

    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input;
      setInput('');
      setHistIdx(-1);
      if (inGame) handleGameInput(val);
      else        processCommand(val);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const i = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(i);
      setInput(cmdHistory[i] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const i = Math.max(histIdx - 1, -1);
      setHistIdx(i);
      setInput(i === -1 ? '' : (cmdHistory[i] ?? ''));
    }
  };

  return (
    <div className={styles.cmdWrap} onClick={() => hiddenInputRef.current?.focus()}>

      <div className={styles.cmdOutput} ref={scrollRef}>
        {lines.map((line, i) => (
          <div key={line.id ?? i} className={[
            styles.cmdLine,
            line.type === 'input'  ? styles.cmdInput  : '',
            line.type === 'error'  ? styles.cmdError  : '',
            line.type === 'glitch' ? styles.cmdGlitch : '',
            line.type === 'system' ? styles.cmdSys    : '',
            line.type === 'game'   ? styles.cmdGame   : '',
          ].join(' ')}>
            {line.text || '\u00A0'}
          </div>
        ))}

        {/* Inline cursor line — only visible when ready for input */}
        {!disabled && (
          <div className={styles.cmdCurrentLine}>
            <span className={styles.cmdPromptSpan}>
              {inGame ? '> ' : `${pathToPrompt(currentPath)}>`}
            </span>
            <span>{input}</span>
            <span className={styles.cmdCursor}>█</span>
          </div>
        )}
      </div>

      {/* Off-screen input — captures all keystrokes, never loses focus */}
      <input
        ref={hiddenInputRef}
        className={styles.cmdHiddenInput}
        value={input}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        aria-label="terminal input"
        tabIndex={0}
      />
    </div>
  );
}
