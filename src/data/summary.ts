/**
 * Turns a week of results into what Lauren needs: which skills are strong or need work,
 * the most common mistakes, and the problems missed most. Class level only; never per child.
 */
export interface ResultRow {
  item_key: string;
  skill: string;
  correct: boolean;
  mistake: string | null;
  at: string;
}

export const SKILL_NAMES: Record<string, string> = {
  "2.OA.B.2": "Facts within 20 (make ten)",
  "2.NBT.B.5": "Two digit numbers within 100 (place value)",
};

const KIND_NAMES: Record<string, string> = { add: "adding", sub: "subtracting" };

export const MIN_TRIES = 5;
export const STRONG = 0.8;
export const NEEDS_WORK = 0.6;

export type SkillStatus = "strong" | "growing" | "needs-work" | "too-few";

export interface SkillLine {
  key: string;
  skill: string;
  label: string;
  tries: number;
  right: number;
  share: number;
  status: SkillStatus;
}

export interface MistakeLine {
  id: string;
  name: string;
  count: number;
  examples: string[];
}

export interface ItemLine {
  key: string;
  label: string;
  tries: number;
  misses: number;
}

export interface Summary {
  tries: number;
  right: number;
  skills: SkillLine[];
  mistakes: MistakeLine[];
  hardest: ItemLine[];
}

/** "add:38+25" → "38 + 25", "sub:52-17" → "52 − 17". Unknown formats are shown as they are. */
export function itemLabel(key: string): string {
  const m = /^(add|sub):(\d+)[+-](\d+)$/.exec(key);
  if (!m) return key;
  return `${m[2]} ${m[1] === "add" ? "+" : "−"} ${m[3]}`;
}

function status(tries: number, share: number): SkillStatus {
  if (tries < MIN_TRIES) return "too-few";
  if (share >= STRONG) return "strong";
  if (share < NEEDS_WORK) return "needs-work";
  return "growing";
}

export function summarize(rows: ResultRow[], mistakeNames: Record<string, string>): Summary {
  const skills = new Map<string, { skill: string; kind: string; tries: number; right: number }>();
  const mistakes = new Map<string, { count: number; items: Map<string, number> }>();
  const items = new Map<string, { tries: number; misses: number }>();

  for (const r of rows) {
    const kind = r.item_key.split(":")[0] ?? "";
    const sk = `${r.skill}|${kind}`;
    const s = skills.get(sk) ?? { skill: r.skill, kind, tries: 0, right: 0 };
    s.tries += 1;
    if (r.correct) s.right += 1;
    skills.set(sk, s);

    const it = items.get(r.item_key) ?? { tries: 0, misses: 0 };
    it.tries += 1;
    if (!r.correct) it.misses += 1;
    items.set(r.item_key, it);

    if (!r.correct && r.mistake) {
      const m = mistakes.get(r.mistake) ?? { count: 0, items: new Map() };
      m.count += 1;
      m.items.set(r.item_key, (m.items.get(r.item_key) ?? 0) + 1);
      mistakes.set(r.mistake, m);
    }
  }

  const skillLines: SkillLine[] = [...skills.entries()]
    .map(([key, s]) => {
      const share = s.tries ? s.right / s.tries : 0;
      const base = SKILL_NAMES[s.skill] ?? s.skill;
      const kind = KIND_NAMES[s.kind];
      return {
        key,
        skill: s.skill,
        label: kind ? `${base}: ${kind}` : base,
        tries: s.tries,
        right: s.right,
        share,
        status: status(s.tries, share),
      };
    })
    // Weakest first, so what needs attention is at the top.
    .sort((a, b) => a.share - b.share || b.tries - a.tries);

  const mistakeLines: MistakeLine[] = [...mistakes.entries()]
    .map(([id, m]) => ({
      id,
      name: mistakeNames[id] ?? id,
      count: m.count,
      examples: [...m.items.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => itemLabel(k)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const hardest: ItemLine[] = [...items.entries()]
    .filter(([, v]) => v.misses > 0)
    .map(([key, v]) => ({ key, label: itemLabel(key), ...v }))
    .sort((a, b) => b.misses - a.misses || b.tries - a.tries)
    .slice(0, 5);

  return {
    tries: rows.length,
    right: rows.filter((r) => r.correct).length,
    skills: skillLines,
    mistakes: mistakeLines,
    hardest,
  };
}

/** Monday 00:00 local time of the week containing `date`, shifted by `weeksAgo`. */
export function weekStart(date: Date, weeksAgo = 0): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday - 7 * weeksAgo);
  return d;
}
