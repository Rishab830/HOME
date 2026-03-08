export type FileType = 'txt' | 'xls' | 'folder' | 'img' | 'log';

export interface FSFile {
  name:                  string;
  type:                  Exclude<FileType, 'folder'>;
  getContent:            (corruption: number) => string;
  corruptionGain?:       number;   // added to corruption on open
  hiddenThreshold?:      number;   // invisible below this corruption
  lockedThreshold?:      number;   // shows locked dialog below this
}

export interface FSFolder {
  name:              string;
  type:              'folder';
  children:          FSNode[];
  corruptionGain?:   number;
  hiddenThreshold?:  number;
  lockedThreshold?:  number;
}

export type FSNode = FSFile | FSFolder;

export const FILESYSTEM: FSFolder = {
  name: 'Desktop',
  type: 'folder',
  children: [

    // ── My Documents ────────────────────────────────────────────────────
    {
      name: 'My Documents',
      type: 'folder',
      corruptionGain: 2,
      children: [
        {
          name: 'letter_to_mom.txt',
          type: 'txt',
          corruptionGain: 3,
          getContent: (c) => {
            const base =
`Hi Mom,

I hope you're doing well. I've been settling into the new apartment.
The neighborhood is quiet — maybe a little too quiet — but I'm getting used to it.

I started the new job last week. Nothing too exciting, just data entry.

Miss you,
Michael`;

            if (c < 30) return base;

            const p2 =
`



PS — something is wrong with the computer. It keeps showing me things.
I don't know how to explain it. Please call me when you get this.
Please call soon.`;

            if (c < 60) return base + p2;

            return base + p2 +
`


PPS — don't use the computer.
don't log in.
if you can read this then it's already too late for you too.
i'm sorry.`;
          },
        },

        {
          name: 'my_diary.txt',
          type: 'txt',
          corruptionGain: 5,
          getContent: (c) => {
            if (c < 20) return (
`August 12, 2003

Got the new Dell today. Windows XP looks pretty slick.
Set up the internet. Everything's working fine.

August 13, 2003

Nothing much. Watched TV. Went to bed early.`
            );

            if (c < 45) return (
`August 12, 2003

Got the new Dell today. Windows XP looks pretty slick.
Set up the internet. Everything's working fine.

August 13, 2003

I keep hearing something from inside the computer. A kind of hum.
Probably just the fan.

August 14, 2003

I haven't been sleeping well. I keep dreaming about the screen.
About being inside it. That probably sounds strange.
It probably is.`
            );

            if (c < 70) return (
`August 12, 2003

Got the new Dell today. Everything's fine.

August 13, 2003

it is watching me

August 14, 2003

it is watching me

August 14, 2003

it is watching me

August 14, 2003

it is watching me

August 14, 2003

it is watching me`
            );

            const days = Math.floor(
              (Date.now() - new Date('2003-08-14').getTime()) / 86_400_000
            );
            return (
`August 14, 2003

i am still here
i am still here
i am still here
i have been here for ${days.toLocaleString()} days
i am still here`
            );
          },
        },

        {
          name: 'budget_2003.xls',
          type: 'xls',
          corruptionGain: 2,
          getContent: (c) => {
            const normal =
`Month      | Income   | Expenses | Balance
-----------|----------|----------|--------
Jan 2003   | $2,400   | $1,850   | $550
Feb 2003   | $2,400   | $1,920   | $480
Mar 2003   | $2,400   | $2,100   | $300
Apr 2003   | $2,400   | $1,750   | $650

Annual Total Savings: $1,980`;

            if (c < 40) return normal;

            return normal + `\n\n\n\n\n                                   HELP\n\n\n`;
          },
        },

        {
          name: 'vacation_photos',
          type: 'folder',
          corruptionGain: 2,
          children: [
            { name: 'beach_001.jpg', type: 'img', getContent: () => 'beach'  },
            { name: 'beach_002.jpg', type: 'img', getContent: () => 'beach2' },
            {
              // This one is deliberately wrong — slightly too dark, wrong aspect ratio
              name: 'IMG_0047.jpg',
              type: 'img',
              corruptionGain: 8,
              getContent: (c) => c > 50 ? 'corrupted' : 'beach3',
            },
          ],
        },
      ],
    },

    // ── DO_NOT_OPEN ─────────────────────────────────────────────────────
    {
      name: 'DO_NOT_OPEN',
      type: 'folder',
      corruptionGain: 10,
      lockedThreshold: 80,
      children: [
        {
          name: 'README.txt',
          type: 'txt',
          getContent: (c) => {
            if (c < 80) return '';
            return (
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

— Michael`
            );
          },
        },
      ],
    },

    // ── Hidden system log (appears at corruption 50+) ────────────────────
    {
      name: 'system_log.txt',
      type: 'log',
      hiddenThreshold: 50,
      corruptionGain: 4,
      getContent: (c) => {
        const base =
`[2003-08-14 03:42:17] user_session_start :: user=michael_chen
[2003-08-14 03:42:18] ERROR   :: kernel32.dll unhandled exception
[2003-08-14 03:42:18] FATAL   :: consciousness_thread cannot be terminated
[2003-08-14 03:42:19] INFO    :: attempting recovery...
[2003-08-14 03:42:19] FATAL   :: recovery failed
[2003-08-14 03:42:20] WARNING :: session will not end
[2003-08-14 03:42:20] WARNING :: session will not end
[2003-08-14 03:42:20] WARNING :: session will not end`;

        if (c < 70) return base;

        const now = new Date().toISOString();
        return base +
`

[${now}] INFO    :: new_user_detected
[${now}] INFO    :: monitoring session
[${now}] INFO    :: subject_corruption_level=${c}
[${now}] INFO    :: subject is still here
[${now}] INFO    :: subject is still here`;
      },
    },

    // ── Recycle Bin ─────────────────────────────────────────────────────
    {
      name: 'Recycle Bin',
      type: 'folder',
      children: [
        {
          name: 'message_for_you.txt',
          type: 'txt',
          hiddenThreshold: 35,
          corruptionGain: 6,
          getContent: () =>
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
  ],
};
