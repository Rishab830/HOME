'use client';

import styles from './apps.module.css';

interface Props {
  src:      string;
  filename: string;
}

export default function ImageViewer({ src, filename }: Props) {
  return (
    <div className={styles.imageViewerWrap}>
      {/* Toolbar */}
      <div className={styles.imageViewerToolbar}>
        <button className={styles.imageViewerBtn}>◀</button>
        <button className={styles.imageViewerBtn}>▶</button>
        <button className={styles.imageViewerBtn}>🔍+</button>
        <button className={styles.imageViewerBtn}>🔍−</button>
        <span className={styles.imageViewerName}>{filename}</span>
      </div>

      {/* Image */}
      <div className={styles.imageViewerCanvas}>
        <img
          src={src}
          alt={filename}
          className={styles.imageViewerImg}
          draggable={false}
        />
      </div>
    </div>
  );
}
