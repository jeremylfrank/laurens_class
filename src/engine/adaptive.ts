/**
 * Difficulty for the whole class (never per kid), one level per game mode.
 *
 * Within a session: up a level after 4 of the last 5 right, down after 2 misses in the last 3.
 * Across sessions: a new day starts one level below where the class finished, as a warm up.
 */
export interface LevelState {
  level: number;
  /** Results at the current level, newest last. Only first tries count. */
  recent: boolean[];
  /** Local date (YYYY-MM-DD) of the last result. */
  lastDay: string | null;
}

export const UP_WINDOW = 5;
export const UP_NEEDS = 4;
export const DOWN_WINDOW = 3;
export const DOWN_MISSES = 2;

export const START_LEVEL: LevelState = { level: 1, recent: [], lastDay: null };

const clamp = (n: number, max: number) => Math.min(Math.max(n, 1), max);

export function recordResult(state: LevelState, correct: boolean, maxLevel: number, day: string): LevelState {
  const recent = [...state.recent, correct].slice(-UP_WINDOW);
  const lastFive = recent.slice(-UP_WINDOW);
  const lastThree = recent.slice(-DOWN_WINDOW);
  if (lastFive.length >= UP_WINDOW && lastFive.filter(Boolean).length >= UP_NEEDS && state.level < maxLevel) {
    return { level: state.level + 1, recent: [], lastDay: day };
  }
  if (lastThree.filter((r) => !r).length >= DOWN_MISSES && state.level > 1) {
    return { level: state.level - 1, recent: [], lastDay: day };
  }
  return { level: clamp(state.level, maxLevel), recent, lastDay: day };
}

/** Call when a game is opened. */
export function startSession(saved: LevelState, maxLevel: number, today: string): LevelState {
  const newDay = saved.lastDay !== null && saved.lastDay !== today;
  const level = clamp(newDay ? saved.level - 1 : saved.level, maxLevel);
  return { level, recent: newDay ? [] : saved.recent, lastDay: saved.lastDay };
}

export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
