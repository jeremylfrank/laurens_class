import type { Item } from "@/engine/types";
import type { MathPrompt } from "./definition";

export function SummitMathPrompt({ item, compact }: { item: Item; compact?: boolean }) {
  const p = item.prompt as MathPrompt;
  const sym = p.op === "+" ? "+" : "−";
  return (
    <div
      className={`board-card eq${compact ? " compact" : ""}`}
      aria-label={`${p.a} ${p.op === "+" ? "plus" : "minus"} ${p.b}`}
      data-a={p.a}
      data-b={p.b}
      data-op={p.op}
    >
      {p.a} {sym} {p.b} = <span className="q">?</span>
    </div>
  );
}
