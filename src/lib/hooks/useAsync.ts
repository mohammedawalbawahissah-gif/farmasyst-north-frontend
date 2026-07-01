import { useState, useEffect, useCallback, useRef } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const fnRef = useRef(fn);

  // Keep the latest fn in a ref (outside render) so `run` below can stay
  // referentially stable without needing `fn` itself in a dependency array.
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      if (mounted.current) setData(result);
    } catch (err: unknown) {
      if (mounted.current) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (err instanceof Error ? err.message : 'An error occurred');
        setError(msg);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  // Callers pass a fresh `deps` array reference every render, so we compare
  // by value (JSON key) instead — this keeps the dependency array below a
  // true array literal (required by the current hooks lint rules) while
  // still re-running whenever the logical deps actually change.
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    mounted.current = true;
    // Deferred so state updates inside `run` aren't synchronous within the
    // effect body itself (avoids cascading-render lint warning); this still
    // fires before paint for practical purposes.
    queueMicrotask(() => {
      if (mounted.current) run();
    });
    return () => {
      mounted.current = false;
    };
  }, [depsKey, run]);

  return { data, loading, error, refetch: run };
}
