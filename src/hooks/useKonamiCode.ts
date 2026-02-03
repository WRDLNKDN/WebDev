import { useEffect, useState } from 'react';

const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

export const useKonamiCode = (action: () => void) => {
  const [input, setInput] = useState<string[]>([]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      setInput((prev) => {
        const newHistory = [...prev, key];
        // Keep buffer only as long as the code
        if (newHistory.length > KONAMI_CODE.length) {
          newHistory.shift();
        }
        return newHistory;
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    // Check for "System Hack" match
    if (input.join('') === KONAMI_CODE.join('')) {
      action();
      setInput([]); // Reset buffer after trigger
    }
  }, [input, action]);
};
