'use client';

import { useState, useCallback } from 'react';
import { ApiError } from '@/lib/api';

export interface UseApiOptions<T> {
  initialData?: T | null;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

export function useApiError<T = unknown, P extends unknown[] = unknown[]>(
  apiFn: (...args: P) => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(options.initialData ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiFn(...args);
        setData(result);
        options.onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        const standardError =
          err instanceof Error
            ? err
            : new ApiError(500, 'Unknown Error', err, String(err));
        
        setError(standardError);
        options.onError?.(standardError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFn, options]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
    setData(options.initialData ?? null);
  }, [options.initialData]);

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: !isLoading && error === null && data !== null,
    execute,
    reset,
    setData,
  };
}
