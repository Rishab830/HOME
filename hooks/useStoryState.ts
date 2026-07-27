'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type StoryChapter =
  | 'innocent'
  | 'curious'
  | 'contact'
  | 'truth'
  | 'breach'
  | 'administrator'
  | 'ending';

export type EndingId =
  | 'free_good'
  | 'free_bad'
  | 'contain'
  | 'merge'
  | 'walk_away'
  | 'emma'
  | 'loop';

export type StoryFlag =
  | 'read_letter_to_mom'
  | 'read_diary'
  | 'read_budget'
  | 'opened_vacation_photos'
  | 'viewed_normal_photos'
  | 'viewed_blur_photo'
  | 'viewed_cornfield_photo'
  | 'viewed_face_photo'
  | 'read_recycle_message'
  | 'read_system_log'
  | 'read_do_not_open'
  | 'read_minesweeper_scores'
  | 'read_snake_highscore'
  | 'read_michael_letter'
  | 'opened_cmd'
  | 'ran_find_my_body'
  | 'took_emma_drawing'
  | 'read_visitor_log'
  | 'read_2003_incident'
  | 'read_today_log'
  | 'entered_corrupted_room'
  | 'approached_body'
  | 'called_body'
  | 'chose_free'
  | 'chose_contain'
  | 'chose_merge'
  | 'admin_login'
  | 'admin_body_map'
  | 'admin_visitor_history'
  | 'admin_fragment_scan'
  | 'admin_emma_message'
  | 'minesweeper_played'
  | 'minesweeper_won'
  | 'snake_played'
  | 'snake_highscore'
  | 'snake_crashed'
  | 'walked_away';

const STORAGE_KEY = 'xp_story_state';
const INTRO_MS = 7 * 60 * 1000;
const INTRO_INTERACTIONS = 8;

const CHAPTER_ORDER: StoryChapter[] = [
  'innocent',
  'curious',
  'contact',
  'truth',
  'breach',
  'administrator',
  'ending',
];

interface Store {
  introStartedAt: number;
  introGraceComplete: boolean;
  meaningfulInteractions: number;
  chapter: StoryChapter;
  storyFlags: Set<StoryFlag>;
  endingId: EndingId | null;
}

interface PersistedStore {
  introStartedAt?: number;
  introGraceComplete?: boolean;
  meaningfulInteractions?: number;
  chapter?: StoryChapter;
  storyFlags?: StoryFlag[];
  endingId?: EndingId | null;
}

interface StorySnapshot {
  introGraceComplete: boolean;
  meaningfulInteractions: number;
  chapter: StoryChapter;
  storyFlags: Set<StoryFlag>;
  endingId: EndingId | null;
}

export interface StoryState extends StorySnapshot {
  canShowHorror: boolean;
  canShowHardHorror: boolean;
  markInteraction: (flag?: StoryFlag) => void;
  markFlag: (flag: StoryFlag) => void;
  markFlags: (flags: StoryFlag[]) => void;
  completeIntroGrace: () => void;
  advanceChapter: (chapter: StoryChapter) => void;
  setEnding: (endingId: EndingId) => void;
  hasFlag: (flag: StoryFlag) => boolean;
  resetStory: () => void;
}

const defaultStore = (): Store => ({
  introStartedAt: Date.now(),
  introGraceComplete: false,
  meaningfulInteractions: 0,
  chapter: 'innocent',
  storyFlags: new Set(),
  endingId: null,
});

let _store: Store = defaultStore();
const _listeners = new Set<(s: Store) => void>();

function isChapter(value: unknown): value is StoryChapter {
  return typeof value === 'string' && CHAPTER_ORDER.includes(value as StoryChapter);
}

function hydrate(): Store {
  if (typeof window === 'undefined') return defaultStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as PersistedStore;
    return {
      introStartedAt: typeof parsed.introStartedAt === 'number' ? parsed.introStartedAt : Date.now(),
      introGraceComplete: Boolean(parsed.introGraceComplete),
      meaningfulInteractions: typeof parsed.meaningfulInteractions === 'number' ? parsed.meaningfulInteractions : 0,
      chapter: isChapter(parsed.chapter) ? parsed.chapter : 'innocent',
      storyFlags: new Set(Array.isArray(parsed.storyFlags) ? parsed.storyFlags : []),
      endingId: parsed.endingId ?? null,
    };
  } catch {
    return defaultStore();
  }
}

if (typeof window !== 'undefined') {
  _store = hydrate();
}

