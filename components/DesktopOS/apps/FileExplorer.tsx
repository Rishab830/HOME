'use client';

import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import styles from './apps.module.css';
import { FILESYSTEM, type FSFile, type FSFolder, type FSNode } from '../horror/filesystem';

interface Props {
  initialPath: string[];
  corruptionLevel: number;
  onOpenFile: (file: FSFile) => void;
  triggerOnce: (key: string, gain: number) => void;
  deletedFiles: Set<string>;
  unlockedFiles: Set<string>;
  onDeleteNode: (key: string) => void;
  onRestoreNode: (key: string) => void;
  onUndoDelete: () => void;
  onStoryFlag?: (flag: string) => void;
  onMeaningfulInteraction?: () => void;
}

function getNodeAtPath(path: string[]): FSFolder | null {
  let current: FSFolder = FILESYSTEM;
  for (const segment of path) {
    const child = current.children.find(c => c.name === segment);
    if (!child || child.type !== 'folder') return null;
    current = child;
  }
  return current;
}

function nodeIcon(node: FSNode): string {
  if (node.type === 'folder') return '/icons/Folder%20Closed.ico';
  if (node.type === 'txt') return '/icons/File.ico';
  if (node.type === 'xls') return '/icons/List%20File.ico';
  if (node.type === 'img') return '/icons/Video%20File.ico';
  if (node.type === 'log') return '/icons/System%20Properties.ico';
  return '/icons/File.ico';
}

function nodeKey(path: string[], name: string): string {
  return [...path, name].join('/');
}

function pathLabel(path: string[]): string {
  return ['Desktop', ...path].join(' > ');
}

function flattenDeleted(
  folder: FSFolder,
  basePath: string[],
  deletedFiles: Set<string>,
  unlockedFiles: Set<string>,
  corruptionLevel: number
): Array<{ node: FSNode; key: string; originalPath: string[] }> {
  const entries: Array<{ node: FSNode; key: string; originalPath: string[] }> = [];

  for (const node of folder.children) {
    const key = nodeKey(basePath, node.name);
    const visibleByStory =
      !node.hiddenThreshold ||
      corruptionLevel >= node.hiddenThreshold ||
      unlockedFiles.has(node.name);

    if (visibleByStory && (deletedFiles.has(key) || deletedFiles.has(node.name))) {
      entries.push({ node, key, originalPath: basePath });
    }

    if (node.type === 'folder') {
      entries.push(...flattenDeleted(node, [...basePath, node.name], deletedFiles, unlockedFiles, corruptionLevel));
    }
  }

  return entries;
}

