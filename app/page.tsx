'use client';
import { useState, useCallback } from 'react';
import LoginScreen from '@/components/LoginScreen';
import DesktopOS from '@/components/DesktopOS';         // your next component
import LogoffOverlay from '@/components/LogoffOverlay';   // ← ADD

type Scene = 'login' | 'desktop' | 'secret';

export default function Page() {
  const [scene, setScene] = useState<Scene>('login');
  const [isLoggingOff,   setLoggingOff]   = useState(false);  // ← ADD

  const handleShutdown = useCallback(() => {}, []);

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

      {scene === 'secret' && (
        <div style={{
          width: '100vw',
          height: '100vh',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Courier New, monospace',
          color: '#fff',
          fontSize: '18px',
        }}>
          ADMINISTRATOR PARTITION — [placeholder]
        </div>
      )}

      {/* Overlays render above everything */}
      {isLoggingOff   && <LogoffOverlay onComplete={handleLogoffComplete} />}  {/* ← ADD */}
    </>
  );
}