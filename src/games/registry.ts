import type { ComponentType } from "react";
import type { GameDefinition, Item } from "@/engine/types";
import { summitMath } from "./summit-math/definition";
import { SummitMathPrompt } from "./summit-math/Prompt";

export interface BoardGame {
  def: GameDefinition;
  /** Short instruction on the wood sign. */
  sign: string;
  Prompt: ComponentType<{ item: Item; compact?: boolean }>;
}

export const GAMES: BoardGame[] = [{ def: summitMath, sign: "Solve it to climb!", Prompt: SummitMathPrompt }];

export const findGame = (id: string) => GAMES.find((g) => g.def.id === id);
