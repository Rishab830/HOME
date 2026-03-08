'use client';

import { useEffect, useState } from 'react';
import styles from './ShutdownOverlay.module.css';

interface Props {
  onComplete: () => void;   // called after animation finishes
}

const SHUTDOWN_DURATION = 2200; // ms before scene resets to login

export default function ShutdownOverlay({ onComplete }: Props) {
  const [phase, setPhase] = useState<'shutting-down' | 'done'>('shutting-down');

  useEffect(() => {
    const id = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, SHUTDOWN_DURATION);
    return () => clearTimeout(id);
  }, [onComplete]);

  return (
    <div className={styles.overlay}>
      <p className={styles.text}>
        {phase === 'shutting-down' ? 'Windows is shutting down...' : ''}
      </p>
    </div>
  );
}
