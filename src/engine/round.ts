import type { Choice, Item } from "./types";

/**
 * One round at the board, including team turns and steals.
 *
 * Board mode: a miss ends the round and the explanation plays.
 * Team mode: a miss passes the same question to the other team to steal.
 * If the steal misses too, the round ends with the explanation.
 * Either way, if anyone missed, the explanation plays so the class sees why.
 */
export type Team = 0 | 1;

export interface RoundState {
  item: Item;
  teams: boolean;
  /** Whose turn it is right now (null in board mode). */
  turn: Team | null;
  /** The team that started this round. */
  startTurn: Team | null;
  phase: "ask" | "steal" | "done";
  /** Indices of choices already tapped wrong (disabled). */
  wrong: number[];
  /** First wrong choice, shown in the explanation. */
  firstMiss: Choice | null;
  /** Team that scored, if any. */
  scorer: Team | null;
  /** True if the round ended with someone right. */
  solved: boolean;
}

export interface TapResult {
  state: RoundState;
  correct: boolean;
  /** Who tapped (null in board mode). For the attempt log. */
  by: Team | null;
}

export function startRound(item: Item, teams: boolean, turn: Team): RoundState {
  return {
    item,
    teams,
    turn: teams ? turn : null,
    startTurn: teams ? turn : null,
    phase: "ask",
    wrong: [],
    firstMiss: null,
    scorer: null,
    solved: false,
  };
}

export function tap(state: RoundState, index: number): TapResult | null {
  if (state.phase === "done" || state.wrong.includes(index)) return null;
  const choice = state.item.choices[index];
  if (!choice) return null;
  const by = state.turn;
  const correct = choice.value === state.item.answer;
  if (correct) {
    return { state: { ...state, phase: "done", scorer: by, solved: true }, correct, by };
  }
  const wrong = [...state.wrong, index];
  const firstMiss = state.firstMiss ?? choice;
  if (state.teams && state.phase === "ask" && state.turn !== null) {
    const other: Team = state.turn === 0 ? 1 : 0;
    return { state: { ...state, phase: "steal", turn: other, wrong, firstMiss }, correct, by };
  }
  return { state: { ...state, phase: "done", wrong, firstMiss }, correct, by };
}

/** Turns alternate by round, whatever happened with steals. */
export function nextTurn(state: RoundState): Team {
  return state.startTurn === 0 ? 1 : 0;
}

/** For the adaptive level: did the class get it on the first try? */
export function firstTryRight(state: RoundState): boolean {
  return state.solved && state.wrong.length === 0;
}
