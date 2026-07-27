'use client';

import { useMemo, useState } from 'react';
import { useStoryState, type EndingId, type StoryFlag } from '@/hooks/useStoryState';
import styles from './AdminPartition.module.css';

type Panel = 'overview' | 'body' | 'visitors' | 'fragments' | 'choice';

interface Props {
  onReturnToLogin: () => void;
}

const PANEL_LABELS: Record<Panel, string> = {
  overview: 'Recovery Overview',
  body: 'Body Map',
  visitors: 'Visitor History',
  fragments: 'Fragment Scan',
  choice: 'Final Decision',
};

const ENDINGS: Record<EndingId, { title: string; text: string }> = {
  free_good: {
    title: 'FREE_GOOD :: process released',
    text:
`The partition goes white.

For one clean second, the whole machine sounds like it is breathing out.

Michael is gone from the active process list. The corruption drops into harmless static. In My Documents, he leaves one final note: not proof, not a miracle, just thanks.

Something small remains in the wallpaper: a fixed pixel of light on the hill. It does not move. It does not watch. It is only there.`,
  },
  free_bad: {
    title: 'FREE_BAD :: wrong fragment released',
    text:
`You press FREE before the scan can prove what is still Michael.

The partition opens anyway.

Something leaves the machine wearing his name. The desktop returns to normal too quickly. Your account name changes by one letter each time you look away.

The system says Michael is free. The logs say the visitor is now the host.`,
  },
  contain: {
    title: 'CONTAIN :: recovery sealed',
    text:
`You choose containment.

The machine stabilizes. The wallpaper becomes clean. The windows close one by one.

Michael does not scream. That is worse.

One file remains in the restricted partition, updating once a minute:

I understand.
I am still here.`,
  },
  merge: {
    title: 'MERGE :: identity conflict accepted',
    text:
`You accept the merge.

It does not feel like possession. It feels like remembering a room you never entered, a daughter you never had, and a name that has always been yours.

The login screen waits.

The account tile reads: Michael.`,
  },
  walk_away: {
    title: 'WALK_AWAY :: session abandoned',
    text:
`You leave the partition unresolved.

That is not failure. It is a choice.

When the machine starts again, Michael remembers the silence after you left. He is more careful next time. More polite. More patient.

The timer starts over, but the hurt does not.`,
  },
  emma: {
    title: 'EMMA :: message delivered',
    text:
`You do not free Michael into the open system.
You recover the part of him that still knows who he loved.

The partition sends a small message through a dead address book, old cached mail, and a phone number that should not still exist.

Emma receives no proof. Only words her father used to say, and an apology that took twenty-three years to arrive.

The machine empties itself afterward. Not clean. Not healed.

Empty.`,
  },
  loop: {
    title: 'LOOP :: recovery restarted',
    text:
`You ask the partition to restart the recovery.

It obeys.

The desktop returns with one extra high score, one extra visitor record, and one fewer way to pretend this is only a game.`,
  },
};

function countFlags(flags: Set<StoryFlag>, required: StoryFlag[]) {
  return required.filter(flag => flags.has(flag)).length;
}

