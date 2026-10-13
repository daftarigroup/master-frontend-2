import { useEffect, useState } from 'react';

/** True at the `lg` breakpoint and up. Used where the phone and desktop layouts differ in structure (collapsible sections vs tabs and charts), so only one is mounted and fetches. */
export function useIsDesktop(): boolean {
  const query = '(min-width: 1024px)';
  const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return match;
}
