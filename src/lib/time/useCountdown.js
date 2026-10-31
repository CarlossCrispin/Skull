import { useEffect, useState } from 'react';
import { countdownAt, formatCountdown } from './countdown.js';

const TICK_MS = 1000;

const currentText = () => formatCountdown(countdownAt(Date.now()));

/**
 * The countdown text (`DD:HH:MM:SS` or `HOY`), refreshed once per second. A text update is not
 * motion, so reduced motion does not stop it. The interval is cleared on unmount.
 */
export function useCountdown() {
  const [text, setText] = useState(currentText);
  useEffect(() => {
    setText(currentText());
    const id = setInterval(() => setText(currentText()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return text;
}
