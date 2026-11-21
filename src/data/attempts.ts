"use client";
import { readStored, writeStored } from "@/lib/storage";
import type { PlayStyle } from "@/engine/types";

/**
 * Every answer tapped at the board, kept on the board until step 3 syncs it to Lauren's account.
 * No names: a result belongs to the class, or to team 0 / team 1.
 */
export interface AttemptRecord {
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
  writeStored(KEY, prune([...list, record], Date.now()));
}

export function readAttempts(): AttemptRecord[] {
  return readStored(KEY, EMPTY);
}

export function newSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}
