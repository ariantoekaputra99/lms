import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './format';

/** Loads data on mount (and whenever deps change) and exposes a reload function. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loaderRef.current());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, deps);

  return { data, setData, loading, error, reload };
}
