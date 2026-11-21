import { describe, expect, it } from "vitest";
import { START_LEVEL, localDay, recordResult, startSession, type LevelState } from "./adaptive";

const DAY = "2026-11-20";
const run = (results: boolean[], start: LevelState = START_LEVEL, max = 5) =>
  results.reduce((s, r) => recordResult(s, r, max, DAY), start);

describe("adaptive level", () => {
  it("moves up after 4 of the last 5 right", () => {
    expect(run([true, true, false, true, true]).level).toBe(2);
    expect(run([true, true, true]).level).toBe(1);
  });

  it("moves down after 2 misses in the last 3", () => {
    const at3: LevelState = { level: 3, recent: [], lastDay: DAY };
    expect(run([false, true, false], at3).level).toBe(2);
    expect(run([false, true, true], at3).level).toBe(3);
  });

  it("never goes below 1 or above the top level", () => {
    expect(run([false, false, false, false]).level).toBe(1);
    const top: LevelState = { level: 5, recent: [], lastDay: DAY };
    expect(run(Array(10).fill(true), top).level).toBe(5);
  });

  it("starts a new day one level lower as a warm up", () => {
    const saved: LevelState = { level: 4, recent: [true], lastDay: "2026-11-19" };
    expect(startSession(saved, 5, DAY)).toEqual({ level: 3, recent: [], lastDay: "2026-11-19" });
  });

  it("keeps the level when reopened the same day", () => {
    const saved: LevelState = { level: 4, recent: [true], lastDay: DAY };
    expect(startSession(saved, 5, DAY).level).toBe(4);
  });

  it("formats local days", () => {
    expect(localDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