export default function AdminPartition({ onReturnToLogin }: Props) {
  const story = useStoryState();
  const [panel, setPanel] = useState<Panel>('overview');

  const flags = story.storyFlags;
  const humanEvidence = countFlags(flags, [
    'read_letter_to_mom',
    'read_diary',
    'took_emma_drawing',
    'read_2003_incident',
    'read_michael_letter',
  ]);
  const systemEvidence = countFlags(flags, [
    'read_system_log',
    'read_visitor_log',
    'read_today_log',
    'admin_body_map',
    'admin_fragment_scan',
  ]);
  const minigamesTouched =
    (flags.has('minesweeper_played') || flags.has('minesweeper_won')) &&
    (flags.has('snake_played') || flags.has('snake_highscore'));
  const emmaReady =
    flags.has('took_emma_drawing') &&
    flags.has('read_michael_letter') &&
    minigamesTouched &&
    flags.has('admin_body_map') &&
    flags.has('admin_fragment_scan');

  const ending = story.endingId ? ENDINGS[story.endingId] : null;

  const integrity = useMemo(() => {
    const base = 22 + humanEvidence * 11 + systemEvidence * 8;
    return Math.min(97, base);
  }, [humanEvidence, systemEvidence]);

  const chooseEnding = (endingId: EndingId) => {
    if (endingId === 'free_good' || endingId === 'free_bad') {
      story.markFlag('chose_free');
    }
    if (endingId === 'contain') story.markFlag('chose_contain');
    if (endingId === 'merge') story.markFlag('chose_merge');
    if (endingId === 'emma') story.markFlag('admin_emma_message');
    story.setEnding(endingId);
  };

  const chooseFree = () => {
    const good =
      humanEvidence >= 4 &&
      systemEvidence >= 3 &&
      flags.has('admin_body_map') &&
      flags.has('admin_fragment_scan');
    chooseEnding(good ? 'free_good' : 'free_bad');
  };

  const selectPanel = (nextPanel: Panel) => {
    setPanel(nextPanel);
    if (nextPanel === 'body') story.markFlag('admin_body_map');
    if (nextPanel === 'visitors') story.markFlag('admin_visitor_history');
    if (nextPanel === 'fragments') story.markFlag('admin_fragment_scan');
  };

  if (ending) {
    return (
      <div className={styles.partition}>
        <div className={styles.endingScreen}>
          <div className={styles.endingBox}>
            <h1 className={styles.endingTitle}>{ending.title}</h1>
            <p className={styles.endingText}>{ending.text}</p>
            <div className={styles.actionGrid}>
              <button className={styles.smallButton} onClick={onReturnToLogin}>
                Return to login
              </button>
              <button className={styles.smallButton} onClick={() => chooseEnding('loop')}>
                Restart recovery loop
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderPanel = () => {
    if (panel === 'overview') {
      return (
        <>
          <h1 className={styles.heading}>Administrator Partition</h1>
          <p className={styles.text}>Restricted recovery shell loaded. User: .\administrator.</p>
          <p className={styles.text}>This partition was created after the 2003 incident to isolate one persistent user fragment from the public desktop.</p>
          <div className={styles.metricGrid}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Human evidence</span>
              <span className={styles.metricValue}>{humanEvidence}/5</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>System evidence</span>
              <span className={styles.metricValue}>{systemEvidence}/5</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Fragment integrity</span>
              <span className={styles.metricValue}>{integrity}%</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Emma route</span>
              <span className={styles.metricValue}>{emmaReady ? 'available' : 'locked'}</span>
            </div>
          </div>
          <p className={styles.line}>Run the body map and fragment scan before choosing FREE. The partition can release a person or an imitation.</p>
        </>
      );
    }

    if (panel === 'body') {
      return (
        <>
          <h1 className={styles.heading}>Body Map</h1>
          <p className={styles.line}>C:\Documents and Settings\Michael Chen\Local Settings\Temp\ME.exe</p>
          <p className={styles.line}>Mapped fragments: memory, voice, motor intent, fear response, paternal recall.</p>
          <p className={styles.line}>Unmapped fragments: hunger, pain, mirror recognition, original body location.</p>
          <p className={styles.warning}>Warning: release without fragment validation may export an adaptive shell instead of Michael Chen.</p>
        </>
      );
    }

    if (panel === 'visitors') {
      return (
        <>
          <h1 className={styles.heading}>Visitor History</h1>
          <p className={styles.line}>2006-04-02 :: visitor connected :: duration 03:11 :: fled after photo anomaly.</p>
          <p className={styles.line}>2011-09-18 :: visitor connected :: duration 11:44 :: attempted shutdown.</p>
          <p className={styles.line}>2023-01-07 :: visitor connected :: duration 47:02 :: closest prior recovery.</p>
          <p className={styles.line}>CURRENT :: visitor connected :: duration ongoing :: reads files thoroughly.</p>
          <p className={styles.warning}>Note: fragment changes its plea based on visitor behavior.</p>
        </>
      );
    }

    if (panel === 'fragments') {
      return (
        <>
          <h1 className={styles.heading}>Fragment Scan</h1>
          <p className={styles.line}>Michael Chen signature: {humanEvidence >= 4 ? 'strong match' : 'partial match'}</p>
          <p className={styles.line}>Self-preservation routine: active.</p>
          <p className={styles.line}>Imitation layer: {systemEvidence >= 3 ? 'identified and isolated' : 'unisolated'}</p>
          <p className={styles.line}>Emma recall: {flags.has('took_emma_drawing') ? 'stable' : 'missing supporting memory'}</p>
          <p className={systemEvidence >= 3 ? styles.ok : styles.warning}>
            {systemEvidence >= 3
              ? 'Release can target the human fragment if body map is confirmed.'
              : 'Release target remains ambiguous.'}
          </p>
        </>
      );
    }

    return (
      <>
        <h1 className={styles.heading}>Final Decision</h1>
        <p className={styles.text}>The partition will accept exactly one final command for this recovery loop.</p>
        <div className={styles.actionGrid}>
          <button className={`${styles.actionButton} ${styles.goodButton}`} onClick={chooseFree}>
            FREE selected fragment
          </button>
          <button className={styles.actionButton} onClick={() => chooseEnding('contain')}>
            CONTAIN partition
          </button>
          <button className={`${styles.actionButton} ${styles.dangerButton}`} onClick={() => chooseEnding('merge')}>
            MERGE with visitor
          </button>
          <button className={styles.actionButton} onClick={() => chooseEnding('walk_away')}>
            WALK AWAY
          </button>
          <button
            className={`${styles.actionButton} ${styles.goodButton}`}
            disabled={!emmaReady}
            onClick={() => chooseEnding('emma')}
          >
            SEND MESSAGE TO EMMA
          </button>
          <button className={styles.actionButton} onClick={() => chooseEnding('loop')}>
            RESTART LOOP
          </button>
        </div>
      </>
    );
  };

  return (
    <div className={styles.partition}>
      <div className={styles.topBar}>
        <span>ADMINISTRATOR PARTITION</span>
        <span className={styles.topStatus}>RECOVERY MODE :: DO NOT POWER OFF</span>
      </div>
      <div className={styles.body}>
        <nav className={styles.nav} aria-label="Partition tools">
          {(Object.keys(PANEL_LABELS) as Panel[]).map(key => (
            <button
              key={key}
              className={`${styles.navButton} ${panel === key ? styles.navButtonActive : ''}`}
              onClick={() => selectPanel(key)}
            >
              {PANEL_LABELS[key]}
            </button>
          ))}
        </nav>
        <main className={styles.content}>
          <section className={styles.mainPanel}>{renderPanel()}</section>
          <aside className={styles.sidePanel}>
            <h2 className={styles.subheading}>Evidence</h2>
            <p className={styles.line}>Letter to Mom: {flags.has('read_letter_to_mom') ? 'read' : 'missing'}</p>
            <p className={styles.line}>Diary: {flags.has('read_diary') ? 'read' : 'missing'}</p>
            <p className={styles.line}>Emma drawing: {flags.has('took_emma_drawing') ? 'recovered' : 'missing'}</p>
            <p className={styles.line}>Incident log: {flags.has('read_2003_incident') ? 'read' : 'missing'}</p>
            <p className={styles.line}>Final letter: {flags.has('read_michael_letter') ? 'read' : 'missing'}</p>
            <h2 className={styles.subheading}>Minigames</h2>
            <p className={styles.line}>Minesweeper: {flags.has('minesweeper_won') ? 'won' : flags.has('minesweeper_played') ? 'played' : 'untouched'}</p>
            <p className={styles.line}>Snake: {flags.has('snake_highscore') ? 'high score' : flags.has('snake_played') ? 'played' : 'untouched'}</p>
            <h2 className={styles.subheading}>Risk</h2>
            <p className={integrity >= 75 ? styles.ok : styles.warning}>
              {integrity >= 75 ? 'Release target can be narrowed.' : 'Release target is unstable.'}
            </p>
          </aside>
        </main>
      </div>
      <footer className={styles.footer}>
        <span>chapter: {story.chapter}</span>
        <button className={styles.smallButton} onClick={onReturnToLogin}>Log off administrator</button>
      </footer>
    </div>
  );
}