export default function FileExplorer({
  initialPath,
  corruptionLevel,
  onOpenFile,
  triggerOnce,
  deletedFiles,
  unlockedFiles,
  onDeleteNode,
  onRestoreNode,
  onUndoDelete,
  onStoryFlag,
  onMeaningfulInteraction,
}: Props) {
  const [path, setPath] = useState<string[]>(initialPath);
  const [history, setHistory] = useState<string[][]>([initialPath]);
  const [histIdx, setHistIdx] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FSNode;
    key: string;
    originalPath: string[];
    inRecycle: boolean;
  } | null>(null);

  const folder = getNodeAtPath(path);
  const inRecycleBin = path.join('/') === 'Recycle Bin';
  const recycleEntries = useMemo(
    () => flattenDeleted(FILESYSTEM, [], deletedFiles, unlockedFiles, corruptionLevel),
    [deletedFiles, unlockedFiles, corruptionLevel]
  );

  const visible = folder
    ? folder.children
        .filter(node =>
          !node.hiddenThreshold ||
          corruptionLevel >= node.hiddenThreshold ||
          unlockedFiles.has(node.name)
        )
        .filter(node => inRecycleBin || (!deletedFiles.has(nodeKey(path, node.name)) && !deletedFiles.has(node.name)))
    : [];

  const shownEntries = inRecycleBin
    ? recycleEntries
    : visible.map(node => ({ node, key: nodeKey(path, node.name), originalPath: path }));

  const navigate = (newPath: string[]) => {
    const trimmed = history.slice(0, histIdx + 1);
    setHistory([...trimmed, newPath]);
    setHistIdx(trimmed.length);
    setPath(newPath);
    setSelectedKey(null);
  };

  const goBack = () => {
    if (histIdx <= 0) return;
    setHistIdx(i => i - 1);
    setPath(history[histIdx - 1]);
    setSelectedKey(null);
  };

  const goUp = () => {
    if (path.length === 0) return;
    navigate(path.slice(0, -1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndoDelete();
        return;
      }
      if (e.key === 'Delete' && selectedKey && !inRecycleBin) {
        e.preventDefault();
        onDeleteNode(selectedKey);
        setSelectedKey(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inRecycleBin, onDeleteNode, onUndoDelete, selectedKey]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [contextMenu]);

  const handleNodeDoubleClick = (node: FSNode) => {
    if (node.corruptionGain) {
      const key = node.type === 'folder' ? `folder:${node.name}` : `file:${node.name}`;
      triggerOnce(key, node.corruptionGain);
    }

    if (node.type === 'folder') {
      onMeaningfulInteraction?.();
      if (node.setsFlag) onStoryFlag?.(node.setsFlag);
      if (node.lockedThreshold && corruptionLevel < node.lockedThreshold) {
        alert('Access denied.\n\nThis folder is locked.');
        return;
      }
      navigate([...path, node.name]);
    } else {
      onOpenFile(node);
    }
  };

  const handleNodeContextMenu = (
    e: ReactMouseEvent<HTMLDivElement>,
    entry: { node: FSNode; key: string; originalPath: string[] }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedKey(entry.key);
    setContextMenu({
      x: Math.max(4, Math.min(e.clientX, window.innerWidth - 190)),
      y: Math.max(4, Math.min(e.clientY, window.innerHeight - 132)),
      node: entry.node,
      key: entry.key,
      originalPath: entry.originalPath,
      inRecycle: inRecycleBin,
    });
  };

  const runContextAction = (action: () => void) => {
    action();
    setContextMenu(null);
  };

  return (
    <div className={styles.explorerWrap}>
      <div className={styles.toolbar}>
        <button className={styles.toolBtn} onClick={goBack} disabled={histIdx <= 0}>Back</button>
        <button className={styles.toolBtn} onClick={goUp} disabled={path.length === 0}>Up</button>
        <div className={styles.addressBar}>
          <span className={styles.addressLabel}>Address</span>
          <span className={styles.addressPath}>{pathLabel(path)}</span>
        </div>
      </div>

      <div className={styles.explorerBody}>
        <aside className={styles.sidebar}>
          <p className={styles.sideTitle}>File and Folder Tasks</p>
          <button className={styles.sideLink}>Make a new folder</button>
          <button className={styles.sideLink}>Share this folder</button>
          <button className={styles.sideLink} onClick={onUndoDelete}>Undo Delete</button>
          <p className={[styles.sideTitle, styles.mt12].join(' ')}>Other Places</p>
          <button className={styles.sideLink} onClick={() => navigate([])}>Desktop</button>
          <button className={styles.sideLink} onClick={() => navigate(['My Documents'])}>My Documents</button>
          <button className={styles.sideLink} onClick={() => navigate(['Recycle Bin'])}>Recycle Bin</button>
        </aside>

        <main className={styles.fileList}>
          {shownEntries.length === 0 && (
            <p className={styles.emptyMsg}>This folder is empty.</p>
          )}
          {shownEntries.map(entry => (
            <div
              key={entry.key}
              className={[
                styles.fileItem,
                selectedKey === entry.key ? styles.fileItemSelected : '',
              ].join(' ')}
              onClick={() => setSelectedKey(entry.key)}
              onDoubleClick={() => inRecycleBin ? onRestoreNode(entry.key) : handleNodeDoubleClick(entry.node)}
              onContextMenu={e => handleNodeContextMenu(e, entry)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && (inRecycleBin ? onRestoreNode(entry.key) : handleNodeDoubleClick(entry.node))}
            >
              <span
                className={styles.fileIconImage}
                style={{ backgroundImage: `url(${nodeIcon(entry.node)})` }}
                aria-hidden
              />
              <span className={styles.fileName}>{entry.node.name}</span>
              {inRecycleBin && <span className={styles.fileOrigin}>{pathLabel(entry.originalPath)}</span>}
            </div>
          ))}
        </main>
      </div>

      {contextMenu && (
        <div
          className={styles.fileContextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={e => e.stopPropagation()}
          role="menu"
        >
          <button
            className={styles.menuItem}
            onClick={() => runContextAction(() => contextMenu.inRecycle ? onRestoreNode(contextMenu.key) : handleNodeDoubleClick(contextMenu.node))}
          >
            {contextMenu.inRecycle ? 'Restore' : 'Open'}
          </button>
          {!contextMenu.inRecycle && (
            <button className={styles.menuItem} onClick={() => runContextAction(() => onDeleteNode(contextMenu.key))}>Delete</button>
          )}
          <button
            className={styles.menuItem}
            onClick={() => runContextAction(() => alert(`${contextMenu.node.name}\nType: ${contextMenu.node.type}\nLocation: ${pathLabel(contextMenu.originalPath)}`))}
          >
            Properties
          </button>
        </div>
      )}

      <div className={styles.statusBar}>
        <span>{shownEntries.length} object{shownEntries.length !== 1 ? 's' : ''}</span>
        <span>{inRecycleBin ? 'Recycle Bin' : pathLabel(path)}</span>
      </div>
    </div>
  );
}
