'use client';
import { useState, useCallback } from 'react';
import LoginScreen from '@/components/LoginScreen';
import DesktopOS from '@/components/DesktopOS';         // your next component
import ShutdownOverlay from '@/components/ShutdownOverlay';

type Scene = 'login' | 'desktop' | 'secret';

export default function Page() {
  const [scene, setScene] = useState<Scene>('login');
  const [isShuttingDown, setShuttingDown] = useState(false);

  const handleShutdown = useCallback(() => {         // ← ADD
    setShuttingDown(true);
  }, []);

  const handleShutdownComplete = useCallback(() => { // ← ADD
    setShuttingDown(false);
    setScene('login');
  }, []);

  return (
    <>
      {scene === 'login'   && (
        <LoginScreen
          onLogin={isSecret => setScene(isSecret ? 'secret' : 'desktop')}
          onTurnOff={handleShutdown}   // ← was previously doing nothing
        />
      )}
      {scene === 'desktop' && (
        <DesktopOS
          onLogout={handleShutdown}    // ← was setScene('login') directly, now goes through overlay
          onTurnOff={handleShutdown}   // ← ADD this new prop
        />
      )}
      {/* Overlay renders above everything — triggered from any scene */}
      {isShuttingDown && (             // ← ADD
        <ShutdownOverlay onComplete={handleShutdownComplete} />
      )}
    </>
  );
}