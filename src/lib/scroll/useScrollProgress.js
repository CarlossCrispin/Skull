import { useEffect, useState } from 'react';
import { scrollProgress } from '../motion/scroll.js';

/**
 * Page scroll progress in [0, 1]: 0 at the top of the document, 1 at the bottom. Reads on the next
 * animation frame after a scroll or resize (one request per burst) through passive listeners, and
 * stays 0 where nothing scrolls (jsdom, a page shorter than the viewport) or there is no window.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = null;
    const read = () => {
      frame = null;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollProgress(window.scrollY, 0, range));
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}