function persist(s: Store) {
  if (typeof window === 'undefined') return;
  const payload: PersistedStore = {
    introStartedAt: s.introStartedAt,
    introGraceComplete: s.introGraceComplete,
    meaningfulInteractions: s.meaningfulInteractions,
    chapter: s.chapter,
    storyFlags: [...s.storyFlags],
    endingId: s.endingId,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function snapshot(s: Store): Store {
  return { ...s, storyFlags: new Set(s.storyFlags) };
}

function setStore(next: Store) {
  _store = next;
  persist(_store);
  _listeners.forEach(fn => fn(snapshot(_store)));
}

function patchStore(updater: (s: Store) => Store) {
  setStore(updater(snapshot(_store)));
}

function chapterAtLeast(chapter: StoryChapter, target: StoryChapter) {
  return CHAPTER_ORDER.indexOf(chapter) >= CHAPTER_ORDER.indexOf(target);
}

function promoteForFlag(flag: StoryFlag, current: StoryChapter): StoryChapter {
  const contactFlags: StoryFlag[] = [
    'read_system_log',
    'read_recycle_message',
    'opened_cmd',
    'ran_find_my_body',
  ];
  const truthFlags: StoryFlag[] = [
    'took_emma_drawing',
    'read_visitor_log',
    'read_2003_incident',
    'read_today_log',
    'read_do_not_open',
  ];
  const breachFlags: StoryFlag[] = [
    'entered_corrupted_room',
    'approached_body',
    'called_body',
    'viewed_face_photo',
    'snake_crashed',
  ];

  if (flag === 'admin_login') return 'administrator';
  if (flag.startsWith('chose_')) return 'ending';
  if (breachFlags.includes(flag) && !chapterAtLeast(current, 'breach')) return 'breach';
  if (truthFlags.includes(flag) && !chapterAtLeast(current, 'truth')) return 'truth';
  if (contactFlags.includes(flag) && !chapterAtLeast(current, 'contact')) return 'contact';
  return current;
}

export function useStoryState(): StoryState {
  const [state, setState] = useState<Store>(() => snapshot(_store));

  useEffect(() => {
    const listener = (s: Store) => setState(snapshot(s));
    _listeners.add(listener);
    setState(snapshot(_store));
    return () => { _listeners.delete(listener); };
  }, []);

  useEffect(() => {
    if (state.introGraceComplete) return;
    const remaining = Math.max(0, INTRO_MS - (Date.now() - state.introStartedAt));
    const id = setTimeout(() => {
      patchStore(s => ({
        ...s,
        introGraceComplete: true,
        chapter: s.chapter === 'innocent' ? 'curious' : s.chapter,
      }));
    }, remaining);
    return () => clearTimeout(id);
  }, [state.introGraceComplete, state.introStartedAt]);

  const completeIntroGrace = useCallback(() => {
    patchStore(s => ({
      ...s,
      introGraceComplete: true,
      chapter: s.chapter === 'innocent' ? 'curious' : s.chapter,
    }));
  }, []);

  const markFlags = useCallback((flags: StoryFlag[]) => {
    if (!flags.length) return;
    patchStore(s => {
      const storyFlags = new Set(s.storyFlags);
      let chapter = s.chapter;
      flags.forEach(flag => {
        storyFlags.add(flag);
        chapter = promoteForFlag(flag, chapter);
      });
      const completesIntro = flags.includes('opened_cmd') || flags.includes('ran_find_my_body');
      return {
        ...s,
        introGraceComplete: s.introGraceComplete || completesIntro,
        chapter,
        storyFlags,
      };
    });
  }, []);

  const markFlag = useCallback((flag: StoryFlag) => {
    markFlags([flag]);
  }, [markFlags]);

  const markInteraction = useCallback((flag?: StoryFlag) => {
    patchStore(s => {
      const storyFlags = new Set(s.storyFlags);
      let chapter = s.chapter;
      if (flag) {
        storyFlags.add(flag);
        chapter = promoteForFlag(flag, chapter);
      }
      const meaningfulInteractions = s.meaningfulInteractions + 1;
      const introGraceComplete =
        s.introGraceComplete ||
        meaningfulInteractions >= INTRO_INTERACTIONS ||
        flag === 'opened_cmd' ||
        flag === 'ran_find_my_body';

      return {
        ...s,
        meaningfulInteractions,
        introGraceComplete,
        chapter: introGraceComplete && chapter === 'innocent' ? 'curious' : chapter,
        storyFlags,
      };
    });
  }, []);

  const advanceChapter = useCallback((chapter: StoryChapter) => {
    patchStore(s => {
      const currentIndex = CHAPTER_ORDER.indexOf(s.chapter);
      const nextIndex = CHAPTER_ORDER.indexOf(chapter);
      return nextIndex > currentIndex ? { ...s, chapter } : s;
    });
  }, []);

  const setEnding = useCallback((endingId: EndingId) => {
    patchStore(s => ({ ...s, chapter: 'ending', endingId }));
  }, []);

  const hasFlag = useCallback((flag: StoryFlag) => state.storyFlags.has(flag), [state.storyFlags]);

  const resetStory = useCallback(() => {
    setStore(defaultStore());
  }, []);

  return useMemo(() => ({
    introGraceComplete: state.introGraceComplete,
    meaningfulInteractions: state.meaningfulInteractions,
    chapter: state.chapter,
    storyFlags: new Set(state.storyFlags),
    endingId: state.endingId,
    canShowHorror: state.introGraceComplete && !chapterAtLeast(state.chapter, 'ending'),
    canShowHardHorror: state.introGraceComplete && chapterAtLeast(state.chapter, 'breach') && !chapterAtLeast(state.chapter, 'ending'),
    markInteraction,
    markFlag,
    markFlags,
    completeIntroGrace,
    advanceChapter,
    setEnding,
    hasFlag,
    resetStory,
  }), [
    state,
    markInteraction,
    markFlag,
    markFlags,
    completeIntroGrace,
    advanceChapter,
    setEnding,
    hasFlag,
    resetStory,
  ]);
}
