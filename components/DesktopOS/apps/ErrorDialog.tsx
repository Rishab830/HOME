'use client';

import styles from './apps.module.css';

interface Props {
  message:         string;
  corruptionLevel: number;
  onClose:         () => void;
}

export default function ErrorDialog({ message, corruptionLevel, onClose }: Props) {
  const isEntity = corruptionLevel >= 50 && !message.startsWith('Error');

  return (
    <div className={styles.errorWrap}>
      <div className={styles.errorIcon} aria-hidden>
        {isEntity ? '👁' : '⚠️'}
      </div>
      <p className={[styles.errorMsg, isEntity ? styles.entityMsg : ''].join(' ')}>
        {message}
      </p>
      <div className={styles.errorBtns}>
        <button className={styles.xpBtn} onClick={onClose}>OK</button>
        {!isEntity && (
          <button className={styles.xpBtn} onClick={onClose}>Cancel</button>
        )}
      </div>
    </div>
  );
}
