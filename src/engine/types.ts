import type { Rng } from "@/lib/rng";

/** What a kid taps. Math games use numbers; word games will use strings. */
export type Answer = number | string;

export interface Choice {
  value: Answer;
  /** Set on every wrong choice: the real mistake this distractor models. Absent on the answer. */
  mistake?: string;
}

export interface Item {
  /** Stable id of the problem itself, e.g. "add:38+25". Same problem, same key. */
  key: string;
  /** Standard code this item practices, e.g. "2.NBT.B.5". */
  skill: string;
  /** Game specific data the game's view knows how to draw. */
  prompt: unknown;
  answer: Answer;
  /** Includes the answer exactly once, in display order. */
  choices: Choice[];
  /** What read aloud says. */
  speech: string;
}

export type PlayStyle = "board" | "teams" | "split";

export interface GameMode {
  id: string;
  label: string;
  /** The one standard this mode practices. */
  skill: string;
  /** Levels run 1..levels. */
  levels: number;
}

/** Plain data describing the teach-on-the-miss animation. The board decides how to draw it. */
export type MissAnimation =
  | {
      kind: "baseTen";
      op: "+" | "-";
      a: number;
      b: number;
      regroup: boolean;
      caption: string;
      answerText: string;
    }
  | {
      kind: "numberLine";
      start: number;
      /** Signed hops in order, e.g. [+2, +3] for 8 + 5 by making ten. */
      jumps: number[];
      caption: string;
      answerText: string;
    };

export interface GameDefinition {
  id: string;
  title: string;
  blurb: string;
  standards: string[];
  modes: GameMode[];
  play: PlayStyle[];
  /** Pure and seeded. Same (level, mode, rng seed) always gives the same item. */
  makeItem(level: number, rng: Rng, modeId: string): Item;
  explainMiss(item: Item, chosen: Choice): MissAnimation;
  /** Every mistake id this game can produce, with a plain language name for the teacher page. */
  mistakes: Record<string, string>;
}
