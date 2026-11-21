import { describe, expect, it } from "vitest";
import { prune, type AttemptRecord } from "./attempts";

const rec = (at: string): AttemptRecord => ({
  at,
  session: "s",
  game: "summit-math",
  mode: "add",
  play: "board",
  itemKey: "add:1+1",
  skill: "2.NBT.B.5",
  correct: true,
});

describe("attempt log on the board", () => {
  it("drops results older than 13 months", () => {
    const now = Date.parse("2026-11-21T12:00:00Z");
    const kept = prune(
      [rec("2025-09-01T00:00:00Z"), rec("2025-11-01T00:00:00Z"), rec("2026-11-20T00:00:00Z")],
      now,
    );
    expect(kept.map((r) => r.at)).toEqual(["2025-11-01T00:00:00Z", "2026-11-20T00:00:00Z"]);
  });

  it("caps how many it keeps, newest last", () => {
    const now = Date.parse("2026-11-21T12:00:00Z");
    const many = Array.from({ length: 3100 }, (_, i) => rec(new Date(now - (3100 - i) * 1000).toISOString()));
    const kept = prune(many, now);
    expect(kept).toHaveLength(3000);
    expect(kept.at(-1)).toBe(many.at(-1));
  });
});
