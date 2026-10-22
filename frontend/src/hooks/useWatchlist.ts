import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'boi_user_watchlist';
const DEFAULT_WATCHLIST = ['KXHIGHDEN-26OCT23-T76', 'KXHIGHNY-26OCT23-T64'];

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_WATCHLIST;
  });

  const saveWatchlist = useCallback((newList: string[]) => {
    setWatchlist(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (e) {
      console.warn('Failed to persist watchlist:', e);
    }
  }, []);

  const isWatchlisted = useCallback(
    (ticker: string) => {
      return watchlist.includes(ticker);
    },
    [watchlist]
  );

  const toggleWatchlist = useCallback(
    (ticker: string) => {
      if (watchlist.includes(ticker)) {
        saveWatchlist(watchlist.filter((t) => t !== ticker));
      } else {
        saveWatchlist([...watchlist, ticker]);
      }
    },
    [watchlist, saveWatchlist]
  );

  return {
    watchlist,
    isWatchlisted,
    toggleWatchlist,
  };
}
