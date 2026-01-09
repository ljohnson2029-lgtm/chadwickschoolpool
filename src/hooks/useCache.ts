import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheStore {
  [key: string]: CacheEntry<any>;
}

// In-memory cache store
const memoryCache: CacheStore = {};

interface UseCacheOptions {
  ttlMinutes?: number;
  useLocalStorage?: boolean;
}

/**
 * Simple caching hook with TTL support
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
) {
  const { ttlMinutes = 5, useLocalStorage = false } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const getCachedData = useCallback((): CacheEntry<T> | null => {
    if (useLocalStorage) {
      try {
        const stored = localStorage.getItem(`cache_${key}`);
        if (stored) {
          const entry = JSON.parse(stored) as CacheEntry<T>;
          if (entry.expiresAt > Date.now()) {
            return entry;
          }
          localStorage.removeItem(`cache_${key}`);
        }
      } catch {
        return null;
      }
    }
    
    const entry = memoryCache[key];
    if (entry && entry.expiresAt > Date.now()) {
      return entry;
    }
    
    if (entry) {
      delete memoryCache[key];
    }
    
    return null;
  }, [key, useLocalStorage]);

  const setCachedData = useCallback(
    (data: T) => {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttlMinutes * 60 * 1000,
      };

      memoryCache[key] = entry;

      if (useLocalStorage) {
        try {
          localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
        } catch {
          // Storage full or not available
        }
      }
    },
    [key, ttlMinutes, useLocalStorage]
  );

  const invalidate = useCallback(() => {
    delete memoryCache[key];
    if (useLocalStorage) {
      localStorage.removeItem(`cache_${key}`);
    }
  }, [key, useLocalStorage]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (isMountedRef.current) {
        setData(result);
        setCachedData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetcher, setCachedData]);

  useEffect(() => {
    isMountedRef.current = true;

    const cached = getCachedData();
    if (cached) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    refetch();

    return () => {
      isMountedRef.current = false;
    };
  }, [key]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
  };
}

/**
 * Clear all cached data
 */
export function clearAllCache() {
  Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
  
  Object.keys(localStorage)
    .filter((key) => key.startsWith('cache_'))
    .forEach((key) => localStorage.removeItem(key));
}

/**
 * Cache route calculations
 */
export function cacheRouteCalculation(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  data: any
) {
  const key = `route_${startLat.toFixed(4)}_${startLng.toFixed(4)}_${endLat.toFixed(4)}_${endLng.toFixed(4)}`;
  memoryCache[key] = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
}

export function getCachedRouteCalculation(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): any | null {
  const key = `route_${startLat.toFixed(4)}_${startLng.toFixed(4)}_${endLat.toFixed(4)}_${endLng.toFixed(4)}`;
  const entry = memoryCache[key];
  
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  
  if (entry) {
    delete memoryCache[key];
  }
  
  return null;
}