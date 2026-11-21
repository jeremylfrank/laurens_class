import type { Rng } from "@/lib/rng";
import type { Choice, GameDefinition, Item, MissAnimation } from "@/engine/types";

/**
 * Summit Math. Three modes, each one standard:
 *   facts  2.OA.B.2  add and subtract within 20 using mental strategies (make ten)
 *   add    2.NBT.B.5  add within 100 using place value
 *   sub    2.NBT.B.5  subtract within 100 using place value
 *
 * Wrong answers are the answers a 2nd grader actually gets when they make a specific mistake.
 */

export type Op = "+" | "-";
export interface MathPrompt {
  a: number;
  b: number;
  op: Op;
}

export const MISTAKES = {
  "forgot-to-regroup": "Forgot to regroup (dropped the new ten)",
  "wrote-column-sums": "Wrote both column sums side by side (38 + 25 = 513)",
  "smaller-from-larger": "Subtracted the smaller ones digit from the larger (52 − 17 = 45)",
  "forgot-to-reduce-tens": "Broke a ten but didn't take it away from the tens",
  "added-instead": "Added instead of subtracting",
  "subtracted-instead": "Subtracted instead of adding",
  "added-to-tens": "Lined the ones digit up with the tens (34 + 5 = 84)",
  "subtracted-from-tens": "Lined the ones digit up with the tens (87 − 5 = 37)",
  "reversed-digits": "Swapped the tens and ones digits",
  "miscounted-tens": "Counted one ten too many or too few",
  "forgot-the-ones": "Worked the tens but forgot the ones",
  "counted-start-number": "Counted the starting number as a jump (off by one)",
  "counted-one-extra": "Counted one jump too many",
  "make-ten-forgot-split": "Made ten but forgot to split the other number",
  "dropped-the-ten": "Wrote only the ones digit and dropped the ten",
  "near-double-wrong": "Used the double but didn't adjust (6 + 7 = 12)",
  "subtract-from-ten-forgot-ones": "Took away from ten but forgot the extra ones",
} as const satisfies Record<string, string>;

export type MistakeId = keyof typeof MISTAKES;

type Candidate = [MistakeId, number];

export const MODES = [
  { id: "facts", label: "Facts to 20", skill: "2.OA.B.2", levels: 4 },
  { id: "add", label: "Add to 100", skill: "2.NBT.B.5", levels: 5 },
  { id: "sub", label: "Subtract to 100", skill: "2.NBT.B.5", levels: 5 },
] as const;

export type ModeId = (typeof MODES)[number]["id"];

const tens = (n: number) => Math.floor(n / 10);
const ones = (n: number) => n % 10;
const solve = ({ a, b, op }: MathPrompt) => (op === "+" ? a + b : a - b);

export function needsRegroup({ a, b, op }: MathPrompt): boolean {
  return op === "+" ? ones(a) + ones(b) >= 10 : ones(a) < ones(b);
}

function reversed(n: number): number | null {
  if (n < 10 || n > 99 || ones(n) === 0 || ones(n) === tens(n)) return null;
  return ones(n) * 10 + tens(n);
}

/** Every mistake that applies to this problem, the level's signature mistake first. */
export function candidateMistakes(p: MathPrompt, rng: Rng, fact: boolean): Candidate[] {
  const { a, b, op } = p;
  const ans = solve(p);
  const regroup = needsRegroup(p);
  const twoDigit = a >= 10 && b >= 10;
  const primary: Candidate[] = [];
  const other: Candidate[] = [];
  const rev = reversed(ans);

  if (op === "+") {
    if (fact) {
      // Facts within 20.
      if (ans > 10) {
        primary.push(["make-ten-forgot-split", 10 + b], ["dropped-the-ten", ans - 10]);
      }
      if (Math.abs(a - b) === 1) primary.push(["near-double-wrong", 2 * Math.min(a, b)]);
      other.push(["counted-start-number", ans - 1], ["counted-one-extra", ans + 1]);
      if (a > b) other.push(["subtracted-instead", a - b]);
    } else {
      if (regroup) {
        primary.push(["forgot-to-regroup", ans - 10]);
        primary.push(["wrote-column-sums", (tens(a) + tens(b)) * 100 + ones(a) + ones(b)]);
      }
      if (!twoDigit) primary.push(["added-to-tens", Math.max(a, b) + 10 * Math.min(a, b)]);
      if (twoDigit && !regroup) other.push(["forgot-the-ones", (tens(a) + tens(b)) * 10 + ones(a)]);
      other.push(
        ["subtracted-instead", Math.abs(a - b)],
        ["miscounted-tens", ans + 10],
        ["miscounted-tens", ans - 10],
      );
      if (rev !== null) other.push(["reversed-digits", rev]);
    }
  } else {
    if (fact) {
      // Facts within 20.
      if (a > 10 && ans < 10) {
        primary.push(["smaller-from-larger", 10 + Math.abs(ones(a) - b)]);
        primary.push(["subtract-from-ten-forgot-ones", 10 - b]);
      }
      other.push(["counted-start-number", ans + 1], ["counted-one-extra", ans - 1], ["added-instead", a + b]);
    } else {
      if (regroup) {
        primary.push(["smaller-from-larger", (tens(a) - tens(b)) * 10 + Math.abs(ones(a) - ones(b))]);
        primary.push(["forgot-to-reduce-tens", (tens(a) - tens(b)) * 10 + ones(a) + 10 - ones(b)]);
      }
      if (!twoDigit) primary.push(["subtracted-from-tens", a - 10 * b]);
      if (twoDigit && !regroup) other.push(["forgot-the-ones", (tens(a) - tens(b)) * 10 + ones(a)]);
      other.push(["added-instead", a + b], ["miscounted-tens", ans + 10], ["miscounted-tens", ans - 10]);
      if (rev !== null) other.push(["reversed-digits", rev]);
    }
  }
  return [...primary, ...rng.shuffle(other)];
}

