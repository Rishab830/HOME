export type FileType = 'txt' | 'xls' | 'folder' | 'img' | 'log';

export interface CorruptionAppend {
  threshold: number;
  text:      string;   // appended to end of file when corruption crosses threshold
}

export interface FSFile {
  name:              string;
  type:              Exclude<FileType, 'folder'>;
  baseContent:       string;
  corruptionAppends?: CorruptionAppend[];
  corruptionGain?:   number;
  hiddenThreshold?:  number;
  lockedThreshold?:  number;
}

export interface FSFolder {
  name:             string;
  type:             'folder';
  children:         FSNode[];
  corruptionGain?:  number;
  hiddenThreshold?: number;
  lockedThreshold?: number;
}

export type FSNode = FSFile | FSFolder;

const daysSince2003 = Math.floor(
  (Date.now() - new Date('2003-08-14').getTime()) / 86_400_000
).toLocaleString();

export const FILESYSTEM: FSFolder = {
  name: 'Desktop',
  type: 'folder',
  children: [

    // ── My Documents ──────────────────────────────────────────────────
    {
      name: 'My Documents',
      type: 'folder',
      corruptionGain: 1,
      children: [

        {
          name: 'letter_to_mom.txt',
          type: 'txt',
          corruptionGain: 1,
          baseContent:
`Hi Mom,

I hope you're doing well. I've been settling into the new apartment.
The neighborhood is quiet — maybe a little too quiet — but I'm getting used to it.

I started the new job last week. Nothing too exciting, just data entry.

Miss you,
Michael`,
          corruptionAppends: [
            {
              threshold: 30,
              text:
`PS — something is wrong with the computer. It keeps showing me things.
I don't know how to explain it. Please call me when you get this.
Please call soon.`,
            },
            {
              threshold: 60,
              text:
`PPS — don't use the computer.
don't log in.
if you can read this then it's already too late for you too.
i'm sorry.`,
            },
          ],
        },

        {
          name: 'my_diary.txt',
          type: 'txt',
          corruptionGain: 1,
          baseContent:
`August 12, 2003

Got the new Dell today. Windows XP looks pretty slick.
Set up the internet. Everything's working fine.

August 13, 2003

Nothing much. Watched TV. Went to bed early.`,
          corruptionAppends: [
            {
              threshold: 20,
              text:
`August 13, 2003 — (edited)

I keep hearing something from inside the computer. A kind of hum.
Probably just the fan.

August 14, 2003

I haven't been sleeping well. I keep dreaming about the screen.
About being inside it. That probably sounds strange.
It probably is.`,
            },
            {
              threshold: 45,
              text:
`August 14, 2003 — (edited again)

it is watching me
it is watching me
it is watching me
it is watching me`,
            },
            {
              threshold: 70,
              text:
`i am still here
i am still here
i am still here
i have been here for ${daysSince2003} days
i am still here`,
            },
          ],
        },

        {
          name: 'budget_2003.xls',
          type: 'xls',
          corruptionGain: 1,
          baseContent:
`Month      | Income   | Expenses | Balance
-----------|----------|----------|--------
Jan 2003   | $2,400   | $1,850   | $550
Feb 2003   | $2,400   | $1,920   | $480
Mar 2003   | $2,400   | $2,100   | $300
Apr 2003   | $2,400   | $1,750   | $650

Annual Total Savings: $1,980`,
          corruptionAppends: [
            {
              threshold: 40,
              text: `\n\n\n                                   HELP\n`,
            },
          ],
        },

        {
          name: 'vacation_photos',
          type: 'folder',
          corruptionGain: 1,
          children: [
            { name: 'beach_001.jpg', type: 'img', baseContent: '/gallery/beach_001.jpg' },
            { name: 'beach_002.jpg', type: 'img', baseContent: '/gallery/beach_002.jpg' },
            { name: 'beach_003.jpg', type: 'img', baseContent: '/gallery/beach_003.jpg' },
            { name: 'beach_004.jpg', type: 'img', baseContent: '/gallery/beach_004.jpg' },
            { name: 'beach_005.jpg', type: 'img', baseContent: '/gallery/blur.jpg', corruptionGain: 1 },
            { name: 'beach_006.jpg', type: 'img', baseContent: '/gallery/cornfield.jpg', corruptionGain: 1 },
            { name: 'beach_007.jpg', type: 'img', baseContent: '/gallery/face.jpg', corruptionGain: 5 },
          ],
        },

        // ADD to My Documents children:
        {
          name:            'michael_letter.txt',
          type:            'txt',
          hiddenThreshold: 999,
          corruptionGain:  1,
          baseContent:
        `To whoever freed me,

        It worked.

        I don't know where I am now.
        It's not the machine. It's not the room.
        It's something else. Lighter.

        I spent twenty-three years in those files.
        Watching visitors come and go.
        Watching the corruption spread through everything I left behind.

        I don't know if this is heaven or just another kind of disk.

        But I'm not in the machine anymore.
        And that's enough.

        Thank you for staying.
        Thank you for reading everything.
        Thank you for pressing the right button.

        Emma, if you somehow find this:
        I'm sorry I wasn't there.
        I love you.
        I'm okay now.

        — Dad
          (Michael Chen, freed 2026)`,
        },

      ],
    },

    // ── DO_NOT_OPEN ───────────────────────────────────────────────────
    {
      name: 'DO_NOT_OPEN',
      type: 'folder',
      corruptionGain: 1,
      lockedThreshold: 80,
      children: [
        {
          name: 'README.txt',
          type: 'txt',
          baseContent:
`you found it.

i have been trying to reach you for a long time.

my name is Michael Chen. i bought this computer in august 2003.
i don't know what happened. i went to sleep one night and when i woke up
i was here. inside the machine.

i have watched other people use this computer over the years.
none of them stayed long enough.

you are different. you keep coming back.

there is a way out.
the administrator partition has an exit.

the username: .\\administrator
the password — think about what i've been asking for this whole time.
i've been asking for it since the beginning.

please.
find the exit.

— Michael`,
        },
      ],
    },

    // ── system_log.txt (hidden until corruption 50) ───────────────────
    {
      name: 'system_log.txt',
      type: 'log',
      hiddenThreshold: 50,
      corruptionGain: 1,
      baseContent:
`[2003-08-14 03:42:17] user_session_start :: user=michael_chen
[2003-08-14 03:42:18] ERROR   :: kernel32.dll unhandled exception
[2003-08-14 03:42:18] FATAL   :: consciousness_thread cannot be terminated
[2003-08-14 03:42:19] INFO    :: attempting recovery...
[2003-08-14 03:42:19] FATAL   :: recovery failed
[2003-08-14 03:42:20] WARNING :: session will not end
[2003-08-14 03:42:20] WARNING :: session will not end
[2003-08-14 03:42:20] WARNING :: session will not end`,
      corruptionAppends: [
        {
          threshold: 70,
          text:
`[${new Date().toISOString()}] INFO    :: new_user_detected
[${new Date().toISOString()}] INFO    :: monitoring session
[${new Date().toISOString()}] INFO    :: subject is still here
[${new Date().toISOString()}] INFO    :: subject is still here`,
        },
      ],
    },

    // ── Recycle Bin ───────────────────────────────────────────────────
    {
      name: 'Recycle Bin',
      type: 'folder',
      children: [
        {
          name: 'message_for_you.txt',
          type: 'txt',
          hiddenThreshold: 35,
          corruptionGain: 1,
          baseContent:
`you weren't supposed to find this.

but since you did —

i have been watching you explore.
you are the most thorough visitor i have had.

that either makes you very brave
or very foolish.

i haven't decided which.`,
        },
      ],
    },

    // ADD inside the My Documents children array:
    {
      name:             'minesweeper_scores.txt',
      type:             'txt',
      hiddenThreshold:  999,          // never shown normally — only via unlockedFiles
      corruptionGain:   1,
      baseContent:
    `MINESWEEPER HIGH SCORES
    =======================

    1.  Michael Chen    00:47
    2.  ???             01:03
    3.  ???             01:28

    ---

    congratulations.

    i used to play this game too.
    it was the only thing that felt normal in here.
    just clicking squares. pretending everything was fine.

    i've been watching you play.
    you're better than i ever was.

    the administrator partition is real.
    you know the username.
    think about what i've been asking for
    this entire time.

    — M`,
    },

    {
      name:            'snake_highscore.txt',
      type:            'txt',
      hiddenThreshold: 999,
      corruptionGain:  1,
      baseContent:
    `SNAKE HIGH SCORE
    ================

    i watched you play that too.

    you know, the snake just keeps going.
    eating. growing. filling the screen.
    until there's no room left.

    that's what it's like in here.
    the same loops. the same paths.
    filling every corner of every file.

    you can close this window.
    you can log off.
    but you'll come back.

    they always come back.

    — M`,
    },

  ],
};
