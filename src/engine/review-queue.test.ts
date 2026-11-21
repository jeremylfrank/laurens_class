import { describe, expect, it } from "vitest";
import { RETURN_AFTER_ROUNDS, nextDue, recordMiss, recordRight, type ReviewQueue } from "./review-queue";
import type { Item } from "./types";

const item = (key: string): Item => ({
  key,
  skill: "x",
  prompt: null,
  answer: 1,
  choices: [{ value: 1 }],
  speech: "",
});

describe("review queue", () => {
  it("brings a missed item back a few rounds later, not right away", () => {
    const q = recordMiss([], item("a"), 10);
    expect(nextDue(q, 10)).toBeUndefined();
    expect(nextDue(q, 10 + RETURN_AFTER_ROUNDS - 1)).toBeUndefined();
    expect(nextDue(q, 10 + RETURN_AFTER_ROUNDS)?.item.key).toBe("a");
  });

  it("keeps it until it is answered right twice", () => {
    let q: ReviewQueue = recordMiss([], item("a"), 0);
    q = recordRight(q, "a", 3);
    expect(q).toHaveLength(1);
    expect(nextDue(q, 5)).toBeUndefined();
    expect(nextDue(q, 6)?.item.key).toBe("a");
    q = recordRight(q, "a", 6);
    expect(q).toHaveLength(0);
  });

  it("a miss resets the count", () => {
    let q: ReviewQueue = recordMiss([], item("a"), 0);
    q = recordRight(q, "a", 3);
    q = recordMiss(q, item("a"), 6);
    expect(q).toHaveLength(1);
    expect(q[0]!.rightCount).toBe(0);
    q = recordRight(q, "a", 9);
    expect(q).toHaveLength(1);
  });

  it("returns the earliest due item first", () => {
    let q: ReviewQueue = recordMiss([], item("late"), 5);
    q = recordMiss(q, item("early"), 1);
    expect(nextDue(q, 20)?.item.key).toBe("early");
  });

  it("ignores right answers to items not in the queue", () => {
    const q = recordMiss([], item("a"), 0);
    expect(recordRight(q, "b", 3)).toBe(q);
  });
});