export const CHOICES = 4;

/** Picks up to CHOICES - 1 distinct, sensible distractors. Null if there aren't enough. */
export function buildChoices(p: MathPrompt, rng: Rng, fact: boolean): Choice[] | null {
  const ans = solve(p);
  const seen = new Set<number>([ans]);
  const wrong: Choice[] = [];
  const candidates = candidateMistakes(p, rng, fact);
  // First pass: one choice per kind of mistake. Second pass fills in if a problem has few kinds.
  for (const allowRepeat of [false, true]) {
    for (const [mistake, value] of candidates) {
      if (wrong.length >= CHOICES - 1) break;
      if (!Number.isInteger(value) || value < 0 || value > 999 || seen.has(value)) continue;
      if (!allowRepeat && wrong.some((w) => w.mistake === mistake)) continue;
      seen.add(value);
      wrong.push({ value, mistake });
    }
  }
  if (wrong.length < CHOICES - 1) return null;
  return rng.shuffle([{ value: ans }, ...wrong]);
}

/** Two digit number with ones digit in [lo, hi] and tens digit in [tlo, thi]. */
function twoDigit(rng: Rng, tlo: number, thi: number, lo: number, hi: number) {
  return rng.range(tlo, thi) * 10 + rng.range(lo, hi);
}

/** Raw problem for a mode and level. Exported for tests. */
export function makeProblem(mode: ModeId, level: number, rng: Rng): MathPrompt {
  if (mode === "facts") {
    const style = level >= 4 ? rng.range(1, 3) : level;
    if (style === 1) {
      const a = rng.range(2, 8);
      return { a, b: rng.range(1, 10 - a), op: "+" };
    }
    if (style === 2) {
      // Make ten: 8 + 5.
      const a = rng.range(6, 9);
      return { a, b: rng.range(11 - a, 9), op: "+" };
    }
    // Take from ten: 13 − 5.
    const a = rng.range(11, 18);
    return { a, b: rng.range(ones(a) + 1, 9), op: "-" };
  }

  if (mode === "add") {
    switch (level) {
      case 1: {
        const a = twoDigit(rng, 1, 8, 0, 8);
        return { a, b: rng.range(1, 9 - ones(a)), op: "+" };
      }
      case 2: {
        const a = twoDigit(rng, 1, 7, 0, 8);
        const b = twoDigit(rng, 1, 8 - tens(a), 1, 9 - ones(a));
        return { a, b, op: "+" };
      }
      case 3: {
        const a = twoDigit(rng, 1, 8, 2, 9);
        return { a, b: rng.range(10 - ones(a), 9), op: "+" };
      }
      case 4: {
        const a = twoDigit(rng, 1, 7, 2, 9);
        const b = twoDigit(rng, 1, 8 - tens(a), 10 - ones(a), 9);
        return { a, b, op: "+" };
      }
      default: {
        // Bigger sums with regrouping, some landing exactly on 100.
        const a = twoDigit(rng, 3, 8, 1, 9);
        const b = twoDigit(rng, 1, 9 - tens(a), 10 - ones(a), 9);
        return { a, b, op: "+" };
      }
    }
  }

  switch (level) {
    case 1: {
      const a = twoDigit(rng, 2, 9, 2, 9);
      return { a, b: rng.range(1, ones(a)), op: "-" };
    }
    case 2: {
      const a = twoDigit(rng, 3, 9, 1, 9);
      const b = twoDigit(rng, 1, tens(a) - 1, 0, ones(a));
      return { a, b, op: "-" };
    }
    case 3: {
      const a = twoDigit(rng, 2, 9, 0, 7);
      return { a, b: rng.range(ones(a) + 1, 9), op: "-" };
    }
    case 4: {
      const a = twoDigit(rng, 3, 9, 0, 7);
      const b = twoDigit(rng, 1, tens(a) - 1, ones(a) + 1, 9);
      return { a, b, op: "-" };
    }
    default: {
      // Subtract from a whole ten: 70 − 26.
      const a = rng.range(3, 9) * 10;
      const b = twoDigit(rng, 1, tens(a) - 1, 1, 9);
      return { a, b, op: "-" };
    }
  }
}

