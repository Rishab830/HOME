'use client';
import { useState, useCallback } from 'react';
import LoginScreen from '@/components/LoginScreen';
import DesktopOS from '@/components/DesktopOS';         // your next component
import LogoffOverlay from '@/components/LogoffOverlay';   // ← ADD

type Scene = 'login' | 'desktop' | 'secret';

export default function Page() {
  const [scene, setScene] = useState<Scene>('login');
  const [isShuttingDown, setShuttingDown] = useState(false);
  const [isLoggingOff,   setLoggingOff]   = useState(false);  // ← ADD

  const handleShutdown = useCallback(() => {         // ← ADD
    setShuttingDown(true);
  }, []);

  const handleShutdownComplete = useCallback(() => { // ← ADD
    setShuttingDown(false);
    setScene('login');
  }, []);

  const handleLogoff = useCallback(() => {
    setLoggingOff(true);
  }, []);

  // ← ADD
  const handleLogoffComplete = useCallback(() => {
    setLoggingOff(false);
    setScene('login');
  }, []);

  return (
    <>
      {scene === 'login' && (
        <LoginScreen
          onLogin={isSecret => setScene(isSecret ? 'secret' : 'desktop')}
          onTurnOff={handleShutdown}
        />
      )}
      {scene === 'desktop' && !isLoggingOff && (
        <DesktopOS
          onLogout={handleLogoff}
          onTurnOff={handleShutdown}
        />
      )}

      {/* Overlays render above everything */}
      {isLoggingOff   && <LogoffOverlay onComplete={handleLogoffComplete} />}  {/* ← ADD */}
    </>
  );
}