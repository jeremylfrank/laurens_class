import { describe, expect, it } from "vitest";
import { firstTryRight, nextTurn, startRound, tap } from "./round";
import type { Item } from "./types";

const item: Item = {
  key: "add:8+5",
  skill: "2.OA.B.2",
  prompt: null,
  answer: 13,
  choices: [
    { value: 12, mistake: "counted-start-number" },
    { value: 13 },
    { value: 15, mistake: "make-ten-forgot-split" },
  ],
  speech: "",
};

describe("round", () => {
  it("board mode: a miss ends the round and keeps the mistake for the explanation", () => {
    const r = tap(startRound(item, false, 0), 0)!;
    expect(r.correct).toBe(false);
    expect(r.state.phase).toBe("done");
    expect(r.state.firstMiss?.mistake).toBe("counted-start-number");
    expect(r.by).toBeNull();
  });

  it("team mode: a miss gives the other team a steal", () => {
    const r = tap(startRound(item, true, 0), 0)!;
    expect(r.state.phase).toBe("steal");
    expect(r.state.turn).toBe(1);
    expect(r.by).toBe(0);
  });

  it("a successful steal scores for the stealing team", () => {
    const miss = tap(startRound(item, true, 0), 0)!;
    const steal = tap(miss.state, 1)!;
    expect(steal.correct).toBe(true);
    expect(steal.state.scorer).toBe(1);
    expect(steal.state.firstMiss?.mistake).toBe("counted-start-number");
    expect(firstTryRight(steal.state)).toBe(false);
  });

  it("a missed steal ends the round with no score", () => {
    const miss = tap(startRound(item, true, 0), 0)!;
    const steal = tap(miss.state, 2)!;
    expect(steal.state.phase).toBe("done");
    expect(steal.state.scorer).toBeNull();
    expect(steal.state.solved).toBe(false);
  });

  it("can't tap the same wrong answer twice, or tap after the round ends", () => {
    const miss = tap(startRound(item, true, 0), 0)!;
    expect(tap(miss.state, 0)).toBeNull();
    const done = tap(miss.state, 1)!;
    expect(tap(done.state, 2)).toBeNull();
  });

  it("turns alternate by round even after a steal", () => {
    const miss = tap(startRound(item, true, 0), 0)!;
    const steal = tap(miss.state, 1)!;
    expect(nextTurn(steal.state)).toBe(1);
    expect(nextTurn(startRound(item, true, 1))).toBe(0);
  });

  it("first try right counts for the adaptive level", () => {
    expect(firstTryRight(tap(startRound(item, false, 0), 1)!.state)).toBe(true);
  });
});
