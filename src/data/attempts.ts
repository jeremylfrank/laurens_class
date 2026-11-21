"use client";
import { readStored, writeStored } from "@/lib/storage";
import type { PlayStyle } from "@/engine/types";

/**
 * Every answer tapped at the board waits here until it is saved to the teacher's account.
 * No names: a result belongs to the class, or to team 0 / team 1.
 * If nobody signs in, results stay on the board (at most 13 months, at most 3,000 rows).
 */
export interface AttemptRecord {
  id?: string;
  at: string;
  session: string;
  game: string;
  mode: string;
  play: PlayStyle;
  itemKey: string;
  skill: string;
  correct: boolean;
  mistake?: string;
  team?: 0 | 1;
}

const KEY = "attempts";
const MAX = 3000;
const KEEP_MS = 396 * 24 * 60 * 60 * 1000; // about 13 months
const EMPTY: AttemptRecord[] = [];

export function prune(list: AttemptRecord[], now: number): AttemptRecord[] {
  return list.filter((a) => now - Date.parse(a.at) < KEEP_MS).slice(-MAX);
}

export function logAttempt(record: AttemptRecord): void {
  const list = readStored(KEY, EMPTY);
  writeStored(KEY, prune([...list, { id: newId(), ...record }], Date.now()));
}

export function readAttempts(): AttemptRecord[] {
  return readStored(KEY, EMPTY);
}

/** After a successful save, forget those rows on the board. */
export function removeAttempts(ids: Set<string>): void {
  writeStored(
    KEY,
    readStored(KEY, EMPTY).filter((a) => !a.id || !ids.has(a.id)),
  );
}

/** Give ids to rows saved before ids existed, so they can be synced safely. */
export function ensureIds(): AttemptRecord[] {
  const list = readStored(KEY, EMPTY);
  if (list.every((a) => a.id)) return list;
  const fixed = list.map((a) => (a.id ? a : { ...a, id: newId() }));
  writeStored(KEY, fixed);
  return fixed;
}

export function newId(): string {
  return crypto.randomUUID();
}

export const newSessionId = newId;
