'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './apps.module.css';

export type SystemPanelKind =
  | 'camera'
  | 'storage'
  | 'display'
  | 'internet'
  | 'freecell'
  | 'hearts'
  | 'pinball'
  | 'network'
  | 'users'
  | 'sound'
  | 'system';

interface Props {
  kind: SystemPanelKind;
}

const ADMIN_PASSWORD = 'letmefree';
const DEFAULT_DISPLAY_SETTINGS = {
  theme: 'Windows XP',
  desktop: 'Bliss',
  resolution: '1024 x 768',
  colorQuality: 'Highest (32 bit)',
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const units = ['bytes', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function storageUsage(): number {
  try {
    return Object.keys(localStorage).reduce((total, key) => {
      const value = localStorage.getItem(key) ?? '';
      return total + key.length + value.length;
    }, 0) * 2;
  } catch {
    return 0;
  }
}

export default function SystemPanel({ kind }: Props) {
  const [cameraStatus, setCameraStatus] = useState('Camera permission has not been requested.');
  const [streamActive, setStreamActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [storage, setStorage] = useState({ usage: storageUsage(), quota: 64 * 1024 * 1024 });
  const [pinballScore, setPinballScore] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [displaySettings, setDisplaySettings] = useState(DEFAULT_DISPLAY_SETTINGS);
  const [pendingDisplaySettings, setPendingDisplaySettings] = useState(DEFAULT_DISPLAY_SETTINGS);
  const [displayStatus, setDisplayStatus] = useState('Administrator permission is required to change these settings.');

  useEffect(() => {
    if (kind !== 'storage') return;
    navigator.storage?.estimate?.()
      .then(estimate => {
        setStorage({
          usage: estimate.usage ?? storageUsage(),
          quota: estimate.quota ?? 64 * 1024 * 1024,
        });
      })
      .catch(() => setStorage({ usage: storageUsage(), quota: 64 * 1024 * 1024 }));
  }, [kind]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    if (kind !== 'camera' || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
  }, [kind, streamActive]);

  const requestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('No webcam device interface is available.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setStreamActive(true);
      setCameraStatus('Camera permission granted. Preview device is active.');
    } catch {
      setStreamActive(false);
      setCameraStatus('Camera permission was denied or no camera was found.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !streamActive || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraStatus('Camera preview is not ready yet.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraStatus('Unable to capture picture from this device.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedPhoto(canvas.toDataURL('image/png'));
    setCameraStatus('Picture captured.');
  };

  const stageDisplayChange = (nextSettings: Partial<typeof displaySettings>) => {
    setPendingDisplaySettings(prev => ({ ...prev, ...nextSettings }));
    setDisplayStatus('Unsaved changes. Click Save Changes to apply.');
  };

  const saveDisplayChanges = () => {
    const password = window.prompt('Administrator password required to save display changes:');
    if (password !== ADMIN_PASSWORD) {
      setPendingDisplaySettings(displaySettings);
      setDisplayStatus('Access is denied. Changes were reverted.');
      return;
    }

    setDisplaySettings(pendingDisplaySettings);
    setDisplayStatus('Changes applied.');
  };

  const hasPendingDisplayChanges =
    displaySettings.theme !== pendingDisplaySettings.theme ||
    displaySettings.desktop !== pendingDisplaySettings.desktop ||
    displaySettings.resolution !== pendingDisplaySettings.resolution ||
    displaySettings.colorQuality !== pendingDisplaySettings.colorQuality;

  const cards = useMemo(() => ['A', '2', '3', '4', '5', '6', '7', '8'], []);

  if (kind === 'camera') {
    return (
      <div className={styles.panelWrap}>
        <div className={styles.panelHeader}>Camera and Scanner Wizard</div>
        <div className={styles.cameraPreview}>
          <video
            ref={videoRef}
            className={streamActive ? styles.cameraVideo : styles.cameraVideoHidden}
            autoPlay
            muted
            playsInline
          />
          {!streamActive && <span>NO PREVIEW</span>}
        </div>
        <canvas ref={canvasRef} className={styles.hiddenCanvas} aria-hidden />
        <p className={styles.panelText}>{cameraStatus}</p>
        <div className={styles.panelActions}>
          <button className={styles.xpBtn} onClick={requestCamera}>Request Camera Permission</button>
          <button className={styles.xpBtn} onClick={capturePhoto} disabled={!streamActive}>Click Picture</button>
        </div>
        {capturedPhoto && (
          <div
            className={styles.cameraSnapshot}
            style={{ backgroundImage: `url(${capturedPhoto})` }}
            role="img"
            aria-label="Captured camera picture"
          />
        )}
      </div>
    );
  }

  if (kind === 'storage') {
    const percent = Math.min(100, Math.round((storage.usage / storage.quota) * 100));
    return (
      <div className={styles.panelWrap}>
        <div className={styles.panelHeader}>Local Disk (C:) Properties</div>
        <div className={styles.driveIcon}>C:</div>
        <div className={styles.meter}><span style={{ width: `${percent}%` }} /></div>
        <p className={styles.panelText}>Used space: {formatBytes(storage.usage)}</p>
        <p className={styles.panelText}>Free space: {formatBytes(Math.max(0, storage.quota - storage.usage))}</p>
        <p className={styles.panelText}>Capacity: {formatBytes(storage.quota)}</p>
      </div>
    );
  }

  if (kind === 'display') {
    return (
      <div className={styles.panelWrap}>
        <div className={styles.panelHeader}>Display Properties</div>
        <label className={styles.panelLabel}>
          Theme
          <select
            value={pendingDisplaySettings.theme}
            onChange={e => stageDisplayChange({ theme: e.currentTarget.value })}
          >
            <option>Windows XP</option>
            <option>Windows Classic</option>
          </select>
        </label>
        <label className={styles.panelLabel}>
          Desktop
          <select
            value={pendingDisplaySettings.desktop}
            onChange={e => stageDisplayChange({ desktop: e.currentTarget.value })}
          >
            <option>Bliss</option>
            <option>None</option>
            <option>Azul</option>
            <option>Follow</option>
          </select>
        </label>
        <label className={styles.panelLabel}>
          Screen resolution
          <select
            value={pendingDisplaySettings.resolution}
            onChange={e => stageDisplayChange({ resolution: e.currentTarget.value })}
          >
            <option>800 x 600</option>
            <option>1024 x 768</option>
            <option>1280 x 1024</option>
            <option>1600 x 1200</option>
          </select>
        </label>
        <label className={styles.panelLabel}>
          Color quality
          <select
            value={pendingDisplaySettings.colorQuality}
            onChange={e => stageDisplayChange({ colorQuality: e.currentTarget.value })}
          >
            <option>Medium (16 bit)</option>
            <option>Highest (32 bit)</option>
          </select>
        </label>
        <div className={styles.panelActions}>
          <button
            className={styles.xpBtn}
            onClick={saveDisplayChanges}
            disabled={!hasPendingDisplayChanges}
          >
            <span className={styles.adminButtonIcon} aria-hidden />
            Save Changes
          </button>
        </div>
        <p className={styles.panelText}>{displayStatus}</p>
      </div>
    );
  }

  if (kind === 'internet') {
    return (
      <div className={styles.panelWrap}>
        <div className={styles.panelHeader}>Internet Properties</div>
        <div className={styles.tabs}><button>General</button><button>Security</button><button>Privacy</button><button>Connections</button></div>
        <p className={styles.panelText}>Home page: about:blank</p>
        <p className={styles.panelText}>Temporary Internet files: 12 files</p>
        <p className={styles.panelText}>Connection: Dial-up adapter unavailable</p>
        <button className={styles.xpBtn}>Delete Cookies...</button>
      </div>
    );
  }

  if (kind === 'freecell') {
    return (
      <div className={styles.cardGameWrap}>
        <div className={styles.panelHeader}>FreeCell</div>
        <div className={styles.cardRow}>{cards.slice(0, 4).map(card => <button key={card} className={styles.playingCard}>{card}<span>♠</span></button>)}</div>
        <div className={styles.cardColumns}>{cards.map(card => <button key={card} className={styles.playingCard}>{card}<span>♥</span></button>)}</div>
        <p className={styles.panelText}>Move cards to the free cells and foundations. Game #2003.</p>
      </div>
    );
  }

  if (kind === 'hearts') {
    return (
      <div className={styles.cardGameWrap}>
        <div className={styles.panelHeader}>Hearts</div>
        <div className={styles.scoreTable}><span>You</span><b>0</b><span>North</span><b>12</b><span>East</span><b>8</b><span>West</span><b>14</b></div>
        <div className={styles.cardRow}>{['2', '5', '9', 'Q', 'A'].map(card => <button key={card} className={styles.playingCard}>{card}<span>♥</span></button>)}</div>
        <p className={styles.panelText}>Choose a card to play. Avoid hearts and the queen of spades.</p>
      </div>
    );
  }

  if (kind === 'pinball') {
    return (
      <div className={styles.pinballWrap}>
        <div className={styles.pinballBoard} onClick={() => setPinballScore(score => score + 250)}>
          <span className={styles.pinballBall} />
          <span className={styles.flipperLeft} />
          <span className={styles.flipperRight} />
        </div>
        <p className={styles.panelText}>Score: {pinballScore}. Click the table to launch.</p>
      </div>
    );
  }

  if (kind === 'network') {
    return (
      <div className={styles.panelWrap}>
        <div className={styles.panelHeader}>My Network Places</div>
        <p className={styles.panelText}>MSHOME</p>
        <p className={styles.panelText}>Shared Documents on HOME-PC</p>
        <p className={styles.panelText}>Network status: Limited or no connectivity.</p>
      </div>
    );
  }

  if (kind === 'users') {
    return (
      <div className={styles.panelWrap}>
        <div className={styles.panelHeader}>User Accounts</div>
        <button className={styles.userTile}>User - Computer administrator</button>
        <button className={styles.userTile}>Guest - Off</button>
        <button className={styles.userTile}>Michael Chen - Archived profile</button>
      </div>
    );
  }

  if (kind === 'sound') {
    return (
      <div className={styles.panelWrap}>
        <div className={styles.panelHeader}>Sounds and Audio Devices</div>
        <label className={styles.panelLabel}><input type="checkbox" checked={soundOn} onChange={e => setSoundOn(e.target.checked)} /> Place volume icon in the taskbar</label>
        <label className={styles.panelLabel}>Device volume <input type="range" min="0" max="100" defaultValue="72" /></label>
        <p className={styles.panelText}>Sound scheme: Windows Default</p>
      </div>
    );
  }

  return (
    <div className={styles.panelWrap}>
      <div className={styles.panelHeader}>System Properties</div>
      <p className={styles.panelText}>Microsoft Windows XP Professional</p>
      <p className={styles.panelText}>Version 2003 preservation build</p>
      <p className={styles.panelText}>Computer: HOME-PC</p>
      <p className={styles.panelText}>Registered to: User</p>
    </div>
  );
}
