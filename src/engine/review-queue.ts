import type { Item } from "./types";

/**
 * Missed items come back a few rounds later, until the class gets them right twice.
 * Pure functions over a small array so the queue can be saved on the board as JSON.
 */
export interface ReviewEntry {
  item: Item;
  /** The round number at or after which this item should come back. */
  dueRound: number;
  /** Right answers since the last miss. Two and it leaves the queue. */
  rightCount: number;
}

export type ReviewQueue = ReviewEntry[];

export const RETURN_AFTER_ROUNDS = 3;
export const RIGHT_TO_CLEAR = 2;
export const MAX_QUEUE = 20;

export function recordMiss(queue: ReviewQueue, item: Item, round: number): ReviewQueue {
  const rest = queue.filter((e) => e.item.key !== item.key);
  const next = [...rest, { item, dueRound: round + RETURN_AFTER_ROUNDS, rightCount: 0 }];
  // Oldest entries drop off first if the class is having a rough day.
  return next.slice(-MAX_QUEUE);
}

export function recordRight(queue: ReviewQueue, key: string, round: number): ReviewQueue {
  const entry = queue.find((e) => e.item.key === key);
  if (!entry) return queue;
  const rightCount = entry.rightCount + 1;
  if (rightCount >= RIGHT_TO_CLEAR) return queue.filter((e) => e !== entry);
  return queue.map((e) => (e === entry ? { ...e, rightCount, dueRound: round + RETURN_AFTER_ROUNDS } : e));
}

/** The item that is due now, earliest first, or undefined. */
export function nextDue(queue: ReviewQueue, round: number): ReviewEntry | undefined {
  return queue
    .filter((e) => e.dueRound <= round)
    .reduce<ReviewEntry | undefined>(
      (best, e) => (!best || e.dueRound < best.dueRound ? e : best),
      undefined,
    );
}
