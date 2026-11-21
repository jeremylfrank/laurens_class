"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Small JSON store on top of localStorage for things that stay on this board.
 * Every read and write is wrapped: private windows and full storage must never break the board.
 */
const PREFIX = "classcade:";
const cache = new Map<string, unknown>();
const listeners = new Set<() => void>();

export function readStored<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value: T = fallback;
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(PREFIX + key);
    if (raw !== null) value = JSON.parse(raw) as T;
  } catch {
    value = fallback;
  }
  cache.set(key, value);
  return value;
}

export function writeStored<T>(key: string, value: T): void {
  cache.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: keep working from memory.
  }
  for (const l of listeners) l();
}

export function removeStored(key: string): void {
  cache.delete(key);
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Like useState, but saved on this board. `fallback` must be a stable value (a module constant). */
export function usePersisted<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readStored(key, fallback),
    () => fallback,
  );
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = readStored(key, fallback);
      writeStored(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
    },
    [key, fallback],
  );
  return [value, set];
}

/** True after the first client render. Lets the board skip server rendering of stored state. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
const noopSubscribe = () => () => {};
