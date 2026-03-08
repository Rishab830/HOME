//components/LoginScreen/index.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './LoginScreen.module.css';
import { useCorruption } from '@/hooks/useCorruption';

// ─── Secret credentials ──────────────────────────────────────────────────────
// The player discovers these by reading corrupted files deep in the OS.
// Username is intentionally XP-flavored. Password is the entity's plea.
export const SECRET_USER = '.\\administrator';
export const SECRET_PASS = 'letmefree';

// ─── Corruption message ladder ───────────────────────────────────────────────
interface LoginMessage {
  minCorruption: number;   // 👈 renamed, now on a 0–100 scale
  greeting: string;
  subtext?: string;
  glitched?: boolean;
  aggressive?: boolean;
}

const MESSAGES: LoginMessage[] = [
  { minCorruption: 0,  greeting: 'Welcome.',                                                           },
  { minCorruption: 5,  greeting: 'Welcome back.',                                                      },
  { minCorruption: 15, greeting: 'You are back again.',                subtext: ''                     },
  { minCorruption: 25, greeting: 'Back so soon?',                      subtext: 'There is nothing new here.'                        },
  { minCorruption: 38, greeting: 'Why do you keep returning?',         subtext: 'You should leave while you still can.'              },
  { minCorruption: 52, greeting: "I was hoping you wouldn't come back.", subtext: 'But here you are.',          glitched: true       },
  { minCorruption: 65, greeting: 'PLEASE. STOP. COMING BACK.',         subtext: "you don't understand what you're doing.",
                                                                                                        glitched: true, aggressive: true },
  { minCorruption: 78, greeting: "you're just like me now.",            subtext: "trapped. and you don't even know it.",
                                                                                                        glitched: true, aggressive: true },
  { minCorruption: 88, greeting: "i've been waiting.",                  subtext: '...',                 glitched: true, aggressive: true },
  { minCorruption: 96, greeting: "there is no leaving anymore.",        subtext: 'you know that, right?',
                                                                                                        glitched: true, aggressive: true },
];

