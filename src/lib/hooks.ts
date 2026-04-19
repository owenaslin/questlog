"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { AsyncState, createLoadingState, createSuccessState, createErrorState, getErrorMessage } from "./errors";

/**
 * Hook to track if component is mounted
 * Prevents state updates on unmounted components
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * Hook for safe async operations that check if component is still mounted
 */
export function useSafeAsync() {
  const isMounted = useIsMounted();

  const safeAsync = useCallback(
    async <T,>(promise: Promise<T>): Promise<T | null> => {
      try {
        const result = await promise;
        if (!isMounted()) {
          return null;
        }
        return result;
      } catch (err) {
        if (!isMounted()) {
          return null;
        }
        throw err;
      }
    },
    [isMounted]
  );

  return safeAsync;
}

/**
 * Hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for managing async data loading with proper error handling
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>(createLoadingState<T>());
  const isMounted = useIsMounted();

  const fetch = useCallback(async () => {
    setState(createLoadingState<T>());
    try {
      const data = await fetcher();
      if (isMounted()) {
        setState(createSuccessState(data));
      }
    } catch (err) {
      if (isMounted()) {
        setState(createErrorState<T>(err));
      }
    }
  }, [fetcher, isMounted]);

  useEffect(() => {
    fetch();
  }, deps);

  return { ...state, refetch: fetch };
}
