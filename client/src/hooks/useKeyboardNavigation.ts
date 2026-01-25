import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  onEnter,
  onEscape,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      const isInputFocused = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (event.key === 'Enter' && onEnter) {
        if (isInputFocused && target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          onEnter();
        } else if (!isInputFocused) {
          event.preventDefault();
          onEnter();
        }
      }

      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
      }
    },
    [onEnter, onEscape, enabled]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, enabled]);
}