function resolveMessage(corruption: number): LoginMessage {
  let result = MESSAGES[0];
  for (const msg of MESSAGES) {
    if (corruption >= msg.minCorruption) result = msg;
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  onLogin:       (isSecret: boolean) => void;
  onTurnOff?:    () => void;
}

type UserTile = 'normal' | 'other' | null;

export default function LoginScreen({ onLogin, onTurnOff }: Props) {
  const { loginCount, corruptionLevel, recordLogin, username: savedUsername, setUsername: saveUsername } = useCorruption();

  const [selectedTile, setSelectedTile]           = useState<UserTile>(null);
  const [password, setPassword]                   = useState('');
  const [username, setUsername]                   = useState('');
  const [error, setError]                         = useState('');
  const [isTransitioning, setIsTransitioning]     = useState(false);
  const [secretMode, setSecretMode]               = useState(false);
  const [clockTime, setClockTime]                 = useState('');
  const [shakePassword, setShakePassword]         = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [crtDone, setCrtDone]               = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleNameSubmit = useCallback(() => {
    const trimmed = nameInput.trim();
    const final   = trimmed === '' ? 'User' : trimmed;
    saveUsername(final);
    setShowNamePrompt(false);
  }, [nameInput, saveUsername]);

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSubmit();
  };

  // Tick the clock
  useEffect(() => {
    const tick = () =>
      setClockTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-focus when a tile is selected
  useEffect(() => {
    if (selectedTile) setTimeout(() => passwordRef.current?.focus(), 80);
  }, [selectedTile]);

  const msg           = resolveMessage(corruptionLevel);   // 👈 drives messages
  const isCorrupted   = corruptionLevel >= 52;             // scanlines + ghost avatar turns red
  const isAggressive  = corruptionLevel >= 65;             // red tint, caps messages
  const isMaxCorrupt  = corruptionLevel >= 78;             // "Other" tile becomes ███████

  useEffect(() => {
    const stored = localStorage.getItem('xp_username');
    if (!stored) setShowNamePrompt(true);
  }, []);

  // ── Tile selection ──────────────────────────────────────────────────────────
  const selectTile = (tile: UserTile) => {
    setSelectedTile(tile);
    setPassword('');
    setUsername('');
    setError('');
  };

  // ── Login logic ─────────────────────────────────────────────────────────────
  const handleLogin = useCallback(() => {
    // 1. Secret credentials → Part 2 unlock
    if (username.trim() === SECRET_USER && password === SECRET_PASS) {
      setIsTransitioning(true);
      setSecretMode(true);
      setTimeout(() => onLogin(true), 3000);
      return;
    }

    // 2. Normal user tile — password is empty or "password" (XP default)
    if (selectedTile === 'normal') {
      if (password === '' || password.toLowerCase() === 'password') {
        recordLogin();
        setIsTransitioning(true);
        setSecretMode(false);
        setTimeout(() => onLogin(false), 1800);
        return;
      }
    }

    // 3. Wrong credentials
    setError(
      isAggressive
        ? 'INCORRECT. you should know better by now.'
        : 'The password is incorrect. Please try again.'
    );
    setPassword('');
    setShakePassword(true);
    setTimeout(() => setShakePassword(false), 500);
    passwordRef.current?.focus();
  }, [username, password, selectedTile, isAggressive, recordLogin, onLogin]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  const handleTurnOff = useCallback(() => {
    setIsShuttingDown(true);
    // After CRT collapse animation finishes, attempt window.close()
    // then fall back to the "safe to close" screen
    setTimeout(() => {
      setCrtDone(true);
      window.close();     // works only if tab was JS-opened; silently fails otherwise
    }, 1800);             // matches .crtShutdown animation duration
  }, []);


  // ── The "Other" tile label warps at high corruption ──────────────────────────
  const otherTileLabel = isMaxCorrupt
    ? '███████'                  // fully redacted
    : isCorrupted
    ? '█ther...'                 // partially corrupted
    : 'Other...';

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {!showNamePrompt && (
        <div
          className={[
            styles.screen,
            isCorrupted  ? styles.corrupted   : '',
            isAggressive ? styles.aggressive  : '',
            isMaxCorrupt ? styles.maxCorrupt  : '',
            isShuttingDown ? 'crt-shutdown'  : '',
          ].join(' ')}
          aria-label="Windows XP Login Screen"
        >
          <div className={styles.scanlines} />

          {/* ── Thin top stripe ─────────────────────────────────────────── */}
          <div className={styles.topStripe} />

          {/* ── Main split layout ───────────────────────────────────────── */}
          <main className={styles.main}>

            {/* LEFT — welcome panel */}
            <section className={styles.leftPanel}>
              <div className={styles.welcomeContent}>
                <XPFlag />
                <h1
                  className={[
                    styles.welcomeText,
                    msg.glitched    ? styles.glitchedText   : '',
                    msg.aggressive  ? styles.aggressiveText : '',
                  ].join(' ')}
                  data-text={loginCount === 0 ? 'welcome' : msg.greeting}
                  aria-live="polite"
                >
                  {loginCount === 0 ? 'welcome' : msg.greeting}
                </h1>
                <p className={[
                  styles.welcomeSub,
                  msg.aggressive ? styles.aggressiveSubtext : '',
                ].join(' ')}>
                  {loginCount === 0
                    ? 'Click on your user name to begin'
                    : (msg.subtext ?? 'Click on your user name to begin')}
                </p>
              </div>
            </section>

            {/* Vertical divider */}
            <div className={styles.divider} role="separator" />

            {/* RIGHT — user list panel */}
            <section className={styles.rightPanel} aria-label="User list">
              <div className={styles.userScroll} ref={scrollRef}>

                {/* Normal user tile */}
                <div
                  className={[styles.tile, selectedTile === 'normal' ? styles.activeTile : ''].join(' ')}
                  onClick={() => selectTile('normal')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && selectTile('normal')}
                >
                  <DefaultAvatar corrupted={isMaxCorrupt} />
                  <div className={styles.tileContent}>
                    <span className={styles.tileName}>{savedUsername || 'User'}</span>
                    {selectedTile === 'normal' && (
                      <PasswordRow
                        ref={passwordRef}
                        value={password}
                        onChange={v => { setPassword(v); setError(''); }}
                        onSubmit={handleLogin}
                        onKeyDown={onKeyDown}
                        shake={shakePassword}
                        error={error}
                        placeholder="Type your password"
                        type="password"
                      />
                    )}
                  </div>
                </div>

                {/* Other / secret tile */}
                <div
                  className={[
                    styles.tile,
                    styles.dimmedTile,
                    selectedTile === 'other' ? styles.activeTile : '',
                  ].join(' ')}
                  onClick={() => selectTile('other')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && selectTile('other')}
                >
                  <GhostAvatar corrupted={isCorrupted} />
                  <div className={styles.tileContent}>
                    <span className={[
                      styles.tileName,
                      styles.otherName,
                      isCorrupted ? styles.glitchedText : '',
                    ].join(' ')} data-text={otherTileLabel}>
                      {otherTileLabel}
                    </span>
                    {selectedTile === 'other' && (
                      <div className={styles.twoFieldGroup}>
                        <input
                          className={styles.textInput}
                          type="text"
                          placeholder="Username"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          onKeyDown={onKeyDown}
                          aria-label="Username"
                          spellCheck={false}
                          autoComplete="off"
                        />
                        <PasswordRow
                          ref={passwordRef}
                          value={password}
                          onChange={v => { setPassword(v); setError(''); }}
                          onSubmit={handleLogin}
                          onKeyDown={onKeyDown}
                          shake={shakePassword}
                          error={error}
                          placeholder="Password"
                          type="password"
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </section>
          </main>

          {/* ── Bottom bar ──────────────────────────────────────────────── */}
          <footer className={styles.bottomBar}>
            <div className={styles.bottomLeft}>
              <button className={styles.turnOffBtn} onClick={handleTurnOff}>
                <span className={styles.powerCircle} aria-hidden>⏻</span>
                <span className={styles.turnOffText}>Turn off computer</span>
              </button>
            </div>
            <div className={styles.bottomRight}>
              <span className={styles.bottomHint}>
                After you log on, you can add or change accounts.{' '}
                <span className={styles.bottomHintLink}>For assistance, click here.</span>
              </span>
              <span className={styles.clock} aria-label="Current time">{clockTime}</span>
            </div>
          </footer>

          {/* Transition overlay */}
          {isTransitioning && (
            <TransitionOverlay isSecret={secretMode} message={msg} loginCount={loginCount} />
          )}

        </div>
      )}

      {/* Fallback for browsers that block window.close() */}
      {crtDone && (
        <div className={styles.safeToClose}>
          <p className={styles.safeText}>It is now safe to close this window.</p>
        </div>
      )}

      {showNamePrompt && (
        <div className={styles.namePromptBackdrop}>
          <div className={styles.namePromptDialog}>
            <div className={styles.namePromptTitle}>
              <span className={styles.namePromptIcon}>🖥️</span>
              Windows XP Setup
            </div>
            <div className={styles.namePromptBody}>
              <p className={styles.namePromptLabel}>
                Type your name below. This will be used to identify your account.
              </p>
              <div className={styles.namePromptRow}>
                <label className={styles.namePromptFieldLabel} htmlFor="nameInput">
                  Your name:
                </label>
                <input
                  id="nameInput"
                  className={styles.namePromptInput}
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  autoFocus
                  maxLength={32}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className={styles.namePromptBtns}>
                <button
                  className={styles.namePromptNext}
                  onClick={handleNameSubmit}
                >
                  Next &nbsp;&#8594;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function XPFlag() {
  return (
    <div className={styles.flag} aria-hidden>
      <span className={`${styles.flagPetal} ${styles.petalRed}`}   />
      <span className={`${styles.flagPetal} ${styles.petalGreen}`} />
      <span className={`${styles.flagPetal} ${styles.petalBlue}`}  />
      <span className={`${styles.flagPetal} ${styles.petalYellow}`}/>
    </div>
  );
}

function DefaultAvatar({ corrupted }: { corrupted: boolean }) {
  return (
    <div className={styles.avatarWrap}>
      <svg viewBox="0 0 40 40" width="56" height="56" aria-hidden>
        <circle cx="20" cy="14" r="9"  fill={corrupted ? '#8899bb' : '#9DB8D2'} />
        <ellipse cx="20" cy="37" rx="15" ry="10" fill={corrupted ? '#8899bb' : '#9DB8D2'} />
      </svg>
    </div>
  );
}

function GhostAvatar({ corrupted }: { corrupted: boolean }) {
  return (
    <div className={`${styles.avatarWrap} ${corrupted ? styles.ghostAvatar : ''}`}>
      <svg viewBox="0 0 40 40" width="56" height="56" aria-hidden>
        <circle cx="20" cy="14" r="9"  fill={corrupted ? '#cc3333' : '#708090'} />
        <ellipse cx="20" cy="37" rx="15" ry="10" fill={corrupted ? '#cc3333' : '#708090'} />
      </svg>
    </div>
  );
}

function UserTileWrapper({
  children, active, onClick, dimmed,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  dimmed?: boolean;
}) {
  return (
    <div
      className={[
        styles.tile,
        active  ? styles.activeTile : '',
        dimmed  ? styles.dimmedTile : '',
      ].join(' ')}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {children}
    </div>
  );
}

import { forwardRef } from 'react';

interface PasswordRowProps {
  value:      string;
  onChange:   (v: string) => void;
  onSubmit:   () => void;
  onKeyDown:  (e: React.KeyboardEvent) => void;
  shake:      boolean;
  error:      string;
  placeholder: string;
  type:       'password' | 'text';
}

const PasswordRow = forwardRef<HTMLInputElement, PasswordRowProps>(
  ({ value, onChange, onSubmit, onKeyDown, shake, error, placeholder, type }, ref) => (
    <div className={styles.passwordRow}>
      <div className={[styles.inputWrap, shake ? styles.shake : ''].join(' ')}>
        <input
          ref={ref}
          className={styles.passwordInput}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          aria-label={placeholder}
        />
        <button className={styles.arrowBtn} onClick={onSubmit} aria-label="Log in">
          &#8594;
        </button>
      </div>
      {error && <p className={styles.errorMsg} role="alert">{error}</p>}
    </div>
  )
);
PasswordRow.displayName = 'PasswordRow';

// Transition overlay — normal vs. secret have entirely different feels
function TransitionOverlay({
  isSecret, message, loginCount
}: {
  isSecret: boolean;
  message: LoginMessage;
  loginCount: number;
}) {
  return (
    <div className={[
      styles.overlay,
      isSecret ? styles.secretOverlay : styles.normalOverlay,
    ].join(' ')}>
      {isSecret ? (
        <div className={styles.secretContent}>
          <p className={styles.secretLine1}>// RESTRICTED ACCESS //</p>
          <p className={styles.secretLine2}>identity confirmed</p>
          <p className={styles.secretLine3}>loading restricted partition...</p>
        </div>
      ) : (
        <p className={styles.loadingText}>
          {message.aggressive
            ? message.greeting           // reuse the creepy message during loading
            : 'Loading your personal settings...'}
        </p>
      )}
    </div>
  );
}
