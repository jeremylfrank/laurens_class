import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/rng";
import {
  CHOICES,
  MISTAKES,
  MODES,
  explainMiss,
  makeItem,
  makeTenJumps,
  needsRegroup,
  summitMath,
  type MathPrompt,
} from "./definition";

const SEEDS = 300;

function everyItem(fn: (item: ReturnType<typeof makeItem>, mode: string, level: number) => void) {
  for (const mode of MODES) {
    for (let level = 1; level <= mode.levels; level++) {
      const rng = createRng(level * 1000 + mode.id.length);
      for (let i = 0; i < SEEDS; i++) fn(makeItem(level, rng, mode.id), mode.id, level);
    }
  }
}

const solve = (p: MathPrompt) => (p.op === "+" ? p.a + p.b : p.a - p.b);

describe("Summit Math items", () => {
  it("answer is always correct", () => {
    everyItem((item) => expect(item.answer).toBe(solve(item.prompt as MathPrompt)));
  });

  it("has four distinct choices with the answer exactly once", () => {
    everyItem((item) => {
      const values = item.choices.map((c) => c.value);
      expect(values).toHaveLength(CHOICES);
      expect(new Set(values).size).toBe(CHOICES);
      expect(values.filter((v) => v === item.answer)).toHaveLength(1);
    });
  });

  it("every distractor names a known mistake, and the answer has none", () => {
    everyItem((item) => {
      for (const c of item.choices) {
        if (c.value === item.answer) expect(c.mistake).toBeUndefined();
        else expect(Object.keys(MISTAKES)).toContain(c.mistake);
      }
    });
  });

  it("never shows a negative number", () => {
    everyItem((item) => {
      for (const c of item.choices) expect(c.value as number).toBeGreaterThanOrEqual(0);
    });
  });

  it("stays within 20 for facts and within 100 otherwise", () => {
    everyItem((item, mode) => {
      const p = item.prompt as MathPrompt;
      const limit = mode === "facts" ? 20 : 100;
      expect(Math.max(p.a, p.b, item.answer as number)).toBeLessThanOrEqual(limit);
    });
  });

  it("tags each mode with its one standard", () => {
    everyItem((item, mode) => expect(item.skill).toBe(mode === "facts" ? "2.OA.B.2" : "2.NBT.B.5"));
  });

  it("levels 1 and 2 of add and subtract never need regrouping; 3 and up always do", () => {
    everyItem((item, mode, level) => {
      if (mode === "facts") return;
      expect(needsRegroup(item.prompt as MathPrompt)).toBe(level >= 3);
    });
  });

  it("regrouping items always include the signature regrouping mistake", () => {
    everyItem((item, mode, level) => {
      if (mode === "facts" || level < 3) return;
      const mistakes = item.choices.map((c) => c.mistake);
      const signature = mode === "add" ? "forgot-to-regroup" : "smaller-from-larger";
      const alt = mode === "add" ? "wrote-column-sums" : "forgot-to-reduce-tens";
      expect(mistakes.includes(signature) || mistakes.includes(alt)).toBe(true);
    });
  });

  it("is reproducible from the seed", () => {
    const a = makeItem(4, createRng(5), "add");
    const b = makeItem(4, createRng(5), "add");
    expect(a).toEqual(b);
  });

  it("keys describe the problem", () => {
    const item = makeItem(4, createRng(1), "add");
    const p = item.prompt as MathPrompt;
    expect(item.key).toBe(`add:${p.a}+${p.b}`);
  });
});

describe("mistake values are what the mistake actually produces", () => {
  const find = (item: ReturnType<typeof makeItem>, id: string) =>
    item.choices.find((c) => c.mistake === id)?.value;

  it("forgot to regroup: 38 + 25 → 53, column sums → 513", () => {
    everyItem((item, mode, level) => {
      if (mode !== "add" || level < 3) return;
      const p = item.prompt as MathPrompt;
      const forgot = find(item, "forgot-to-regroup");
      if (forgot !== undefined) expect(forgot).toBe(p.a + p.b - 10);
      const cols = find(item, "wrote-column-sums");
      const t = Math.floor(p.a / 10) + Math.floor(p.b / 10);
      if (cols !== undefined) expect(cols).toBe(Number(`${t}${(p.a % 10) + (p.b % 10)}`));
    });
  });

  it("smaller from larger: 52 − 17 → 45", () => {
    everyItem((item, mode, level) => {
      if (mode !== "sub" || level < 3) return;
      const p = item.prompt as MathPrompt;
      const v = find(item, "smaller-from-larger");
      const expected = (Math.floor(p.a / 10) - Math.floor(p.b / 10)) * 10 + Math.abs((p.a % 10) - (p.b % 10));
      if (v !== undefined) expect(v).toBe(expected);
    });
  });

  it("added instead of subtracting is the sum", () => {
    everyItem((item) => {
      const p = item.prompt as MathPrompt;
      const v = find(item, "added-instead");
      if (v !== undefined) expect(v).toBe(p.a + p.b);
    });
  });

  it("make ten, forgot to split: 8 + 5 → 15", () => {
    everyItem((item, mode) => {
      if (mode !== "facts") return;
      const p = item.prompt as MathPrompt;
      const v = find(item, "make-ten-forgot-split");
      if (v !== undefined) expect(v).toBe(10 + p.b);
    });
  });

  it("reversed digits really are reversed", () => {
    everyItem((item) => {
      const v = find(item, "reversed-digits");
      if (v !== undefined) expect(String(v)).toBe(String(item.answer).split("").reverse().join(""));
    });
  });
});

describe("explainMiss", () => {
  it("facts use a number line whose hops land on the answer", () => {
    everyItem((item, mode) => {
      if (mode !== "facts") return;
      const wrong = item.choices.find((c) => c.mistake)!;
      const m = explainMiss(item, wrong);
      expect(m.kind).toBe("numberLine");
      if (m.kind !== "numberLine") return;
      expect(m.start + m.jumps.reduce((s, j) => s + j, 0)).toBe(item.answer);
      expect(m.caption.length).toBeGreaterThan(0);
    });
  });

  it("make ten hops go through 10", () => {
    expect(makeTenJumps({ a: 8, b: 5, op: "+" })).toEqual([2, 3]);
    expect(makeTenJumps({ a: 13, b: 5, op: "-" })).toEqual([-3, -2]);
    expect(makeTenJumps({ a: 4, b: 3, op: "+" })).toEqual([3]);
  });

  it("two digit problems use base ten blocks with the right regroup flag", () => {
    everyItem((item, mode) => {
      if (mode === "facts") return;
      const wrong = item.choices.find((c) => c.mistake)!;
      const m = explainMiss(item, wrong);
      expect(m.kind).toBe("baseTen");
      if (m.kind === "baseTen") expect(m.regroup).toBe(needsRegroup(item.prompt as MathPrompt));
    });
  });

  it("every mistake has its own caption, not the generic one", () => {
    everyItem((item) => {
      for (const c of item.choices) {
        if (!c.mistake) continue;
        expect(explainMiss(item, c).caption).not.toBe("Let's see how it works.");
      }
    });
  });

  it("shows the full answer", () => {
    const item = makeItem(4, createRng(3), "add");
    const p = item.prompt as MathPrompt;
    expect(explainMiss(item, item.choices[0]!).answerText).toBe(`${p.a} + ${p.b} = ${item.answer}`);
  });
});

describe("definition", () => {
  it("lists every standard its modes use", () => {
    for (const m of summitMath.modes) expect(summitMath.standards).toContain(m.skill);
  });
});
