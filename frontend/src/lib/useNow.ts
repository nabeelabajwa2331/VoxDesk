import { useEffect, useState } from 'react';

const floorToMinute = (t: number) => Math.floor(t / 60_000) * 60_000;

/** Current time rounded to the minute; re-renders once a minute. */
export function useNow(): number {
  const [now, setNow] = useState(() => floorToMinute(Date.now()));
  useEffect(() => {
    const id = setInterval(() => setNow(floorToMinute(Date.now())), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
