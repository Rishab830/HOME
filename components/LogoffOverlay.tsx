'use client';

import { useEffect, useState } from 'react';
import styles from './LogoffOverlay.module.css';

interface Props {
  onComplete: () => void;
}

const HOLD_DURATION   = 2000;   // ms of "Logging off..." visible
const FADEOUT_DURATION = 600;   // ms of fade to black before login

export default function LogoffOverlay({ onComplete }: Props) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // After holding, begin fade out
    const holdId = setTimeout(() => setFadingOut(true), HOLD_DURATION);

    // After fade out completes, switch scene
    const doneId = setTimeout(onComplete, HOLD_DURATION + FADEOUT_DURATION);

    return () => {
      clearTimeout(holdId);
      clearTimeout(doneId);
    };
  }, [onComplete]);

  return (
    <div className={[
      styles.overlay,
      fadingOut ? styles.fadingOut : '',
    ].join(' ')}>
      <div className={styles.flag}>
        <span className={`${styles.petal} ${styles.red}`}    />
        <span className={`${styles.petal} ${styles.green}`}  />
        <span className={`${styles.petal} ${styles.blue}`}   />
        <span className={`${styles.petal} ${styles.yellow}`} />
      </div>
      <div className={styles.wordmark}>
        <span className={styles.windows}>Windows</span>
        <span className={styles.xp}>XP</span>
      </div>
      <p className={styles.status}>Logging off...</p>
    </div>
  );
}
