import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { SESSION_TIMEOUT, HIDDEN_TAB_TIMEOUT, clearAllStoredData } from '@/lib/security';

interface SessionSecurityContextType {
  isSessionExpired: boolean;
  clearSession: () => void;
  dismissExpiredModal: () => void;
  resetInactivityTimer: () => void;
}

const SessionSecurityContext = createContext<SessionSecurityContextType | null>(null);

export function useSessionSecurity() {
  const context = useContext(SessionSecurityContext);
  if (!context) {
    throw new Error('useSessionSecurity must be used within SessionSecurityProvider');
  }
  return context;
}

interface SessionSecurityProviderProps {
  children: ReactNode;
  onSessionClear?: () => void;
}

export function SessionSecurityProvider({ children, onSessionClear }: SessionSecurityProviderProps) {
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearSession = useCallback(() => {
    clearAllStoredData();
    onSessionClear?.();
    setIsSessionExpired(true);
  }, [onSessionClear]);

  const dismissExpiredModal = useCallback(() => {
    setIsSessionExpired(false);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      clearSession();
    }, SESSION_TIMEOUT);
  }, [clearSession]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.clear();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem('hiddenAt', Date.now().toString());
      } else {
        const hiddenAt = sessionStorage.getItem('hiddenAt');
        if (hiddenAt) {
          const elapsed = Date.now() - parseInt(hiddenAt);
          if (elapsed > HIDDEN_TAB_TIMEOUT) {
            clearSession();
          }
          sessionStorage.removeItem('hiddenAt');
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearSession]);

  return (
    <SessionSecurityContext.Provider value={{
      isSessionExpired,
      clearSession,
      dismissExpiredModal,
      resetInactivityTimer,
    }}>
      {children}
    </SessionSecurityContext.Provider>
  );
}
