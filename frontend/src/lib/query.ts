import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

const versions = new Map<string, number>();
const listeners = new Set<() => void>();
let snapshot = 0;

function bump() {
  snapshot++;
  listeners.forEach((l) => l());
}

/** Marks data tags as stale. Every mounted query that uses one of them refetches. */
export function invalidate(...tags: string[]) {
  for (const t of tags) versions.set(t, (versions.get(t) ?? 0) + 1);
  bump();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function tagVersion(tags: string[]) {
  return tags.map((t) => `${t}:${versions.get(t) ?? 0}`).join('|');
}

interface QueryState<T> {
  key: string;
  data?: T;
  error?: unknown;
}

export interface QueryResult<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/**
 * Fetches data for the given tags and dependency list. Refetches when the
 * dependencies change, when a tag is invalidated, or when `reload` is called.
 */
export function useQuery<T>(tags: string[], fetcher: () => Promise<T>, deps: unknown[]): QueryResult<T> {
  useSyncExternalStore(subscribe, () => snapshot);
  const [nonce, setNonce] = useState(0);
  const key = `${JSON.stringify(deps)}#${tagVersion(tags)}#${nonce}`;
  const [state, setState] = useState<QueryState<T>>({ key: '' });
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let active = true;
    fetcherRef.current().then(
      (data) => active && setState({ key, data }),
      (error: unknown) => active && setState((s) => ({ key, data: s.data, error })),
    );
    return () => {
      active = false;
    };
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const settled = state.key === key;

  return {
    data: state.data,
    error: settled ? state.error : undefined,
    loading: !settled,
    reload,
  };
}

export interface MutationResult<A extends unknown[], R> {
  run: (...args: A) => Promise<R | undefined>;
  pending: boolean;
  error: unknown;
  reset: () => void;
}

/**
 * Wraps a write call. While one call is in flight further calls are ignored,
 * so a double click cannot submit twice. Tags in `invalidates` are refreshed
 * after a successful response only.
 */
export function useMutation<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  options: { invalidates?: string[] } = {},
): MutationResult<A, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const inFlight = useRef(false);
  const tags = options.invalidates ?? [];
  const tagKey = tags.join(',');

  const run = useCallback(
    async (...args: A) => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      setPending(true);
      setError(undefined);
      try {
        const result = await fn(...args);
        if (tagKey) invalidate(...tagKey.split(','));
        return result;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [fn, tagKey],
  );

  const reset = useCallback(() => setError(undefined), []);
  return { run, pending, error, reset };
}

export function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
