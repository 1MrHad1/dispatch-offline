import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-transparency: reduce)';

/** The web half of useReduceTransparency. See the native file for why this exists. */
export function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia(QUERY);
    setReduce(mql.matches);

    const onChange = (event: MediaQueryListEvent) => setReduce(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduce;
}
