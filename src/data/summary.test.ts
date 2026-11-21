import { describe, expect, it } from "vitest";
import { itemLabel, summarize, weekStart, type ResultRow } from "./summary";

const row = (
  item_key: string,
  skill: string,
  correct: boolean,
  mistake: string | null = null,
): ResultRow => ({
  item_key,
  skill,
  correct,
  mistake,
  at: "2026-11-20T10:00:00Z",
});
const NAMES = { "forgot-to-regroup": "Forgot to regroup", "smaller-from-larger": "Smaller from larger" };

describe("summarize", () => {
  const rows: ResultRow[] = [
    ...Array.from({ length: 9 }, () => row("add:12+3", "2.NBT.B.5", true)),
    row("add:38+25", "2.NBT.B.5", false, "forgot-to-regroup"),
    row("sub:52-17", "2.NBT.B.5", false, "smaller-from-larger"),
    row("sub:52-17", "2.NBT.B.5", false, "smaller-from-larger"),
    row("sub:43-8", "2.NBT.B.5", false, "smaller-from-larger"),
    row("sub:43-8", "2.NBT.B.5", true),
    row("sub:60-24", "2.NBT.B.5", true),
    row("add:8+5", "2.OA.B.2", true),
  ];
  const s = summarize(rows, NAMES);

  it("counts tries and right answers", () => {
    expect(s.tries).toBe(16);
    expect(s.right).toBe(12);
  });

  it("splits a standard into adding and subtracting, weakest first", () => {
    expect(s.skills.map((k) => k.key)).toEqual(["2.NBT.B.5|sub", "2.NBT.B.5|add", "2.OA.B.2|add"]);
    expect(s.skills[0]).toMatchObject({ tries: 5, right: 2, status: "needs-work" });
    expect(s.skills[1]).toMatchObject({ tries: 10, right: 9, status: "strong" });
    expect(s.skills[2]!.status).toBe("too-few");
    expect(s.skills[0]!.label).toContain("subtracting");
  });

  it("ranks mistakes with plain names and example problems", () => {
    expect(s.mistakes[0]).toEqual({
      id: "smaller-from-larger",
      name: "Smaller from larger",
      count: 3,
      examples: ["52 − 17", "43 − 8"],
    });
    expect(s.mistakes[1]!.id).toBe("forgot-to-regroup");
  });

  it("lists the problems missed most", () => {
    expect(s.hardest[0]).toEqual({ key: "sub:52-17", label: "52 − 17", tries: 2, misses: 2 });
  });

  it("handles an empty week", () => {
    expect(summarize([], NAMES)).toEqual({ tries: 0, right: 0, skills: [], mistakes: [], hardest: [] });
  });

  it("never includes anything about individual children", () => {
    expect(JSON.stringify(s)).not.toMatch(/student|name":"[A-Z][a-z]+"/);
  });
});

describe("helpers", () => {
  it("formats problems", () => {
    expect(itemLabel("add:38+25")).toBe("38 + 25");
    expect(itemLabel("sub:52-17")).toBe("52 − 17");
    expect(itemLabel("other")).toBe("other");
  });

  it("weeks start on Monday", () => {
    const sat = new Date(2026, 10, 21);
    expect(weekStart(sat).getDate()).toBe(16);
    expect(weekStart(sat, 1).getDate()).toBe(9);
    expect(weekStart(new Date(2026, 10, 16)).getDate()).toBe(16);
    expect(weekStart(new Date(2026, 10, 22)).getDate()).toBe(16);
  });
});

describe("sync rows", async () => {
  const { sessionRows, attemptRows } = await import("./sync");
  const list = [
    {
      id: "a1",
      at: "2026-11-20T10:01:00Z",
      session: "s1",
      game: "summit-math",
      mode: "add",
      play: "board" as const,
      itemKey: "add:1+1",
      skill: "2.NBT.B.5",
      correct: true,
    },
    {
      id: "a2",
      at: "2026-11-20T10:00:00Z",
      session: "s1",
      game: "summit-math",
      mode: "add",
      play: "board" as const,
      itemKey: "add:3+1",
      skill: "2.NBT.B.5",
      correct: false,
      mistake: "x",
      team: 1 as const,
    },
  ];
  it("one session row per session, started at its first answer", () => {
    expect(sessionRows(list, "c", "t")).toEqual([
      {
        id: "s1",
        game: "summit-math",
        mode: "add",
        play: "board",
        started_at: "2026-11-20T10:00:00Z",
        classroom_id: "c",
        teacher_id: "t",
      },
    ]);
  });
  it("attempt rows carry no names, only the class and team", () => {
    const rows = attemptRows(list, "c", "t");
    expect(Object.keys(rows[1]!).sort()).toEqual(
      [
        "at",
        "classroom_id",
        "correct",
        "id",
        "item_key",
        "mistake",
        "session_id",
        "skill",
        "team",
        "teacher_id",
      ].sort(),
    );
    expect(rows[0]!.mistake).toBeNull();
  });
});
