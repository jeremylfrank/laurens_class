"use client";
import { readStored, usePersisted, writeStored } from "@/lib/storage";
import type { LevelState } from "@/engine/adaptive";
import type { ReviewQueue } from "@/engine/review-queue";

export interface Settings {
  title: string;
  sound: boolean;
  slow: boolean;
  teams: boolean;
  teamNames: [string, string];
  /** When these settings last changed (ms). Used to sync with the teacher's account. */
  updatedAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  title: "Trail Games",
  sound: true,
  slow: false,
  teams: false,
  teamNames: ["Bears", "Eagles"],
  updatedAt: 0,
};

/** Accepts settings from the server or old storage, keeping only known fields with safe values. */
export function cleanSettings(raw: unknown, updatedAt: number): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, max: number, fallback: string) =>
    typeof v === "string" && v.trim() ? v.slice(0, max) : fallback;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const names = Array.isArray(r.teamNames) ? r.teamNames : [];
  return {
    title: str(r.title, 40, DEFAULT_SETTINGS.title),
    sound: bool(r.sound, DEFAULT_SETTINGS.sound),
    slow: bool(r.slow, DEFAULT_SETTINGS.slow),
    teams: bool(r.teams, DEFAULT_SETTINGS.teams),
    teamNames: [str(names[0], 14, "Bears"), str(names[1], 14, "Eagles")],
    updatedAt,
  };
}

export interface Progress {
  trail: number;
  badges: number;
  score: [number, number];
}
export const TRAIL_STOPS = 10;
export const DEFAULT_PROGRESS: Progress = { trail: 0, badges: 0, score: [0, 0] };

const NO_LEVELS: Record<string, LevelState> = {};
const NO_REVIEW: Record<string, ReviewQueue> = {};

/** Settings saved on the board. Every change is time stamped so it can sync. */
export function useSettings(): [Settings, (next: Settings) => void] {
  const [settings, set] = usePersisted<Settings>("settings", DEFAULT_SETTINGS);
  return [settings, (next: Settings) => set({ ...next, updatedAt: Date.now() })];
}
export const useProgress = () => usePersisted<Progress>("progress", DEFAULT_PROGRESS);
export const useLevels = () => usePersisted<Record<string, LevelState>>("levels", NO_LEVELS);
/** Latest saved queue, for code that runs from timers after state has moved on. */
export const readReview = () => readStored<Record<string, ReviewQueue>>("review", NO_REVIEW);
export const useReview = () => usePersisted<Record<string, ReviewQueue>>("review", NO_REVIEW);

export const levelKey = (gameId: string, modeId: string) => `${gameId}:${modeId}`;

/** Rounds played per game mode, counted across sessions, so "a few rounds later" survives a reload. */
export const readRounds = (key: string) => readStored<number>(`rounds:${key}`, 0);
export const writeRounds = (key: string, n: number) => writeStored(`rounds:${key}`, n);
