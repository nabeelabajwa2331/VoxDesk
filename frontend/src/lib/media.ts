/** True on phone-width screens, read once when a view first mounts. */
export function isNarrowScreen(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
}