const SPOKEN: Record<Op, string> = { "+": "plus", "-": "minus" };

export function makeItem(level: number, rng: Rng, modeId: string): Item {
  const mode = MODES.find((m) => m.id === modeId) ?? MODES[0];
  const lvl = Math.min(Math.max(Math.round(level), 1), mode.levels);
  for (let attempt = 0; attempt < 100; attempt++) {
    const prompt = makeProblem(mode.id, lvl, rng);
    const answer = solve(prompt);
    if (answer < 0 || answer > (mode.id === "facts" ? 20 : 100)) continue;
    const choices = buildChoices(prompt, rng, mode.id === "facts");
    if (!choices) continue;
    return {
      key: `${prompt.op === "+" ? "add" : "sub"}:${prompt.a}${prompt.op}${prompt.b}`,
      skill: mode.skill,
      prompt,
      answer,
      choices,
      speech: `What is ${prompt.a} ${SPOKEN[prompt.op]} ${prompt.b}?`,
    };
  }
  throw new Error(`Summit Math could not build an item for ${mode.id} level ${lvl}`);
}

/** Make ten hops: 8 + 5 → [+2, +3]; 13 − 5 → [−3, −2]. Otherwise one hop. */
export function makeTenJumps({ a, b, op }: MathPrompt): number[] {
  if (op === "+") {
    const toTen = 10 - a;
    return a < 10 && a + b > 10 && toTen > 0 ? [toTen, b - toTen] : [b];
  }
  const toTen = a - 10;
  return a > 10 && a - b < 10 && toTen > 0 ? [-toTen, -(b - toTen)] : [-b];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function caption(mistake: string | undefined, p: MathPrompt, fact: boolean): string {
  const { a, b } = p;
  const onesSum = ones(a) + ones(b);
  switch (mistake) {
    case "forgot-to-regroup":
    case "wrote-column-sums":
      return `${onesSum} ones make 1 ten and ${plural(onesSum - 10, "one")}. Trade 10 ones for a ten!`;
    case "smaller-from-larger":
      return fact
        ? `Take ${a - 10} to get to 10, then take ${b - (a - 10)} more.`
        : `You can't take ${ones(b)} ones from ${ones(a)}. Break a ten into 10 ones first.`;
    case "forgot-to-reduce-tens":
      return "We broke one ten into ones, so there is one less ten.";
    case "added-instead":
      return "Minus means take away, so the number gets smaller.";
    case "subtracted-instead":
      return "Plus means put together, so the number gets bigger.";
    case "added-to-tens":
    case "subtracted-from-tens":
      return `${b} is ones, not tens. Line up ones with ones.`;
    case "reversed-digits": {
      const ans = solve(p);
      return `${plural(tens(ans), "ten")} and ${plural(ones(ans), "one")} makes ${ans}. Tens go first.`;
    }
    case "miscounted-tens":
      return "Count the tens carefully: each rod is ten.";
    case "forgot-the-ones":
      return "Don't forget the ones!";
    case "counted-start-number":
      return `Start on ${a} and count the jumps, not the start.`;
    case "counted-one-extra":
      return "Count each jump just once.";
    case "make-ten-forgot-split":
      return `Make 10 first: ${a} + ${10 - a} = 10. Then add the ${b - (10 - a)} left over.`;
    case "dropped-the-ten":
      return "We went past 10, so keep the ten!";
    case "near-double-wrong": {
      const m = Math.min(a, b);
      return `${m} + ${m} = ${2 * m}, and one more makes ${2 * m + 1}.`;
    }
    case "subtract-from-ten-forgot-ones":
      return `Take ${a - 10} to get to 10, then take ${b - (a - 10)} more.`;
    default:
      return "Let's see how it works.";
  }
}

export function explainMiss(item: Item, chosen: Choice): MissAnimation {
  const p = item.prompt as MathPrompt;
  const sym = p.op === "+" ? "+" : "−";
  const answerText = `${p.a} ${sym} ${p.b} = ${item.answer}`;
  const fact = item.skill === "2.OA.B.2";
  const text = caption(chosen.mistake, p, fact);
  if (fact) {
    return { kind: "numberLine", start: p.a, jumps: makeTenJumps(p), caption: text, answerText };
  }
  return { kind: "baseTen", op: p.op, a: p.a, b: p.b, regroup: needsRegroup(p), caption: text, answerText };
}

export const summitMath: GameDefinition = {
  id: "summit-math",
  title: "Summit Math",
  blurb: "Add and subtract to climb",
  standards: ["2.OA.B.2", "2.NBT.B.5"],
  modes: MODES.map((m) => ({ ...m })),
  play: ["board", "teams", "split"],
  makeItem,
  explainMiss,
  mistakes: MISTAKES,
};
