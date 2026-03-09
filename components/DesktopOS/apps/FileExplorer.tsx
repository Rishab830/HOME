'use client';

import { useState } from 'react';
import styles from './apps.module.css';
import { FILESYSTEM, FSNode, FSFolder, FSFile } from '../horror/filesystem';

interface Props {
  initialPath:       string[];
  corruptionLevel:   number;
  onOpenFile:        (file: FSFile) => void;
  triggerOnce:       (key: string, gain: number) => void; 
  deletedFiles:    Set<string>;
  unlockedFiles: Set<string>;
}

function getNodeAtPath(path: string[]): FSFolder | null {
  let current: FSFolder = FILESYSTEM;
  for (const segment of path) {
    const child = current.children.find(c => c.name === segment);
    if (!child || child.type !== 'folder') return null;
    current = child as FSFolder;
  }
  return current;
}

function nodeIcon(node: FSNode): string {
  if (node.type === 'folder') return '📁';
  if (node.type === 'txt')    return '📄';
  if (node.type === 'xls')    return '📊';
  if (node.type === 'img')    return '🖼️';
  if (node.type === 'log')    return '🔧';
  return '📄';
}

export default function FileExplorer({
  initialPath, corruptionLevel, onOpenFile, triggerOnce, deletedFiles, unlockedFiles
}: Props) {
  const [path, setPath] = useState<string[]>(initialPath);
  const [history, setHistory] = useState<string[][]>([initialPath]);
  const [histIdx, setHistIdx] = useState(0);

  const folder = getNodeAtPath(path);
  const visible = folder
  ? folder.children
      .filter(node =>
        !node.hiddenThreshold ||
        corruptionLevel >= node.hiddenThreshold ||
        unlockedFiles.has(node.name)            // ← unlocked overrides hiddenThreshold
      )
      .filter(node => !deletedFiles.has(node.name))
  : [];

  const navigate = (newPath: string[]) => {
    const trimmed = history.slice(0, histIdx + 1);
    setHistory([...trimmed, newPath]);
    setHistIdx(trimmed.length);
    setPath(newPath);
  };

  const goBack = () => {
    if (histIdx <= 0) return;
    setHistIdx(i => i - 1);
    setPath(history[histIdx - 1]);
  };

  const handleNodeDoubleClick = (node: FSNode) => {
    if (node.corruptionGain) {
      const key = node.type === 'folder'
        ? `folder:${node.name}`
        : `file:${node.name}`;
      triggerOnce(key, node.corruptionGain);
    }

    if (node.type === 'folder') {
      if (node.lockedThreshold && corruptionLevel < node.lockedThreshold) {
        // Show a locked message — could be expanded to an error dialog
        alert(`Access denied.\n\nThis folder is locked.`);
        return;
      }
      navigate([...path, node.name]);
    } else {
      onOpenFile(node as FSFile);
    }
  };

  return (
    <div className={styles.explorerWrap}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button className={styles.toolBtn} onClick={goBack} disabled={histIdx <= 0}>◀ Back</button>
        <div className={styles.addressBar}>
          <span className={styles.addressLabel}>Address</span>
          <span className={styles.addressPath}>
            {['Desktop', ...path].join(' › ')}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className={styles.explorerBody}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <p className={styles.sideTitle}>File and Folder Tasks</p>
          <button className={styles.sideLink}>🗂 Make a new folder</button>
          <button className={styles.sideLink}>📤 Share this folder</button>
          <p className={[styles.sideTitle, styles.mt12].join(' ')}>Other Places</p>
          <button className={styles.sideLink} onClick={() => navigate([])}>🖥 Desktop</button>
          <button className={styles.sideLink} onClick={() => navigate(['My Documents'])}>📁 My Documents</button>
        </aside>

        {/* File list */}
        <main className={styles.fileList}>
          {visible.length === 0 && (
            <p className={styles.emptyMsg}>This folder is empty.</p>
          )}
          {visible.map(node => (
            <div
              key={node.name}
              className={styles.fileItem}
              onDoubleClick={() => handleNodeDoubleClick(node)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleNodeDoubleClick(node)}
            >
              <span className={styles.fileIcon} aria-hidden>{nodeIcon(node)}</span>
              <span className={styles.fileName}>{node.name}</span>
            </div>
          ))}
        </main>
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span>{visible.length} object{visible.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
